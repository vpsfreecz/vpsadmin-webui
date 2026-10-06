import { describe, expect, test, vi } from 'vitest';

import { fetchNetworks, updateNetwork, networkEnabledWritable } from './networks';

function mockFetchOk(response: unknown) {
  return vi.fn<typeof fetch>().mockResolvedValue({
    ok: true,
    headers: new Headers({ 'content-type': 'application/json' }),
    json: async () => ({ status: true, response }),
  } as Response);
}

describe('networks API wrappers', () => {
  test('requires advertised enabled write support', () => {
    expect(networkEnabledWritable()).toBe(false);
    expect(networkEnabledWritable({ input: { parameters: { managed: {} } } })).toBe(false);
    expect(networkEnabledWritable({ input: { parameters: { enabled: {} } } })).toBe(true);
  });

  test('serializes false explicitly and preserves omission on unrelated updates', async () => {
    const fetchMock = mockFetchOk({ network: { id: 101, enabled: false } });
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    await updateNetwork({ id: 101, enabled: false });
    await updateNetwork({ id: 101, label: 'Inventory' });
    const writes = fetchMock.mock.calls.filter(([, init]) => init?.method === 'PUT');
    expect(JSON.parse(String(writes[0]?.[1]?.body))).toEqual({ network: { enabled: false } });
    expect(JSON.parse(String(writes[1]?.[1]?.body))).toEqual({ network: { label: 'Inventory' } });
  });
  test('fetchNetworks forwards only filters supported by Network.Index', async () => {
    const fetchMock = mockFetchOk({ networks: [{ id: 101, purpose: 'vps' }] });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const res = await fetchNetworks({
      limit: 25,
      fromId: 90,
      locationId: 1,
      purpose: 'vps',
      // Exercise a stale runtime caller while the public type rejects these fields.
      q: 'public',
      ipVersion: 4,
      role: 'public_access',
      managed: true,
    } as Parameters<typeof fetchNetworks>[0] & {
      q: string;
      ipVersion: number;
      role: string;
      managed: boolean;
    });

    expect(res.data).toEqual([{ id: 101, purpose: 'vps' }]);

    const call = fetchMock.mock.calls.find(([requestUrl]) =>
      new URL(String(requestUrl)).pathname.endsWith('/networks')
    );
    if (!call) throw new Error('Expected a networks#index request');
    const url = String(call[0]);
    const parsed = new URL(url);

    expect(parsed.pathname).toBe('/v7.0/networks');
    expect([...parsed.searchParams.keys()].sort()).toEqual(
      [
        'network[from_id]',
        'network[limit]',
        'network[location]',
        'network[purpose]',
      ].sort()
    );
    expect(parsed.searchParams.get('network[from_id]')).toBe('90');
    expect(parsed.searchParams.get('network[limit]')).toBe('25');
    expect(parsed.searchParams.get('network[location]')).toBe('1');
    expect(parsed.searchParams.get('network[purpose]')).toBe('vps');
  });
});
