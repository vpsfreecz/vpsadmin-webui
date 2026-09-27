import { afterEach, describe, expect, it, vi } from 'vitest';
import { loadBoundedIdCollection } from './ascendingIdCollection';

afterEach(() => vi.useRealTimers());

describe('bounded collection without proven ID ordering', () => {
  it('accepts a short owner-grouped response without issuing an ID cursor', async () => {
    const fetchPage = vi.fn().mockResolvedValue({
      data: [{ id: 100 }, { id: 101 }, { id: 1 }, { id: 2 }],
      meta: { total_count: 4 },
    });
    const result = await loadBoundedIdCollection({ fetchPage, isCurrent: () => true });
    expect(result).toMatchObject({ completeness: 'complete', continuation: null, requests: 1 });
    expect(result.rows.map((row) => row.id)).toEqual([100, 101, 1, 2]);
    expect(fetchPage).toHaveBeenCalledTimes(1);
    expect(fetchPage.mock.calls[0]?.[0]).toBeUndefined();
  });

  it('marks a full response partial and never tries a second request', async () => {
    const fetchPage = vi.fn().mockResolvedValue({ data: [{ id: 8 }, { id: 3 }], meta: { total_count: 3 } });
    const result = await loadBoundedIdCollection({ fetchPage, isCurrent: () => true }, 2);
    expect(result).toMatchObject({ completeness: 'partial', reason: 'budget', count: 3, continuation: null });
    expect(fetchPage).toHaveBeenCalledTimes(1);
  });

  it('rejects duplicate and malformed IDs rather than deduplicating the sample', async () => {
    for (const data of [[{ id: 1 }, { id: 1 }], [{ id: 0 }], [{ id: Number.MAX_SAFE_INTEGER + 1 }]]) {
      const result = await loadBoundedIdCollection({ fetchPage: async () => ({ data }), isCurrent: () => true });
      expect(result).toMatchObject({ completeness: 'partial', reason: 'invalid_rows', rows: [] });
    }
  });

  it('preserves a clear timeout reason when fetch rejects on abort', async () => {
    vi.useFakeTimers();
    const resultPromise = loadBoundedIdCollection({
      fetchPage: (_, signal) => new Promise<{ data: Array<{ id: number }> }>((_, reject) => {
        signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
      }),
      isCurrent: () => true,
    });
    await vi.advanceTimersByTimeAsync(10_000);
    expect(await resultPromise).toMatchObject({ completeness: 'partial', reason: 'request_timeout' });
  });
});
