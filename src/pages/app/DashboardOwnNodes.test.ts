import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchDashboardOwnNodeIds, selectDashboardOwnNodes } from './DashboardOwnNodes';

const mocks = vi.hoisted(() => ({ fetch: vi.fn() }));
vi.mock('../../lib/api/vps', () => ({ fetchVpsList: mocks.fetch }));
beforeEach(() => { mocks.fetch.mockReset(); });
const row = (id: number, nodeId: number, userId = 53) => ({ id, node: { id: nodeId }, user: { id: userId } });

describe('dashboard own-node membership', () => {
  it('reads later pages despite total-count metadata and sends an explicit owner and abort signal', async () => {
    mocks.fetch.mockResolvedValueOnce({ data: Array.from({ length: 200 }, (_, i) => row(i + 1, 1)), meta: { total_count: 201 } });
    mocks.fetch.mockResolvedValueOnce({ data: [row(201, 2)], meta: { total_count: 201 } });
    const signal = new AbortController().signal;
    await expect(fetchDashboardOwnNodeIds(53, signal)).resolves.toEqual([1, 2]);
    expect(mocks.fetch.mock.calls).toEqual([
      [{ user: 53, includes: 'node,user', limit: 200, fromId: undefined, signal }],
      [{ user: 53, includes: 'node,user', limit: 200, fromId: 200, signal }],
    ]);
  });

  it('keeps an empty successful collection separate from unknown ownership or node', async () => {
    mocks.fetch.mockResolvedValueOnce({ data: [] });
    await expect(fetchDashboardOwnNodeIds(53)).resolves.toEqual([]);
    for (const data of [[row(1, 2, 84)], [{ id: 1, node: { id: 2 } }], [{ id: 1, user: { id: 53 }, node: null }]]) {
      mocks.fetch.mockResolvedValueOnce({ data });
      await expect(fetchDashboardOwnNodeIds(53)).rejects.toThrow('Unknown VPS owner or node');
    }
  });

  it('rejects a missing identity before dispatch and repeated or truncated pagination', async () => {
    await expect(fetchDashboardOwnNodeIds(0)).rejects.toThrow('Missing account identity');
    expect(mocks.fetch).not.toHaveBeenCalled();
    const page = Array.from({ length: 200 }, (_, i) => row(i + 1, 1));
    mocks.fetch.mockResolvedValue({ data: page });
    await expect(fetchDashboardOwnNodeIds(53)).rejects.toThrow('VPS pagination did not advance');
    mocks.fetch.mockReset();
    mocks.fetch.mockImplementation(async (opts: { fromId?: number }) => ({
      data: Array.from({ length: 200 }, (_, i) => row((opts.fromId ?? 0) + i + 1, 1)),
    }));
    await expect(fetchDashboardOwnNodeIds(53)).rejects.toThrow('Owned VPS collection is incomplete');
    expect(mocks.fetch).toHaveBeenCalledTimes(20);
  });

  it('matches stable IDs, preserves outage data, and refuses unavailable owned status', () => {
    const own = { id: 1, name: 'same-label', status: false };
    const other = { id: 2, name: 'same-label', status: true };
    expect(selectDashboardOwnNodes([other, own], [1])).toEqual([own]);
    expect(selectDashboardOwnNodes([other, own], [])).toEqual([]);
    expect(() => selectDashboardOwnNodes([other], [1])).toThrow('Owned node status is unavailable');
    expect(() => selectDashboardOwnNodes([{ name: 'same-label', status: true }], [1])).toThrow();
  });
});
