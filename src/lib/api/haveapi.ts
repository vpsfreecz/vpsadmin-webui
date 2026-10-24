import { detectStaticUiLanguage, staticTForDocument } from '../staticI18n';
import { recoverBffSession } from '../auth/bffSession';
import { getRuntimeConfig } from '../../app/config';
import {
  MALFORMED_HAVEAPI_ENVELOPE_ERROR_CODE, requestHaveApi,
  type HaveApiReply, type RequestSpec,
} from './haveapiRequestClient';

export { MALFORMED_HAVEAPI_ENVELOPE_ERROR_CODE } from './haveapiRequestClient';
export type JsonValue =
  | null
  | boolean
  | number
  | string
  | JsonValue[]
  | { [k: string]: JsonValue };
export interface HaveApiEnvelope {
  status: boolean;
  message?: string | null;
  errors?: unknown;
  response?: unknown;
}
export interface HaveApiRequestInfo {
  method: string;
  /** HaveAPI path (relative to apiBaseUrl), e.g. "/vpses" */
  path: string;
  /** Full URL used for the request (best-effort, may be omitted) */
  url?: string;
}

export const SESSION_EXPIRED_EVENT = 'webui-next:session-expired';

export class HaveApiError extends Error {
  public readonly envelope: HaveApiEnvelope;
  /**
   * HTTP status code (when the transport returned non-2xx).
   *
   * Note: HaveAPI may also return `status: false` with HTTP 200; in that case
   * `httpStatus` is undefined.
   */
  public readonly httpStatus?: number;

  /** Best-effort request metadata for debugging/support. */
  public request?: HaveApiRequestInfo;

  constructor(envelope: HaveApiEnvelope, fallbackMessage = 'Request failed', httpStatus?: number, request?: HaveApiRequestInfo, cause?: unknown) {
    super(envelope.message || fallbackMessage, cause === undefined ? undefined : { cause });
    this.name = 'HaveApiError';
    this.envelope = envelope;
    this.httpStatus = httpStatus;
    this.request = request;
  }
}

function messageLooksLikeExpiredSession(message: unknown): boolean {
  if (typeof message !== 'string') return false;
  const normalized = message.trim().toLowerCase();
  if (!normalized) return false;

  return (
    normalized.includes('unauthorized') ||
    normalized.includes('not authenticated') ||
    normalized.includes('authentication required') ||
    normalized.includes('authentication failed') ||
    normalized.includes('invalid token') ||
    normalized.includes('token expired') ||
    normalized.includes('session expired') ||
    normalized.includes('invalid session') ||
    normalized.includes('session not found') ||
    normalized.includes('unknown session')
  );
}

export function isExpiredSessionError(error: unknown): boolean {
  if (!(error instanceof HaveApiError)) return false;
  if (error.httpStatus === 401) return true;
  return messageLooksLikeExpiredSession(error.envelope?.message);
}

function notifySessionExpired(error: unknown): void {
  if (!isExpiredSessionError(error)) return;
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(SESSION_EXPIRED_EVENT, { detail: { error } }));
}

export interface CallOpts {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'OPTIONS';
  path: string;
  // Input params are sent namespaced as query parameters for GET/OPTIONS and namespaced JSON for others.
  namespace?: string;
  params?: Record<string, unknown>;
  // Meta params are sent under the meta namespace.
  meta?: Record<string, unknown>;

  /**
   * Optional abort signal.
   *
   * Used by UI surfaces like the command palette to cancel in-flight requests
   * when the query changes.
   */
  signal?: AbortSignal;
}

function getHaveApiDescriptionFromWindow(): any | undefined {
  // Legacy vpsAdmin webui exposes the API description on window.vpsAdmin.description.
  // This is very useful for reading dynamic bits like authentication header name
  // and meta namespace.
  if (typeof window === 'undefined') return undefined;
  return (window as any).vpsAdmin?.description;
}

const descriptions = new Map<string, Promise<any | undefined>>();

async function getHaveApiDescription(): Promise<any | undefined> {
  const supplied = getHaveApiDescriptionFromWindow();
  if (supplied) return supplied;
  const cfg = getRuntimeConfig();
  if (cfg.haveApi?.authHeader && cfg.haveApi?.metaNamespace) return undefined;
  let pending = descriptions.get(cfg.apiBaseUrl);
  if (!pending) {
    // OPTIONS uses the already versioned base, not AsyncClient.setup's version
    // discovery. A public client cannot inherit runtime authentication.
    pending = requestHaveApi(cfg.apiBaseUrl, 'public', { method: 'OPTIONS', path: '/' })
      .then(reply => reply.failure ? undefined : reply.data)
      .catch(() => undefined);
    descriptions.set(cfg.apiBaseUrl, pending);
  }
  return pending;
}

function getMetaNamespace(desc: any): string {
  return (desc && desc.meta && typeof desc.meta.namespace === 'string' && desc.meta.namespace) || '_meta';
}

export function unwrapSingleResponse<T>(
  envelope: HaveApiEnvelope,
  metaNamespace: string = '_meta'
): { data: T; meta?: Record<string, unknown> } {
  if (!envelope.status) {
    throw new HaveApiError(envelope);
  }

  const resp: any = envelope.response;
  if (!resp) {
    // Some actions return no response body beyond status.
    return { data: null as unknown as T };
  }

  if (Array.isArray(resp)) {
    return { data: resp as unknown as T };
  }

  // HaveAPI uses a configurable meta namespace (usually "_meta"). When the SPA runs
  // without the legacy vpsAdmin bootstrap, we may not know it. Be tolerant and
  // treat both "_meta" and "meta" as meta keys.
  const metaCandidates = new Set<string>([
    metaNamespace,
    metaNamespace === '_meta' ? 'meta' : '_meta',
  ]);

  const metaValue = resp[metaNamespace] ?? resp['_meta'] ?? resp['meta'];
  const meta = metaValue && typeof metaValue === 'object' && !Array.isArray(metaValue) ? (metaValue as Record<string, unknown>) : undefined;
  const keys = Object.keys(resp).filter((k) => !metaCandidates.has(k));

  if (keys.length === 1) {
    const k = keys[0];

    // With `noUncheckedIndexedAccess`, keys[0] is `string | undefined`.
    // This guard keeps the function type-safe.
    if (!k) return { data: resp as unknown as T, meta };

    return { data: resp[k] as T, meta };
  }

  // When there are multiple namespaces (or response is not an object), return the whole response.
  return { data: resp as unknown as T, meta };
}

/**
 * Convenience helper: many vpsAdmin actions queue async tasks and return
 * `action_state_id` in the meta block.
 */
export function getMetaActionStateId(meta: unknown): number | undefined {
  if (!meta || typeof meta !== 'object') return undefined;
  const raw =
    (meta as any)['action_state_id'] ??
    (meta as any)['state_id'] ??
    (meta as any)['action_state'] ??
    (meta as any)['state'];
  const rawId = raw && typeof raw === 'object' ? (raw as any)['id'] : raw;
  if (typeof rawId === 'number' && Number.isFinite(rawId)) return rawId;
  if (typeof rawId === 'string') {
    const n = Number(rawId);
    if (Number.isFinite(n)) return n;
  }
  return undefined;
}

export const MISSING_ACTION_STATE_ERROR_CODE = 'MISSING_ACTION_STATE' as const;

/**
 * Raised when an endpoint whose contract is an asynchronous action does not
 * return a usable action-state id. The mutation may already have reached the
 * server, so callers must fail closed and refresh state before offering a
 * retry instead of treating the response as synchronous success.
 */
export class MissingActionStateError extends Error {
  public readonly code = MISSING_ACTION_STATE_ERROR_CODE;
  public readonly action: string;
  public readonly result?: unknown;

  constructor(action: string, result?: unknown) {
    super(`Malformed ${action} response: missing action_state_id`);
    this.name = 'MissingActionStateError';
    this.action = action;
    this.result = result;
  }
}

export function isMissingActionStateError(error: unknown): error is MissingActionStateError {
  return error instanceof MissingActionStateError
    || (Boolean(error)
      && typeof error === 'object'
      && (error as { code?: unknown }).code === MISSING_ACTION_STATE_ERROR_CODE);
}

/**
 * Whether a submitted mutation has an unknown outcome and must not be retried
 * blindly. Explicit HaveAPI rejections and ordinary 4xx responses are
 * authoritative only when they do not contradict a successful API envelope;
 * transport loss, malformed responses and server failures are not proof that
 * the server did nothing.
 */
export function isAmbiguousMutationError(error: unknown): boolean {
  if (isMissingActionStateError(error)) return true;
  if (error instanceof HaveApiError) {
    // Keep both signals in the error receipt. An HTTP failure cannot establish
    // rejection when the validated API envelope says the operation succeeded.
    if (error.envelope.status === true) return true;
    if (
      error.envelope?.errors === 'INVALID_JSON_RESPONSE'
      || error.envelope?.errors === MALFORMED_HAVEAPI_ENVELOPE_ERROR_CODE
    ) return true;
    if (typeof error.httpStatus === 'number') {
      // These responses can be produced after a blocking mutation already
      // reached the server, so they are not authoritative rejections.
      if ([408, 425, 429].includes(error.httpStatus)) return true;
      return error.httpStatus < 400 || error.httpStatus >= 500;
    }
    return false;
  }
  return error instanceof TypeError || (typeof DOMException !== 'undefined' && error instanceof DOMException);
}

/** Require the async-operation proof promised by a blocking API action. */
export function requireActionStateResult<T extends { meta?: Record<string, unknown> }>(result: T, action: string): T {
  const actionStateId = getMetaActionStateId(result.meta);
  if (!Number.isInteger(actionStateId) || (actionStateId as number) <= 0) {
    throw new MissingActionStateError(action, result);
  }
  return result;
}

/**
 * Many HaveAPI Index actions return pagination metadata in `_meta`, including `total_count`.
 */
export function getMetaTotalCount(meta: unknown): number | undefined {
  if (!meta || typeof meta !== 'object') return undefined;
  const raw = (meta as any)['total_count'];
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
  if (typeof raw === 'string') {
    const n = Number(raw);
    if (Number.isFinite(n)) return n;
  }
  return undefined;
}

function describeValue(value: unknown): string {
  if (Array.isArray(value)) return `array(${value.length})`;
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (typeof value === 'object') {
    const keys = Object.keys(value as Record<string, unknown>);
    const head = keys.slice(0, 5).join(', ');
    const tail = keys.length > 5 ? ', …' : '';
    return `object(${head}${tail})`;
  }
  return typeof value;
}

/**
 * Runtime guard for endpoints that are expected to return lists.
 *
 * Use this close to the API boundary so React Query can surface a meaningful error
 * instead of crashing the render with "... is not iterable".
 */
export function expectArray<T>(value: unknown, context: string): T[] {
  if (Array.isArray(value)) return value as T[];
  throw new Error(`${context}: expected array, got ${describeValue(value)}`);
}

function authHeaders(desc: any): Record<string, string> {
  const cfg = getRuntimeConfig();

  if (cfg.auth.kind === 'none') return {};

  // Standalone deployments may not have the HaveAPI description bootstrap
  // on window.vpsAdmin.description. Allow forcing the auth header name.
  const forcedHeader = cfg.haveApi?.authHeader;
  if (forcedHeader) {
    const token = cfg.auth.kind === 'oauth2' ? cfg.auth.accessToken : cfg.auth.sessionToken;
    return { [forcedHeader]: token };
  }

  // HaveAPI uses a provider-specific HTTP header announced in the API description.
  // (The legacy client avoids the standard Authorization header due to CORS policy.)
  const httpHeader: string | undefined = desc?.authentication?.[cfg.auth.kind]?.http_header;

  if (cfg.auth.kind === 'oauth2') {
    if (httpHeader) return { [httpHeader]: cfg.auth.accessToken };

    // Dev fallback. Note: may not work against api.vpsfree.cz due to CORS policy.
    return { Authorization: `Bearer ${cfg.auth.accessToken}` };
  }

  if (cfg.auth.kind === 'token') {
    const token = cfg.auth.sessionToken;

    if (httpHeader) return { [httpHeader]: token };

    // Dev fallback.
    return { 'X-HaveAPI-Auth-Token': token };
  }

  return {};
}

export type HaveApiCall = <T>(opts: CallOpts) => Promise<{
  data: T;
  meta?: Record<string, unknown>;
  envelope: HaveApiEnvelope;
}>;

function snapshotQuery(namespace: string, values: Record<string, unknown>): Record<string, unknown> {
  const copy = { ...values };
  for (const [key, value] of Object.entries(copy)) {
    if (value === undefined || value === null || ['string', 'number', 'boolean'].includes(typeof value)) continue;
    throw new HaveApiError({
      status: false,
      message: `Invalid query parameter ${namespace}[${key}] (must be string/number/boolean/null)`,
      response: { key, value },
    }, 'Invalid query parameter');
  }
  return copy;
}

/** Keep admission and retry inputs stable; encoding belongs to AsyncClient. */
function requestSpec(opts: CallOpts, metaNamespace: string): RequestSpec {
  const method = opts.method ?? 'GET';
  const query = method === 'GET' || method === 'OPTIONS';
  return {
    method,
    path: opts.path.startsWith('/') ? opts.path : `/${opts.path}`,
    inputNamespace: opts.namespace || undefined,
    metaNamespace,
    params: opts.namespace && opts.params
      ? query ? snapshotQuery(opts.namespace, opts.params) : { ...opts.params }
      : undefined,
    meta: opts.meta ? query ? snapshotQuery(metaNamespace, opts.meta) : { ...opts.meta } : undefined,
    signal: opts.signal,
  };
}

function resultFor<T>(reply: HaveApiReply, metaNamespace: string, request: HaveApiRequestInfo) {
  const nonSuccess = reply.httpStatus < 200 || reply.httpStatus >= 300;
  if (nonSuccess || !reply.envelope.status) {
    // Preserve contradictory HTTP/envelope signals for ambiguity classification.
    throw new HaveApiError(reply.envelope, `HTTP ${reply.httpStatus}`, nonSuccess ? reply.httpStatus : undefined, request, reply.cause);
  }
  // Data/envelope are already validated by the package. This only preserves
  // the application's historical single-namespace and metadata projection.
  const projected = unwrapSingleResponse<T>({ ...reply.envelope, response: reply.data }, metaNamespace);
  return { ...projected, envelope: reply.envelope };
}

/** The normal production path always uses the installed AsyncClient. */
export const haveApiCall: HaveApiCall = async <T>(opts: CallOpts) => {
  const language = detectStaticUiLanguage(typeof document === 'undefined' ? undefined : document);
  const desc = await getHaveApiDescription();
  const cfg = getRuntimeConfig();
  const metaNamespace = cfg.haveApi?.metaNamespace ?? getMetaNamespace(desc);
  const spec = requestSpec(opts, metaNamespace);
  const headers = { Accept: 'application/json', 'Accept-Language': language, ...authHeaders(desc) };
  const request: HaveApiRequestInfo = {
    method: spec.method, path: opts.path,
    url: `${cfg.apiBaseUrl}${spec.path}`,
  };
  let reply = await requestHaveApi(cfg.apiBaseUrl, 'authenticated', { ...spec, headers });
  // Only a validated API rejection may renew. Malformed/network outcomes are
  // ambiguous; an impersonation token is never retried as base OAuth.
  if (reply.httpStatus === 401 && reply.failure === 'api' && reply.envelope.status === false && cfg.auth.kind === 'oauth2') {
    const recovered = await recoverBffSession(cfg.auth.accessToken);
    opts.signal?.throwIfAborted();
    if (recovered) {
      if (spec.method !== 'GET' && spec.method !== 'OPTIONS') {
        throw new Error(staticTForDocument(
          typeof document === 'undefined' ? undefined : document,
          'errors.session_renewed_retry_action'
        ));
      }
      reply = await requestHaveApi(cfg.apiBaseUrl, 'authenticated', { ...spec,
        headers: { ...headers, ...authHeaders(desc) } });
    }
  }
  try {
    return resultFor<T>(reply, metaNamespace, request);
  } catch (error) {
    notifySessionExpired(error);
    throw error;
  }
};

/** Anonymous HaveAPI still uses the package, without auth, language or discovery. */
export async function publicHaveApiCall<T>(opts: Pick<CallOpts, 'path' | 'namespace' | 'params'>) {
  const cfg = getRuntimeConfig();
  const metaNamespace = cfg.haveApi?.metaNamespace ?? '_meta';
  const spec = requestSpec({ ...opts, method: 'GET' }, metaNamespace);
  const reply = await requestHaveApi(cfg.apiBaseUrl, 'public', spec);
  return resultFor<T>(reply, metaNamespace, { method: 'GET', path: opts.path, url: `${cfg.apiBaseUrl}${spec.path}` });
}
