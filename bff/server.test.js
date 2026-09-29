'use strict';

const assert = require('node:assert/strict');
const { once } = require('node:events');
const { mkdtempSync, readFileSync, rmSync, writeFileSync } = require('node:fs');
const { createServer } = require('node:http');
const { tmpdir } = require('node:os');
const { join } = require('node:path');
const test = require('node:test');
const { runInNewContext } = require('node:vm');

let bffOrigin;
let bffServer;
let providerServer;
let sessionDirectory;
let credentialDirectory;
const tokenRequests = [];

function closeServer(server) {
  if (!server) return Promise.resolve();
  return new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
}

function secureHeaders(cookie) {
  return {
    'x-forwarded-proto': 'https',
    ...(cookie ? { cookie } : {}),
  };
}

function responseCookie(response) {
  const header = response.headers.get('set-cookie');
  assert.ok(header, 'expected a session cookie');
  assert.match(header, /; Path=\//);
  assert.match(header, /; HttpOnly/i);
  assert.match(header, /; Secure/i);
  assert.match(header, /; SameSite=Lax/i);
  return header.split(';', 1)[0];
}

async function request(path, { cookie, acceptLanguage, headers = {} } = {}) {
  return fetch(`${bffOrigin}${path}`, {
    redirect: 'manual',
    headers: {
      ...secureHeaders(cookie),
      ...(acceptLanguage ? { 'accept-language': acceptLanguage } : {}),
      ...headers,
    },
  });
}

async function startLogin(next = '/app', existingCookie) {
  const response = await request(
    `/oauth/login?next=${encodeURIComponent(next)}`,
    { cookie: existingCookie },
  );
  assert.equal(response.status, 302);

  const authorizationUrl = new URL(response.headers.get('location'));
  const state = authorizationUrl.searchParams.get('state');
  assert.ok(state, 'authorization redirect must include state');

  const cookie = responseCookie(response);
  await response.arrayBuffer();
  const sessionId = decodeURIComponent(cookie.split('=', 2)[1]).slice(2).split('.', 1)[0];
  const storedSession = JSON.parse(
    readFileSync(join(sessionDirectory, `${sessionId}.json`), 'utf8'),
  );
  assert.equal(storedSession.oauth_state, state);
  assert.equal(storedSession.next, next);

  return { cookie, state };
}

function assertCleanRecoveryRedirect(response, body, secrets = []) {
  assert.equal(response.status, 303);
  assert.equal(response.headers.get('location'), '/oauth/error');
  assert.equal(response.headers.get('cache-control'), 'no-store, max-age=0');
  assert.equal(response.headers.get('referrer-policy'), 'no-referrer');
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(response.headers.get('x-frame-options'), 'DENY');
  assert.match(response.headers.get('content-security-policy') || '', /default-src 'none'/);

  const serialized = `${response.headers.get('location')}\n${body}`;
  for (const secret of secrets) assert.equal(serialized.includes(secret), false);
}

test.before(async () => {
  providerServer = createServer(async (request_, response) => {
    const chunks = [];
    for await (const chunk of request_) chunks.push(chunk);
    const parameters = new URLSearchParams(Buffer.concat(chunks).toString('utf8'));
    tokenRequests.push({
      ...Object.fromEntries(parameters),
      providerHeaders: {
        clientIp: request_.headers['client-ip'] ?? null,
        userAgent: request_.headers['user-agent'] ?? null,
      },
    });

    if (parameters.get('code') === 'provider-rejected-code') {
      response.writeHead(502, { 'content-type': 'application/json' });
      response.end(JSON.stringify({
        error: 'temporarily_unavailable',
        error_description: 'provider-detail-must-stay-private',
      }));
      return;
    }

    if (parameters.get('code') === 'provider-raw-error') {
      response.writeHead(503, { 'content-type': 'text/plain' });
      response.end('raw-provider-credential-must-stay-private');
      return;
    }

    response.writeHead(200, { 'content-type': 'application/json' });
    response.end(JSON.stringify({
      access_token: 'test-access-token',
      refresh_token: 'test-refresh-token',
      expires_in: 3600,
      token_type: 'bearer',
      scope: 'all',
    }));
  });
  providerServer.listen(0, '127.0.0.1');
  await once(providerServer, 'listening');
  const providerAddress = providerServer.address();
  assert.ok(providerAddress && typeof providerAddress === 'object');

  sessionDirectory = mkdtempSync(join(tmpdir(), 'webui-next-bff-test-'));
  credentialDirectory = mkdtempSync(join(tmpdir(), 'webui-next-bff-creds-'));
  for (const [name, value] of [
    ['oauth-client-id', 'test-client'],
    ['oauth-client-secret', 'test-client-secret'],
    ['session-secret', 'test-session-secret-with-enough-entropy'],
  ]) writeFileSync(join(credentialDirectory, name), value);
  for (const name of ['OAUTH_CLIENT_ID', 'OAUTH_CLIENT_SECRET', 'SESSION_SECRET']) delete process.env[name];
  Object.assign(process.env, {
    CREDENTIALS_DIRECTORY: credentialDirectory,
    BFF_RUNTIME_MODE: 'legacy-test',
    NODE_ENV: 'test',
    DOMAIN: 'webui.test',
    OAUTH_AUTHORIZE_URL: 'https://identity.test/authorize',
    OAUTH_TOKEN_URL: `http://127.0.0.1:${providerAddress.port}/token`,
    OAUTH_REDIRECT_URI: 'https://webui.test/oauth/callback',
    SESSION_STORE_PATH: sessionDirectory,
    LOGIN_RATE_LIMIT_MAX: '100',
  });

  const { app } = require('./server');
  bffServer = app.listen(0, '127.0.0.1');
  await once(bffServer, 'listening');
  const bffAddress = bffServer.address();
  assert.ok(bffAddress && typeof bffAddress === 'object');
  bffOrigin = `http://127.0.0.1:${bffAddress.port}`;
});

test.after(async () => {
  await Promise.all([closeServer(bffServer), closeServer(providerServer)]);
  if (sessionDirectory) rmSync(sessionDirectory, { force: true, recursive: true });
  if (credentialDirectory) rmSync(credentialDirectory, { force: true, recursive: true });
});

test('runtime config exposes the OAuth provider password recovery entry point', async () => {
  const response = await request('/config.js');
  const body = await response.text();

  assert.equal(response.status, 200);
  assert.match(response.headers.get('cache-control') || '', /no-store/);
  assert.match(
    body,
    /"passwordRecoveryUrl":"https:\/\/identity\.test\/oauth2\/password-reset\?client_id=test-client"/,
  );
});

test('config.json is bounded public JSON and config.js projects the same object', async () => {
  const jsonResponse = await request('/config.json');
  const jsonBody = await jsonResponse.text();
  const jsResponse = await request('/config.js');
  const jsBody = await jsResponse.text();
  assert.equal(jsonResponse.status, 200);
  assert.match(jsonResponse.headers.get('content-type'), /^application\/json(?:;|$)/);
  assert.match(jsResponse.headers.get('content-type'), /^application\/javascript(?:;|$)/);
  for (const response of [jsonResponse, jsResponse]) {
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(response.headers.get('cross-origin-resource-policy'), 'same-origin');
    assert.equal(response.headers.get('set-cookie'), null);
  }
  assert.ok(Buffer.byteLength(jsonBody, 'utf8') <= 64 * 1024);
  const payload = JSON.parse(jsonBody);
  assert.equal(payload.schemaVersion, 1);
  assert.deepEqual(Object.keys(payload).sort(), ['api', 'schemaVersion', 'webuiNext']);
  const sandbox = { window: {} };
  runInNewContext(jsBody, sandbox, { timeout: 100 });
  assert.deepEqual(JSON.parse(JSON.stringify(sandbox.window.vpsAdmin.api)), payload.api);
  assert.deepEqual(JSON.parse(JSON.stringify(sandbox.window.vpsAdmin.webuiNext)), payload.webuiNext);
  for (const secret of ['test-client-secret', 'test-session-secret-with-enough-entropy', 'test-access-token']) {
    assert.equal(jsonBody.includes(secret), false);
    assert.equal(jsBody.includes(secret), false);
  }
});

test('provider callback errors redirect without reflecting details and clear the pending attempt', async () => {
  const { cookie, state } = await startLogin('/app/vps/42');
  const error = 'access_denied_private';
  const description = 'provider-description-private';
  const response = await request(
    `/oauth/callback?error=${error}&error_description=${description}&state=${state}`,
    { cookie },
  );
  const body = await response.text();
  assertCleanRecoveryRedirect(response, body, [error, description, state]);

  const requestCount = tokenRequests.length;
  const replay = await request(`/oauth/callback?code=replay-after-provider-error&state=${state}`, { cookie });
  assert.equal(replay.status, 303);
  await replay.arrayBuffer();
  assert.equal(tokenRequests.length, requestCount, 'cleared state must not reach the token provider');

  const retry = await startLogin('/app', cookie);
  assert.notEqual(retry.state, state, 'retry must issue a fresh OAuth state');
});

test('a callback without a code redirects cleanly and clears the pending attempt', async () => {
  const { cookie, state } = await startLogin('/app');
  const response = await request(`/oauth/callback?state=${state}`, { cookie });
  const body = await response.text();
  assertCleanRecoveryRedirect(response, body, [state]);

  const requestCount = tokenRequests.length;
  const replay = await request(`/oauth/callback?code=replay-after-missing-code&state=${state}`, { cookie });
  assert.equal(replay.status, 303);
  assert.equal(tokenRequests.length, requestCount);
});

test('an invalid state is single-use and never reaches the token provider', async () => {
  const { cookie, state } = await startLogin('/app');
  const invalidState = 'invalid-state-private';
  const requestCount = tokenRequests.length;
  const response = await request(`/oauth/callback?code=unused-code&state=${invalidState}`, { cookie });
  const body = await response.text();
  assertCleanRecoveryRedirect(response, body, [invalidState, 'unused-code']);
  assert.equal(tokenRequests.length, requestCount);

  const replay = await request(`/oauth/callback?code=unused-replay&state=${state}`, { cookie });
  assert.equal(replay.status, 303);
  assert.equal(tokenRequests.length, requestCount, 'state mismatch must consume the original state');
});

test('token exchange failures use the clean recovery route and cannot be replayed', async () => {
  const { cookie, state } = await startLogin('/app');
  const code = 'provider-rejected-code';
  const logs = [];
  const previousError = console.error;
  let response;
  try {
    console.error = (...args) => logs.push(args);
    response = await request(`/oauth/callback?code=${code}&state=${state}`, { cookie });
  } finally {
    console.error = previousError;
  }
  const body = await response.text();
  assertCleanRecoveryRedirect(response, body, [code, state, 'provider-detail-must-stay-private']);
  assert.deepEqual(logs, [[
    '[webui-next-bff] OAuth callback failed',
    { failure: 'provider_http_error', status: 502 },
  ]]);
  for (const secret of [code, state, 'provider-detail-must-stay-private']) {
    assert.equal(JSON.stringify(logs).includes(secret), false);
  }

  const requestCount = tokenRequests.length;
  assert.equal(tokenRequests.at(-1).code, code);
  const replay = await request(`/oauth/callback?code=${code}&state=${state}`, { cookie });
  assert.equal(replay.status, 303);
  assert.equal(tokenRequests.length, requestCount, 'consumed callbacks must not exchange a code twice');
});

test('non-JSON provider errors retain status but neither body nor callback credentials', async () => {
  const { cookie, state } = await startLogin('/app');
  const logs = [];
  const previousError = console.error;
  let response;
  try {
    console.error = (...args) => logs.push(args);
    response = await request(`/oauth/callback?code=provider-raw-error&state=${state}`, { cookie });
  } finally {
    console.error = previousError;
  }
  const body = await response.text();
  assertCleanRecoveryRedirect(response, body, [state, 'provider-raw-error', 'raw-provider-credential-must-stay-private']);
  assert.deepEqual(logs, [[
    '[webui-next-bff] OAuth callback failed',
    { failure: 'provider_http_error', status: 503 },
  ]]);
});

test('successful callbacks preserve a validated next path and establish the session', async () => {
  const next = '/app/vps/42?tab=network#routes';
  const { cookie, state } = await startLogin(next);
  const response = await request(`/oauth/callback?code=successful-code&state=${state}`, { cookie });

  assert.equal(response.status, 302);
  assert.equal(response.headers.get('location'), next);
  const authenticatedCookie = responseCookie(response);
  await response.arrayBuffer();

  const sessionResponse = await fetch(`${bffOrigin}/session.json`, {
    redirect: 'manual',
    headers: {
      ...secureHeaders(authenticatedCookie),
      'sec-fetch-site': 'same-origin',
    },
  });
  assert.equal(sessionResponse.status, 200);
  const payload = await sessionResponse.json();
  assert.equal(payload.accessToken, 'test-access-token');
  assert.equal(typeof payload.sessionExpiresAt, 'number');
});

test('concurrent callbacks send their own validated address and service identity', async () => {
  const first = await startLogin('/app');
  const second = await startLogin('/app');
  const before = tokenRequests.length;
  const callbacks = await Promise.all([
    request(`/oauth/callback?code=concurrent-first&state=${first.state}`, {
      cookie: first.cookie,
      headers: {
        'x-forwarded-for': '198.51.100.11',
        'x-real-ip': '203.0.113.99',
        'client-ip': '203.0.113.98',
        'user-agent': 'spoofed-browser-agent',
      },
    }),
    request(`/oauth/callback?code=concurrent-second&state=${second.state}`, {
      cookie: second.cookie,
      headers: {
        'x-forwarded-for': '2001:db8::22',
        'x-real-ip': '203.0.113.97',
        'client-ip': '203.0.113.96',
        'user-agent': 'another-browser-agent',
      },
    }),
  ]);
  for (const response of callbacks) {
    assert.equal(response.status, 302);
    await response.arrayBuffer();
  }
  assert.deepEqual(
    tokenRequests.slice(before).map(({ code, providerHeaders }) => [code, providerHeaders]).sort(),
    [
      ['concurrent-first', { clientIp: '198.51.100.11', userAgent: 'vpsadmin-webui' }],
      ['concurrent-second', { clientIp: '2001:db8::22', userAgent: 'vpsadmin-webui' }],
    ],
  );
});

test('invalid callback IP consumes state without contacting the provider or reusing a prior IP', async () => {
  for (const address of ['[2001:db8::3]', 'bad-host', '203.0.113.1:443']) {
    const { cookie, state } = await startLogin('/app');
    const before = tokenRequests.length;
    const logs = [];
    const previousError = console.error;
    let response;
    try {
      console.error = (...args) => logs.push(args);
      response = await request(`/oauth/callback?code=unused-invalid-ip&state=${state}`, {
        cookie,
        headers: { 'x-forwarded-for': address, 'client-ip': '198.51.100.250' },
      });
    } finally {
      console.error = previousError;
    }
    assertCleanRecoveryRedirect(response, await response.text(), [address, state, 'unused-invalid-ip']);
    assert.equal(tokenRequests.length, before);
    assert.deepEqual(logs, [[
      '[webui-next-bff] OAuth callback failed',
      { failure: 'client_ip_invalid', status: undefined },
    ]]);
  }
});

test('session fingerprints survive reads but change at a fresh login', async () => {
  const read = async (cookie) => {
    const res = await fetch(`${bffOrigin}/session.json`, {
      headers: { ...secureHeaders(cookie), 'sec-fetch-site': 'same-origin' },
    });
    assert.equal(res.status, 200);
    return res.json();
  };
  const authenticate = async () => {
    const { cookie, state } = await startLogin('/app');
    const res = await request(`/oauth/callback?code=successful-code&state=${state}`, { cookie });
    const authenticated = responseCookie(res); await res.text();
    return authenticated;
  };
  const cookie = await authenticate();
  const first = await read(cookie);
  assert.match(first.sessionKey, /^[a-f0-9]{64}$/);
  assert.equal((await read(cookie)).sessionKey, first.sessionKey);
  assert.notEqual((await read(await authenticate())).sessionKey, first.sessionKey);
  assert.equal((await read(undefined)).sessionKey, null);
});

test('OAuth error page is bilingual, actionable, defensive and never reflects its query', async () => {
  const querySecret = 'callback-query-secret';
  const czechResponse = await request(
    `/oauth/error?code=${querySecret}&state=state-secret&error_description=description-secret`,
    { acceptLanguage: 'en;q=0.4, cs-CZ;q=0.9' },
  );
  const czechBody = await czechResponse.text();

  assert.equal(czechResponse.status, 400);
  assert.equal(czechResponse.headers.get('content-language'), 'cs');
  assert.equal(czechResponse.headers.get('cache-control'), 'no-store, max-age=0');
  assert.equal(czechResponse.headers.get('pragma'), 'no-cache');
  assert.equal(czechResponse.headers.get('referrer-policy'), 'no-referrer');
  assert.equal(czechResponse.headers.get('cross-origin-resource-policy'), 'same-origin');
  assert.equal(czechResponse.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(czechResponse.headers.get('x-frame-options'), 'DENY');
  assert.match(czechResponse.headers.get('content-security-policy') || '', /frame-ancestors 'none'/);
  assert.match(czechResponse.headers.get('vary') || '', /Accept-Language/i);
  assert.match(czechBody, /<html lang="cs">/);
  assert.match(czechBody, /<title>vpsAdmin · Přihlášení se nezdařilo<\/title>/);
  assert.match(czechBody, /href="\/oauth\/login\?next=%2Fapp"/);
  assert.match(czechBody, /href="\/"/);
  for (const secret of [querySecret, 'state-secret', 'description-secret']) {
    assert.equal(czechBody.includes(secret), false);
  }

  const englishResponse = await request('/oauth/error', { acceptLanguage: 'en-US' });
  assert.equal(englishResponse.headers.get('content-language'), 'en');
  assert.match(await englishResponse.text(), /<title>vpsAdmin · Sign-in failed<\/title>/);
});

async function passkeySession() {
  const { cookie, state } = await startLogin('/app/profile/mfa');
  const callback = await request(`/oauth/callback?code=passkey-test-code&state=${state}`, { cookie });
  assert.equal(callback.status, 302);
  await callback.arrayBuffer();
  return responseCookie(callback);
}

test('passkey handoff requires same-origin navigation and an authenticated session', async () => {
  const cookie = await passkeySession();
  for (const site of ['cross-site', 'same-site']) {
    const response = await fetch(`${bffOrigin}/oauth/passkey`, {
      headers: { ...secureHeaders(cookie), 'sec-fetch-site': site }, redirect: 'manual',
    });
    assert.equal(response.status, 403);
    assert.ok(!(await response.text()).includes('test-access-token'));
    assert.match(response.headers.get('cache-control'), /no-store/);
  }
  const anonymous = await fetch(`${bffOrigin}/oauth/passkey`, {
    headers: { ...secureHeaders(), 'sec-fetch-site': 'same-origin' }, redirect: 'manual',
  });
  assert.equal(anonymous.status, 303);
  assert.equal(anonymous.headers.get('location'), '/oauth/login?next=%2Fapp%2Fprofile%2Fmfa');
  assert.ok(!(await anonymous.text()).includes('test-access-token'));
});

test('passkey form uses only trusted destinations, localized copy and restrictive headers', async () => {
  const cookie = await passkeySession();
  for (const language of ['cs', 'en']) {
    const response = await fetch(`${bffOrigin}/oauth/passkey?lang=${language}&access_token=evil-token&redirect_uri=https://evil.test&action=https://evil.test`, {
      headers: { ...secureHeaders(cookie), 'sec-fetch-site': 'same-origin' }, redirect: 'manual',
    });
    assert.equal(response.status, 200);
    const html = await response.text();
    assert.match(html, new RegExp(`<html lang="${language}">`));
    assert.match(html, /method="post" action="https:\/\/identity.test\/webauthn\/registration\/new"/);
    assert.match(html, /name="redirect_uri" value="https:\/\/webui.test\/app\/profile\/mfa"/);
    assert.match(html, /name="access_token" value="test-access-token"/);
    assert.ok(!html.includes('test-refresh-token'));
    assert.ok(!html.includes('evil'));
    assert.equal(response.headers.get('location'), null);
    assert.equal(response.headers.get('referrer-policy'), 'no-referrer');
    assert.equal(response.headers.get('x-frame-options'), 'DENY');
    assert.equal(response.headers.get('cross-origin-resource-policy'), 'same-origin');
    assert.match(response.headers.get('cache-control'), /no-store/);
    assert.equal(response.headers.get('content-security-policy'), "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action https://identity.test; frame-ancestors 'none'");
  }
});
