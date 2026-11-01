import type { RequestResult, RequestSpec } from 'haveapi-client';
import type { ApiDescription } from 'vpsadmin-typescript-client';
import { getRuntimeConfig } from '../../app/config';
import { recoverBffSession } from '../auth/bffSession';
import { detectStaticUiLanguage, staticTForDocument } from '../staticI18n';
import { HaveApiError, notifySessionExpired } from './apiErrors';
import { executeHaveApiRequest, type HaveApiScope } from './haveapiRequestClient';

function authHeaders(description?: ApiDescription): Record<string, string> {
  const cfg = getRuntimeConfig();
  if (cfg.auth.kind === 'none') return {};
  const header = cfg.haveApi.authHeader ?? description?.authentication?.[cfg.auth.kind]?.http_header;
  const token = cfg.auth.kind === 'oauth2' ? cfg.auth.accessToken : cfg.auth.sessionToken;
  if (header) return { [header]: token };
  return cfg.auth.kind === 'oauth2'
    ? { Authorization: `Bearer ${token}` }
    : { 'X-HaveAPI-Auth-Token': token };
}

/** WebUI policy around the complete generated spec; no operation or payload projection. */
export async function executeApiRequest(
  baseUrl: string,
  scope: HaveApiScope,
  spec: RequestSpec,
  description?: ApiDescription,
): Promise<RequestResult<unknown>> {
  const cfg = getRuntimeConfig();
  const authenticated = scope === 'authenticated';
  const resolve = (url: string) => new URL(url, typeof window === 'undefined' ? undefined : window.location.href).href;
  if (authenticated && resolve(cfg.apiBaseUrl) !== resolve(baseUrl)) {
    throw new Error('API configuration changed before request dispatch');
  }
  const requestHeaders = {
    Accept: 'application/json',
    ...(authenticated ? { 'Accept-Language': detectStaticUiLanguage(typeof document === 'undefined' ? undefined : document) } : {}),
    ...spec.headers,
  };
  const headers = { ...requestHeaders, ...(authenticated ? authHeaders(description) : {}) };
  // The generator already snapshots/validates inputs; retries retain those values.
  const request = { ...spec, headers };
  try {
    return await executeHaveApiRequest(baseUrl, scope, request);
  } catch (error) {
    // Only a validated OAuth rejection authorizes renewal. Contradictory success,
    // malformed envelopes, public requests and impersonation never enter this path.
    if (authenticated && error instanceof HaveApiError && error.httpStatus === 401
      && error.failure === 'api' && error.envelope.status === false && cfg.auth.kind === 'oauth2') {
      const recovered = await recoverBffSession(cfg.auth.accessToken);
      spec.signal?.throwIfAborted();
      if (recovered) {
        if (resolve(getRuntimeConfig().apiBaseUrl) !== resolve(baseUrl)) throw new Error('API configuration changed during session recovery');
        if (spec.method !== 'GET' && spec.method !== 'OPTIONS') {
          throw new Error(staticTForDocument(
            typeof document === 'undefined' ? undefined : document, 'errors.session_renewed_retry_action',
          ));
        }
        try {
          return await executeHaveApiRequest(baseUrl, scope, {
            ...request, headers: { ...requestHeaders, ...authHeaders(description) },
          });
        } catch (retryError) {
          notifySessionExpired(retryError);
          throw retryError;
        }
      }
    }
    if (authenticated) notifySessionExpired(error);
    throw error;
  }
}
