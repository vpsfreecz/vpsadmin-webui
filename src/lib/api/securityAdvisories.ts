import { isOperationsRecord, isOperationsReference, type OperationsReference } from './operationsReference';
import type {
  SecurityAdvisory__CreateInput,
  SecurityAdvisory__UpdateInput,
  SecurityAdvisory__PublishInput,
  SecurityAdvisory__RetractInput,
  SecurityAdvisory__DeleteInput,
  SecurityAdvisory__IndexInput,
  SecurityAdvisory__IndexGlobalInput,
  SecurityAdvisoryCve__CreateInput,
  SecurityAdvisoryCve__UpdateInput,
} from 'vpsadmin-typescript-client';
import type {
  Location__ShowOutput,
  SecurityAdvisoryCve__IndexOutput,
  SecurityAdvisory__IndexOutput,
} from 'vpsadmin-typescript-client';
import type { SecurityAdvisoryCve__IndexInput } from 'vpsadmin-typescript-client';
import { getApi } from './sdk';
import { narrowApiResult } from './apiOutput';
import type { ResourceRef } from './appTypes';

export * from './securityAdvisoryRelations';
export * from './securityAdvisoryUpdates';

export type SecurityAdvisoryState = 'draft' | 'published' | 'retracted' | string;

export type SecurityAdvisoryPayload = Omit<
  SecurityAdvisory__UpdateInput,
  'expected_content_revision' | 'expected_state'
>;
export type SecurityAdvisoryMutationGuards = Required<
  Pick<SecurityAdvisory__UpdateInput, 'expected_content_revision' | 'expected_state'>
>;
export type SecurityAdvisoryPublishPayload = SecurityAdvisory__PublishInput;

export type SecurityAdvisoryCve = Omit<SecurityAdvisoryCve__IndexOutput[number], 'id' | 'security_advisory'> & {
  id: number;
  security_advisory?: OperationsReference | null;
  [k: string]: unknown;
};

export type SecurityAdvisory = Omit<SecurityAdvisory__IndexOutput[number], 'id' | 'created_by' | 'published_by'> & {
  id: number;
  created_by?: OperationsReference | null;
  published_by?: OperationsReference | null;
  cves?: Array<SecurityAdvisoryCve | string>;
  security_advisory_cves?: Array<SecurityAdvisoryCve | string>;
  [k: string]: unknown;
};

export interface SecurityAdvisoryFilters {
  limit?: number;
  fromId?: number;
  count?: boolean;
  state?: string;
  affected?: boolean;
  cve?: string;
  recentSince?: string;
  userId?: number;
  vpsId?: number;
  nodeId?: number;
  since?: string;
  order?: 'newest' | 'oldest';
  includes?: string;
}

export interface SecurityAdvisoryAllFilters extends SecurityAdvisoryFilters {
  /** Safety guard for unexpectedly repeating or unbounded API pages. */
  maxPages?: number;
}

export interface SecurityAdvisoryCveFilters {
  securityAdvisoryId?: number;
  cve?: string;
  limit?: number;
  fromId?: number;
  includes?: string;
}

function securityAdvisoryParams(opts?: SecurityAdvisoryFilters): SecurityAdvisory__IndexInput {
  const params: SecurityAdvisory__IndexInput = {};
  if (opts?.limit !== undefined) params['limit'] = opts.limit;
  if (opts?.fromId !== undefined) params['from_id'] = opts.fromId;
  if (opts?.state) params['state'] = opts.state;
  if (opts?.affected !== undefined) params['affected'] = opts.affected;
  if (opts?.cve) params['cve'] = opts.cve;
  if (opts?.recentSince) params['recent_since'] = opts.recentSince;
  if (opts?.userId !== undefined) params['user'] = opts.userId;
  if (opts?.vpsId !== undefined) params['vps'] = opts.vpsId;
  if (opts?.nodeId !== undefined) params['node'] = opts.nodeId;
  if (opts?.since) params['since'] = opts.since;
  if (opts?.order) params['order'] = opts.order;
  return params;
}

export async function fetchSecurityAdvisories(opts?: SecurityAdvisoryFilters) {
  const meta: SecurityAdvisory__IndexGlobalInput = {};
  if (opts?.includes) meta['includes'] = opts.includes;
  if (opts?.count) meta['count'] = true;
  const res = await (
    await getApi()
  ).security_advisory.index({
    params: securityAdvisoryParams(opts),
    meta: Object.keys(meta).length > 0 ? meta : undefined,
  });

  return narrowApiResult(res, narrowSecurityAdvisoryList, 'security_advisories#index');
}

const SECURITY_ADVISORY_PAGE_LIMIT = 100;
const SECURITY_ADVISORY_MAX_PAGES = 100;

function numericSecurityAdvisoryId(advisory: SecurityAdvisory | undefined): number | undefined {
  const id = advisory?.id;
  return typeof id === 'number' && Number.isFinite(id) ? id : undefined;
}

/**
 * Fetch every advisory cursor page while preserving the index filters and
 * order. HaveAPI may repeat the cursor row on the following page, so rows are
 * de-duplicated by ID. A full page that cannot advance is an error: returning
 * it would silently truncate the public archive.
 */
export async function fetchAllSecurityAdvisories(opts: SecurityAdvisoryAllFilters = {}) {
  const pageLimit =
    Number.isInteger(opts.limit) && Number(opts.limit) > 0 ? Number(opts.limit) : SECURITY_ADVISORY_PAGE_LIMIT;
  const maxPages =
    Number.isInteger(opts.maxPages) && Number(opts.maxPages) > 0 ? Number(opts.maxPages) : SECURITY_ADVISORY_MAX_PAGES;
  const { maxPages: _maxPages, ...filters } = opts;

  const data: SecurityAdvisory[] = [];
  const seenIds = new Set<number>();
  const seenCursors = new Set<number>();
  let cursor = filters.fromId;
  if (typeof cursor === 'number' && Number.isFinite(cursor)) seenCursors.add(cursor);

  let firstResult: Awaited<ReturnType<typeof fetchSecurityAdvisories>> | null = null;

  for (let pageNumber = 0; pageNumber < maxPages; pageNumber += 1) {
    const page = await fetchSecurityAdvisories({
      ...filters,
      limit: pageLimit,
      fromId: cursor,
    });
    firstResult ??= page;

    for (const advisory of page.data) {
      const id = numericSecurityAdvisoryId(advisory);
      if (id !== undefined) {
        if (seenIds.has(id)) continue;
        seenIds.add(id);
      }
      data.push(advisory);
    }

    if (page.data.length < pageLimit) return { ...firstResult, data };

    let nextCursor: number | undefined;
    for (let index = page.data.length - 1; index >= 0; index -= 1) {
      nextCursor = numericSecurityAdvisoryId(page.data[index]);
      if (nextCursor !== undefined) break;
    }

    if (nextCursor === undefined || seenCursors.has(nextCursor)) {
      throw new Error('Security advisory pagination stalled before the archive was complete');
    }
    seenCursors.add(nextCursor);
    cursor = nextCursor;
  }

  throw new Error('Security advisory pagination exceeded its safety limit');
}

export async function fetchSecurityAdvisory(
  securityAdvisoryId: number,
  opts?: { includes?: string; signal?: AbortSignal }
) {
  return narrowApiResult(
    await (
      await getApi()
    ).security_advisory.show({
      path: { security_advisory_id: securityAdvisoryId },
      meta: opts?.includes ? { includes: opts.includes } : undefined,
      signal: opts?.signal,
    }),
    narrowSecurityAdvisory,
    'security_advisory.show'
  );
}

export async function createSecurityAdvisory(params: SecurityAdvisory__CreateInput) {
  return narrowApiResult(
    await (await getApi()).security_advisory.create({ params: { ...params } }),
    narrowSecurityAdvisory,
    'security_advisory.create'
  );
}

export async function updateSecurityAdvisory(
  securityAdvisoryId: number,
  params: SecurityAdvisoryPayload & SecurityAdvisoryMutationGuards
) {
  return narrowApiResult(
    await (
      await getApi()
    ).security_advisory.update({ path: { security_advisory_id: securityAdvisoryId }, params: { ...params } }),
    narrowSecurityAdvisory,
    'security_advisory.update'
  );
}

export async function publishSecurityAdvisory(securityAdvisoryId: number, params: SecurityAdvisoryPublishPayload) {
  return narrowApiResult(
    await (
      await getApi()
    ).security_advisory.publish({ path: { security_advisory_id: securityAdvisoryId }, params: { ...params } }),
    narrowSecurityAdvisory,
    'security_advisory.publish'
  );
}

export async function rebuildSecurityAdvisoryAffectedVps(securityAdvisoryId: number) {
  return (await getApi()).security_advisory.rebuild_affected_vps({
    path: { security_advisory_id: securityAdvisoryId },
  });
}

export async function fetchSecurityAdvisoryCves(opts?: SecurityAdvisoryCveFilters) {
  const params: SecurityAdvisoryCve__IndexInput = {};
  if (opts?.securityAdvisoryId !== undefined) params['security_advisory'] = opts.securityAdvisoryId;
  if (opts?.cve) params['cve'] = opts.cve;
  if (opts?.limit !== undefined) params['limit'] = opts.limit;
  if (opts?.fromId !== undefined) params['from_id'] = opts.fromId;

  const res = await (
    await getApi()
  ).security_advisory_cve.index({ params, meta: opts?.includes ? { includes: opts.includes } : undefined });

  return narrowApiResult(res, narrowSecurityAdvisoryCveList, 'security_advisory_cves#index');
}

export async function fetchSecurityAdvisoryCve(
  securityAdvisoryCveId: number,
  opts?: { includes?: string; signal?: AbortSignal }
) {
  return narrowApiResult(
    await (
      await getApi()
    ).security_advisory_cve.show({
      path: { security_advisory_cve_id: securityAdvisoryCveId },
      meta: opts?.includes ? { includes: opts.includes } : undefined,
      signal: opts?.signal,
    }),
    narrowSecurityAdvisoryCve,
    'security_advisory_cve.show'
  );
}

export async function createSecurityAdvisoryCve(
  params: SecurityAdvisoryCve__CreateInput & SecurityAdvisoryMutationGuards
) {
  return narrowApiResult(
    await (await getApi()).security_advisory_cve.create({ params: { ...params } }),
    narrowSecurityAdvisoryCve,
    'security_advisory_cve.create'
  );
}

export async function updateSecurityAdvisoryCve(
  securityAdvisoryCveId: number,
  params: SecurityAdvisoryCve__UpdateInput & SecurityAdvisoryMutationGuards
) {
  return narrowApiResult(
    await (
      await getApi()
    ).security_advisory_cve.update({
      path: { security_advisory_cve_id: securityAdvisoryCveId },
      params: { ...params },
    }),
    narrowSecurityAdvisoryCve,
    'security_advisory_cve.update'
  );
}

export async function deleteSecurityAdvisoryCve(securityAdvisoryCveId: number, guards: SecurityAdvisoryMutationGuards) {
  return (await getApi()).security_advisory_cve.delete({
    path: { security_advisory_cve_id: securityAdvisoryCveId },
    params: { ...guards },
  });
}

export async function fetchSecurityAdvisoriesWithCves(opts?: SecurityAdvisoryFilters) {
  const advisories = await fetchSecurityAdvisories(opts);

  const cveLists = await Promise.all(
    advisories.data.map(async (advisory) => {
      if (advisory.security_advisory_cves || advisory.cves) {
        return advisoryCveObjects(advisory);
      }

      try {
        const cves = await fetchSecurityAdvisoryCves({ securityAdvisoryId: advisory.id });
        return cves.data;
      } catch {
        // Keep the dashboard useful even if the older API does not expose CVE joins
        // to the current session; the advisory itself is still important signal.
        return [];
      }
    })
  );

  return {
    ...advisories,
    data: advisories.data.map((advisory, idx) => ({
      ...advisory,
      cves: cveLists[idx] ?? [],
    })),
  };
}

function cveLabel(item: unknown): string | null {
  if (typeof item === 'string') {
    const s = item.trim().toUpperCase();
    return s || null;
  }

  if (!item || typeof item !== 'object') return null;
  const obj = item as Record<string, unknown>;
  const nested = obj['cve'];
  if (nested && typeof nested === 'object') {
    const nestedLabel = cveLabel(nested);
    if (nestedLabel) return nestedLabel;
  }

  const raw = obj['cve_id'] ?? obj['cveId'] ?? obj['name'] ?? obj['label'];
  if (typeof raw === 'string') {
    const s = raw.trim().toUpperCase();
    return s || null;
  }

  return null;
}

function advisoryCveObjects(advisory: SecurityAdvisory): Array<SecurityAdvisoryCve | string> {
  const raw = advisory.security_advisory_cves ?? advisory.cves ?? [];
  if (!Array.isArray(raw)) return [];

  return raw
    .map((item) => {
      if (typeof item === 'string') {
        return item.trim().toUpperCase();
      }
      return isSecurityAdvisoryCve(item) ? item : null;
    })
    .filter((item): item is SecurityAdvisoryCve | string => item !== null);
}

export function advisoryCveLabels(advisory: SecurityAdvisory): string[] {
  const labels = advisoryCveObjects(advisory)
    .map(cveLabel)
    .filter((v): v is string => Boolean(v));
  return [...new Set(labels)].sort((a, b) => a.localeCompare(b));
}

function isSecurityAdvisory(value: unknown): value is SecurityAdvisory {
  return (
    isOperationsRecord(value) &&
    typeof value['id'] === 'number' &&
    Number.isSafeInteger(value['id']) &&
    value['id'] > 0 &&
    [
      'created_at',
      'cs_description',
      'cs_response',
      'cs_summary',
      'en_description',
      'en_response',
      'en_summary',
      'external_id',
      'name',
      'published_at',
      'retracted_at',
      'state',
      'updated_at',
    ].every((key) => value[key] === undefined || value[key] === null || typeof value[key] === 'string') &&
    ['affected_node_count', 'affected_user_count', 'affected_vps_count', 'content_revision'].every(
      (key) =>
        value[key] === undefined ||
        value[key] === null ||
        (typeof value[key] === 'number' && Number.isFinite(value[key]))
    ) &&
    ['affected'].every((key) => value[key] === undefined || value[key] === null || typeof value[key] === 'boolean') &&
    ['created_by', 'published_by'].every(
      (key) => value[key] === undefined || value[key] === null || isOperationsReference(value[key])
    ) &&
    ['cves', 'security_advisory_cves'].every(
      (key) =>
        value[key] === undefined ||
        (Array.isArray(value[key]) &&
          value[key].every((entry: unknown) => typeof entry === 'string' || isSecurityAdvisoryCve(entry)))
    )
  );
}
export function narrowSecurityAdvisory(value: unknown): SecurityAdvisory {
  if (!isSecurityAdvisory(value)) throw new TypeError('Invalid SecurityAdvisory fields');
  return value;
}
function narrowSecurityAdvisoryList(value: unknown): SecurityAdvisory[] {
  if (!Array.isArray(value)) throw new TypeError('Expected SecurityAdvisory list');
  return value.map(narrowSecurityAdvisory);
}

function isSecurityAdvisoryCve(value: unknown): value is SecurityAdvisoryCve {
  return (
    isOperationsRecord(value) &&
    typeof value['id'] === 'number' &&
    Number.isSafeInteger(value['id']) &&
    value['id'] > 0 &&
    ['cve_id', 'url'].every(
      (key) => value[key] === undefined || value[key] === null || typeof value[key] === 'string'
    ) &&
    ['security_advisory_id'].every(
      (key) =>
        value[key] === undefined ||
        value[key] === null ||
        (typeof value[key] === 'number' && Number.isFinite(value[key]))
    ) &&
    ['security_advisory'].every(
      (key) => value[key] === undefined || value[key] === null || isOperationsReference(value[key])
    )
  );
}
function narrowSecurityAdvisoryCve(value: unknown): SecurityAdvisoryCve {
  if (!isSecurityAdvisoryCve(value)) throw new TypeError('Invalid SecurityAdvisoryCve fields');
  return value;
}
function narrowSecurityAdvisoryCveList(value: unknown): SecurityAdvisoryCve[] {
  if (!Array.isArray(value)) throw new TypeError('Expected SecurityAdvisoryCve list');
  return value.map(narrowSecurityAdvisoryCve);
}

export async function retractSecurityAdvisory(id: number, guards: SecurityAdvisory__RetractInput) {
  return narrowApiResult(
    await (await getApi()).security_advisory.retract({ path: { security_advisory_id: id }, params: { ...guards } }),
    narrowSecurityAdvisory,
    'security_advisory.retract'
  );
}

export async function deleteSecurityAdvisory(id: number, guards: SecurityAdvisory__DeleteInput) {
  return (await getApi()).security_advisory.delete({ path: { security_advisory_id: id }, params: { ...guards } });
}
