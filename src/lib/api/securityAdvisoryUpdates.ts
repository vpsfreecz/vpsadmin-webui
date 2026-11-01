import { isOperationsRecord, isOperationsReference, type OperationsReference } from './operationsReference';
import type {
  SecurityAdvisoryUpdate__CreateInput,
  SecurityAdvisoryUpdate__UpdateInput,
} from 'vpsadmin-typescript-client';
import type {
  Location__ShowOutput,
  SecurityAdvisoryUpdate__IndexOutput,
} from 'vpsadmin-typescript-client';
import type { SecurityAdvisoryUpdate__IndexInput } from 'vpsadmin-typescript-client';
import { getApi } from './sdk';
import { narrowApiResult } from './apiOutput';
import type { ResourceRef } from './appTypes';
import type { SecurityAdvisoryState } from './securityAdvisories';

export type SecurityAdvisoryUpdate = Omit<
  SecurityAdvisoryUpdate__IndexOutput[number],
  'id' | 'reported_by' | 'security_advisory'
> & {
  id: number;
  reported_by?: OperationsReference | null;
  security_advisory?: OperationsReference | null;
  [k: string]: unknown;
};

export type SecurityAdvisoryUpdateTextPayload = SecurityAdvisoryUpdate__UpdateInput;
export type SecurityAdvisoryUpdateCreatePayload = SecurityAdvisoryUpdate__CreateInput;

export interface SecurityAdvisoryUpdateFilters {
  securityAdvisoryId?: number;
  since?: string;
  limit?: number;
  fromId?: number;
  includes?: string;
}

export interface SecurityAdvisoryUpdateAllFilters extends SecurityAdvisoryUpdateFilters {
  /** Safety guard for unexpectedly repeating or unbounded API pages. */
  maxPages?: number;
}

export async function fetchSecurityAdvisoryUpdates(opts?: SecurityAdvisoryUpdateFilters) {
  const params: SecurityAdvisoryUpdate__IndexInput = {};
  if (opts?.securityAdvisoryId !== undefined) params['security_advisory'] = opts.securityAdvisoryId;
  if (opts?.since) params['since'] = opts.since;
  if (opts?.limit !== undefined) params['limit'] = opts.limit;
  if (opts?.fromId !== undefined) params['from_id'] = opts.fromId;

  const res = await (
    await getApi()
  ).security_advisory_update.index({ params, meta: opts?.includes ? { includes: opts.includes } : undefined });

  return narrowApiResult(res, narrowSecurityAdvisoryUpdateList, 'security_advisory_updates#index');
}

const SECURITY_ADVISORY_UPDATE_PAGE_LIMIT = 100;
const SECURITY_ADVISORY_UPDATE_MAX_PAGES = 100;

function numericSecurityAdvisoryUpdateId(update: SecurityAdvisoryUpdate | undefined): number | undefined {
  const id = update?.id;
  return typeof id === 'number' && Number.isFinite(id) ? id : undefined;
}

/**
 * Fetch every cursor page while retaining the filters and includes used for
 * the first request. The API may include the cursor row again on the next
 * page, so results are de-duplicated by their numeric ID.
 */
export async function fetchAllSecurityAdvisoryUpdates(opts: SecurityAdvisoryUpdateAllFilters = {}) {
  const pageLimit =
    Number.isInteger(opts.limit) && Number(opts.limit) > 0 ? Number(opts.limit) : SECURITY_ADVISORY_UPDATE_PAGE_LIMIT;
  const maxPages =
    Number.isInteger(opts.maxPages) && Number(opts.maxPages) > 0
      ? Number(opts.maxPages)
      : SECURITY_ADVISORY_UPDATE_MAX_PAGES;
  const { maxPages: _maxPages, ...filters } = opts;

  const data: SecurityAdvisoryUpdate[] = [];
  const seenIds = new Set<number>();
  const seenCursors = new Set<number>();
  let cursor = filters.fromId;
  if (typeof cursor === 'number' && Number.isFinite(cursor)) seenCursors.add(cursor);

  let firstResult: Awaited<ReturnType<typeof fetchSecurityAdvisoryUpdates>> | null = null;

  for (let pageNumber = 0; pageNumber < maxPages; pageNumber += 1) {
    const page = await fetchSecurityAdvisoryUpdates({
      ...filters,
      limit: pageLimit,
      fromId: cursor,
    });
    firstResult ??= page;

    for (const update of page.data) {
      const id = numericSecurityAdvisoryUpdateId(update);
      if (id !== undefined) {
        if (seenIds.has(id)) continue;
        seenIds.add(id);
      }
      data.push(update);
    }

    if (page.data.length < pageLimit) return { ...firstResult, data };

    let nextCursor: number | undefined;
    for (let index = page.data.length - 1; index >= 0; index -= 1) {
      nextCursor = numericSecurityAdvisoryUpdateId(page.data[index]);
      if (nextCursor !== undefined) break;
    }

    if (nextCursor === undefined || seenCursors.has(nextCursor)) {
      throw new Error('Security advisory update pagination stalled before the history was complete');
    }
    seenCursors.add(nextCursor);
    cursor = nextCursor;
  }

  throw new Error('Security advisory update pagination exceeded its safety limit');
}

export async function fetchSecurityAdvisoryUpdate(
  securityAdvisoryUpdateId: number,
  opts?: { includes?: string; signal?: AbortSignal }
) {
  return narrowApiResult(
    await (
      await getApi()
    ).security_advisory_update.show({
      path: { security_advisory_update_id: securityAdvisoryUpdateId },
      meta: opts?.includes ? { includes: opts.includes } : undefined,
      signal: opts?.signal,
    }),
    narrowSecurityAdvisoryUpdate,
    'security_advisory_update.show'
  );
}

export async function createSecurityAdvisoryUpdate(params: SecurityAdvisoryUpdateCreatePayload) {
  return narrowApiResult(
    await (await getApi()).security_advisory_update.create({ params: { ...params } }),
    narrowSecurityAdvisoryUpdate,
    'security_advisory_update.create'
  );
}

export async function updateSecurityAdvisoryUpdate(
  securityAdvisoryUpdateId: number,
  params: SecurityAdvisoryUpdateTextPayload
) {
  return narrowApiResult(
    await (
      await getApi()
    ).security_advisory_update.update({
      path: { security_advisory_update_id: securityAdvisoryUpdateId },
      params: { ...params },
    }),
    narrowSecurityAdvisoryUpdate,
    'security_advisory_update.update'
  );
}

export async function deleteSecurityAdvisoryUpdate(securityAdvisoryUpdateId: number) {
  return (await getApi()).security_advisory_update.delete({
    path: { security_advisory_update_id: securityAdvisoryUpdateId },
  });
}

function isSecurityAdvisoryUpdate(value: unknown): value is SecurityAdvisoryUpdate {
  return (
    isOperationsRecord(value) &&
    typeof value['id'] === 'number' &&
    Number.isSafeInteger(value['id']) &&
    value['id'] > 0 &&
    [
      'created_at',
      'cs_message',
      'cs_summary',
      'en_message',
      'en_summary',
      'name',
      'reporter_name',
      'state',
      'updated_at',
    ].every((key) => value[key] === undefined || value[key] === null || typeof value[key] === 'string') &&
    ['reported_by', 'security_advisory'].every(
      (key) => value[key] === undefined || value[key] === null || isOperationsReference(value[key])
    )
  );
}
function narrowSecurityAdvisoryUpdate(value: unknown): SecurityAdvisoryUpdate {
  if (!isSecurityAdvisoryUpdate(value)) throw new TypeError('Invalid SecurityAdvisoryUpdate fields');
  return value;
}
function narrowSecurityAdvisoryUpdateList(value: unknown): SecurityAdvisoryUpdate[] {
  if (!Array.isArray(value)) throw new TypeError('Expected SecurityAdvisoryUpdate list');
  return value.map(narrowSecurityAdvisoryUpdate);
}
