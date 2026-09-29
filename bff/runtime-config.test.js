'use strict';

const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { runInNewContext } = require('node:vm');
const { PUBLIC_CONFIG_MAX_BYTES, loadBffConfig, renderConfigJs } = require('./runtime-config');
const { setRuntimeConfigSecurityHeaders } = require('./security');

const CLIENT_ID = 'webui-client';
const CLIENT_SECRET = 'Qf74sc9MWpL2hz8ABvY6tRk3xN5jD0eU';
const SESSION_SECRET = 'Aa8fG6jdL4vsP0xR2kHtM9bY1wZ5nQ3c';

function productionEnv(storePath) {
  const fixtureRoot = fs.existsSync(storePath) && fs.lstatSync(storePath).isDirectory()
    ? storePath : path.dirname(storePath);
  const credentialDirectory = path.join(fixtureRoot, 'credentials');
  fs.mkdirSync(credentialDirectory, { recursive: true });
  for (const [name, value] of [
    ['oauth-client-id', CLIENT_ID],
    ['oauth-client-secret', CLIENT_SECRET],
    ['session-secret', SESSION_SECRET],
  ]) fs.writeFileSync(path.join(credentialDirectory, name), `${value}\n`);
  return {
    CREDENTIALS_DIRECTORY: credentialDirectory,
    BFF_RUNTIME_MODE: 'production',
    PUBLIC_ORIGIN: 'https://newadmin.example.test',
    API_URL: 'https://api.example.test', API_VERSION: '7.0',
    HAVEAPI_AUTH_HEADER: 'X-HaveAPI-OAuth2-Token', HAVEAPI_META_NAMESPACE: '_meta',
    OAUTH_AUTHORIZE_URL: 'https://auth.example.test/_auth/oauth2/authorize',
    OAUTH_TOKEN_URL: 'https://auth.example.test/_auth/oauth2/token',
    OAUTH_REVOKE_URL: 'https://auth.example.test/_auth/oauth2/revoke',
    PASSWORD_RECOVERY_URL: 'https://auth.example.test/oauth2/password-reset',
    OAUTH_REDIRECT_URI: 'https://newadmin.example.test/oauth/callback',
    OAUTH_SCOPE: 'all', OAUTH_TYPE: 'web_server',
    SESSION_STORE_PATH: storePath, SESSION_COOKIE_NAME: 'vpsadmin_webui_session',
    LEGACY_WEBUI_URL: 'https://oldadmin.example.test',
  };
}

function rejectWithoutEcho(env, name, secret) {
  assert.throws(() => loadBffConfig(env), (error) => {
    assert.match(error.message, new RegExp(name));
    if (secret) assert.equal(error.message.includes(secret), false);
    return true;
  });
}

test('strict production config has one bounded, credential-free public projection', (t) => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'bff-config-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const env = productionEnv(directory);
  const originalEnv = { ...env };
  const config = loadBffConfig(env);
  assert.deepEqual(env, originalEnv);
  assert.equal(config.mode, 'production');
  assert.equal(config.publicOrigin, env.PUBLIC_ORIGIN);
  assert.equal(config.publicConfig.schemaVersion, 1);
  assert.deepEqual(config.publicConfig.api, { url: env.API_URL, version: '7.0' });
  assert.deepEqual(config.publicConfig.webuiNext.haveApi,
    { authHeader: env.HAVEAPI_AUTH_HEADER, metaNamespace: env.HAVEAPI_META_NAMESPACE });
  assert.equal(config.publicConfig.webuiNext.legacyUrl, env.LEGACY_WEBUI_URL);
  assert.equal(config.publicConfig.webuiNext.passwordRecoveryUrl,
    `${env.PASSWORD_RECOVERY_URL}?client_id=webui-client`);
  assert.ok(Buffer.byteLength(config.publicJson, 'utf8') <= PUBLIC_CONFIG_MAX_BYTES);
  for (const secret of [CLIENT_SECRET, SESSION_SECRET]) {
    assert.equal(config.publicJson.includes(secret), false);
  }
  for (const field of ['accessToken', 'refresh_token', 'sessionKey', 'sessionExpiresAt']) {
    assert.equal(config.publicJson.includes(field), false);
  }
  const browser = { window: {} };
  runInNewContext(renderConfigJs(config.publicConfig), browser, { timeout: 100 });
  assert.deepEqual(JSON.parse(JSON.stringify(browser.window.vpsAdmin.api)), config.publicConfig.api);
  assert.deepEqual(JSON.parse(JSON.stringify(browser.window.vpsAdmin.webuiNext)), config.publicConfig.webuiNext);
  const headers = {};
  const response = { setHeader: (name, value) => { headers[name] = value; } };
  setRuntimeConfigSecurityHeaders(response, 'application/json; charset=utf-8');
  assert.equal(headers['content-type'], 'application/json; charset=utf-8');
  assert.equal(headers['cache-control'], 'no-store');
  assert.equal(headers['x-content-type-options'], 'nosniff');
  assert.equal(headers['cross-origin-resource-policy'], 'same-origin');
  setRuntimeConfigSecurityHeaders(response);
  assert.equal(headers['content-type'], 'application/javascript; charset=utf-8');
  assert.deepEqual(fs.readdirSync(directory), ['credentials'], 'writability probe must be removed');
});

test('required production settings never fall back to legacy defaults', (t) => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'bff-config-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  for (const name of [
    'PUBLIC_ORIGIN', 'API_URL', 'API_VERSION', 'HAVEAPI_AUTH_HEADER',
    'HAVEAPI_META_NAMESPACE', 'OAUTH_AUTHORIZE_URL', 'OAUTH_TOKEN_URL',
    'OAUTH_REVOKE_URL', 'PASSWORD_RECOVERY_URL', 'OAUTH_REDIRECT_URI',
    'OAUTH_SCOPE', 'OAUTH_TYPE', 'SESSION_STORE_PATH', 'SESSION_COOKIE_NAME',
  ]) {
    const env = productionEnv(directory);
    delete env[name];
    rejectWithoutEcho(env, name);
  }
});

test('URL validation rejects credentials, unsafe schemes, mixed origins and noncanonical callbacks', (t) => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'bff-config-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const cases = [
    ['PUBLIC_ORIGIN', 'https://newadmin.example.test/path'],
    ['PUBLIC_ORIGIN', 'https://newadmin.example.test/'],
    ['PUBLIC_ORIGIN', 'http://newadmin.example.test'],
    ['API_URL', 'http://api.example.test'],
    ['API_URL', 'https://user:pass@api.example.test'],
    ['API_URL', 'https://api.example.test/?access_token=private'],
    ['API_URL', 'https://api.example.test\\@attacker.test'],
    ['OAUTH_AUTHORIZE_URL', 'https://auth.example.test/authorize?client_secret=private'],
    ['OAUTH_TOKEN_URL', 'https://other.example.test/token'],
    ['OAUTH_REVOKE_URL', 'http://auth.example.test/revoke'],
    ['PASSWORD_RECOVERY_URL', 'https://other.example.test/reset'],
    ['PASSWORD_RECOVERY_URL', 'https://auth.example.test/reset?client_id=other'],
    ['PASSWORD_RECOVERY_URL', 'https://auth.example.test/reset?client_id=webui-client&client_id=other'],
    ['PASSWORD_RECOVERY_URL', 'https://auth.example.test/reset?custom=private'],
    ['OAUTH_REDIRECT_URI', 'https://other.example.test/oauth/callback'],
    ['OAUTH_REDIRECT_URI', 'https://newadmin.example.test/oauth/callback?state=private'],
    ['LEGACY_WEBUI_URL', 'javascript:alert(1)'],
  ];
  for (const [name, value] of cases) {
    const env = productionEnv(directory);
    env[name] = value;
    rejectWithoutEcho(env, name === 'OAUTH_TOKEN_URL' ? 'OAUTH_URLS' : name, value);
  }
});

test('numbers are exact positive bounded integers with coherent lifetimes', (t) => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'bff-config-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const cases = [
    ['PORT', '3001junk'], ['BFF_PORT', '0'], ['PORT', '65536'],
    ['REFRESH_SKEW_MS', '-1'], ['SESSION_MAX_AGE_MS', '1e9'],
    ['OAUTH_STATE_MAX_AGE_MS', '0'], ['PREAUTH_SESSION_MAX_AGE_MS', 'NaN'],
    ['LOGIN_RATE_LIMIT_WINDOW_MS', '60000x'], ['LOGIN_RATE_LIMIT_MAX', '1001'],
    ['OAUTH_FETCH_TIMEOUT_MS', '30001'], ['OAUTH_RESPONSE_MAX_BYTES', '0'],
  ];
  for (const [name, value] of cases) {
    const env = productionEnv(directory);
    env[name] = value;
    rejectWithoutEcho(env, name === 'BFF_PORT' ? 'PORT' : name, value);
  }
  const conflicting = { ...productionEnv(directory), PORT: '3001', BFF_PORT: '3002' };
  rejectWithoutEcho(conflicting, 'PORT/BFF_PORT');
  const inconsistent = { ...productionEnv(directory), OAUTH_STATE_MAX_AGE_MS: '1200000', PREAUTH_SESSION_MAX_AGE_MS: '600000' };
  rejectWithoutEcho(inconsistent, 'SESSION_DURATIONS');
});

test('public versions, headers and identifiers reject malformed values', (t) => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'bff-config-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  for (const [name, value] of [
    ['API_VERSION', '7.0junk'], ['API_VERSION', '07.0'],
    ['HAVEAPI_AUTH_HEADER', 'Bad Header'],
    ['HAVEAPI_META_NAMESPACE', '__proto__'],
    ['OAUTH_SCOPE', 'all\nunsafe'], ['OAUTH_TYPE', 'web server'],
    ['SESSION_COOKIE_NAME', 'bad;cookie'],
  ]) {
    const env = productionEnv(directory);
    env[name] = value;
    rejectWithoutEcho(env, name, value);
  }
});

test('missing, weak or placeholder secrets and unwritable state fail without values', (t) => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'bff-config-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  for (const [name, value] of [
    ['OAUTH_CLIENT_SECRET', 'short'],
    ['OAUTH_CLIENT_SECRET', 'a'.repeat(64)],
    ['OAUTH_CLIENT_SECRET', 'example-with-more-than-thirty-two-characters'],
    ['SESSION_SECRET', 'change-me-with-a-lot-of-padding-123456789'],
  ]) {
    const env = productionEnv(directory);
    const filename = name === 'SESSION_SECRET' ? 'session-secret' : 'oauth-client-secret';
    fs.writeFileSync(path.join(env.CREDENTIALS_DIRECTORY, filename), value);
    rejectWithoutEcho(env, name, value);
  }
  const longId = productionEnv(directory);
  fs.writeFileSync(path.join(longId.CREDENTIALS_DIRECTORY, 'oauth-client-id'), 'i'.repeat(257));
  rejectWithoutEcho(longId, 'OAUTH_CLIENT_ID');
  const absent = productionEnv(path.join(directory, 'missing'));
  rejectWithoutEcho(absent, 'SESSION_STORE_PATH', absent.SESSION_STORE_PATH);
  const regularFile = path.join(directory, 'regular-file');
  fs.writeFileSync(regularFile, '');
  rejectWithoutEcho(productionEnv(regularFile), 'SESSION_STORE_PATH', regularFile);
  const symlink = path.join(directory, 'linked-store');
  fs.symlinkSync(directory, symlink);
  rejectWithoutEcho(productionEnv(symlink), 'SESSION_STORE_PATH', symlink);
});

test('explicit legacy-test mode keeps local fixture defaults without enabling production fallback', (t) => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'bff-config-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const env = {
    BFF_RUNTIME_MODE: 'legacy-test', OAUTH_AUTHORIZE_URL: 'https://identity.test/authorize',
    OAUTH_TOKEN_URL: 'http://127.0.0.1:1234/token',
    OAUTH_REDIRECT_URI: 'https://webui.test/oauth/callback',
    SESSION_STORE_PATH: directory,
  };
  const credentialDirectory = path.join(directory, 'credentials');
  fs.mkdirSync(credentialDirectory);
  for (const [name, value] of [
    ['oauth-client-id', 'fixture-client'],
    ['oauth-client-secret', 'fixture-secret'],
    ['session-secret', 'fixture-session-secret-with-enough-entropy'],
  ]) fs.writeFileSync(path.join(credentialDirectory, name), value);
  env.CREDENTIALS_DIRECTORY = credentialDirectory;
  const config = loadBffConfig(env);
  assert.equal(config.oauthRevokeUrl, '');
  assert.equal(config.publicConfig.api.url, 'https://api.vpsfree.cz');
  assert.equal(config.publicConfig.webuiNext.loginUrl, '/oauth/login');
  const production = { ...env };
  delete production.BFF_RUNTIME_MODE;
  production.OAUTH_TOKEN_URL = 'https://identity.test/token';
  rejectWithoutEcho(production, 'OAUTH_REVOKE_URL');
  rejectWithoutEcho({ ...env, BFF_RUNTIME_MODE: 'auto' }, 'BFF_RUNTIME_MODE');
  rejectWithoutEcho({ ...env, NODE_ENV: 'production' }, 'BFF_RUNTIME_MODE');
});

test('server module validates production configuration before a listener exists', (t) => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'bff-startup-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const env = { ...productionEnv(directory), NODE_ENV: 'production' };
  const load = (overrides) => spawnSync(process.execPath,
    ['-e', "require('./server'); process.exit(0)"],
    { cwd: __dirname, env: { ...env, ...overrides }, encoding: 'utf8', timeout: 5_000 });
  const good = load({});
  assert.equal(good.status, 0, good.stderr);
  const bad = spawnSync(process.execPath, ['server.js'], {
    cwd: __dirname,
    env: { ...env, API_URL: 'https://user:private-secret@api.example.test' },
    encoding: 'utf8', timeout: 5_000,
  });
  assert.equal(bad.status, 1);
  assert.match(bad.stderr, /API_URL/);
  assert.equal(bad.stderr.includes('private-secret'), false);
  assert.equal(bad.stderr.includes('listen EPERM'), false);
  const missingStore = path.join(directory, 'absent-store');
  const badStore = spawnSync(process.execPath, ['server.js'], {
    cwd: __dirname,
    env: { ...env, SESSION_STORE_PATH: missingStore },
    encoding: 'utf8', timeout: 5_000,
  });
  assert.equal(badStore.status, 1);
  assert.match(badStore.stderr, /SESSION_STORE_PATH/);
  assert.equal(badStore.stderr.includes(missingStore), false);
  assert.equal(badStore.stderr.includes('listen EPERM'), false);
  fs.unlinkSync(path.join(env.CREDENTIALS_DIRECTORY, 'oauth-client-secret'));
  const missingCredential = spawnSync(process.execPath, ['server.js'], {
    cwd: __dirname, env, encoding: 'utf8', timeout: 5_000,
  });
  assert.equal(missingCredential.status, 1);
  assert.match(missingCredential.stderr, /oauth-client-secret: missing file/);
  assert.equal(missingCredential.stderr.includes(env.CREDENTIALS_DIRECTORY), false);
  assert.equal(missingCredential.stderr.includes('listen EPERM'), false);
  const retired = spawnSync(process.execPath, ['server.js'], {
    cwd: __dirname,
    env: { ...env, OAUTH_CLIENT_SECRET: 'synthetic-retired-value' },
    encoding: 'utf8', timeout: 5_000,
  });
  assert.equal(retired.status, 1);
  assert.match(retired.stderr, /OAUTH_CLIENT_SECRET: retired environment variable/);
  assert.equal(retired.stderr.includes('synthetic-retired-value'), false);
});
