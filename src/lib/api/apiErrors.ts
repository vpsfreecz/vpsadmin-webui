import type { RequestResult } from 'haveapi-client';
import { ClientInputError } from 'vpsadmin-typescript-client';
import { ApiOutputError } from './apiOutput';

export { ClientInputError } from 'vpsadmin-typescript-client';
export const MALFORMED_HAVEAPI_ENVELOPE_ERROR_CODE = 'MALFORMED_HAVEAPI_ENVELOPE' as const;

export type HaveApiEnvelope = Omit<RequestResult<unknown>['envelope'], 'errors'> & {
  /** Includes application protocol-error codes as well as API validation errors. */
  errors?: unknown;
};
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
  /** Complete validated transport receipt, including contradictory status evidence. */
  public result?: RequestResult<unknown>;
  public failure?: 'api' | 'protocol';

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

export function notifySessionExpired(error: unknown): void {
  if (!isExpiredSessionError(error)) return;
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(SESSION_EXPIRED_EVENT, { detail: { error } }));
}

export function getMetaActionStateId(meta: unknown): number | undefined {
  if (!meta || typeof meta !== 'object' || Array.isArray(meta)) return undefined;
  const values = meta as Record<string, unknown>;
  const raw = values['action_state_id'] ?? values['state_id'] ?? values['action_state'] ?? values['state'];
  const rawId = raw && typeof raw === 'object' ? (raw as Record<string, unknown>)['id'] : raw;
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
  if (error instanceof ClientInputError) return false;
  if (error instanceof ApiOutputError || isMissingActionStateError(error)) return true;
  if (error instanceof HaveApiError) {
    if (error.failure === 'protocol') return true;
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
  if (!Number.isSafeInteger(actionStateId) || (actionStateId as number) <= 0) {
    throw new MissingActionStateError(action, result);
  }
  return result;
}

/**
 * Many HaveAPI Index actions return pagination metadata in `_meta`, including `total_count`.
 */
export function getMetaTotalCount(meta: unknown): number | undefined {
  if (!meta || typeof meta !== 'object') return undefined;
  const raw = (meta as Record<string, unknown>)['total_count'];
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
