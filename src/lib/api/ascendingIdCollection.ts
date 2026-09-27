/** The pinned API proves ID ordering only for host IPs and effective-admin IPs. */
export const ASCENDING_ID_PAGE_SIZE = 250;
export const ASCENDING_ID_MAX_REQUESTS = 20;
export const ASCENDING_ID_MAX_ROWS = 5_000;
export const ASCENDING_ID_REQUEST_TIMEOUT_MS = 10_000;
export const ASCENDING_ID_TOTAL_TIMEOUT_MS = 30_000;

export type CollectionStopReason =
  | 'budget'
  | 'request_failed'
  | 'request_timeout'
  | 'deadline'
  | 'aborted'
  | 'scope_changed'
  | 'invalid_rows'
  | 'invalid_count';

export interface AscendingIdPage<T> {
  data: T[];
  meta?: Record<string, unknown>;
}

export interface AscendingIdCollection<T> {
  rows: T[];
  completeness: 'complete' | 'partial';
  reason?: CollectionStopReason;
  /** Last validated ID. This is an opaque continuation for the same frozen scope. */
  continuation: number | null;
  requests: number;
  /** Count from the first request, if the API supplied one. It is not a snapshot. */
  count?: number;
  /** Raw page metadata remains available to callers for diagnostics. */
  pageMeta: Array<Record<string, unknown> | undefined>;
}

export interface AscendingIdOptions<T extends { id: unknown }> {
  fetchPage: (fromId: number | undefined, signal: AbortSignal) => Promise<AscendingIdPage<T>>;
  signal?: AbortSignal;
  /** Recheck effective identity/API/filter scope before and after every request. */
  isCurrent: () => boolean;
}

function validatedCount(meta: Record<string, unknown> | undefined): number | undefined | null {
  if (!meta || !Object.hasOwn(meta, 'total_count')) return undefined;
  const count = meta['total_count'];
  return typeof count === 'number' && Number.isSafeInteger(count) && count >= 0 ? count : null;
}

/**
 * Sequential ID traversal for the two resource/role combinations established
 * by the locked HaveAPI source. Never use this for another collection or role.
 */
export async function loadAscendingIdCollection<T extends { id: unknown }>(
  options: AscendingIdOptions<T>,
): Promise<AscendingIdCollection<T>> {
  const rows: T[] = [];
  const pageMeta: Array<Record<string, unknown> | undefined> = [];
  let continuation: number | null = null;
  let count: number | undefined;
  let requests = 0;
  const deadline = Date.now() + ASCENDING_ID_TOTAL_TIMEOUT_MS;

  const result = (reason?: CollectionStopReason): AscendingIdCollection<T> => ({
    rows,
    completeness: reason ? 'partial' : 'complete',
    ...(reason ? { reason } : {}),
    continuation,
    requests,
    ...(count === undefined ? {} : { count }),
    pageMeta,
  });

  while (requests < ASCENDING_ID_MAX_REQUESTS && rows.length < ASCENDING_ID_MAX_ROWS) {
    if (options.signal?.aborted) return result('aborted');
    if (!options.isCurrent()) return result('scope_changed');
    const remaining = deadline - Date.now();
    if (remaining <= 0) return result('deadline');

    const controller = new AbortController();
    const fromId = continuation ?? undefined;
    const timeoutMs = Math.min(ASCENDING_ID_REQUEST_TIMEOUT_MS, remaining);
    let timer: ReturnType<typeof setTimeout> | undefined;
    let onAbort: (() => void) | undefined;
    const stopped = new Promise<'aborted' | 'request_timeout' | 'deadline'>((resolve) => {
      onAbort = () => { resolve('aborted'); controller.abort(); };
      options.signal?.addEventListener('abort', onAbort, { once: true });
      timer = setTimeout(() => {
        resolve(timeoutMs === remaining ? 'deadline' : 'request_timeout');
        controller.abort();
      }, timeoutMs);
    });

    requests += 1;
    let outcome: AscendingIdPage<T> | CollectionStopReason;
    try {
      outcome = await Promise.race([
        Promise.resolve().then(() => options.fetchPage(fromId, controller.signal)).catch(() => 'request_failed' as const),
        stopped,
      ]);
    } finally {
      if (timer !== undefined) clearTimeout(timer);
      if (onAbort) options.signal?.removeEventListener('abort', onAbort);
    }

    if (options.signal?.aborted) return result('aborted');
    if (!options.isCurrent()) return result('scope_changed');
    if (typeof outcome === 'string') return result(outcome);
    if (!outcome || !Array.isArray(outcome.data) || outcome.data.length > ASCENDING_ID_PAGE_SIZE) {
      return result('invalid_rows');
    }

    let last: number = continuation ?? 0;
    for (const row of outcome.data) {
      if (!row || typeof row !== 'object' ||
          typeof row.id !== 'number' || !Number.isSafeInteger(row.id) || row.id <= last) {
        return result('invalid_rows');
      }
      last = row.id;
    }

    const pageCount = validatedCount(outcome.meta);
    const accumulated = rows.length + outcome.data.length;
    if (pageCount === null || (pageCount !== undefined && (
      pageCount < accumulated ||
      (outcome.data.length < ASCENDING_ID_PAGE_SIZE && pageCount > accumulated)
    ))) return result('invalid_count');

    // A rejected page contributes neither rows nor a cursor. Earlier pages stay visible.
    rows.push(...outcome.data);
    pageMeta.push(outcome.meta);
    if (outcome.data.length > 0) continuation = last;
    if (requests === 1 && pageCount !== undefined) count = pageCount;
    if (outcome.data.length < ASCENDING_ID_PAGE_SIZE) return result();
  }

  // A full page at the exact bound never proves that another page is absent.
  return result('budget');
}
