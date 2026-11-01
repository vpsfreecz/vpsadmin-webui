import { expectArray, getMetaTotalCount } from './apiErrors';
import { narrowApiResult } from './apiOutput';
import { getApi } from './sdk';
import { narrowOutageEntity, narrowAdminOutageHandler } from './outageViews';
import type { OutageEntity, OutageHandler } from './outageViews';

export class OutageScopeReadError extends Error {
  readonly outageId: number;
  readonly scope: 'entities' | 'handlers';
  readonly originalCause?: unknown;

  constructor(outageId: number, scope: 'entities' | 'handlers', message: string, cause?: unknown) {
    super(`Unable to read the complete ${scope} scope for outage #${outageId}: ${message}`);
    this.name = 'OutageScopeReadError';
    this.outageId = outageId;
    this.scope = scope;
    this.originalCause = cause;
  }
}

const PAGE_LIMIT = 100;
const MAX_PAGES = 50;
const MAX_ITEMS = PAGE_LIMIT * MAX_PAGES;

async function fetchEntityPage(outageId: number, fromId?: number) {
  const res = await (
    await getApi()
  ).outage.entity.index({
    path: { outage_id: outageId },
    params: { limit: PAGE_LIMIT, from_id: fromId },
    meta: { count: true },
  });
  return narrowApiResult(
    res,
    (data) => expectArray<unknown>(data, 'outage scope').map(narrowOutageEntity),
    'outage entity scope'
  );
}

async function fetchHandlerPage(outageId: number, fromId?: number) {
  const res = await (
    await getApi()
  ).outage.handler.index({
    path: { outage_id: outageId },
    params: { limit: PAGE_LIMIT, from_id: fromId },
    meta: { count: true },
  });
  return narrowApiResult(
    res,
    (data) => expectArray<unknown>(data, 'outage scope').map(narrowAdminOutageHandler),
    'outage handler scope'
  );
}

async function fetchCompleteScope<T extends { id: number }>(opts: {
  outageId: number;
  scope: 'entities' | 'handlers';
  fetchPage: (fromId?: number) => Promise<{ data: T[]; meta?: Record<string, unknown> }>;
}): Promise<T[]> {
  const rows: T[] = [];
  const seen = new Set<number>();
  let fromId: number | undefined;
  let expectedTotal: number | undefined;

  for (let page = 0; page < MAX_PAGES; page += 1) {
    let result: { data: T[]; meta?: Record<string, unknown> };
    try {
      result = await opts.fetchPage(fromId);
    } catch (error) {
      throw new OutageScopeReadError(opts.outageId, opts.scope, 'a page request failed', error);
    }

    const pageTotal = getMetaTotalCount(result.meta);
    if (pageTotal === undefined || pageTotal < 0) {
      throw new OutageScopeReadError(opts.outageId, opts.scope, 'the API did not return a valid total_count');
    }
    if (expectedTotal === undefined) expectedTotal = pageTotal;
    if (pageTotal !== expectedTotal) {
      throw new OutageScopeReadError(opts.outageId, opts.scope, 'the scope changed while it was being read');
    }
    if (expectedTotal > MAX_ITEMS) {
      throw new OutageScopeReadError(opts.outageId, opts.scope, `the scope exceeds the ${MAX_ITEMS}-item safety cap`);
    }

    for (const row of result.data) {
      if (
        !Number.isSafeInteger(row.id) ||
        row.id <= 0 ||
        (fromId !== undefined && row.id <= fromId) ||
        seen.has(row.id)
      ) {
        throw new OutageScopeReadError(
          opts.outageId,
          opts.scope,
          'keyset pagination stalled or returned duplicate/out-of-order ids'
        );
      }
      seen.add(row.id);
      rows.push(row);
    }

    if (rows.length === expectedTotal) return rows;
    if (rows.length > expectedTotal || result.data.length === 0) {
      throw new OutageScopeReadError(opts.outageId, opts.scope, `received ${rows.length} of ${expectedTotal} items`);
    }

    const nextFromId = result.data.at(-1)?.id;
    if (!nextFromId || nextFromId === fromId) {
      throw new OutageScopeReadError(opts.outageId, opts.scope, 'keyset pagination did not advance');
    }
    fromId = nextFromId;
  }

  throw new OutageScopeReadError(opts.outageId, opts.scope, `pagination exceeded ${MAX_PAGES} pages`);
}

export function fetchAllOutageEntities(outageId: number): Promise<OutageEntity[]> {
  return fetchCompleteScope({
    outageId,
    scope: 'entities',
    fetchPage: (fromId) => fetchEntityPage(outageId, fromId),
  });
}

export function fetchAllOutageHandlers(outageId: number): Promise<OutageHandler[]> {
  return fetchCompleteScope({
    outageId,
    scope: 'handlers',
    fetchPage: (fromId) => fetchHandlerPage(outageId, fromId),
  });
}
