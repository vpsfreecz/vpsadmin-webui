import { HaveApiError, type CallOpts, type HaveApiEnvelope } from './haveapi';
import { parseHaveApiEnvelope } from './haveapiEnvelope';

export interface HaveApiTransportResponse {
  readonly status: number;
  readonly ok: boolean;
  readEnvelope(): Promise<HaveApiEnvelope>;
  cancel(): Promise<void>;
}
export interface HaveApiTransport {
  prepare(request: { opts: CallOpts; baseUrl: string; metaNamespace: string }): {
    readonly url: string;
    send(headers: Record<string, string>): Promise<HaveApiTransportResponse>;
  };
}

function validateQueryValue(namespace: string, k: string, v: unknown): void {
  if (v === undefined || v === null || ['string', 'number', 'boolean'].includes(typeof v)) return;
  throw new HaveApiError(
    {
      status: false,
      message: `Invalid query parameter ${namespace}[${k}] (must be string/number/boolean/null)`,
      response: { key: k, value: v },
    },
    'Invalid query parameter'
  );
}
/** Preserve the app's scalar-query boundary for either selected transport. */
export function validateQueryParameters(namespace: string, params: Record<string, unknown>): void {
  for (const [k, v] of Object.entries(params)) validateQueryValue(namespace, k, v);
}
function buildQuery(namespace: string, params: Record<string, unknown>): URLSearchParams {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    validateQueryValue(namespace, k, v);
    if (v !== undefined) qs.append(`${namespace}[${k}]`, v === null ? '' : String(v));
  }
  return qs;
}

/** Default browser transport; serialization is prepared once before any read retry. */
export const fetchHaveApiTransport: HaveApiTransport = {
  prepare({ opts, baseUrl, metaNamespace: metaNs }) {
    const method = opts.method ?? 'GET';
    let url = `${baseUrl}${opts.path.startsWith('/') ? '' : '/'}${opts.path}`;

    const ns = opts.namespace;
    const qs = new URLSearchParams();

    const paramsInQuery = method === 'GET' || method === 'OPTIONS';

    if (paramsInQuery && ns && opts.params) {
      for (const [k, v] of buildQuery(ns, opts.params).entries()) qs.append(k, v);
    }

    if (paramsInQuery && opts.meta) {
      for (const [k, v] of buildQuery(metaNs, opts.meta).entries()) {
        qs.append(k, v);
      }
    }

    if ([...qs.keys()].length > 0) {
      url += (url.includes('?') ? '&' : '?') + qs.toString();
    }

    const init: RequestInit = {
      method,
      // Match the legacy XHR client default: do not send cookies cross-origin.
      credentials: 'same-origin',
      signal: opts.signal,
    };

    if (!paramsInQuery) {
      const body: Record<string, unknown> = {};

      if (ns && opts.params) {
        body[ns] = opts.params;
      }

      if (opts.meta) {
        body[metaNs] = opts.meta;
      }

      init.body = JSON.stringify(body);
    }

    return {
      url,
      async send(headers) {
        const res = await fetch(url, {
          ...init,
          headers: paramsInQuery ? headers : { ...headers, 'Content-Type': 'application/json' },
        });
        return {
          status: res.status,
          ok: res.ok,
          readEnvelope: () => parseHaveApiEnvelope(res),
          cancel: async () => {
            await res.body?.cancel();
          },
        };
      },
    };
  },
};
