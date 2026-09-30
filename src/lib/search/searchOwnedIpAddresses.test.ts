import { beforeEach, expect, it, vi } from 'vitest';
import { fetchIpAddresses, type IpAddress } from '../api/ipAddresses';
import { searchOwnedIpAddresses } from './searchOwnedIpAddresses';

vi.mock('../api/ipAddresses', () => ({ fetchIpAddresses: vi.fn() }));
beforeEach(() => vi.resetAllMocks());
const response = (data: IpAddress[]) => ({ data }) as Awaited<ReturnType<typeof fetchIpAddresses>>;

it.each(['203.0.113.20', '2001:db8::20'])('finds a VPS-assigned %s without the direct-owner filter', async (addr) => {
  vi.mocked(fetchIpAddresses).mockImplementation(async (opts) => response(opts?.user ? [] : [
    { id: 1, addr, network_interface: { id: 2, vps: { id: 3, user: { id: 42 } } } },
    { id: 2, addr, user: { id: 7 } },
    { id: 3, addr },
  ]));
  expect(await searchOwnedIpAddresses({ addr, scopeUserId: 42, isAdmin: true })).toHaveLength(1);
  expect(fetchIpAddresses).toHaveBeenCalledWith(expect.objectContaining({ addr, order: 'asc' }));
  expect(vi.mocked(fetchIpAddresses).mock.calls[0]?.[0]).not.toHaveProperty('user');
});

it('walks admin ID pages before applying ownership, including a full last page', async () => {
  vi.mocked(fetchIpAddresses).mockImplementation(async (opts) => response(
    opts?.fromId === 200 ? [] : Array.from({ length: 100 }, (_, index) => ({
      id: (opts?.fromId ?? 0) + index + 1,
      addr: '192.0.2.1',
      user: { id: opts?.fromId === 100 ? 42 : 7 },
    })),
  ));
  const result = await searchOwnedIpAddresses({ addr: '192.0.2.1', scopeUserId: 42, isAdmin: true });
  expect(result).toHaveLength(100);
  expect(result[0]?.id).toBe(101);
  expect(vi.mocked(fetchIpAddresses).mock.calls.map(([opts]) => opts?.fromId)).toEqual([undefined, 100, 200]);
});

it('does not guess an ID cursor for member owner-first ordering', async () => {
  vi.mocked(fetchIpAddresses).mockResolvedValue(response(Array.from({ length: 100 }, (_, i) => ({ id: i + 1 }))));
  await expect(searchOwnedIpAddresses({ addr: '192.0.2.1', expectedUserId: 42 })).rejects.toThrow('incomplete');
  expect(fetchIpAddresses).toHaveBeenCalledOnce();
});

it('rejects a stalled cursor and propagates API failure', async () => {
  vi.mocked(fetchIpAddresses).mockResolvedValue(response(Array.from({ length: 100 }, (_, i) => ({ id: i + 1 }))));
  await expect(searchOwnedIpAddresses({ addr: '192.0.2.1', scopeUserId: 42, isAdmin: true })).rejects.toThrow('stalled');
  vi.mocked(fetchIpAddresses).mockRejectedValue(new Error('unavailable'));
  await expect(searchOwnedIpAddresses({ addr: '192.0.2.1', scopeUserId: 42, isAdmin: true })).rejects.toThrow('unavailable');
});

it('does not query IPs without a known owner', async () => {
  expect(await searchOwnedIpAddresses({ addr: '192.0.2.1' })).toEqual([]);
  expect(fetchIpAddresses).not.toHaveBeenCalled();
});

it('does not infer administrator ordering from an explicit My-view owner', async () => {
  vi.mocked(fetchIpAddresses).mockResolvedValue(response(Array.from({ length: 100 }, (_, i) => ({ id: i + 1 }))));
  await expect(searchOwnedIpAddresses({ addr: '192.0.2.1', scopeUserId: 42, isAdmin: false })).rejects.toThrow('incomplete');
  expect(fetchIpAddresses).toHaveBeenCalledOnce();
});
