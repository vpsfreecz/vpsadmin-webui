import { apiWire } from '../../test/haveapiXhr';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { createClient, type RequestExecutor } from 'vpsadmin-typescript-client';

import { ApiOutputError } from './apiOutput';
import * as sdk from './sdk';
import { fetchNetworks, fetchNetworkWriteCapability, updateNetwork, networkEnabledWritable } from './networks';

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
    expect(networkEnabledWritable({ input: { parameters: { enabled: {} } } })).toBe(false);
    expect(networkEnabledWritable({ input: { parameters: { enabled: { type: 'Boolean' } } } })).toBe(true);
  });

  test('serializes false explicitly and preserves omission on unrelated updates', async () => {
    const fetchMock = mockFetchOk({ network: { id: 101, enabled: false } });
    apiWire.respond = fetchMock as unknown as typeof fetch;
    await updateNetwork({ id: 101, enabled: false });
    await updateNetwork({ id: 101, label: 'Inventory' });
    const writes = fetchMock.mock.calls.filter(([, init]) => init?.method === 'PUT');
    expect(JSON.parse(String(writes[0]?.[1]?.body))).toEqual({ network: { enabled: false } });
    expect(JSON.parse(String(writes[1]?.[1]?.body))).toEqual({ network: { label: 'Inventory' } });
  });
  test('keeps authoritative zero and optional missing network counts without a client fallback', async () => {
    const rows = [
      { id: 101, available_to_users: 0, owned_unassigned: 2, owned: 5, size: 256, used: 9, taken: 7 },
      { id: 102, owned: 5, size: 256, used: 9, taken: 7 },
    ];
    apiWire.respond = mockFetchOk({ networks: rows });
    const result = await fetchNetworks();
    expect(result.data).toEqual(rows);
    expect(result.data[0]?.available_to_users).toBe(0);
    expect(result.data[1]).not.toHaveProperty('available_to_users');
    expect(result.data[1]).not.toHaveProperty('owned_unassigned');
  });

  test('fetchNetworks forwards only filters supported by Network.Index', async () => {
    const fetchMock = mockFetchOk({ networks: [{ id: 101, purpose: 'vps' }] });
    apiWire.respond = fetchMock as unknown as typeof fetch;

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

describe('network write capability pilot', () => {
  const execute = vi.fn<RequestExecutor>();
  const receipt = (data: unknown) => ({
    data,
    meta: { future: false, total_count: 0 },
    envelope: { status: true, response: data },
    httpStatus: 200,
  });

  beforeEach(() => {
    execute.mockReset();
    vi.spyOn(sdk, 'getApi').mockResolvedValue(createClient({ execute }));
  });
  afterEach(() => { vi.restoreAllMocks(); });

  test.each([
    [undefined, '/networks?method=POST'],
    [101, '/networks/101?method=PUT'],
  ] as const)('uses the generated action description for network %s', async (id, path) => {
    const data = {
      input: { parameters: { enabled: { type: 'Boolean', required: false, nullable: false, default: false } } },
    };
    const result = receipt(data);
    execute.mockResolvedValueOnce(result);

    const capability = await fetchNetworkWriteCapability(id);

    expect(execute).toHaveBeenCalledOnce();
    expect(execute).toHaveBeenCalledWith(expect.objectContaining({
      method: 'OPTIONS', path, inputNamespace: null, outputNamespace: null,
    }));
    expect(capability.data).toBe(data);
    expect(capability.meta).toBe(result.meta);
    expect(capability.envelope).toBe(result.envelope);
    expect(capability.httpStatus).toBe(200);
    expect(networkEnabledWritable(capability.data)).toBe(true);
  });

  test.each([
    {},
    { input: null },
    { input: {} },
    { input: { parameters: null } },
    { input: { parameters: {} } },
    { input: { parameters: { managed: { type: 'Boolean' } } } },
  ])('keeps absent authorization-filtered fields unsupported: %j', async (data) => {
    execute.mockResolvedValueOnce(receipt(data));
    const result = await fetchNetworkWriteCapability();
    expect(result.data).toBe(data);
    expect(networkEnabledWritable(result.data)).toBe(false);
  });

  test.each([
    null,
    [],
    { input: [] },
    { input: false },
    { input: { parameters: [] } },
    { input: { parameters: false } },
    { input: { parameters: { enabled: null } } },
    { input: { parameters: { enabled: [] } } },
    { input: { parameters: { enabled: {} } } },
    { input: { parameters: { enabled: { type: 'String' } } } },
    { input: { parameters: { enabled: { type: 'Boolean', nullable: 'false' } } } },
  ])('rejects malformed capability metadata with the complete receipt: %j', async (data) => {
    const result = receipt(data);
    execute.mockResolvedValueOnce(result);
    const pending = fetchNetworkWriteCapability(101);
    await expect(pending).rejects.toBeInstanceOf(ApiOutputError);
    await expect(pending).rejects.toMatchObject({
      name: 'ApiOutputError', code: 'INVALID_API_OUTPUT', phase: 'post-dispatch', result,
    });
  });

  test('does not turn a failed capability lookup into an unsupported-field response', async () => {
    const denied = new Error('Capability access denied');
    execute.mockRejectedValueOnce(denied);
    await expect(fetchNetworkWriteCapability(101)).rejects.toBe(denied);
  });

  test('does not reuse a capability after the shared binding changes', async () => {
    execute.mockResolvedValueOnce(receipt({ input: { parameters: { enabled: { type: 'Boolean' } } } }));
    expect(networkEnabledWritable((await fetchNetworkWriteCapability(101)).data)).toBe(true);

    const nextExecute = vi.fn<RequestExecutor>().mockResolvedValueOnce(receipt({ input: { parameters: {} } }));
    vi.mocked(sdk.getApi).mockResolvedValueOnce(createClient({ execute: nextExecute }));
    expect(networkEnabledWritable((await fetchNetworkWriteCapability(101)).data)).toBe(false);
    expect(nextExecute).toHaveBeenCalledOnce();
    expect(execute).toHaveBeenCalledOnce();
  });

  test.each([null, false, {}, { type: 'String' }, { type: 'Boolean', required: 'false' }])(
    'fails closed on malformed cached enabled metadata: %j', (enabled) => {
      expect(networkEnabledWritable({ input: { parameters: { enabled } } })).toBe(false);
    },
  );
});

describe('network capability actual XHR', () => {
  let previousConfig: typeof window.vpsAdmin;
  beforeEach(() => {
    previousConfig = window.vpsAdmin;
    window.vpsAdmin = {
      api: { url: 'https://network-pilot.example.test/mounted', version: '7.0' },
      accessToken: 'network-pilot-token',
      webuiNext: { haveApi: { authHeader: 'X-Token', metaNamespace: '_meta' } },
    };
  });
  afterEach(() => { window.vpsAdmin = previousConfig; });

  test.each([
    [undefined, '/mounted/v7.0/networks', 'POST'],
    [101, '/mounted/v7.0/networks/101', 'PUT'],
  ] as const)('preserves the live network %s capability receipt through the installed runtime', async (id, path, method) => {
    const data = { input: { parameters: { enabled: { type: 'Boolean', required: false, nullable: false } } } };
    const envelope = { status: true, response: { ...data, _meta: { future: false, total_count: 0 } } };
    apiWire.respond = async () => ({ status: 200, json: async () => envelope });

    const result = await fetchNetworkWriteCapability(id);

    expect(apiWire.requests).toHaveLength(1);
    const request = apiWire.requests[0]!;
    expect(request.method).toBe('OPTIONS');
    const url = new URL(request.url);
    expect(url.pathname).toBe(path);
    expect(url.searchParams.get('method')).toBe(method);
    expect(request.headers['X-Token']).toBe('network-pilot-token');
    expect(networkEnabledWritable(result.data)).toBe(true);
    expect(result.meta).toEqual({ future: false, total_count: 0 });
    expect(result.envelope).toEqual(envelope);
    expect(result.httpStatus).toBe(200);
  });

  test('keeps a successful older description without enabled unsupported', async () => {
    apiWire.respond = mockFetchOk({ input: { parameters: { label: { type: 'String' } } } });
    expect(networkEnabledWritable((await fetchNetworkWriteCapability()).data)).toBe(false);
  });

  test('retains explicit null metadata in a rejected wire envelope', async () => {
    const envelope = { status: true, response: { input: { parameters: {} }, _meta: null } };
    apiWire.respond = async () => ({ status: 200, json: async () => envelope });
    await expect(fetchNetworkWriteCapability(101)).rejects.toMatchObject({
      name: 'HaveApiError', failure: 'protocol',
      result: { envelope, data: envelope.response, httpStatus: 200 },
    });
  });

  test('preserves denied capability errors instead of assuming an older API', async () => {
    const envelope = { status: false, message: 'Capability access denied' };
    apiWire.respond = async () => ({ status: 403, json: async () => envelope });
    await expect(fetchNetworkWriteCapability(101)).rejects.toMatchObject({
      httpStatus: 403, envelope,
    });
  });

  test('retains the wire receipt when live application metadata is malformed', async () => {
    const envelope = { status: true, response: { input: { parameters: { enabled: { type: 'String' } } } } };
    apiWire.respond = async () => ({ status: 200, json: async () => envelope });
    await expect(fetchNetworkWriteCapability(101)).rejects.toMatchObject({
      name: 'ApiOutputError', result: { envelope, httpStatus: 200 },
    });
  });
});
