import { AsyncClient, AsyncError, type RequestSpec, type RequestResult } from 'haveapi-client';
import { HaveApiError, MALFORMED_HAVEAPI_ENVELOPE_ERROR_CODE, type HaveApiEnvelope, type HaveApiRequestInfo } from './apiErrors';
export { MALFORMED_HAVEAPI_ENVELOPE_ERROR_CODE } from './apiErrors';
export type HaveApiScope = 'authenticated' | 'public';
export type { RequestSpec };

// Public requests never share authentication state with signed-in requests.
// No setup/authenticate call: the runtime base is already versioned and WebUI
// supplies live credentials and language only on the individual request.
const clients: Record<HaveApiScope, Map<string, AsyncClient>> = {
  authenticated: new Map(),
  public: new Map(),
};
function clientFor(baseUrl: string, scope: HaveApiScope): AsyncClient {
  const resolvedBase = new URL(baseUrl, typeof window === 'undefined' ? undefined : window.location.href).href;
  const cache = clients[scope];
  let client = cache.get(resolvedBase);
  if (!client) {
    client = new AsyncClient(resolvedBase);
    cache.set(resolvedBase, client);
  }
  return client;
}

/** Complete generated executor seam: only HaveAPI serializes and decodes wire data. */
export async function executeHaveApiRequest(
  baseUrl: string, scope: HaveApiScope, spec: RequestSpec,
): Promise<RequestResult<unknown>> {
  const request: HaveApiRequestInfo = {
    method: spec.method, path: spec.path, url: `${baseUrl.replace(/\/$/, '')}${spec.path}`,
  };
  try {
    return await clientFor(baseUrl, scope).request(spec);
  } catch (cause) {
    if (!(cause instanceof AsyncError)) throw cause;
    if (cause.kind === 'aborted') throw new DOMException(cause.message, 'AbortError');
    if (cause.kind === 'timeout') throw new DOMException(cause.message, 'TimeoutError');
    if (cause.kind === 'transport') throw new TypeError(cause.message, { cause });
    if (cause.kind !== 'api' && cause.kind !== 'protocol') throw cause;
    const envelope: HaveApiEnvelope = cause.kind === 'api' && cause.response
      ? cause.response.envelope
      : {
        status: false, message: cause.message,
        errors: cause.message === 'Invalid JSON response'
          ? 'INVALID_JSON_RESPONSE' : MALFORMED_HAVEAPI_ENVELOPE_ERROR_CODE,
        response: null,
      };
    const httpStatus = cause.httpStatus !== undefined && (cause.httpStatus < 200 || cause.httpStatus >= 300)
      ? cause.httpStatus : undefined;
    const error = new HaveApiError(envelope, cause.message, httpStatus, request, cause);
    error.result = cause.response;
    error.failure = cause.kind;
    throw error;
  }
}
