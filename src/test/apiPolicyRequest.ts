import type { RequestSpec } from 'haveapi-client';
import { getRuntimeConfig } from '../app/config';
import { executeApiRequest } from '../lib/api/apiRequestPolicy';
import { resolveApiContext } from '../lib/api/sdk';

type Spec = Pick<RequestSpec, 'path'> & Partial<RequestSpec>;

/** Policy tests supply explicit runtime specs; no operation or output projection. */
export async function policyRequest(spec: Spec) {
  const context = await resolveApiContext();
  return executeApiRequest(context.baseUrl, 'authenticated', {
    method: 'GET', metaNamespace: context.metaNamespace, ...spec,
  }, context.description);
}

export function publicPolicyRequest(spec: Spec) {
  const cfg = getRuntimeConfig();
  return executeApiRequest(cfg.apiBaseUrl, 'public', { method: 'GET', metaNamespace: cfg.haveApi.metaNamespace ?? '_meta', ...spec });
}
