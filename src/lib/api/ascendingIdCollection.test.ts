import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  ASCENDING_ID_MAX_REQUESTS,
  ASCENDING_ID_PAGE_SIZE,
  loadAscendingIdCollection,
} from './ascendingIdCollection';

const ids = (start: number, length: number, step = 1) =>
  Array.from({ length }, (_, index) => ({ id: start + index * step }));
const page = (data: Array<{ id: number }>, count = data.length) => ({ data, meta: { total_count: count } });

afterEach(() => vi.useRealTimers());

describe('proven ascending-ID collection traversal', () => {
  it('uses the last ID unchanged across three pages and gaps, retaining metadata', async () => {
    const first = ids(2, ASCENDING_ID_PAGE_SIZE, 2);
    const second = ids(504, ASCENDING_ID_PAGE_SIZE, 2);
    const third = [{ id: 1008 }, { id: 1014 }];
    const fetchPage = vi.fn().mockResolvedValueOnce(page(first, 502))
      .mockResolvedValueOnce(page(second, 502)).mockResolvedValueOnce(page(third, 502));
    const result = await loadAscendingIdCollection({ fetchPage, isCurrent: () => true });
    expect(fetchPage.mock.calls.map(([cursor]) => cursor)).toEqual([undefined, 500, 1002]);
    expect(result).toMatchObject({ completeness: 'complete', requests: 3, count: 502, continuation: 1014 });
    expect(result.rows).toHaveLength(502);
    expect(result.pageMeta).toHaveLength(3);
  });

  it('treats an exact full page as unproven until an empty response', async () => {
    const fetchPage = vi.fn().mockResolvedValueOnce(page(ids(1, 250))).mockResolvedValueOnce(page([], 250));
    const result = await loadAscendingIdCollection({ fetchPage, isCurrent: () => true });
    expect(result.completeness).toBe('complete');
    expect(fetchPage.mock.calls.map(([cursor]) => cursor)).toEqual([undefined, 250]);
  });

  it('accepts a short second page when count describes the full filtered set', async () => {
    const fetchPage = vi.fn().mockResolvedValueOnce(page(ids(1, 250), 300))
      .mockResolvedValueOnce(page(ids(251, 50), 300));
    const result = await loadAscendingIdCollection({ fetchPage, isCurrent: () => true });
    expect(result).toMatchObject({ completeness: 'complete', count: 300, requests: 2 });
    expect(result.rows).toHaveLength(300);
    expect(fetchPage.mock.calls.map(([cursor]) => cursor)).toEqual([undefined, 250]);
  });

  it.each([
    { title: 'duplicate', second: [{ id: 250 }, { id: 251 }] },
    { title: 'reordered', second: [{ id: 252 }, { id: 251 }] },
    { title: 'nonprogress', second: [{ id: 4 }] },
    { title: 'unsafe ID', second: [{ id: Number.MAX_SAFE_INTEGER + 1 }] },
  ])('rejects $title pages without appending them', async ({ second }) => {
    const fetchPage = vi.fn().mockResolvedValueOnce(page(ids(1, 250), 252))
      .mockResolvedValueOnce(page(second, 252));
    const result = await loadAscendingIdCollection({ fetchPage, isCurrent: () => true });
    expect(result).toMatchObject({ completeness: 'partial', reason: 'invalid_rows', continuation: 250 });
    expect(result.rows).toHaveLength(250);
  });

  it('rejects contradictory and malformed counts without accepting the page', async () => {
    for (const meta of [{ total_count: 1 }, { total_count: -1 }, { total_count: '2' }]) {
      const result = await loadAscendingIdCollection({
        fetchPage: async () => ({ data: ids(1, 2), meta }), isCurrent: () => true,
      });
      expect(result).toMatchObject({ completeness: 'partial', reason: 'invalid_count', rows: [] });
    }
  });

  it('preserves verified rows after a later request failure', async () => {
    const fetchPage = vi.fn().mockResolvedValueOnce(page(ids(1, 250), 500))
      .mockRejectedValueOnce(new Error('backend response must not surface'));
    const result = await loadAscendingIdCollection({ fetchPage, isCurrent: () => true });
    expect(result).toMatchObject({ completeness: 'partial', reason: 'request_failed', continuation: 250, requests: 2 });
    expect(result.rows).toHaveLength(250);
  });

  it('stops at twenty requests and 5,000 rows with no speculative next call', async () => {
    const fetchPage = vi.fn(async (fromId: number | undefined) =>
      page(ids((fromId ?? 0) + 1, ASCENDING_ID_PAGE_SIZE), 10_000));
    const result = await loadAscendingIdCollection({ fetchPage, isCurrent: () => true });
    expect(result).toMatchObject({ completeness: 'partial', reason: 'budget', requests: ASCENDING_ID_MAX_REQUESTS });
    expect(result.rows).toHaveLength(5_000);
    expect(fetchPage).toHaveBeenCalledTimes(20);
  });

  it('discards a late response after abort, even if the transport ignores its signal', async () => {
    let resolvePage!: (value: ReturnType<typeof page>) => void;
    const controller = new AbortController();
    const pending = new Promise<ReturnType<typeof page>>((resolve) => { resolvePage = resolve; });
    const resultPromise = loadAscendingIdCollection({
      fetchPage: () => pending, signal: controller.signal, isCurrent: () => true,
    });
    await Promise.resolve();
    controller.abort();
    resolvePage(page([{ id: 1 }]));
    expect(await resultPromise).toMatchObject({ completeness: 'partial', reason: 'aborted', rows: [] });
  });

  it('discards a page when the effective scope changes', async () => {
    let current = true;
    const result = await loadAscendingIdCollection({
      fetchPage: async () => { current = false; return page([{ id: 1 }]); },
      isCurrent: () => current,
    });
    expect(result).toMatchObject({ completeness: 'partial', reason: 'scope_changed', rows: [] });
  });

  it('bounds an unresponsive request to ten seconds', async () => {
    vi.useFakeTimers();
    const resultPromise = loadAscendingIdCollection({
      fetchPage: () => new Promise<ReturnType<typeof page>>(() => {}), isCurrent: () => true,
    });
    await vi.advanceTimersByTimeAsync(10_000);
    expect(await resultPromise).toMatchObject({ completeness: 'partial', reason: 'request_timeout', rows: [] });
  });

  it('reports a timeout when a signal-aware request rejects on abort', async () => {
    vi.useFakeTimers();
    const resultPromise = loadAscendingIdCollection({
      fetchPage: (_, signal) => new Promise<ReturnType<typeof page>>((_, reject) => {
        signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true });
      }),
      isCurrent: () => true,
    });
    await vi.advanceTimersByTimeAsync(10_000);
    expect(await resultPromise).toMatchObject({ completeness: 'partial', reason: 'request_timeout' });
  });
});
