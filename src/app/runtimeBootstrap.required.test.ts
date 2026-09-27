import { afterEach, describe, expect, it, vi } from 'vitest';

import { getRuntimeConfig } from './config';
import { renderBootstrapFailure, safeBootstrapFailureClass } from './bootstrapFailure';
import { resolveRuntimeMode } from './runtimeMode';
import { getBffSessionKey } from '../lib/auth/bffSession';
import {
  BffBootstrapError, loadRequiredBffRuntime, type RuntimeSessionTarget,
} from './runtimeBootstrap';
import {
  IMPERSONATION_STORAGE_KEY, bindBffImpersonationToSession, getValidatedBffSessionKey,
  readImpersonationState, writeImpersonationState,
} from '../lib/auth/impersonation';

const ORIGIN = 'https://ui.example.test';
const KEY_A = 'a'.repeat(64);
const KEY_B = 'b'.repeat(64);
const STORAGE_KEY = 'vpsadmin_ui_next.oauth2';

function publicConfig() {
  return {
    schemaVersion: 1,
    api: { url: 'https://api.example.test', version: '7.0' },
    webuiNext: {
      loginUrl: '/oauth/login', logoutUrl: '/oauth/logout',
      passwordRecoveryUrl: 'https://auth.example.test/reset?client_id=webui',
      passkeyRegistrationUrl: '/oauth/passkey', basePath: '',
      haveApi: { authHeader: 'X-HaveAPI-OAuth2-Token', metaNamespace: '_meta' },
      legacyUrl: 'https://old.example.test',
    },
  };
}

function authenticated(key = KEY_A) {
  return { accessToken: 'bff-access-token', sessionKey: key, sessionExpiresAt: 1_900_000_000_000 };
}

function jsonResponse(value: unknown): Response {
  return new Response(JSON.stringify(value), { headers: { 'content-type': 'application/json; charset=utf-8' } });
}

function responses(config: Response = jsonResponse(publicConfig()), session: Response = jsonResponse(authenticated())) {
  const requests: Array<{ url: string; init: RequestInit | undefined }> = [];
  const fetchImpl = vi.fn(async (url: string, init?: RequestInit) => {
    requests.push({ url, init });
    return url.endsWith('/config.json') ? config : session;
  }) as unknown as typeof fetch;
  return { fetchImpl, requests };
}

function target(): RuntimeSessionTarget {
  return { vpsAdmin: { api: { url: 'https://stale.example.test', version: '1.0' }, accessToken: 'stale-token' } };
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  window.vpsAdmin = undefined;
  sessionStorage.clear();
  localStorage.clear();
  bindBffImpersonationToSession(null);
  document.body.innerHTML = '';
});

describe('required BFF bootstrap', () => {
  it('selects BFF and legacy explicitly, with only dev preserving the old default', () => {
    expect(resolveRuntimeMode('bff', false)).toBe('bff');
    expect(resolveRuntimeMode('legacy', false)).toBe('legacy');
    expect(resolveRuntimeMode(undefined, true)).toBe('legacy');
    expect(() => resolveRuntimeMode(undefined, false)).toThrow('runtime_mode');
    expect(() => resolveRuntimeMode('unknown', true)).toThrow('runtime_mode');
  });

  it('loads exact same-origin JSON routes in order and installs only a validated snapshot', async () => {
    const fixture = responses();
    const runtime = target();
    await loadRequiredBffRuntime({ origin: ORIGIN, target: runtime, fetchImpl: fixture.fetchImpl });
    expect(fixture.requests.map((request) => request.url)).toEqual([
      `${ORIGIN}/config.json`, `${ORIGIN}/session.json`,
    ]);
    for (const { init } of fixture.requests) {
      expect(init).toMatchObject({ method: 'GET', mode: 'same-origin', credentials: 'same-origin',
        cache: 'no-store', redirect: 'error' });
      expect(init?.signal).toBeInstanceOf(AbortSignal);
    }
    expect(runtime.vpsAdmin).toEqual({
      api: publicConfig().api,
      webuiNext: { ...publicConfig().webuiNext, sessionExpiresAt: authenticated().sessionExpiresAt },
      accessToken: authenticated().accessToken,
    });
    expect(runtime.vpsAdmin?.sessionToken).toBeUndefined();
  });

  it.each([
    ['missing', new Response('', { status: 404, headers: { 'content-type': 'text/html' } }), 'config_http'],
    ['wrong MIME', new Response('<html>private</html>', { headers: { 'content-type': 'text/html' } }), 'config_mime'],
    ['malformed JSON', new Response('{private', { headers: { 'content-type': 'application/json' } }), 'config_json'],
    ['oversized body', new Response('x'.repeat(64 * 1024 + 1), { headers: { 'content-type': 'application/json' } }), 'config_size'],
    ['oversized length', new Response('{}', { headers: { 'content-type': 'application/json', 'content-length': '65537' } }), 'config_size'],
  ])('rejects %s config without touching prior runtime', async (_name, config, code) => {
    const runtime = target();
    const before = structuredClone(runtime.vpsAdmin);
    await expect(loadRequiredBffRuntime({ origin: ORIGIN, target: runtime,
      fetchImpl: responses(config).fetchImpl })).rejects.toMatchObject({ code });
    expect(runtime.vpsAdmin).toEqual(before);
  });

  it('rejects redirects even if a fetch mock returns an HTTP 200 JSON body', async () => {
    const config = jsonResponse(publicConfig());
    Object.defineProperty(config, 'redirected', { value: true });
    await expect(loadRequiredBffRuntime({ origin: ORIGIN, target: target(),
      fetchImpl: responses(config).fetchImpl })).rejects.toMatchObject({ code: 'config_redirect' });
    const wrongUrl = jsonResponse(publicConfig());
    Object.defineProperty(wrongUrl, 'url', { value: 'https://other.example.test/config.json' });
    await expect(loadRequiredBffRuntime({ origin: ORIGIN, target: target(),
      fetchImpl: responses(wrongUrl).fetchImpl })).rejects.toMatchObject({ code: 'config_redirect' });
  });

  it.each([
    ['schema', { ...publicConfig(), schemaVersion: 2 }],
    ['API credentials', { ...publicConfig(), api: { url: 'https://user:secret@api.example.test', version: '7.0' } }],
    ['HTTP API', { ...publicConfig(), api: { url: 'http://api.example.test', version: '7.0' } }],
    ['bad version', { ...publicConfig(), api: { url: 'https://api.example.test', version: 'v7.0' } }],
    ['foreign login', { ...publicConfig(), webuiNext: { ...publicConfig().webuiNext, loginUrl: 'https://evil.test/login' } }],
    ['bad header', { ...publicConfig(), webuiNext: { ...publicConfig().webuiNext,
      haveApi: { authHeader: 'Bad Header', metaNamespace: '_meta' } } }],
    ['extra token', { ...publicConfig(), webuiNext: { ...publicConfig().webuiNext, accessToken: 'private' } }],
  ])('rejects %s public config shape', async (_name, config) => {
    await expect(loadRequiredBffRuntime({ origin: ORIGIN, target: target(),
      fetchImpl: responses(jsonResponse(config)).fetchImpl })).rejects.toMatchObject({ code: 'config_shape' });
  });

  it.each([
    ['wrong MIME', new Response('<html>private</html>', { headers: { 'content-type': 'text/html' } }), 'session_mime'],
    ['missing key', jsonResponse({ accessToken: 'token', sessionExpiresAt: 123 }), 'session_shape'],
    ['mixed anonymous', jsonResponse({ accessToken: null, sessionKey: KEY_A, sessionExpiresAt: null }), 'session_shape'],
    ['bad key', jsonResponse({ accessToken: 'token', sessionKey: 'short', sessionExpiresAt: 123 }), 'session_shape'],
  ])('rejects %s session without partial config or credential installation', async (_name, session, code) => {
    const runtime = target();
    const before = structuredClone(runtime.vpsAdmin);
    await expect(loadRequiredBffRuntime({ origin: ORIGIN, target: runtime,
      fetchImpl: responses(undefined, session).fetchImpl })).rejects.toMatchObject({ code });
    expect(runtime.vpsAdmin).toEqual(before);
  });

  it('bounds a stalled config body within one deadline and ignores its late result', async () => {
    let release!: () => void;
    const held = new Promise<void>((resolve) => { release = resolve; });
    const stream = new ReadableStream<Uint8Array>({
      async pull(controller) { await held; controller.enqueue(new TextEncoder().encode(JSON.stringify(publicConfig()))); controller.close(); },
    });
    const runtime = target();
    await expect(loadRequiredBffRuntime({ origin: ORIGIN, target: runtime, timeoutMs: 20,
      fetchImpl: responses(new Response(stream, { headers: { 'content-type': 'application/json' } })).fetchImpl,
    })).rejects.toMatchObject({ code: 'bootstrap_timeout' });
    release();
    await Promise.resolve();
    expect(runtime.vpsAdmin?.accessToken).toBe('stale-token');
  });

  it('cancellation and retry prevent an older late response from restoring credentials', async () => {
    let release!: (response: Response) => void;
    const oldConfig = new Promise<Response>((resolve) => { release = resolve; });
    const oldFetch = vi.fn(async () => oldConfig) as unknown as typeof fetch;
    const runtime = target();
    const controller = new AbortController();
    const oldAttempt = loadRequiredBffRuntime({ origin: ORIGIN, target: runtime,
      fetchImpl: oldFetch, signal: controller.signal });
    controller.abort();
    await expect(oldAttempt).rejects.toMatchObject({ code: 'bootstrap_cancelled' });
    await loadRequiredBffRuntime({ origin: ORIGIN, target: runtime,
      fetchImpl: responses(jsonResponse(publicConfig()), jsonResponse(authenticated(KEY_B))).fetchImpl });
    release(jsonResponse(publicConfig()));
    await Promise.resolve();
    expect(runtime.vpsAdmin?.accessToken).toBe('bff-access-token');
    expect(runtime.vpsAdmin?.webuiNext?.sessionExpiresAt).toBe(authenticated(KEY_B).sessionExpiresAt);
  });

  it('valid anonymous BFF result clears stale OAuth and impersonation state after logout', async () => {
    vi.stubEnv('VITE_RUNTIME_MODE', 'bff');
    window.vpsAdmin = { api: { url: 'https://old.example.test', version: '1.0' },
      sessionToken: 'old-window-session' };
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ accessToken: 'old-session-token' }));
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ accessToken: 'old-local-token' }));
    sessionStorage.setItem(IMPERSONATION_STORAGE_KEY, JSON.stringify({
      kind: 'impersonation', sessionId: 3, sessionToken: 'impersonation-token',
      targetUserId: 7, startedAt: Date.now(), bffSessionKey: KEY_A,
    }));
    await loadRequiredBffRuntime({ origin: window.location.origin, allowHttp: true,
      fetchImpl: responses(jsonResponse(publicConfig()),
        jsonResponse({ accessToken: null, sessionKey: null, sessionExpiresAt: null })).fetchImpl });
    expect(window.vpsAdmin?.accessToken).toBeUndefined();
    expect(window.vpsAdmin?.sessionToken).toBeUndefined();
    expect(window.vpsAdmin?.webuiNext?.sessionExpiresAt).toBeNull();
    expect(getRuntimeConfig().auth).toEqual({ kind: 'none' });
    expect(sessionStorage.getItem(STORAGE_KEY)).toBeNull();
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    expect(sessionStorage.getItem(IMPERSONATION_STORAGE_KEY)).toBeNull();
    expect(getValidatedBffSessionKey()).toBeNull();
  });

  it('keeps bound impersonation on same-session reload and clears it on a fresh login', async () => {
    vi.stubEnv('VITE_RUNTIME_MODE', 'bff');
    const fetchImpl = responses().fetchImpl;
    await loadRequiredBffRuntime({ origin: window.location.origin, allowHttp: true, fetchImpl });
    writeImpersonationState({ kind: 'impersonation', sessionId: 3,
      sessionToken: 'impersonation-token', targetUserId: 7,
      startedAt: Date.now(), bffSessionKey: KEY_A }, sessionStorage);
    expect(getRuntimeConfig().auth).toEqual({ kind: 'oauth2', accessToken: 'bff-access-token' });

    // A page reload creates a new module instance but the BFF fingerprint is stable.
    bindBffImpersonationToSession(null);
    await loadRequiredBffRuntime({ origin: window.location.origin, allowHttp: true,
      fetchImpl: responses(jsonResponse(publicConfig()), jsonResponse({
        ...authenticated(), accessToken: 'rotated-oauth-token',
      })).fetchImpl });
    expect(readImpersonationState(sessionStorage)?.bffSessionKey).toBe(KEY_A);
    expect(getRuntimeConfig().auth).toEqual({ kind: 'token', sessionToken: 'impersonation-token' });
    expect(getBffSessionKey()).toBe(KEY_A);

    await loadRequiredBffRuntime({ origin: window.location.origin, allowHttp: true,
      fetchImpl: responses(jsonResponse(publicConfig()), jsonResponse(authenticated(KEY_B))).fetchImpl });
    expect(sessionStorage.getItem(IMPERSONATION_STORAGE_KEY)).toBeNull();
    expect(getRuntimeConfig().auth).toEqual({ kind: 'oauth2', accessToken: 'bff-access-token' });
  });

  it('rejects old unbound impersonation in BFF mode but leaves standalone behavior intact', async () => {
    const state = { kind: 'impersonation' as const, sessionId: 3,
      sessionToken: 'impersonation-token', targetUserId: 7, startedAt: Date.now() };
    vi.stubEnv('VITE_RUNTIME_MODE', 'legacy');
    writeImpersonationState(state, sessionStorage);
    expect(readImpersonationState(sessionStorage)).toEqual(state);
    expect(getRuntimeConfig().auth).toEqual({ kind: 'token', sessionToken: 'impersonation-token' });

    vi.stubEnv('VITE_RUNTIME_MODE', 'bff');
    await loadRequiredBffRuntime({ origin: window.location.origin, allowHttp: true,
      fetchImpl: responses().fetchImpl });
    expect(sessionStorage.getItem(IMPERSONATION_STORAGE_KEY)).toBeNull();
    expect(getRuntimeConfig().auth).toEqual({ kind: 'oauth2', accessToken: 'bff-access-token' });
  });

  it('clears malformed stored impersonation without logging its raw contents', async () => {
    vi.stubEnv('VITE_RUNTIME_MODE', 'bff');
    sessionStorage.setItem(IMPERSONATION_STORAGE_KEY, '{private-malformed-record');
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    await loadRequiredBffRuntime({ origin: window.location.origin, allowHttp: true,
      fetchImpl: responses().fetchImpl });
    expect(sessionStorage.getItem(IMPERSONATION_STORAGE_KEY)).toBeNull();
    expect(readImpersonationState(sessionStorage)).toBeNull();
    expect(log).not.toHaveBeenCalled();
  });

  it('does not accept a stored token when storage removal fails', () => {
    vi.stubEnv('VITE_RUNTIME_MODE', 'bff');
    const raw = JSON.stringify({ kind: 'impersonation', sessionId: 9,
      sessionToken: 'stale-impersonation-token', targetUserId: 17,
      startedAt: Date.now(), bffSessionKey: KEY_B });
    const unavailable = {
      getItem: () => raw, removeItem: () => { throw new Error('storage blocked'); },
    } as unknown as Storage;
    expect(() => bindBffImpersonationToSession(KEY_A, unavailable)).not.toThrow();
    expect(readImpersonationState(unavailable)).toBeNull();
  });

  it('treats a throwing sessionStorage getter as no impersonation', async () => {
    vi.stubEnv('VITE_RUNTIME_MODE', 'bff');
    await loadRequiredBffRuntime({ origin: window.location.origin, allowHttp: true,
      fetchImpl: responses().fetchImpl });
    vi.spyOn(window, 'sessionStorage', 'get').mockImplementation(() => {
      throw new Error('private storage is unavailable');
    });
    expect(() => getRuntimeConfig()).not.toThrow();
    expect(getRuntimeConfig().auth).toEqual({ kind: 'oauth2', accessToken: 'bff-access-token' });
  });
});

describe('early bilingual failure UI', () => {
  it.each([
    ['en', 'Retry', 'An error occurred while loading the interface.'],
    ['cs', 'Zkusit znovu', 'Při načítání rozhraní došlo k chybě.'],
  ])('offers a safe %s retry', (lang, label, body) => {
    document.documentElement.lang = lang;
    document.body.innerHTML = '<div id="root"></div>';
    const retry = vi.fn();
    renderBootstrapFailure(new BffBootstrapError('config_mime'), document, retry);
    const button = document.querySelector('button');
    expect(button?.textContent).toBe(label);
    expect(document.querySelector('p')?.textContent).toBe(body);
    button?.click();
    expect(retry).toHaveBeenCalledOnce();
    expect(button?.disabled).toBe(true);
    expect(document.querySelector('pre')?.textContent).toBe('config_mime');
  });

  it('never renders raw thrown credential or provider text in technical details', () => {
    document.body.innerHTML = '<div id="root"></div>';
    const error = new Error('https://user:private-secret@example.test: provider-body');
    renderBootstrapFailure(error);
    expect(safeBootstrapFailureClass(error)).toBe('app_start_failed');
    expect(document.getElementById('root')?.textContent).not.toContain('private-secret');
    expect(document.getElementById('root')?.textContent).not.toContain('provider-body');
  });
});
