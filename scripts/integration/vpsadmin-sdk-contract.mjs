import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawn, spawnSync } from 'node:child_process';
import { readFileSync, realpathSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

const API_REVISION = '610a96f8ce523afbcd3e4374a70047dbe3264b0d';
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
  assert.equal(args.length, 4, 'Usage: node scripts/integration/vpsadmin-sdk-contract.mjs --api-root DIR --sdk-receipt FILE');
  assert.equal(args[0], '--api-root');
  assert.equal(args[2], '--sdk-receipt');
  return { apiRoot: args[1], receiptPath: args[3] };
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
    assert.ok(calls <= 30, 'HTTP matrix budget exceeded');
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
  return calls;
}

async function main() {
  checkEnvironment(process.env);
  const args = parseArguments(process.argv.slice(2));
  const apiRoot = realpathSync(args.apiRoot);
  const receiptPath = resolve(args.receiptPath);
  const receipt = JSON.parse(readFileSync(receiptPath, 'utf8'));
  assert.equal(receipt.package, 'vpsadmin-typescript-client');
  assert.equal(receipt.version, '0.3.0');
  assert.equal(receipt.filename, 'vpsadmin-typescript-client-0.3.0.tgz');
  const archive = join(dirname(receiptPath), receipt.filename);
  assert.equal(sha256(readFileSync(archive)), receipt.sha256);
  const root = fileURLToPath(new URL('../../', import.meta.url));
  const sdkRoot = realpathSync(join(root, 'node_modules/vpsadmin-typescript-client'));
  const runtimeRoot = realpathSync(join(root, 'node_modules/haveapi-client'));
  const packageJson = JSON.parse(readFileSync(join(sdkRoot, 'package.json')));
  assert.equal(packageJson.name, receipt.package);
  assert.equal(packageJson.version, receipt.version);
  assert.equal(packageJson.peerDependencies['haveapi-client'], '0.32.0');
  const runtimeFile = join(runtimeRoot, 'dist/haveapi-client.js');
  assert.equal(sha256(readFileSync(runtimeFile)), RUNTIME_SHA256);
  // Verify installed application bytes against the already retained archive;
  // this neither extracts nor repacks a second candidate.
  for (const path of ['dist/index.js', 'dist/generated/runtime.js', 'dist/generated/api.js', 'tools/generator.json', 'schema/schema.json']) {
    const packed = spawnSync('tar', ['-xOf', archive, `package/${path}`], { maxBuffer: 16 * 1024 * 1024 });
    assert.equal(packed.status, 0, 'Archive identity read failed');
    assert.equal(sha256(packed.stdout), sha256(readFileSync(join(sdkRoot, path))), 'Installed SDK differs from archive');
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
    evidence = { result: 'passed', calls, api_revision: API_REVISION, sdk_commit: receipt.commit,
      archive_sha256: receipt.sha256, runtime_sha256: RUNTIME_SHA256,
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
  main().catch((error) => { console.error(`SDK contract failed (${error.name}); no response or credential values logged`); process.exitCode = 1; });
}
