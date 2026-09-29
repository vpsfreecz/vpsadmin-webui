'use strict';

const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { MAX_CREDENTIAL_BYTES, readCredentials } = require('./credentials');

const VALUES = {
  'oauth-client-id': 'fixture-client',
  'oauth-client-secret': 'Fixture-Client-Secret-47A0bC1dE2fG3hI4jK5l',
  'session-secret': 'Fixture-Session-Secret-60A1bC2dE3fG4hI5jK6l',
};

function fixture(t) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'bff-credentials-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  for (const [name, value] of Object.entries(VALUES)) {
    fs.writeFileSync(path.join(directory, name), value, { mode: 0o600 });
  }
  return { directory, env: { CREDENTIALS_DIRECTORY: directory } };
}

function rejectsWithoutValue(env, name) {
  assert.throws(() => readCredentials(env), (error) => {
    assert.match(error.message, new RegExp(name));
    for (const value of Object.values(VALUES)) assert.equal(error.message.includes(value), false);
    if (env.CREDENTIALS_DIRECTORY && path.isAbsolute(env.CREDENTIALS_DIRECTORY)) {
      assert.equal(error.message.includes(env.CREDENTIALS_DIRECTORY), false);
    }
    return true;
  });
}

test('reads exact raw UTF-8 files, one optional newline, and leaves the environment untouched', (t) => {
  const { directory, env } = fixture(t);
  fs.writeFileSync(path.join(directory, 'oauth-client-id'), `${VALUES['oauth-client-id']}\n`);
  fs.writeFileSync(path.join(directory, 'oauth-client-secret'), `${VALUES['oauth-client-secret']}\r\n`);
  const before = { ...env };
  assert.deepEqual(readCredentials(env), {
    oauthClientId: VALUES['oauth-client-id'],
    oauthClientSecret: VALUES['oauth-client-secret'],
    sessionSecret: VALUES['session-secret'],
  });
  assert.deepEqual(env, before);
  for (const name of ['OAUTH_CLIENT_ID', 'OAUTH_CLIENT_SECRET', 'SESSION_SECRET']) {
    assert.equal(Object.hasOwn(env, name), false);
  }
  const child = spawnSync(process.execPath, ['-e',
    "process.exitCode = ['OAUTH_CLIENT_ID','OAUTH_CLIENT_SECRET','SESSION_SECRET'].some((name) => Object.hasOwn(process.env, name)) ? 1 : 0"],
  { env, encoding: 'utf8' });
  assert.equal(child.status, 0);
  assert.equal(child.stdout, '');
});

test('requires an existing absolute credential directory and all three fixed files', (t) => {
  const { directory, env } = fixture(t);
  for (const invalid of [undefined, '', 'relative', path.join(directory, 'absent')]) {
    rejectsWithoutValue({ CREDENTIALS_DIRECTORY: invalid }, 'CREDENTIALS_DIRECTORY');
  }
  const file = path.join(directory, 'not-directory');
  fs.writeFileSync(file, 'x');
  rejectsWithoutValue({ CREDENTIALS_DIRECTORY: file }, 'CREDENTIALS_DIRECTORY');
  const linkedDirectory = path.join(directory, 'linked-directory');
  fs.symlinkSync(directory, linkedDirectory);
  rejectsWithoutValue({ CREDENTIALS_DIRECTORY: linkedDirectory }, 'CREDENTIALS_DIRECTORY');
  for (const name of Object.keys(VALUES)) {
    const filename = path.join(directory, name);
    fs.renameSync(filename, `${filename}.missing`);
    rejectsWithoutValue(env, name);
    fs.renameSync(`${filename}.missing`, filename);
    fs.writeFileSync(filename, '');
    rejectsWithoutValue(env, name);
    fs.writeFileSync(filename, VALUES[name]);
  }
});

test('rejects retired environment variables in production and fixture modes', (t) => {
  const { env } = fixture(t);
  for (const name of ['OAUTH_CLIENT_ID', 'OAUTH_CLIENT_SECRET', 'SESSION_SECRET']) {
    rejectsWithoutValue({ ...env, [name]: 'synthetic-value' }, name);
    rejectsWithoutValue({ ...env, [name]: '' }, name);
  }
});

test('rejects nonregular files before opening, including symlinks and FIFOs', (t) => {
  const { directory, env } = fixture(t);
  const filename = path.join(directory, 'oauth-client-id');
  fs.unlinkSync(filename);
  fs.symlinkSync(path.join(directory, 'oauth-client-secret'), filename);
  rejectsWithoutValue(env, 'oauth-client-id');
  fs.unlinkSync(filename);
  fs.mkdirSync(filename);
  rejectsWithoutValue(env, 'oauth-client-id');
  fs.rmdirSync(filename);
  const fifo = spawnSync('mkfifo', [filename], { encoding: 'utf8' });
  assert.equal(fifo.status, 0, 'fixture requires the declared coreutils mkfifo tool');
  rejectsWithoutValue(env, 'oauth-client-id');
});

test('rejects oversized, malformed and whitespace-bearing credential bytes', (t) => {
  const { directory, env } = fixture(t);
  const filename = path.join(directory, 'oauth-client-secret');
  const cases = [
    Buffer.alloc(MAX_CREDENTIAL_BYTES + 1, 0x61),
    Buffer.from([0xef, 0xbb, 0xbf, 0x61]),
    Buffer.from([0xc3, 0x28]),
    '', ' value', 'value ', 'value\n\n', 'value\r', 'value\tmore', 'value\0more',
    'value\u0085more', 'value\uFEFFmore',
  ];
  for (const value of cases) {
    fs.writeFileSync(filename, value);
    rejectsWithoutValue(env, 'oauth-client-secret');
  }
  fs.writeFileSync(filename, Buffer.alloc(MAX_CREDENTIAL_BYTES, 0x61));
  assert.equal(readCredentials(env).oauthClientSecret.length, MAX_CREDENTIAL_BYTES);
});

test('the BFF keeps asynchronous session-file-store reaping disabled', () => {
  const source = fs.readFileSync(path.join(__dirname, 'server.js'), 'utf8');
  assert.match(source, /reapAsync:\s*false/);
});
