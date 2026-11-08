import assert from 'node:assert/strict';
import test from 'node:test';
import { spawn } from 'node:child_process';
import { EventEmitter } from 'node:events';
import { PassThrough } from 'node:stream';
import { browserFailureDiagnostic, browserHttpKind, checkBaseUrl, checkEnvironment, checkSdkReceipt, parseArguments, readReadiness, stopFixture } from './vpsadmin-sdk-contract.mjs';

test('browser diagnostics retain static phases and owned path kinds without private values', () => {
  const privateValue = 'private-credential-response-stack';
  const error = { name: 'TimeoutError', message: privateValue, stack: privateValue };
  assert.deepEqual(browserFailureDiagnostic('current-path', error), { browser_phase: 'current-path', error_class: 'TimeoutError' });
  assert.deepEqual(browserFailureDiagnostic(privateValue, { name: privateValue }), { browser_phase: 'unknown', error_class: 'Error' });
  const base = 'http://127.0.0.1:1234/sdk-contract/v7.0';
  assert.equal(browserHttpKind(`${base}/dns_zones/42?secret=${privateValue}`, base), 'dns');
  assert.equal(browserHttpKind(`${base}/users/current`, base), 'identity');
  assert.equal(browserHttpKind(base, base), 'description');
  assert.equal(browserHttpKind(`${base}/private-resource`, base), 'other');
  for (const url of ['http://127.0.0.1:4198/app', `${base}-other/users`, 'invalid']) {
    assert.equal(browserHttpKind(url, base), undefined);
  }
  assert.equal(JSON.stringify(browserFailureDiagnostic('current-path', error)).includes(privateValue), false);
});

test('refuses inherited connection, bundler and preload overrides before child startup', () => {
  for (const name of ['DATABASE_URL', 'VPSADMIN_TEST_DB_PORT', 'BUNDLE_GEMFILE', 'MYSQL_HOST', 'MARIADB_HOST', 'RUBYOPT']) {
    assert.throws(() => checkEnvironment({ [name]: 'fixture' }), /Refusing/);
  }
  assert.throws(() => checkEnvironment({ RACK_ENV: 'production' }), /Refusing/);
  assert.throws(() => checkEnvironment({ VPSADMIN_PLUGINS: 'none' }), /Refusing/);
  checkEnvironment({ RACK_ENV: 'test', VPSADMIN_PLUGINS: 'all', RUBYLIB: '/nix/shell/path' });
});

test('requires the explicit source and immutable receipt arguments', () => {
  assert.deepEqual(parseArguments(['--api-root', '/fixture', '--sdk-receipt', '/receipt']), { apiRoot: '/fixture', receiptPath: '/receipt' });
  assert.throws(() => parseArguments([]));
  assert.throws(() => parseArguments(['--base-url', '/fixture', '--sdk-receipt', '/receipt']));
  assert.equal(parseArguments(['--api-root', '/fixture', '--sdk-receipt', '/receipt',
    '--ui-base-url', 'http://127.0.0.1:4198']).uiBaseUrl, 'http://127.0.0.1:4198');
  assert.throws(() => parseArguments(['--api-root', '/fixture', '--sdk-receipt', '/receipt',
    '--ui-base-url', 'https://newadmin.vpsfree.cz']));
});

test('SDK receipt refuses stale API, dirty source, substituted archives and unsupported runtime', () => {
  const receipt = {
    status: 'development-only-unpublished',
    dependency: 'file:../vpsadmin-typescript-client/vpsadmin-typescript-client-0.4.0.tgz',
    source_revision: '440f0170f211ea2a2fd0acce0def6bc88f541b57', source_dirty: false,
    api_revision: '68a36237b0bad9625fb25965bd415e801ddccf4c',
    schema_sha256: '46317b52cbb73ddb54973e5227a9a274bc74f76834eb8e4ead3f2266cf46a972',
    haveapi_generator_revision: '1ef9b204ba45bb261d3334be5c555cc1856b713b',
    runtime_peer: 'haveapi-client@0.32.0', archive_sha256: 'a'.repeat(64),
    archive_integrity: `sha512-${'a'.repeat(86)}==`, archive_size: 339986,
  };
  checkSdkReceipt(receipt);
  for (const delta of [
    { api_revision: '627eae83dccbee3e465ddc1bf506e7c82fe7fbf4' }, { source_dirty: true },
    { source_revision: '13985ec7c3d50a948a99f6fd2694abe5bcd816b6' },
    { runtime_peer: 'haveapi-client@0.30.2' }, { dependency: 'file:/tmp/substitute.tgz' },
    { archive_sha256: 'malformed' }, { archive_integrity: 'sha256-malformed' }, { archive_size: 0 },
  ]) assert.throws(() => checkSdkReceipt({ ...receipt, ...delta }));
});

test('owner closes its child input and waits for native exit', { timeout: 5_000 }, async () => {
  const child = spawn(process.execPath, ['-e', 'process.stdin.resume()'], { stdio: ['pipe', 'ignore', 'ignore'] });
  const exited = new Promise((resolve) => child.once('exit', (code) => resolve({ code })));
  await stopFixture(child, exited);
  assert.equal(child.exitCode, 0);
});

test('accepts only the owned loopback mounted version URL', () => {
  assert.equal(checkBaseUrl('http://127.0.0.1:12345/sdk-contract/v7.0'), 'http://127.0.0.1:12345/sdk-contract/v7.0');
  for (const value of ['https://api.vpsfree.cz/v7.0', 'http://localhost:1234/sdk-contract/v7.0',
    'http://127.0.0.1:1234/v7.0', 'http://user:password@127.0.0.1:1234/sdk-contract/v7.0']) {
    assert.throws(() => checkBaseUrl(value));
  }
});

function readinessFixture() {
  const child = new EventEmitter();
  child.stdio = [null, null, null, new PassThrough()];
  return child;
}

test('readiness resolves on the complete line while the producer stays open', { timeout: 1_000 }, async () => {
  const child = readinessFixture();
  const ready = readReadiness(child);
  child.stdio[3].write('{"ready":');
  child.stdio[3].write('true}\n');
  assert.deepEqual(await ready, { ready: true });
  assert.equal(child.stdio[3].readableEnded, false);
  assert.equal(child.listenerCount('exit'), 0);
  child.stdio[3].destroy();
});

test('premature readiness EOF and exit reject without exposing the payload', async () => {
  const eof = readinessFixture();
  const eofRejected = assert.rejects(readReadiness(eof), /incomplete/);
  eof.stdio[3].end('{"private":"unfinished');
  await eofRejected;
  const exited = readinessFixture();
  const exitRejected = assert.rejects(readReadiness(exited), /exited before readiness/);
  exited.emit('exit', 1);
  await exitRejected;
  exited.stdio[3].destroy();
});

test('malformed readiness rejects with a fixed message', async () => {
  const child = readinessFixture();
  const rejected = assert.rejects(readReadiness(child), (error) => error.message === 'Fixture readiness frame is invalid');
  child.stdio[3].write('private-invalid-json\n');
  await rejected;
  child.stdio[3].destroy();
});
