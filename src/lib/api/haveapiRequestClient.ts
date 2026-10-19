import { createHaveApiCall, type HaveApiEnvelope } from './haveapi';
import { MALFORMED_HAVEAPI_ENVELOPE_ERROR_CODE } from './haveapiEnvelope';
import { validateQueryParameters, type HaveApiTransport, type HaveApiTransportResponse } from './haveapiTransport';

/** Structural seam: the app does not import or install a candidate npm package. */
export interface HaveApiRequestClient {
  request<T = unknown>(spec: {
    method: string;
    path: string;
    inputNamespace?: string | null;
    metaNamespace?: string;
    params?: Record<string, unknown>;
    meta?: Record<string, unknown>;
    headers?: Record<string, string>;
    signal?: AbortSignal;
  }): Promise<{
    data: T;
    meta: Record<string, unknown>;
    envelope: RequestClientEnvelope;
    httpStatus: number;
  }>;
}

interface RequestClientEnvelope {
  status: boolean;
  response?: unknown;
  message?: string | null;
  errors?: unknown;
}
interface RequestClientFailure extends Error {
  kind: string;
  httpStatus?: number;
  envelope?: RequestClientEnvelope;
}
function isRequestClientFailure(error: unknown): error is RequestClientFailure {
  return error instanceof Error && 'kind' in error && typeof error.kind === 'string';
}

function response(status: number, envelope: HaveApiEnvelope): HaveApiTransportResponse {
  return {
    status,
    ok: status >= 200 && status < 300,
    readEnvelope: async () => envelope,
    cancel: async () => {}, // The request client has already consumed its response.
  };
}

/** Map validated library outcomes into the existing WebUI error/result policy. */
export function requestClientTransport(client: HaveApiRequestClient): HaveApiTransport {
  return {
    prepare({ opts, baseUrl, metaNamespace }) {
      if (!opts.method || opts.method === 'GET' || opts.method === 'OPTIONS') {
        if (opts.namespace && opts.params) validateQueryParameters(opts.namespace, opts.params);
        if (opts.meta) validateQueryParameters(metaNamespace, opts.meta);
      }
      const spec = {
        method: opts.method ?? 'GET',
        path: opts.path.startsWith('/') ? opts.path : `/${opts.path}`,
        inputNamespace: opts.namespace || undefined,
        metaNamespace,
        params: opts.namespace && opts.params ? { ...opts.params } : undefined,
        meta: opts.meta && { ...opts.meta },
        signal: opts.signal,
      };
      return {
        url: `${baseUrl}${opts.path.startsWith('/') ? '' : '/'}${opts.path}`,
        async send(headers) {
          try {
            const result = await client.request({ ...spec, headers });
            // The client owns protocol validation. WebUI owns namespace unwrapping.
            return response(result.httpStatus, result.envelope as HaveApiEnvelope);
          } catch (error) {
            if (!isRequestClientFailure(error)) throw error;
            if (error.kind === 'aborted') throw new DOMException(error.message, 'AbortError');
            if (error.kind === 'timeout') throw new DOMException(error.message, 'TimeoutError');
            if (error.kind === 'transport') throw new TypeError(error.message, { cause: error });
            if (error.kind === 'api' && error.envelope) {
              return response(error.httpStatus ?? 200, error.envelope as HaveApiEnvelope);
            }
            if (error.kind === 'protocol') {
              return response(error.httpStatus ?? 200, {
                status: false,
                message: error.message,
                response: null,
                errors:
                  error.message === 'Invalid JSON response'
                    ? 'INVALID_JSON_RESPONSE'
                    : MALFORMED_HAVEAPI_ENVELOPE_ERROR_CODE,
              });
            }
            throw error;
          }
        },
      };
    },
  };
}

export function createRequestClientCall(client: HaveApiRequestClient) {
  return createHaveApiCall(requestClientTransport(client));
}
