import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawn, spawnSync } from 'node:child_process';
import { readFileSync, realpathSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

const API_REVISION = '68a36237b0bad9625fb25965bd415e801ddccf4c';
const SDK_REVISION = '440f0170f211ea2a2fd0acce0def6bc88f541b57';
const SCHEMA_SHA256 = '46317b52cbb73ddb54973e5227a9a274bc74f76834eb8e4ead3f2266cf46a972';
const RUNTIME_SHA256 = '9285eab56e435ee86a501a24808e15496d44521881a032090003a1108511f016';
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');

export function checkEnvironment(env) {
  for (const name of Object.keys(env)) {
    if (['RUBYOPT', 'DATABASE_URL', 'VPSADMIN_PLUGIN_DIR', 'BUNDLER_SETUP', 'BUNDLER_VERSION'].includes(name)
      || /^(BUNDLE_|VPSADMIN_TEST_DB_|MYSQL_|MARIADB_)/.test(name)) throw new Error(`Refusing inherited ${name}`);
  }
  if (env.RACK_ENV !== undefined && env.RACK_ENV !== 'test') throw new Error('Refusing non-test Rack environment');
  if (env.VPSADMIN_PLUGINS !== undefined && env.VPSADMIN_PLUGINS !== 'all') throw new Error('Refusing partial plugin profile');
}

export function checkBaseUrl(value) {
  const url = new URL(value);
  assert.equal(url.protocol, 'http:');
  assert.equal(url.hostname, '127.0.0.1');
  assert.ok(url.port && !url.username && !url.password && !url.search && !url.hash);
  assert.equal(url.pathname, '/sdk-contract/v7.0');
  return url.href;
}

export function parseArguments(args) {
  assert.ok(args.length === 4 || args.length === 6, 'Expected --api-root DIR --sdk-receipt FILE [--ui-base-url URL]');
  assert.equal(args[0], '--api-root');
  assert.equal(args[2], '--sdk-receipt');
  if (args.length === 6) {
    assert.equal(args[4], '--ui-base-url');
    assert.equal(args[5], 'http://127.0.0.1:4198');
  }
  return { apiRoot: args[1], receiptPath: args[3], ...(args.length === 6 ? { uiBaseUrl: args[5] } : {}) };
}

export async function stopFixture(child, exited) {
  child.stdin.end();
  const result = await exited;
  assert.equal(result.code, 0, 'Fixture shutdown failed');
}

export function readReadiness(child) {
  return new Promise((ready, fail) => {
    const stream = child.stdio[3];
    let buffer = '';
    const cleanup = () => {
      stream.removeListener('data', onData);
      stream.removeListener('end', onEnd);
      stream.removeListener('error', onFailure);
      child.removeListener('exit', onFailure);
      child.removeListener('error', onFailure);
    };
    const onFailure = () => { cleanup(); fail(new Error('Fixture exited before readiness')); };
    const onEnd = () => { cleanup(); fail(new Error('Fixture readiness frame is incomplete')); };
    const onData = (chunk) => {
      buffer += chunk;
      const newline = buffer.indexOf('\n');
      if (newline < 0) return;
      cleanup();
      try { ready(JSON.parse(buffer.slice(0, newline))); }
      catch { fail(new Error('Fixture readiness frame is invalid')); }
    };
    stream.setEncoding('utf8');
    stream.on('data', onData);
    stream.once('end', onEnd);
    stream.once('error', onFailure);
    child.once('exit', onFailure);
    child.once('error', onFailure);
  });
}

async function matrix(facts, sdk, AsyncClient) {
  const base = checkBaseUrl(facts.base_url);
  let calls = 0;
  const timeoutMs = 5_000;
  const bind = (identity) => {
    const runtime = new AsyncClient(base);
    const api = sdk.createVpsAdminClient({ execute: sdk.createHaveApiExecutor(runtime) });
    const headers = identity ? { Authorization: `Basic ${Buffer.from(`${identity.login}:${identity.password}`).toString('base64')}` } : {};
    return { api, options: { headers, timeoutMs } };
  };
  const anonymous = bind();
  const admin = bind(facts.identities.admin);
  const member = bind(facts.identities.user);
  const other = bind(facts.identities.other_user);
  const call = async (label, invoke) => {
    calls += 1;
    assert.ok(calls <= 55, 'HTTP matrix budget exceeded');
    console.log(JSON.stringify({ step: calls, contract: label }));
    try { return await invoke(); } catch { throw new Error(`Contract call failed: ${label}`); }
  };
  const reject = (label, invoke, statuses) => call(label, async () => {
    await assert.rejects(invoke, (error) => error instanceof AsyncClientError
      && error.kind === 'api' && statuses.includes(error.httpStatus)
      && error.envelope?.status === false && !(error instanceof sdk.ClientInputError));
  });
  // Assigned below from the same installed HaveAPI package as AsyncClient.
  const AsyncClientError = sdk.runtimeError;
  for (const [role, client] of [['anonymous', anonymous], ['member', member], ['admin', admin]]) {
    const result = await call(`${role} root describe`, () => client.api.describe(client.options));
    assert.equal(result.httpStatus, 200);
    assert.equal(result.envelope.status, true);
    assert.equal(result.data.meta?.namespace, '_meta');
  }
  for (const [role, client] of [['member', member], ['admin', admin]]) {
    const identity = await call(`${role} current`, () => client.api.user.current(client.options));
    assert.equal(identity.data.id, role === 'admin' ? facts.identities.admin.id : facts.identities.user.id);
  }
  await reject('anonymous current', () => anonymous.api.user.current(anonymous.options), [401, 403]);
  const bad = bind({ login: facts.identities.user.login, password: `${facts.identities.user.password}-invalid` });
  await reject('invalid password', () => bad.api.user.current(bad.options), [401, 403]);
  const capability = await call('admin node update describe', () => admin.api.node.update.describe({ ...admin.options, path: { node_id: facts.node_id } }));
  assert.equal(capability.data.method, 'PUT');
  assert.ok(capability.data.input?.parameters && Object.hasOwn(capability.data.input.parameters, 'name'));
  await reject('member node update describe', () => member.api.node.update.describe({ ...member.options, path: { node_id: facts.node_id } }), [403]);
  for (const [role, client] of [['admin', admin], ['member', member], ['anonymous', anonymous]]) {
    const result = await call(`${role} templates`, () => client.api.os_template.index({ ...client.options, params: { limit: 20 } }));
    const rows = result.data;
    assert.ok(Array.isArray(rows));
    const supported = rows.find((row) => row.id === facts.templates.supported);
    assert.ok(supported);
    assert.equal(rows.some((row) => row.id === facts.templates.disabled), role === 'admin');
    assert.equal(rows.some((row) => row.id === facts.templates.unsupported), role !== 'anonymous');
    if (role === 'admin') {
      assert.equal(supported.enabled, true);
      assert.equal(rows.find((row) => row.id === facts.templates.disabled).enabled, false);
      assert.equal(rows.find((row) => row.id === facts.templates.unsupported).supported, false);
    }
    else assert.equal(Object.hasOwn(supported, 'enabled'), false);
    if (role !== 'anonymous') assert.equal(supported.supported, true);
    else assert.equal(Object.hasOwn(supported, 'supported'), false);
  }
  const users = await call('admin bounded users', () => admin.api.user.index({ ...admin.options, params: { limit: 2 }, meta: { count: true } }));
  assert.ok(users.data.length > 0 && users.data.length <= 2);
  assert.ok(Number.isSafeInteger(users.meta.total_count) && users.meta.total_count >= users.data.length);
  const cursor = Math.min(...users.data.map((row) => row.id));
  const later = await call('user from_id predicate', () => admin.api.user.index({ ...admin.options, params: { limit: 2, from_id: cursor } }));
  assert.ok(later.data.every((row) => Number.isSafeInteger(row.id) && row.id > cursor));
  const path = { namespace: 'ui', key: 'sdk-contract' };
  const value = { enabled: false, offset: 0, nested: { value: null } };
  const setting = await call('member setting set', () => member.api.webui_user_setting.set({ ...member.options, path, params: { value } }));
  assert.deepEqual(setting.data.value, value);
  const stored = await call('member setting show', () => member.api.webui_user_setting.show({ ...member.options, path }));
  assert.deepEqual(stored.data.value, value);
  const listing = await call('member setting index', () => member.api.webui_user_setting.index({ ...member.options, params: path }));
  assert.equal(listing.data.length, 1);
  assert.deepEqual(listing.data[0].value, value);
  const isolated = await call('other identity settings', () => other.api.webui_user_setting.index({ ...other.options, params: path }));
  assert.deepEqual(isolated.data, []);
  await reject('other identity setting show', () => other.api.webui_user_setting.show({ ...other.options, path }), [404]);
  await reject('invalid setting namespace', () => member.api.webui_user_setting.set({ ...member.options, path: { ...path, namespace: 'invalid' }, params: { value } }), [200, 400, 422]);
  await reject('anonymous setting access', () => anonymous.api.webui_user_setting.index(anonymous.options), [401, 403]);
  const deleted = await call('member setting delete', () => member.api.webui_user_setting.delete({ ...member.options, path }));
  assert.deepEqual(deleted.data, {});
  await reject('deleted setting show', () => member.api.webui_user_setting.show({ ...member.options, path }), [404]);
  const dnsStart = calls;
  await dnsMatrix(facts.dns, { member, admin, other, anonymous }, call, reject);
  assert.ok(calls - dnsStart <= 30, 'DNS matrix budget exceeded');
  return calls;
}

async function dnsMatrix(facts, clients, call, reject) {
  const { member, admin, other, anonymous } = clients;
  const paths = (client, params = {}) => client.api.dns_server_zone_primary_transfer_state.index({
    ...client.options, params: { dns_zone: facts.zone, ...params },
  });
  const memberPaths = await call('member DNS paths', () => paths(member));
  assert.deepEqual(memberPaths.data.map(row => row.id), [facts.current_path, facts.stale_path].sort((a, b) => a - b));
  const current = memberPaths.data.find(row => row.id === facts.current_path);
  const stale = memberPaths.data.find(row => row.id === facts.stale_path);
  assert.equal(current.status, 'failed');
  assert.equal(current.evidence_current, true);
  assert.equal(stale.status, 'success');
  assert.equal(stale.evidence_current, false);
  for (const row of memberPaths.data) {
    assert.equal(Object.hasOwn(row, 'configuration_generation'), false);
    assert.equal(Object.hasOwn(row, 'last_event_key'), false);
  }
  const filtered = await call('member DNS primary filter', () => paths(member, { dns_zone_transfer: facts.primary, status: 'failed' }));
  assert.deepEqual(filtered.data.map(row => row.id), [facts.current_path]);
  const all = await call('admin DNS hidden and foreign paths', () => admin.api.dns_server_zone_primary_transfer_state.index(admin.options));
  for (const id of [facts.current_path, facts.stale_path, facts.hidden_path, facts.foreign_path]) {
    assert.ok(all.data.some(row => row.id === id));
  }
  const foreign = await call('member foreign DNS path filter', () => paths(member, { dns_zone: facts.foreign_zone }));
  assert.deepEqual(foreign.data, []);
  const otherPaths = await call('other identity DNS path filter', () => paths(other));
  assert.deepEqual(otherPaths.data, []);
  await reject('anonymous DNS paths', () => paths(anonymous), [401, 403]);
  const description = await call('member DNS declared capabilities', () => member.api.describe(member.options));
  const resource = description.data.resources?.dns_server_zone_primary_transfer_state;
  assert.ok(resource?.actions?.index);
  assert.equal(Object.hasOwn(resource.actions, 'show'), false, 'Only the declared Index contract is supported');

  for (const [role, client] of [['member', member], ['admin', admin]]) {
    const transfers = await call(`${role} DNS aggregate and detached allocation`, () => client.api.dns_zone_transfer.index({
      ...client.options, params: { dns_zone: facts.zone, peer_type: 'primary_type', limit: 1 },
      meta: { includes: 'host_ip_address__ip_address__network_interface,host_ip_address__ip_address__user' },
    }));
    const primary = transfers.data.find(row => row.id === facts.primary);
    assert.ok(primary);
    assert.equal(primary.transfer_check_status, 'failed');
    assert.equal(primary.transfer_check_failed_count, 1);
    assert.equal(primary.transfer_check_pending_count, 1);
    assert.equal(primary.transfer_check_success_count, 0);
    assert.equal(primary.transfer_check_server_count, 2);
    const ip = primary.host_ip_address?.ip_address;
    assert.equal(ip?.id, facts.allocation);
    assert.equal(ip?.user?.id, facts.owner);
    assert.ok(Object.hasOwn(ip, 'network_interface'));
    assert.equal(ip.network_interface, null);
    const empty = await call(`${role} DNS missing primary existence`, () => client.api.dns_zone_transfer.index({
      ...client.options, params: { dns_zone: facts.empty_zone, peer_type: 'primary_type', limit: 1 },
    }));
    assert.deepEqual(empty.data, []);
  }
  const servers = await call('member DNS serving state', () => member.api.dns_server_zone.index({
    ...member.options, params: { dns_zone: facts.zone },
  }));
  assert.equal(servers.data.find(row => row.id === facts.server_zone)?.zone_status, 'serving');

  const history = await call('member unfiltered DNS history visibility', () => member.api.dns_server_zone_transfer_log.index(member.options));
  assert.deepEqual(history.data.map(row => row.id).sort((a, b) => a - b), [facts.legacy_log]);
  assert.ok(history.data.some(row => row.id === facts.legacy_log && row.attempt_kind === 'legacy'));
  assert.equal(history.data.some(row => row.id === facts.unbound_log), false);
  assert.equal(history.data.some(row => row.id === facts.foreign_log), false);
  assert.equal(history.data.some(row => row.id === facts.hidden_log), false);
  const adminHistory = await call('admin unfiltered DNS history visibility', () => admin.api.dns_server_zone_transfer_log.index(admin.options));
  for (const id of [facts.legacy_log, facts.unbound_log, facts.foreign_log, facts.hidden_log]) {
    assert.ok(adminHistory.data.some(row => row.id === id));
  }
  const legacy = await call('member legacy DNS history Show', () => member.api.dns_server_zone_transfer_log.show({
    ...member.options, path: { dns_server_zone_transfer_log_id: facts.legacy_log },
  }));
  assert.equal(legacy.data.attempt_kind, 'legacy');
  assert.equal(Object.hasOwn(legacy.data, 'raw_message'), false);
  assert.equal(Object.hasOwn(legacy.data, 'source_cursor'), false);
  await reject('member foreign DNS history Show', () => member.api.dns_server_zone_transfer_log.show({
    ...member.options, path: { dns_server_zone_transfer_log_id: facts.foreign_log },
  }), [404]);
  await reject('member hidden DNS history Show', () => member.api.dns_server_zone_transfer_log.show({
    ...member.options, path: { dns_server_zone_transfer_log_id: facts.hidden_log },
  }), [404]);
  await reject('member new unbound DNS history Show', () => member.api.dns_server_zone_transfer_log.show({
    ...member.options, path: { dns_server_zone_transfer_log_id: facts.unbound_log },
  }), [404]);
  const privileged = await call('admin unbound DNS history Show', () => admin.api.dns_server_zone_transfer_log.show({
    ...admin.options, path: { dns_server_zone_transfer_log_id: facts.unbound_log },
  }));
  assert.equal(privileged.data.id, facts.unbound_log);
  for (const [kind, id] of [['hidden', facts.hidden_log], ['foreign', facts.foreign_log]]) {
    const allowed = await call(`admin ${kind} DNS history Show`, () => admin.api.dns_server_zone_transfer_log.show({
      ...admin.options, path: { dns_server_zone_transfer_log_id: id },
    }));
    assert.equal(allowed.data.id, id);
    assert.equal(allowed.data.attempt_kind, 'legacy');
  }
}

const browserPhases = ['launch', 'navigate', 'current-path', 'stale-path', 'detached', 'history', 'serving'];

export function browserFailureDiagnostic(phase, error) {
  return {
    browser_phase: browserPhases.includes(phase) ? phase : 'unknown',
    error_class: ['Error', 'TimeoutError', 'AssertionError'].includes(error?.name) ? error.name : 'Error',
  };
}

export function browserHttpKind(value, base) {
  try {
    const url = new URL(value);
    const owned = new URL(checkBaseUrl(base));
    if (url.origin !== owned.origin || (url.pathname !== owned.pathname && !url.pathname.startsWith(`${owned.pathname}/`))) return undefined;
    const resource = url.pathname.slice(owned.pathname.length).split('/')[1];
    if (resource?.startsWith('dns_')) return 'dns';
    if (resource === 'users') return 'identity';
    return resource ? 'other' : 'description';
  } catch { return undefined; }
}

async function verifyBrowser(facts, uiBaseUrl) {
  // The existing registered Vite preview is selected explicitly; no browser mocks
  // or server startup occur here. Synthetic Basic credentials stay in memory.
  const { chromium } = await import('@playwright/test');
  const executablePath = process.env.E2E_CHROMIUM_EXECUTABLE_PATH;
  assert.ok(executablePath, 'Native Chromium must be selected explicitly');
  const browser = await chromium.launch({ executablePath });
  let phase = 'launch';
  const http = { requests: 0, responses: 0, failed: 0, statuses: {}, kinds: {} };
  try {
    const page = await browser.newPage();
    page.on('request', request => {
      const kind = browserHttpKind(request.url(), facts.base_url);
      if (!kind) return;
      http.requests += 1;
      http.kinds[kind] = (http.kinds[kind] ?? 0) + 1;
    });
    page.on('response', response => {
      if (!browserHttpKind(response.url(), facts.base_url)) return;
      http.responses += 1;
      const statusClass = `${Math.floor(response.status() / 100)}xx`;
      http.statuses[statusClass] = (http.statuses[statusClass] ?? 0) + 1;
    });
    page.on('requestfailed', request => {
      if (browserHttpKind(request.url(), facts.base_url)) http.failed += 1;
    });
    const identity = facts.identities.user;
    const auth = `Basic ${Buffer.from(`${identity.login}:${identity.password}`).toString('base64')}`;
    await page.addInitScript(({ base, auth }) => {
      const config = { api: { url: base.replace(/\/v7\.0$/, ''), version: '7.0' }, sessionToken: auth,
        webuiNext: { haveApi: { authHeader: 'Authorization', metaNamespace: '_meta' }, uiSettings: { persistence: 'local' } } };
      Object.defineProperty(window, 'vpsAdmin', { configurable: true, get: () => config, set: () => {} });
    }, { base: checkBaseUrl(facts.base_url), auth });
    phase = 'navigate';
    await page.goto(`${uiBaseUrl}/app/dns/zones/${facts.dns.zone}/transfers`);
    phase = 'current-path';
    await page.getByTestId(`dns.readiness.path.${facts.dns.current_path}`).waitFor();
    phase = 'stale-path';
    await page.getByTestId(`dns.readiness.path.${facts.dns.stale_path}`).waitFor();
    phase = 'detached';
    assert.ok(await page.locator(`[data-testid="dns.primary.detached.${facts.dns.primary}"]:visible`).isVisible());
    phase = 'history';
    assert.match(await page.getByTestId('dns.transfers.log').innerText(), /Historical attempt before readiness checks/);
    phase = 'serving';
    assert.match(await page.getByTestId('dns.transfers.status').innerText(), /Serving/);
    return { result: 'one unmocked member DNS view passed', http };
  } catch (error) {
    console.error(JSON.stringify({ ...browserFailureDiagnostic(phase, error), browser_http: http }));
    throw error;
  } finally {
    await browser.close();
  }
}

export function checkSdkReceipt(receipt) {
  assert.equal(receipt.status, 'development-only-unpublished');
  assert.equal(receipt.dependency, 'file:../vpsadmin-typescript-client/vpsadmin-typescript-client-0.4.0.tgz');
  assert.equal(receipt.source_revision, SDK_REVISION);
  assert.equal(receipt.source_dirty, false);
  assert.equal(receipt.api_revision, API_REVISION);
  assert.equal(receipt.schema_sha256, SCHEMA_SHA256);
  assert.equal(receipt.haveapi_generator_revision, '1ef9b204ba45bb261d3334be5c555cc1856b713b');
  assert.equal(receipt.runtime_peer, 'haveapi-client@0.32.0');
  assert.match(receipt.archive_sha256, /^[a-f0-9]{64}$/);
  assert.match(receipt.archive_integrity, /^sha512-[A-Za-z0-9+/]{86}==$/);
  assert.ok(Number.isSafeInteger(receipt.archive_size) && receipt.archive_size > 0);
}

async function main() {
  checkEnvironment(process.env);
  const args = parseArguments(process.argv.slice(2));
  const apiRoot = realpathSync(args.apiRoot);
  const receiptPath = resolve(args.receiptPath);
  const receipt = JSON.parse(readFileSync(receiptPath, 'utf8'));
  checkSdkReceipt(receipt);
  const root = fileURLToPath(new URL('../../', import.meta.url));
  const archive = resolve(root, receipt.dependency.slice('file:'.length));
  const archiveBytes = readFileSync(archive);
  assert.equal(sha256(archiveBytes), receipt.archive_sha256);
  assert.equal(archiveBytes.length, receipt.archive_size);
  assert.equal(`sha512-${createHash('sha512').update(archiveBytes).digest('base64')}`, receipt.archive_integrity);
  const sdkRoot = realpathSync(join(root, 'node_modules/vpsadmin-typescript-client'));
  const runtimeRoot = realpathSync(join(root, 'node_modules/haveapi-client'));
  const packageJson = JSON.parse(readFileSync(join(sdkRoot, 'package.json')));
  assert.equal(packageJson.name, 'vpsadmin-typescript-client');
  assert.equal(packageJson.version, '0.4.0');
  assert.equal(packageJson.peerDependencies['haveapi-client'], '0.32.0');
  const runtimeFile = join(runtimeRoot, 'dist/haveapi-client.js');
  assert.equal(sha256(readFileSync(runtimeFile)), RUNTIME_SHA256);
  // Verify installed application bytes against the already retained archive;
  // this neither extracts nor repacks a second candidate.
  for (const path of ['dist/index.js', 'dist/generated/runtime.js', 'dist/generated/api.js', 'tools/generator.json', 'schema/schema.json', 'schema/provenance.json', 'src/generated/.haveapi-generated.json']) {
    const packed = spawnSync('tar', ['-xOf', archive, `package/${path}`], { maxBuffer: 16 * 1024 * 1024 });
    assert.equal(packed.status, 0, 'Archive identity read failed');
    assert.equal(sha256(packed.stdout), sha256(readFileSync(join(sdkRoot, path))), 'Installed generated client differs from archive');
  }
  const sdk = await import(pathToFileURL(join(sdkRoot, 'dist/index.js')));
  const runtime = createRequire(import.meta.url)(runtimeFile);
  const environment = { ...process.env };
  delete environment.RUBYLIB;
  const child = spawn('ruby', [fileURLToPath(new URL('./vpsadmin-sdk-contract.rb', import.meta.url)), apiRoot, API_REVISION], {
    cwd: apiRoot, env: environment, stdio: ['pipe', 'inherit', 'inherit', 'pipe'],
  });
  const exited = new Promise((resolveExit) => {
    child.once('exit', (code, signal) => resolveExit({ code, signal }));
    child.once('error', () => resolveExit({ code: -1 }));
  });
  child.stdin.on('error', () => {}); // A failed bootstrap can close its input first.
  const abort = () => child.kill('SIGTERM');
  process.once('SIGINT', abort);
  process.once('SIGTERM', abort);
  let timer = setTimeout(abort, 600_000);
  let evidence;
  try {
    const facts = await readReadiness(child);
    clearTimeout(timer);
    timer = setTimeout(abort, 300_000);
    assert.equal(facts.api_revision, API_REVISION);
    const calls = await matrix(facts, { ...sdk, runtimeError: runtime.AsyncError }, runtime.AsyncClient);
    const browser = args.uiBaseUrl ? await verifyBrowser(facts, args.uiBaseUrl) : 'not-run';
    evidence = { result: 'passed', calls, api_revision: API_REVISION, sdk_commit: receipt.source_revision, browser,
      archive_sha256: receipt.archive_sha256, runtime_sha256: RUNTIME_SHA256,
      generator: JSON.parse(readFileSync(join(sdkRoot, 'tools/generator.json'))), api_tooling: facts.tooling,
      profile: 'six-plugin isolated mounted API' };
  } finally {
    clearTimeout(timer);
    await stopFixture(child, exited);
    process.removeListener('SIGINT', abort);
    process.removeListener('SIGTERM', abort);
  }
  console.log(JSON.stringify(evidence));
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  main().catch((error) => { console.error(`Generated client contract failed (${error.name}); no response or credential values logged`); process.exitCode = 1; });
}
