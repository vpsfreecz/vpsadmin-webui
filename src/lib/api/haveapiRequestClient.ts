import { AsyncClient, AsyncError, type RequestSpec } from 'haveapi-client';
import type { HaveApiEnvelope } from './haveapi';

export const MALFORMED_HAVEAPI_ENVELOPE_ERROR_CODE = 'MALFORMED_HAVEAPI_ENVELOPE' as const;
export type HaveApiScope = 'authenticated' | 'public';
export type { RequestSpec };

export interface HaveApiReply {
  data: unknown;
  meta: Record<string, unknown>;
  envelope: HaveApiEnvelope;
  httpStatus: number;
  failure?: 'api' | 'protocol';
  cause?: AsyncError;
}

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

/** The package owns HTTP, serialization and all wire-response validation. */
export async function requestHaveApi(baseUrl: string, scope: HaveApiScope, spec: RequestSpec): Promise<HaveApiReply> {
  try {
    return await clientFor(baseUrl, scope).request(spec);
  } catch (error) {
    if (!(error instanceof AsyncError)) throw error;
    if (error.kind === 'aborted') throw new DOMException(error.message, 'AbortError');
    if (error.kind === 'timeout') throw new DOMException(error.message, 'TimeoutError');
    if (error.kind === 'transport') throw new TypeError(error.message, { cause: error });
    if (error.kind === 'api' && error.response) {
      return { ...error.response, failure: 'api', cause: error };
    }
    if (error.kind === 'protocol') {
      // Application error classification, never a second wire decoder.
      return {
        data: null,
        meta: {},
        httpStatus: error.httpStatus ?? 200,
        failure: 'protocol',
        cause: error,
        envelope: {
          status: false,
          message: error.message,
          errors:
            error.message === 'Invalid JSON response' ? 'INVALID_JSON_RESPONSE' : MALFORMED_HAVEAPI_ENVELOPE_ERROR_CODE,
          response: null,
        },
      };
    }
    throw error;
  }
}
