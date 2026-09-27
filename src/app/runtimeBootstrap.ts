import { rememberBffSession } from '../lib/auth/bffSession';
import { bindBffImpersonationToSession } from '../lib/auth/impersonation';
import { clearStoredOAuthToken } from '../lib/auth/tokenStore';

export type OptionalRuntimeScriptName = 'config.js' | 'config.local.js';
export type RuntimeScriptLoader = (src: string) => Promise<void>;

export interface RuntimeSessionTarget {
  vpsAdmin?: Window['vpsAdmin'];
}

export interface LoadBffRuntimeSessionOptions {
  baseUrl?: string;
  origin?: string;
  fetchImpl?: typeof fetch;
  target?: RuntimeSessionTarget;
}

export class BffBootstrapError extends Error {
  constructor(readonly code: string) {
    super(code);
    this.name = 'BffBootstrapError';
  }
}

interface RequiredBffConfig {
  api: { url: string; version: string };
  webuiNext: NonNullable<Window['vpsAdmin']>['webuiNext'];
}

interface RequiredBffSession {
  accessToken: string | null;
  sessionKey: string | null;
  sessionExpiresAt: number | null;
}

export interface LoadRequiredBffRuntimeOptions {
  origin?: string;
  fetchImpl?: typeof fetch;
  target?: RuntimeSessionTarget;
  signal?: AbortSignal;
  /** For isolated HTTP fixtures only; production bootstrap leaves this false. */
  allowHttp?: boolean;
  /** A test may shorten the 15-second overall deadline. */
  timeoutMs?: number;
}

const MAX_BFF_JSON_BYTES = 64 * 1024;
const BFF_BOOTSTRAP_TIMEOUT_MS = 15_000;

function plainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function exactKeys(value: Record<string, unknown>, required: string[], optional: string[] = []): boolean {
  return required.every((key) => Object.hasOwn(value, key)) &&
    Object.keys(value).every((key) => required.includes(key) || optional.includes(key));
}

function validPublicUrl(value: unknown, allowHttp: boolean, allowClientId = false): value is string {
  if (typeof value !== 'string' || !value || value.length > 4096 ||
      /[\\\s\x00-\x1f\x7f]/.test(value)) return false;
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' && !(allowHttp && url.protocol === 'http:')) return false;
    if (!url.hostname || url.username || url.password || url.hash) return false;
    if (!allowClientId && url.search) return false;
    if (allowClientId && ([...url.searchParams.keys()].some((key) => key !== 'client_id') ||
      url.searchParams.getAll('client_id').length !== 1 || !url.searchParams.get('client_id'))) return false;
    return true;
  } catch {
    return false;
  }
}

function parseRequiredBffConfig(value: unknown, allowHttp: boolean): RequiredBffConfig {
  if (!plainObject(value) || !exactKeys(value, ['schemaVersion', 'api', 'webuiNext']) ||
      value['schemaVersion'] !== 1 || !plainObject(value['api']) ||
      !exactKeys(value['api'], ['url', 'version']) || !plainObject(value['webuiNext'])) {
    throw new BffBootstrapError('config_shape');
  }
  const api = value['api'];
  const webuiNext = value['webuiNext'];
  if (!validPublicUrl(api['url'], allowHttp) ||
      typeof api['version'] !== 'string' ||
      !/^(?:0|[1-9][0-9]*)\.(?:0|[1-9][0-9]*)(?:\.(?:0|[1-9][0-9]*))?$/.test(api['version']) ||
      !exactKeys(webuiNext, [
        'loginUrl', 'logoutUrl', 'passwordRecoveryUrl', 'passkeyRegistrationUrl',
        'basePath', 'haveApi',
      ], ['legacyUrl']) ||
      webuiNext['loginUrl'] !== '/oauth/login' || webuiNext['logoutUrl'] !== '/oauth/logout' ||
      webuiNext['passkeyRegistrationUrl'] !== '/oauth/passkey' || webuiNext['basePath'] !== '' ||
      !validPublicUrl(webuiNext['passwordRecoveryUrl'], allowHttp, true) ||
      (webuiNext['legacyUrl'] !== undefined && !validPublicUrl(webuiNext['legacyUrl'], allowHttp)) ||
      !plainObject(webuiNext['haveApi']) ||
      !exactKeys(webuiNext['haveApi'], ['authHeader', 'metaNamespace']) ||
      typeof webuiNext['haveApi']['authHeader'] !== 'string' ||
      !/^[!#$%&'*+.^_`|~0-9A-Za-z-]+$/.test(webuiNext['haveApi']['authHeader']) ||
      typeof webuiNext['haveApi']['metaNamespace'] !== 'string' ||
      !/^_[A-Za-z][A-Za-z0-9_]*$/.test(webuiNext['haveApi']['metaNamespace'])) {
    throw new BffBootstrapError('config_shape');
  }
  return {
    api: { url: api['url'], version: api['version'] },
    webuiNext: {
      loginUrl: webuiNext['loginUrl'],
      logoutUrl: webuiNext['logoutUrl'],
      passwordRecoveryUrl: webuiNext['passwordRecoveryUrl'],
      passkeyRegistrationUrl: webuiNext['passkeyRegistrationUrl'],
      basePath: '',
      haveApi: {
        authHeader: webuiNext['haveApi']['authHeader'],
        metaNamespace: webuiNext['haveApi']['metaNamespace'],
      },
      ...(webuiNext['legacyUrl'] === undefined ? {} : { legacyUrl: webuiNext['legacyUrl'] }),
    },
  };
}

function parseRequiredBffSession(value: unknown): RequiredBffSession {
  if (!plainObject(value) || !exactKeys(value, ['accessToken', 'sessionKey', 'sessionExpiresAt'])) {
    throw new BffBootstrapError('session_shape');
  }
  const accessToken = value['accessToken'];
  const sessionKey = value['sessionKey'];
  const sessionExpiresAt = value['sessionExpiresAt'];
  if (accessToken === null && sessionKey === null && sessionExpiresAt === null) {
    return { accessToken, sessionKey, sessionExpiresAt };
  }
  if (typeof accessToken !== 'string' || !accessToken.trim() || accessToken.trim() !== accessToken ||
      typeof sessionKey !== 'string' || !/^[a-f0-9]{64}$/.test(sessionKey) ||
      typeof sessionExpiresAt !== 'number' || !Number.isFinite(sessionExpiresAt) || sessionExpiresAt <= 0) {
    throw new BffBootstrapError('session_shape');
  }
  return { accessToken, sessionKey, sessionExpiresAt };
}

function assertActive(signal: AbortSignal): void {
  if (signal.aborted) {
    throw new BffBootstrapError(signal.reason === 'timeout' ? 'bootstrap_timeout' : 'bootstrap_cancelled');
  }
}

async function readBoundedJson(response: Response, stage: 'config' | 'session', signal: AbortSignal): Promise<unknown> {
  const contentType = response.headers.get('content-type')?.toLowerCase() ?? '';
  if (!/^application\/json(?:\s*;|$)/.test(contentType)) throw new BffBootstrapError(`${stage}_mime`);
  const length = response.headers.get('content-length');
  if (length !== null && (!/^(?:0|[1-9][0-9]*)$/.test(length) || Number(length) > MAX_BFF_JSON_BYTES)) {
    throw new BffBootstrapError(`${stage}_size`);
  }
  if (!response.body) throw new BffBootstrapError(`${stage}_body`);

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  let completed = false;
  try {
    while (true) {
      const { done, value } = await reader.read();
      assertActive(signal);
      if (done) { completed = true; break; }
      size += value.byteLength;
      if (size > MAX_BFF_JSON_BYTES) throw new BffBootstrapError(`${stage}_size`);
      chunks.push(value);
    }
  } finally {
    if (!completed) void reader.cancel().catch(() => undefined);
    reader.releaseLock();
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  try {
    return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)) as unknown;
  } catch {
    throw new BffBootstrapError(`${stage}_json`);
  }
}

async function fetchRequiredJson(
  fetchImpl: typeof fetch, url: string, stage: 'config' | 'session', signal: AbortSignal,
): Promise<unknown> {
  assertActive(signal);
  try {
    const response = await fetchImpl(url, {
      method: 'GET', credentials: 'same-origin', mode: 'same-origin', cache: 'no-store',
      redirect: 'error', headers: { Accept: 'application/json' }, signal,
    });
    assertActive(signal);
    if (response.redirected || (response.url && response.url !== url)) {
      throw new BffBootstrapError(`${stage}_redirect`);
    }
    if (!response.ok) throw new BffBootstrapError(`${stage}_http`);
    return await readBoundedJson(response, stage, signal);
  } catch (error) {
    assertActive(signal);
    if (error instanceof BffBootstrapError) throw error;
    throw new BffBootstrapError(`${stage}_network`);
  }
}

/** Required BFF bootstrap installs neither config nor credentials until both responses pass. */
export async function loadRequiredBffRuntime(options: LoadRequiredBffRuntimeOptions = {}): Promise<void> {
  const target = options.target ?? (typeof window !== 'undefined' ? window : undefined);
  const fetchImpl = options.fetchImpl ?? (typeof fetch !== 'undefined' ? fetch : undefined);
  if (!target || !fetchImpl) throw new BffBootstrapError('bootstrap_unavailable');
  const origin = options.origin ?? currentWindowOrigin();
  if (!validPublicUrl(origin, options.allowHttp === true) || new URL(origin).origin !== origin) {
    throw new BffBootstrapError('public_origin');
  }
  const timeoutMs = options.timeoutMs ?? BFF_BOOTSTRAP_TIMEOUT_MS;
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0 || timeoutMs > BFF_BOOTSTRAP_TIMEOUT_MS) {
    throw new BffBootstrapError('bootstrap_timeout_setting');
  }

  const controller = new AbortController();
  let timeout: ReturnType<typeof setTimeout>;
  const cancelled = new Promise<never>((_resolve, reject) => {
    controller.signal.addEventListener('abort', () => {
      reject(new BffBootstrapError(controller.signal.reason === 'timeout'
        ? 'bootstrap_timeout' : 'bootstrap_cancelled'));
    }, { once: true });
  });
  const abortFromCaller = () => controller.abort('cancelled');
  options.signal?.addEventListener('abort', abortFromCaller, { once: true });
  if (options.signal?.aborted) abortFromCaller();
  timeout = setTimeout(() => controller.abort('timeout'), timeoutMs);
  try {
    const operation = (async () => {
      const config = parseRequiredBffConfig(
        await fetchRequiredJson(fetchImpl, `${origin}/config.json`, 'config', controller.signal),
        options.allowHttp === true,
      );
      const session = parseRequiredBffSession(
        await fetchRequiredJson(fetchImpl, `${origin}/session.json`, 'session', controller.signal),
      );
      assertActive(controller.signal);
      // Install as one snapshot so a failed or cancelled attempt cannot leave
      // partial config or revive credentials from an earlier standalone build.
      clearStoredOAuthToken('session');
      clearStoredOAuthToken('local');
      target.vpsAdmin = {
        api: config.api,
        webuiNext: { ...config.webuiNext, sessionExpiresAt: session.sessionExpiresAt },
        accessToken: session.accessToken ?? undefined,
      };
      if (typeof window !== 'undefined' && target === window) {
        let storage: Storage | undefined;
        try { storage = window.sessionStorage; } catch { /* Private storage can be unavailable. */ }
        bindBffImpersonationToSession(session.sessionKey, storage);
        rememberBffSession(`${origin}/session.json`, session.sessionKey, session.accessToken ?? undefined);
      }
    })();
    await Promise.race([operation, cancelled]);
  } finally {
    clearTimeout(timeout);
    options.signal?.removeEventListener('abort', abortFromCaller);
  }
}

function currentWindowOrigin(): string {
  if (typeof window === 'undefined') return 'http://localhost';
  return window.location.origin;
}

function currentWindowHostname(): string {
  if (typeof window === 'undefined') return '';
  return window.location.hostname;
}

export function normalizeBaseUrl(baseUrl: string | undefined): string {
  if (!baseUrl) return '/';

  let normalized = baseUrl.trim();
  if (!normalized) return '/';
  if (!normalized.startsWith('/')) normalized = `/${normalized}`;
  if (!normalized.endsWith('/')) normalized = `${normalized}/`;
  return normalized;
}

export function shouldTryLocalRuntimeConfig(isDev: boolean, hostname: string): boolean {
  if (isDev) return true;

  const normalized = hostname.trim().toLowerCase();
  return (
    normalized === 'localhost' ||
    normalized === '127.0.0.1' ||
    normalized === '::1' ||
    normalized === '[::1]'
  );
}

export function buildRuntimeScriptCandidates(
  scriptName: OptionalRuntimeScriptName,
  baseUrl: string | undefined,
  origin: string = currentWindowOrigin()
): string[] {
  const normalizedBaseUrl = normalizeBaseUrl(baseUrl);
  const candidates = [new URL(scriptName, `${origin}${normalizedBaseUrl}`).toString()];

  if (normalizedBaseUrl !== '/') {
    candidates.push(new URL(`/${scriptName}`, origin).toString());
  }

  return Array.from(new Set(candidates));
}

export function loadClassicRuntimeScript(src: string, doc: Document = document): Promise<void> {
  return new Promise((resolve, reject) => {
    const parent = doc.head ?? doc.body ?? doc.documentElement;
    if (!parent) {
      reject(new Error('runtimeBootstrap: no document parent available for script injection'));
      return;
    }

    const script = doc.createElement('script');
    script.src = src;
    script.async = false;
    script.defer = false;

    script.onload = () => {
      resolve();
    };

    script.onerror = () => {
      script.remove();
      reject(new Error(`runtimeBootstrap: failed to load ${src}`));
    };

    parent.appendChild(script);
  });
}

export interface LoadOptionalRuntimeScriptsOptions {
  baseUrl?: string;
  origin?: string;
  hostname?: string;
  isDev?: boolean;
  loadScript?: RuntimeScriptLoader;
  scriptNames?: OptionalRuntimeScriptName[];
}

export async function loadOptionalRuntimeScripts(
  options: LoadOptionalRuntimeScriptsOptions = {}
): Promise<string[]> {
  const origin = options.origin ?? currentWindowOrigin();
  const hostname = options.hostname ?? currentWindowHostname();
  const isDev = options.isDev ?? Boolean(import.meta.env.DEV);
  const loadScript = options.loadScript ?? ((src: string) => loadClassicRuntimeScript(src));

  const scriptNames: OptionalRuntimeScriptName[] = options.scriptNames
    ? [...options.scriptNames]
    : shouldTryLocalRuntimeConfig(isDev, hostname)
      ? ['config.js', 'config.local.js']
      : ['config.js'];

  const loadedScripts: string[] = [];

  for (const scriptName of scriptNames) {
    const candidates = buildRuntimeScriptCandidates(
      scriptName,
      options.baseUrl ?? import.meta.env.BASE_URL,
      origin
    );

    for (const src of candidates) {
      try {
        await loadScript(src);
        loadedScripts.push(src);
        break;
      } catch {
        // Optional runtime script. Try the next candidate or continue without it.
      }
    }
  }

  return loadedScripts;
}

export async function loadBffRuntimeSession(
  options: LoadBffRuntimeSessionOptions = {},
): Promise<string | null> {
  const origin = options.origin ?? currentWindowOrigin();
  const target = options.target ?? (typeof window !== 'undefined' ? window : undefined);
  if (typeof target?.vpsAdmin?.sessionToken === 'string' && target.vpsAdmin.sessionToken.trim()) {
    return null;
  }

  const fetchImpl = options.fetchImpl ?? (typeof fetch !== 'undefined' ? fetch : undefined);
  if (!target?.vpsAdmin || !fetchImpl) return null;

  const normalizedBaseUrl = normalizeBaseUrl(options.baseUrl ?? import.meta.env.BASE_URL);
  const candidates = [new URL('session.json', `${origin}${normalizedBaseUrl}`).toString()];
  if (normalizedBaseUrl !== '/') candidates.push(new URL('/session.json', origin).toString());

  for (const url of Array.from(new Set(candidates))) {
    try {
      const response = await fetchImpl(url, {
        method: 'GET',
        credentials: 'same-origin',
        cache: 'no-store',
        headers: { Accept: 'application/json' },
      });
      if (!response.ok) continue;
      if (!response.headers.get('content-type')?.toLowerCase().includes('application/json')) continue;

      const payload: unknown = await response.json();
      if (!payload || typeof payload !== 'object' || Array.isArray(payload)) continue;

      // A valid same-origin BFF session response is authoritative. Clear tokens
      // left by an earlier standalone OAuth deployment so a logged-out/expired
      // BFF session cannot silently fall back to stale browser credentials.
      clearStoredOAuthToken('session');
      clearStoredOAuthToken('local');

      const values = payload as Record<string, unknown>;
      const accessToken = typeof values['accessToken'] === 'string' && values['accessToken'].trim()
        ? values['accessToken'].trim()
        : undefined;
      const rawExpiresAt = values['sessionExpiresAt'];
      const sessionExpiresAt = typeof rawExpiresAt === 'number' && Number.isFinite(rawExpiresAt) && rawExpiresAt > 0
        ? rawExpiresAt
        : null;

      target.vpsAdmin.accessToken = accessToken;
      target.vpsAdmin.webuiNext = {
        ...target.vpsAdmin.webuiNext,
        sessionExpiresAt,
      };
      if (typeof window !== 'undefined' && target === window) {
        rememberBffSession(url, values['sessionKey'], accessToken);
      }
      return url;
    } catch {
      // Optional BFF session bootstrap. Static/legacy deployments do not expose it.
    }
  }

  return null;
}
