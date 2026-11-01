import { createClient, type ActionResult, type ApiDescription } from 'vpsadmin-typescript-client';
import { getRuntimeConfig } from '../../app/config';
import { ApiOutputError } from './apiOutput';
import { executeApiRequest } from './apiRequestPolicy';
import type { HaveApiScope } from './haveapiRequestClient';

export type VpsAdminApi = ReturnType<typeof createClient>;
export type { ActionResult, ApiDescription, ActionDescription } from 'vpsadmin-typescript-client';

interface ClientBinding { api: VpsAdminApi; description?: ApiDescription }
const clients = new Map<string, ClientBinding>();
const descriptions = new Map<string, Promise<ApiDescription>>();
const descriptionNamespaces = new Map<string, string>();

function resolvedBase(base: string): string {
  return new URL(base, typeof window === 'undefined' ? undefined : window.location.href).href;
}

function binding(base: string, scope: HaveApiScope, metaNamespace?: string, description?: ApiDescription): VpsAdminApi {
  const key = JSON.stringify([resolvedBase(base), scope, metaNamespace ?? null]);
  let bound = clients.get(key);
  if (!bound) {
    const state: ClientBinding = {
      api: createClient({
        metaNamespace,
        execute: spec => executeApiRequest(base, scope, spec, state.description),
      }),
      description,
    };
    bound = state;
    clients.set(key, bound);
  }
  bound.description = description;
  return bound.api;
}

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function descriptionNamespace(value: unknown): string | undefined {
  if (value == null) return undefined;
  if (!record(value)) throw new Error('Invalid API description configuration');
  const meta = value['meta'];
  if (meta == null) return undefined;
  if (!record(meta)) throw new Error('Invalid API metadata configuration');
  const namespace = meta['namespace'];
  if (namespace == null) return undefined;
  if (typeof namespace !== 'string' || !namespace) throw new Error('Invalid API metadata namespace');
  return namespace;
}

/** Only discovery fields used by WebUI are narrowed; HaveAPI owns the envelope. */
function descriptionFrom(value: unknown, result?: ActionResult<unknown>): ApiDescription {
  const invalid = () => {
    if (result) throw new ApiOutputError('API description', result);
    throw new Error('Invalid API description configuration');
  };
  if (!record(value)) return invalid();
  try { descriptionNamespace(value); } catch { return invalid(); }
  const authentication = value['authentication'];
  if (authentication !== undefined && authentication !== null) {
    if (!record(authentication)) return invalid();
    for (const provider of Object.values(authentication)) {
      if (!record(provider)) return invalid();
      const header = provider['http_header'];
      if (header !== undefined && header !== null
        && (typeof header !== 'string' || !/^[!#$%&'*+.^_`|~0-9A-Za-z-]+$/.test(header))) return invalid();
    }
  }
  // Only the fields above influence binding. Other description fields stay unknown
  // at their own domain boundary; this is not a general protocol decoder.
  return value;
}

export async function resolveApiContext(): Promise<{
  baseUrl: string; metaNamespace: string; description?: ApiDescription;
}> {
  const cfg = getRuntimeConfig();
  const supplied: unknown = typeof window === 'undefined' ? undefined : window.vpsAdmin?.description;
  let description = supplied === undefined ? undefined : descriptionFrom(supplied);
  if (!description && !(cfg.haveApi.authHeader && cfg.haveApi.metaNamespace)) {
    const key = resolvedBase(cfg.apiBaseUrl);
    let pending = descriptions.get(key);
    if (!pending) {
      // The anonymous executor never waits for this discovery, avoiding recursion.
      pending = binding(cfg.apiBaseUrl, 'public').describe()
        .then(result => descriptionFrom(result.data, result));
      descriptions.set(key, pending);
      void pending.catch(() => { if (descriptions.get(key) === pending) descriptions.delete(key); });
    }
    try {
      description = await pending;
      const namespace = descriptionNamespace(description);
      if (namespace !== undefined) descriptionNamespaces.set(key, namespace);
    } catch (cause) {
      // Only anonymous OPTIONS was attempted. Preserve its error/receipt without
      // misclassifying a caller's not-yet-dispatched mutation as uncertain.
      throw new Error('Unable to load API description', { cause });
    }
  }
  return {
    baseUrl: cfg.apiBaseUrl,
    metaNamespace: cfg.haveApi.metaNamespace ?? description?.meta?.namespace ?? '_meta',
    description,
  };
}

/** Auth and language are read on every dispatch; callers use generated operations. */
export async function getApi(): Promise<VpsAdminApi> {
  const context = await resolveApiContext();
  return binding(context.baseUrl, 'authenticated', context.metaNamespace, context.description);
}

/** Anonymous calls do not inherit auth/language, renew sessions or trigger discovery. */
export function getPublicApi(): VpsAdminApi {
  const cfg = getRuntimeConfig();
  const supplied: unknown = typeof window === 'undefined' ? undefined : window.vpsAdmin?.description;
  const namespace = cfg.haveApi.metaNamespace ?? descriptionNamespace(supplied)
    ?? descriptionNamespaces.get(resolvedBase(cfg.apiBaseUrl));
  return binding(cfg.apiBaseUrl, 'public', namespace);
}
