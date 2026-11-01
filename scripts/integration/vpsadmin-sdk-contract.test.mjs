import assert from 'node:assert/strict';
import test from 'node:test';
import { spawn } from 'node:child_process';
import { EventEmitter } from 'node:events';
import { PassThrough } from 'node:stream';
import { checkBaseUrl, checkEnvironment, parseArguments, readReadiness, stopFixture } from './vpsadmin-sdk-contract.mjs';

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
