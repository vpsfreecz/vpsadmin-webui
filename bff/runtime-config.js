'use strict';

const { randomBytes } = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { readCredentials } = require('./credentials');
const { validateSessionSecret } = require('./security');

const PUBLIC_CONFIG_MAX_BYTES = 64 * 1024;
const NUMBERS = {
  PORT: [3001, 1, 65535],
  REFRESH_SKEW_MS: [60_000, 1, 10 * 60_000],
  SESSION_MAX_AGE_MS: [30 * 24 * 60 * 60_000, 60_000, 90 * 24 * 60 * 60_000],
  OAUTH_STATE_MAX_AGE_MS: [10 * 60_000, 1_000, 30 * 60_000],
  PREAUTH_SESSION_MAX_AGE_MS: [10 * 60_000, 1_000, 30 * 60_000],
  LOGIN_RATE_LIMIT_WINDOW_MS: [10 * 60_000, 1_000, 60 * 60_000],
  LOGIN_RATE_LIMIT_MAX: [20, 1, 1_000],
  OAUTH_FETCH_TIMEOUT_MS: [10_000, 100, 30_000],
  OAUTH_RESPONSE_MAX_BYTES: [64 * 1024, 1_024, 1024 * 1024],
};

function invalid(name, reason) {
  throw new Error(`${name}: ${reason}`);
}

function textSetting(env, name, fallback) {
  const value = env[name] === undefined ? fallback : env[name];
  if (typeof value !== 'string' || value.length === 0) invalid(name, 'required');
  if (value.trim() !== value || /[\x00-\x1f\x7f]/.test(value)) invalid(name, 'invalid value');
  return value;
}

function optionalText(env, name) {
  if (env[name] === undefined || env[name] === '') return undefined;
  return textSetting(env, name);
}

function integerSetting(env, name, override) {
  const [fallback, min, max] = NUMBERS[name];
  const raw = override ?? env[name] ?? String(fallback);
  if (typeof raw !== 'string' || !/^[1-9][0-9]*$/.test(raw)) invalid(name, 'invalid integer');
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value < min || value > max) invalid(name, 'out of bounds');
  return value;
}

function parsedUrl(env, name, { fallback, allowHttp = false, originOnly = false, noQuery = false } = {}) {
  const raw = textSetting(env, name, fallback);
  if (raw.length > 4096 || /[\\\s\x00-\x1f\x7f]/.test(raw)) invalid(name, 'invalid URL');
  let url;
  try { url = new URL(raw); } catch { invalid(name, 'invalid URL'); }
  if (!url.hostname || !['https:', ...(allowHttp ? ['http:'] : [])].includes(url.protocol)) {
    invalid(name, 'invalid URL scheme');
  }
  if (url.username || url.password) invalid(name, 'URL credentials are forbidden');
  if (url.hash || (noQuery && url.search)) invalid(name, 'URL fragment or query is forbidden');
  if (originOnly && raw !== url.origin) invalid(name, 'canonical origin required');
  for (const key of url.searchParams.keys()) {
    if (/^(?:access_token|refresh_token|client_secret|token|code|state|session|password|authorization)$/i.test(key)) {
      invalid(name, 'credential-bearing query is forbidden');
    }
  }
  return { raw, url };
}

function secretSetting(value, name, strict) {
  if (typeof value !== 'string' || value.length === 0) invalid(name, 'required');
  if (value.length > 4096) invalid(name, 'invalid secret length');
  if (name === 'SESSION_SECRET') validateSessionSecret(value);
  if (strict && (
    Buffer.byteLength(value, 'utf8') < 32 ||
    /^(?:test|change|replace|example|dummy|sample|password|secret)/i.test(value) ||
    /^(.)\1+$/.test(value) ||
    new Set(value).size < 10
  )) invalid(name, 'weak or placeholder secret');
  return value;
}

function assertWritableSessionStore(storePath) {
  if (!path.isAbsolute(storePath)) invalid('SESSION_STORE_PATH', 'absolute directory required');
  let probe;
  let probeCreated = false;
  try {
    if (!fs.lstatSync(storePath).isDirectory()) throw new Error('not a directory');
    probe = path.join(storePath, `.bff-startup-${randomBytes(12).toString('hex')}`);
    fs.writeFileSync(probe, '', { flag: 'wx', mode: 0o600 });
    probeCreated = true;
    fs.unlinkSync(probe);
    probeCreated = false;
  } catch {
    if (probeCreated) { try { fs.unlinkSync(probe); } catch { /* keep the original failure class */ } }
    invalid('SESSION_STORE_PATH', 'not a writable directory');
  }
}

function renderConfigJs(publicConfig) {
  return [
    'window.vpsAdmin = window.vpsAdmin || {};',
    `window.vpsAdmin.api = ${JSON.stringify(publicConfig.api)};`,
    'window.vpsAdmin.webuiNext = window.vpsAdmin.webuiNext || {};',
    `Object.assign(window.vpsAdmin.webuiNext, ${JSON.stringify(publicConfig.webuiNext)});`,
  ].join('\n');
}

function loadBffConfig(env = process.env) {
  const credentials = readCredentials(env);
  const mode = env.BFF_RUNTIME_MODE ?? 'production';
  if (!['production', 'legacy-test'].includes(mode)) invalid('BFF_RUNTIME_MODE', 'unsupported mode');
  if (mode === 'legacy-test' && env.NODE_ENV === 'production') {
    invalid('BFF_RUNTIME_MODE', 'legacy-test is forbidden with NODE_ENV=production');
  }
  const strict = mode === 'production';
  const allowHttp = !strict;
  const fallback = (value) => strict ? undefined : value;

  if (env.PORT !== undefined && env.BFF_PORT !== undefined && env.PORT !== env.BFF_PORT) {
    invalid('PORT/BFF_PORT', 'conflicting values');
  }
  const port = integerSetting(env, 'PORT', env.PORT ?? env.BFF_PORT);
  const authorize = parsedUrl(env, 'OAUTH_AUTHORIZE_URL', { allowHttp, noQuery: true });
  const token = parsedUrl(env, 'OAUTH_TOKEN_URL', { allowHttp, noQuery: true });
  const revokeRaw = optionalText(env, 'OAUTH_REVOKE_URL');
  const revoke = revokeRaw
    ? parsedUrl(env, 'OAUTH_REVOKE_URL', { allowHttp, noQuery: true })
    : (strict ? invalid('OAUTH_REVOKE_URL', 'required') : undefined);
  const clientId = credentials.oauthClientId;
  if (clientId.length > 256 || /\s/.test(clientId)) invalid('OAUTH_CLIENT_ID', 'invalid value');
  const clientSecret = secretSetting(credentials.oauthClientSecret, 'OAUTH_CLIENT_SECRET', strict);
  const sessionSecret = secretSetting(credentials.sessionSecret, 'SESSION_SECRET', strict);
  const redirect = parsedUrl(env, 'OAUTH_REDIRECT_URI', {
    fallback: fallback(`https://${env.DOMAIN || 'clankerdev.vpsfree.cz'}/oauth/callback`),
    allowHttp, noQuery: true,
  });
  const publicOrigin = parsedUrl(env, 'PUBLIC_ORIGIN', {
    fallback: fallback(redirect.url.origin), allowHttp, originOnly: true,
  });
  if (redirect.raw !== `${publicOrigin.raw}/oauth/callback`) {
    invalid('OAUTH_REDIRECT_URI', 'must match PUBLIC_ORIGIN callback');
  }
  if (env.DOMAIN !== undefined && env.DOMAIN !== publicOrigin.url.host) {
    invalid('DOMAIN', 'does not match PUBLIC_ORIGIN');
  }
  if (strict && (authorize.url.origin !== token.url.origin ||
      authorize.url.origin !== revoke.url.origin)) {
    invalid('OAUTH_URLS', 'provider origins differ');
  }

  const recoveryRaw = optionalText(env, 'PASSWORD_RECOVERY_URL');
  if (strict && !recoveryRaw) invalid('PASSWORD_RECOVERY_URL', 'required');
  const recovery = parsedUrl({ PASSWORD_RECOVERY_URL: recoveryRaw ??
    new URL('/oauth2/password-reset', authorize.url.origin).toString() }, 'PASSWORD_RECOVERY_URL', { allowHttp });
  if (strict && recovery.url.origin !== authorize.url.origin) {
    invalid('PASSWORD_RECOVERY_URL', 'provider origin differs');
  }
  if (strict && [...recovery.url.searchParams.keys()].some((key) => key !== 'client_id')) {
    invalid('PASSWORD_RECOVERY_URL', 'unsupported query parameter');
  }
  const recoveryClientIds = recovery.url.searchParams.getAll('client_id');
  if (recoveryClientIds.length > 1 ||
      (recoveryClientIds.length === 1 && recoveryClientIds[0] !== clientId)) {
    invalid('PASSWORD_RECOVERY_URL', 'client_id differs from OAUTH_CLIENT_ID');
  }
  if (!recovery.url.searchParams.has('client_id')) recovery.url.searchParams.set('client_id', clientId);

  const api = parsedUrl(env, 'API_URL', {
    fallback: fallback('https://api.vpsfree.cz'), allowHttp, noQuery: true,
  });
  const apiVersion = textSetting(env, 'API_VERSION', fallback('7.0'));
  if (!/^(?:0|[1-9][0-9]*)\.(?:0|[1-9][0-9]*)(?:\.(?:0|[1-9][0-9]*))?$/.test(apiVersion)) {
    invalid('API_VERSION', 'invalid version');
  }
  const authHeader = textSetting(env, 'HAVEAPI_AUTH_HEADER', fallback('X-HaveAPI-OAuth2-Token'));
  if (!/^[!#$%&'*+.^_`|~0-9A-Za-z-]+$/.test(authHeader)) {
    invalid('HAVEAPI_AUTH_HEADER', 'invalid header name');
  }
  const metaNamespace = textSetting(env, 'HAVEAPI_META_NAMESPACE', fallback('_meta'));
  if (!/^_[A-Za-z][A-Za-z0-9_]*$/.test(metaNamespace)) {
    invalid('HAVEAPI_META_NAMESPACE', 'invalid namespace');
  }
  const scope = textSetting(env, 'OAUTH_SCOPE', fallback('all'));
  if (!/^[A-Za-z0-9:_./ -]{1,256}$/.test(scope)) invalid('OAUTH_SCOPE', 'invalid scope');
  const type = textSetting(env, 'OAUTH_TYPE', fallback('web_server'));
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(type)) invalid('OAUTH_TYPE', 'invalid type');
  const cookieName = textSetting(env, 'SESSION_COOKIE_NAME', fallback('webui_next_sess'));
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(cookieName)) invalid('SESSION_COOKIE_NAME', 'invalid cookie name');
  const storePath = textSetting(env, 'SESSION_STORE_PATH', fallback('/var/lib/webui-next-bff/sessions'));

  const durations = {};
  for (const name of Object.keys(NUMBERS).filter((name) => name !== 'PORT')) {
    durations[name] = integerSetting(env, name);
  }
  if (durations.PREAUTH_SESSION_MAX_AGE_MS > durations.SESSION_MAX_AGE_MS ||
      durations.OAUTH_STATE_MAX_AGE_MS > durations.PREAUTH_SESSION_MAX_AGE_MS ||
      durations.REFRESH_SKEW_MS >= durations.SESSION_MAX_AGE_MS) {
    invalid('SESSION_DURATIONS', 'inconsistent bounds');
  }

  const legacyRaw = optionalText(env, 'LEGACY_WEBUI_URL');
  const legacy = legacyRaw ? parsedUrl(env, 'LEGACY_WEBUI_URL', { allowHttp, noQuery: true }) : undefined;
  const publicConfig = {
    schemaVersion: 1,
    api: { url: api.raw, version: apiVersion },
    webuiNext: {
      loginUrl: '/oauth/login',
      logoutUrl: '/oauth/logout',
      passwordRecoveryUrl: recovery.url.toString(),
      passkeyRegistrationUrl: '/oauth/passkey',
      basePath: '',
      haveApi: { authHeader, metaNamespace },
      ...(legacy ? { legacyUrl: legacy.raw } : {}),
    },
  };
  const publicJson = JSON.stringify(publicConfig);
  if (Buffer.byteLength(publicJson, 'utf8') > PUBLIC_CONFIG_MAX_BYTES) {
    invalid('PUBLIC_CONFIG', 'response exceeds 64 KiB');
  }
  assertWritableSessionStore(storePath);
  return {
    mode, port, publicOrigin: publicOrigin.raw, publicConfig, publicJson,
    oauthAuthorizeUrl: authorize.raw, oauthTokenUrl: token.raw,
    oauthRevokeUrl: revoke?.raw ?? '', oauthRedirectUri: redirect.raw,
    oauthClientId: clientId, oauthClientSecret: clientSecret,
    oauthScope: scope, oauthType: type,
    sessionSecret, sessionStorePath: storePath, sessionCookieName: cookieName,
    ...durations,
  };
}

module.exports = { PUBLIC_CONFIG_MAX_BYTES, assertWritableSessionStore, loadBffConfig, renderConfigJs };
