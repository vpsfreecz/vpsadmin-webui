// i18n-ignore-file
import React from 'react';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { fetchIpAddresses, fetchIpAddressIndexCapability, type IpAddress } from '../../../../lib/api/ipAddresses';
import type { Location as InfraLocation } from '../../../../lib/api/infra';
import { useProgressiveSuggestedIpQueries } from './useProgressiveSuggestedIpQueries';

vi.mock('../../../../lib/api/ipAddresses', () => ({
  fetchIpAddresses: vi.fn(), fetchIpAddressIndexCapability: vi.fn(),
}));

const locations: InfraLocation[] = [{ id: 10, label: 'Prague', environment: { id: 1, label: 'Production' } }];
function ip(id: number, enabled?: boolean, locationId = 10): IpAddress {
  return {
    id, addr: `192.0.2.${id}`, prefix: 32,
    network: { id: 100 + id, enabled, ip_version: 4, role: 'public_access',
      primary_location: { id: locationId } },
  };
}

const clients = new Set<QueryClient>();
function queryClient() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
  clients.add(client);
  return client;
}

function renderSuggestions(client = queryClient(), queryLocations = locations, enabled = true) {
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return { ...renderHook(() => useProgressiveSuggestedIpQueries(queryLocations, enabled), { wrapper }), client };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

const capabilityResult = () => {
  const data = { input: { parameters: { network_enabled: {} } } };
  return { data, envelope: { status: true, response: data } };
};
const addressResult = (data: IpAddress[] = []) => ({ data, envelope: { status: true } });
const suggestionKey = (location = 10) => ['ip_addresses', 'suggested_free', location, 4, 'public_access'];
const capabilityKey = ['ip-address-index-capability'];
async function advance(milliseconds = 0) {
  await act(async () => { await vi.advanceTimersByTimeAsync(milliseconds); });
}

afterEach(() => {
  cleanup();
  clients.forEach((client) => client.clear());
  clients.clear();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

beforeEach(() => {
  vi.resetAllMocks();
  const capability = { input: { parameters: { network_enabled: {} } } };
  vi.mocked(fetchIpAddressIndexCapability).mockResolvedValue({
    data: capability, envelope: { status: true, response: capability },
  });
});

describe('suggestion caller budget with the real QueryClient', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-09T12:00:00Z'));
    vi.mocked(fetchIpAddresses).mockResolvedValue(addressResult());
  });

  it('settles cold stalled metadata as an abort error and progresses one later location at a time', async () => {
    const metadata = deferred<ReturnType<typeof capabilityResult>>();
    vi.mocked(fetchIpAddressIndexCapability).mockReturnValue(metadata.promise);
    const moreLocations = [10, 20, 30, 40].map((id) => ({ ...locations[0], id }));
    const { client, result } = renderSuggestions(queryClient(), moreLocations);
    await advance(1);
    expect(fetchIpAddressIndexCapability).toHaveBeenCalledTimes(1);
    expect(client.getQueryState(suggestionKey(30))?.fetchStatus).toBe('idle');
    await advance(12_000);
    expect(client.getQueryState(suggestionKey(10))).toMatchObject({ status: 'error', fetchStatus: 'idle', error: expect.objectContaining({ name: 'AbortError' }) });
    expect(client.getQueryState(suggestionKey(30))?.fetchStatus).toBe('fetching');
    expect(client.getQueryState(suggestionKey(40))?.fetchStatus).toBe('idle');
    expect(fetchIpAddresses).not.toHaveBeenCalled();
    await advance(12_001);
    expect(client.getQueryState(suggestionKey(40))?.fetchStatus).toBe('fetching');
    await advance(12_001);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isLoadingMore).toBe(false);
    expect(result.current.error).toMatchObject({ name: 'AbortError' });
    expect(client.getQueryState(capabilityKey)?.fetchStatus).toBe('fetching');
    expect(fetchIpAddressIndexCapability).toHaveBeenCalledTimes(1);
    expect(fetchIpAddresses).not.toHaveBeenCalled();
    metadata.resolve(capabilityResult());
    await advance(1);
    expect(client.getQueryData(capabilityKey)).toEqual(capabilityResult().data);
    expect(fetchIpAddresses).not.toHaveBeenCalled();
  });

  it('spends eleven seconds on metadata and gives GET only the remaining second', async () => {
    const metadata = deferred<ReturnType<typeof capabilityResult>>();
    const addresses = deferred<ReturnType<typeof addressResult>>();
    vi.mocked(fetchIpAddressIndexCapability).mockReturnValue(metadata.promise);
    vi.mocked(fetchIpAddresses).mockReturnValue(addresses.promise);
    const { client, result } = renderSuggestions();
    const started = Date.now();
    await advance(11_000);
    metadata.resolve(capabilityResult());
    await advance(1);
    expect(fetchIpAddresses).toHaveBeenCalledTimes(3);
    const abortTimes: number[] = [];
    for (const [options] of vi.mocked(fetchIpAddresses).mock.calls) {
      options?.signal?.addEventListener('abort', () => abortTimes.push(Date.now()));
    }
    await advance(998);
    expect(client.getQueryState(suggestionKey())?.fetchStatus).toBe('fetching');
    await advance(2);
    expect(abortTimes).toEqual([started + 12_000, started + 12_000, started + 12_000]);
    expect(result.current.error).toMatchObject({ name: 'AbortError' });
    addresses.resolve(addressResult([ip(1, true)]));
    await advance(1);
    expect(client.getQueryData(suggestionKey())).toBeUndefined();
    expect(result.current.data).toEqual([]);
  });

  it.each(['metadata', 'GET'] as const)('consumes late %s resolution and rejection without late work or rows', async (stage) => {
    for (const outcome of ['resolve', 'reject'] as const) {
      const metadata = deferred<ReturnType<typeof capabilityResult>>();
      const addresses = deferred<ReturnType<typeof addressResult>>();
      vi.mocked(fetchIpAddressIndexCapability).mockReturnValue(metadata.promise);
      vi.mocked(fetchIpAddresses).mockReturnValue(addresses.promise);
      const unhandled = vi.fn();
      window.addEventListener('unhandledrejection', unhandled);
      const { client, result, unmount } = renderSuggestions();
      try {
        if (stage === 'GET') metadata.resolve(capabilityResult());
        await advance(12_001);
        expect(result.current.error).toMatchObject({ name: 'AbortError' });
        const calls = vi.mocked(fetchIpAddresses).mock.calls.length;
        if (stage === 'metadata') {
          if (outcome === 'resolve') metadata.resolve(capabilityResult());
          else metadata.reject(new Error('Late capability failure'));
        } else if (outcome === 'resolve') addresses.resolve(addressResult([ip(1, true)]));
        else addresses.reject(new Error('Late GET failure'));
        await advance(1);
        expect(fetchIpAddresses).toHaveBeenCalledTimes(calls);
        expect(calls).toBe(stage === 'metadata' ? 0 : 3);
        expect(client.getQueryData(suggestionKey())).toBeUndefined();
        expect(result.current.data).toEqual([]);
        expect(unhandled).not.toHaveBeenCalled();
      } finally {
        window.removeEventListener('unhandledrejection', unhandled);
        unmount(); client.clear(); vi.clearAllMocks();
      }
    }
  });

  it('uses a fresh metadata cache but still bounds a stalled GET and cleans listeners and timers', async () => {
    const client = queryClient();
    client.setQueryData(capabilityKey, capabilityResult().data);
    const addresses = deferred<ReturnType<typeof addressResult>>();
    vi.mocked(fetchIpAddresses).mockReturnValue(addresses.promise);
    const add = vi.spyOn(AbortSignal.prototype, 'addEventListener');
    const remove = vi.spyOn(AbortSignal.prototype, 'removeEventListener');
    const timers = vi.spyOn(window, 'setTimeout');
    const clear = vi.spyOn(window, 'clearTimeout');
    const { result } = renderSuggestions(client);
    await advance(1);
    expect(fetchIpAddressIndexCapability).not.toHaveBeenCalled();
    expect(fetchIpAddresses).toHaveBeenCalledTimes(3);
    await advance(12_000);
    expect(result.current.error).toMatchObject({ name: 'AbortError' });
    for (const [options] of vi.mocked(fetchIpAddresses).mock.calls) {
      const signal = options?.signal;
      expect(signal?.aborted).toBe(true);
      add.mock.calls.forEach((args, index) => {
        if (add.mock.contexts[index] === signal && args[0] === 'abort') {
          expect(remove.mock.calls.some((removed, at) => remove.mock.contexts[at] === signal && removed[1] === args[1])).toBe(true);
        }
      });
    }
    const budgets = timers.mock.calls.flatMap((args, index) => args[1] === 12_000 ? [timers.mock.results[index]?.value] : []);
    expect(budgets).toHaveLength(3);
    budgets.forEach((id) => expect(clear).toHaveBeenCalledWith(id));
    addresses.reject(new Error('Ignored transport tail'));
    await advance(1);
  });

  it('refuses an already-aborted invocation before even looking up shared metadata', async () => {
    const { client } = renderSuggestions(queryClient(), locations, false);
    const query = client.getQueryCache().find({ queryKey: suggestionKey(), exact: true });
    const queryFn = query?.options.queryFn;
    if (typeof queryFn !== 'function') throw new Error('Suggestion query function missing');
    const controller = new AbortController();
    controller.abort();
    await expect(queryFn({ client, queryKey: suggestionKey(), signal: controller.signal, meta: undefined })).rejects.toMatchObject({ name: 'AbortError' });
    expect(fetchIpAddressIndexCapability).not.toHaveBeenCalled();
    expect(fetchIpAddresses).not.toHaveBeenCalled();
  });

  it.each(['resolve', 'reject', 'cancel'] as const)('cleans caller timers and abort listeners after GET %s', async (outcome) => {
    const addresses = deferred<ReturnType<typeof addressResult>>();
    vi.mocked(fetchIpAddresses).mockReturnValue(addresses.promise);
    const add = vi.spyOn(AbortSignal.prototype, 'addEventListener');
    const remove = vi.spyOn(AbortSignal.prototype, 'removeEventListener');
    const timers = vi.spyOn(window, 'setTimeout');
    const clear = vi.spyOn(window, 'clearTimeout');
    const { client } = renderSuggestions();
    await advance(1);
    expect(fetchIpAddresses).toHaveBeenCalledTimes(3);
    if (outcome === 'resolve') addresses.resolve(addressResult());
    else if (outcome === 'reject') addresses.reject(new Error('GET rejected'));
    else await act(async () => { await client.cancelQueries({ queryKey: ['ip_addresses', 'suggested_free'] }); });
    await advance(1);
    const removed = remove.mock.calls.map((args, index) => ({ signal: remove.mock.contexts[index], listener: args[1] }));
    for (const [index, args] of add.mock.calls.entries()) {
      if (args[0] === 'abort') expect(removed).toContainEqual({ signal: add.mock.contexts[index], listener: args[1] });
    }
    const budgets = timers.mock.calls.flatMap((args, index) => args[1] === 12_000 ? [timers.mock.results[index]?.value] : []);
    expect(budgets).toHaveLength(3);
    budgets.forEach((id) => expect(clear).toHaveBeenCalledWith(id));
  });

  it.each([
    ['metadata', 'cancel', 'resolve'], ['metadata', 'cancel', 'reject'],
    ['metadata', 'unmount', 'resolve'], ['metadata', 'unmount', 'reject'],
    ['GET', 'cancel', 'resolve'], ['GET', 'cancel', 'reject'],
    ['GET', 'unmount', 'resolve'], ['GET', 'unmount', 'reject'],
  ] as const)('honors %s %s with late %s without GET or cache writes', async (stage, operation, outcome) => {
    const metadata = deferred<ReturnType<typeof capabilityResult>>();
    const addresses = deferred<ReturnType<typeof addressResult>>();
    vi.mocked(fetchIpAddressIndexCapability).mockReturnValue(metadata.promise);
    vi.mocked(fetchIpAddresses).mockReturnValue(addresses.promise);
    const { client, unmount } = renderSuggestions();
    if (stage === 'GET') metadata.resolve(capabilityResult());
    await advance(1);
    if (operation === 'unmount') unmount();
    else await act(async () => { await client.cancelQueries({ queryKey: ['ip_addresses', 'suggested_free'] }); });
    await advance(1);
    expect(client.getQueryState(suggestionKey())?.fetchStatus).toBe('idle');
    expect(client.getQueryData(suggestionKey())).toBeUndefined();
    if (stage === 'metadata') {
      if (outcome === 'resolve') metadata.resolve(capabilityResult());
      else metadata.reject(new Error('Late cancelled discovery'));
    } else if (outcome === 'resolve') addresses.resolve(addressResult([ip(1, true)]));
    else addresses.reject(new Error('Late cancelled GET'));
    await advance(1);
    expect(fetchIpAddresses).toHaveBeenCalledTimes(stage === 'metadata' ? 0 : 3);
    expect(client.getQueryData(suggestionKey())).toBeUndefined();
    if (stage === 'GET' || outcome === 'resolve') {
      expect(client.getQueryData(capabilityKey)).toEqual(capabilityResult().data);
    } else expect(client.getQueryState(capabilityKey)?.status).toBe('error');
  });

  it('shares discovery across distinct keys without letting one cancelled caller cancel the other', async () => {
    const metadata = deferred<ReturnType<typeof capabilityResult>>();
    vi.mocked(fetchIpAddressIndexCapability).mockReturnValue(metadata.promise);
    vi.mocked(fetchIpAddresses).mockImplementation(async (options) => addressResult(
      options?.role === 'public_access' ? [ip(2, true, 20)] : []
    ));
    const client = queryClient();
    renderSuggestions(client);
    const remaining = renderSuggestions(client, [{ ...locations[0], id: 20 }]);
    await advance(1);
    await act(async () => { await client.cancelQueries({ queryKey: ['ip_addresses', 'suggested_free', 10] }); });
    expect(client.getQueryState(capabilityKey)?.fetchStatus).toBe('fetching');
    metadata.resolve(capabilityResult());
    await advance(1);
    expect(fetchIpAddressIndexCapability).toHaveBeenCalledTimes(1);
    expect(fetchIpAddresses).toHaveBeenCalledTimes(3);
    expect(vi.mocked(fetchIpAddresses).mock.calls.every(([options]) => options?.location === 20)).toBe(true);
    expect(remaining.result.current.data.map((row) => row.id)).toEqual([2]);
    expect(client.getQueryData(suggestionKey(10))).toBeUndefined();
  });

  it('keeps an identical query alive while another observer remains', async () => {
    const metadata = deferred<ReturnType<typeof capabilityResult>>();
    vi.mocked(fetchIpAddressIndexCapability).mockReturnValue(metadata.promise);
    const client = queryClient();
    const first = renderSuggestions(client);
    const second = renderSuggestions(client);
    await advance(1);
    first.unmount();
    expect(client.getQueryCache().find({ queryKey: suggestionKey(), exact: true })?.getObserversCount()).toBe(1);
    metadata.resolve(capabilityResult());
    await advance(1);
    expect(fetchIpAddressIndexCapability).toHaveBeenCalledTimes(1);
    expect(fetchIpAddresses).toHaveBeenCalledTimes(3);
    expect(second.result.current.isLoading).toBe(false);
    expect(vi.mocked(fetchIpAddresses).mock.calls.every(([options]) => options?.signal?.aborted === false)).toBe(true);
  });

  it('reuses both five-minute caches and refetches after their freshness expires', async () => {
    const client = queryClient();
    const first = renderSuggestions(client);
    await advance(1);
    first.unmount();
    await advance(4 * 60_000);
    const second = renderSuggestions(client);
    await advance(1);
    expect(second.result.current.isLoading).toBe(false);
    expect(fetchIpAddressIndexCapability).toHaveBeenCalledTimes(1);
    expect(fetchIpAddresses).toHaveBeenCalledTimes(3);
    const capability = client.getQueryCache().find({ queryKey: capabilityKey, exact: true });
    const suggestion = client.getQueryCache().find({ queryKey: suggestionKey(), exact: true });
    if (!capability || !suggestion) throw new Error('Warm capability and suggestion caches must be present');
    const updatedAt = { capability: capability.state.dataUpdatedAt, suggestion: suggestion.state.dataUpdatedAt };
    second.unmount();
    await advance(60_001);
    expect(client.getQueryCache().find({ queryKey: capabilityKey, exact: true })).toBe(capability);
    expect(client.getQueryCache().find({ queryKey: suggestionKey(), exact: true })).toBe(suggestion);
    expect(capability.state.dataUpdatedAt).toBe(updatedAt.capability);
    expect(suggestion.state.dataUpdatedAt).toBe(updatedAt.suggestion);
    const expired = renderSuggestions(client);
    await advance(1);
    expect(expired.result.current.isLoading).toBe(false);
    expect(fetchIpAddressIndexCapability).toHaveBeenCalledTimes(2);
    expect(fetchIpAddresses).toHaveBeenCalledTimes(6);
    expect(capability.state.dataUpdatedAt).toBeGreaterThan(updatedAt.capability + 5 * 60_000);
    expect(suggestion.state.dataUpdatedAt).toBeGreaterThan(updatedAt.suggestion + 5 * 60_000);
  });

  it('retries a settled metadata failure normally with a fresh discovery and caller budget', async () => {
    vi.mocked(fetchIpAddressIndexCapability).mockRejectedValueOnce(new Error('Capability unavailable'));
    const { result } = renderSuggestions();
    await advance(1);
    expect(result.current.error).toEqual(new Error('Capability unavailable'));
    expect(fetchIpAddresses).not.toHaveBeenCalled();
    act(() => result.current.retryErrors());
    await advance(1);
    expect(fetchIpAddressIndexCapability).toHaveBeenCalledTimes(2);
    expect(fetchIpAddresses).toHaveBeenCalledTimes(3);
    expect(result.current.error).toBeUndefined();
  });

  it('bounds retries that rejoin still-pending metadata and permits a later explicit recovery', async () => {
    const metadata = deferred<ReturnType<typeof capabilityResult>>();
    vi.mocked(fetchIpAddressIndexCapability).mockReturnValue(metadata.promise);
    const { result } = renderSuggestions();
    await advance(12_001);
    act(() => result.current.retryErrors());
    await advance(12_001);
    expect(result.current.error).toMatchObject({ name: 'AbortError' });
    expect(fetchIpAddressIndexCapability).toHaveBeenCalledTimes(1);
    expect(fetchIpAddresses).not.toHaveBeenCalled();
    act(() => result.current.retryErrors());
    await advance(6_000);
    metadata.resolve(capabilityResult());
    await advance(1);
    expect(result.current.error).toBeUndefined();
    expect(fetchIpAddressIndexCapability).toHaveBeenCalledTimes(1);
    expect(fetchIpAddresses).toHaveBeenCalledTimes(3);
  });

  it('retains partial failures while later locations progress', async () => {
    vi.mocked(fetchIpAddresses).mockImplementation(async (options) => {
      if (options?.location === 10 && options.role === 'public_access') throw new Error('One pool unavailable');
      return addressResult(options?.location === 30 && options.role === 'public_access'
        ? [ip(3, true, 30)] : []);
    });
    const { result } = renderSuggestions(queryClient(), [10, 20, 30].map((id) => ({ ...locations[0], id })));
    await advance(1);
    await advance(1);
    expect(fetchIpAddresses).toHaveBeenCalledTimes(9);
    expect(result.current.data.map((row) => row.id)).toEqual([3]);
    expect(result.current.partialError).toBe(true);
    expect(result.current.error).toBeUndefined();
    expect(result.current.isLoadingMore).toBe(false);
  });

  it('keeps a separate manual-filter query selected when a suggestion finishes late', async () => {
    const addresses = deferred<ReturnType<typeof addressResult>>();
    vi.mocked(fetchIpAddresses).mockImplementation((options) => options?.addr
      ? Promise.resolve(addressResult([ip(99, true)])) : addresses.promise);
    const client = queryClient();
    const wrapper = ({ children }: { children: React.ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
    const { result, rerender } = renderHook(({ filtered }) => {
      const suggestions = useProgressiveSuggestedIpQueries(locations, !filtered);
      const list = useQuery({ queryKey: ['ip_addresses', 'index', 'manual'], enabled: filtered,
        queryFn: async () => (await fetchIpAddresses({ addr: '192.0.2.99' })).data });
      return { data: filtered ? list.data : suggestions.data };
    }, { wrapper, initialProps: { filtered: false } });
    await advance(1);
    rerender({ filtered: true });
    await advance(1);
    expect(result.current.data?.map((row) => row.id)).toEqual([99]);
    addresses.resolve(addressResult([ip(1, true)]));
    await advance(1);
    expect(client.getQueryData(suggestionKey())).toEqual([ip(1, true)]);
    expect(result.current.data?.map((row) => row.id)).toEqual([99]);
  });
});

describe('suggested IP availability', () => {
  it('filters disabled pools before the bounded server page so enabled suggestions are not starved', async () => {
    const rows = [...Array.from({ length: 50 }, (_, index) => ip(index + 1, false)), ip(51, true)];
    vi.mocked(fetchIpAddresses).mockImplementation(async (opts) => {
      const candidates = opts?.version === 4 && opts.role === 'public_access' ? rows : [];
      const filtered = opts?.networkEnabled ? candidates.filter((row) => row.network?.enabled) : candidates;
      return { data: filtered.slice(0, opts?.limit), envelope: { status: true } };
    });
    const { result } = renderSuggestions();
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.data.map((row) => row.id)).toEqual([51]);
    expect(fetchIpAddressIndexCapability).toHaveBeenCalledTimes(1);
    expect(fetchIpAddresses).toHaveBeenCalledWith(expect.objectContaining({
      version: 4, role: 'public_access', limit: 50, networkEnabled: true,
    }));
  });

  it('keeps the local stale-response guard even when the server filter is advertised', async () => {
    vi.mocked(fetchIpAddresses).mockImplementation(async (opts) => ({
      data: opts?.version === 4 && opts.role === 'public_access' ? [ip(1, false), ip(2, true)] : [],
      envelope: { status: true },
    }));
    const { result } = renderSuggestions();
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.data.map((row) => row.id)).toEqual([2]);
  });

  it('omits the unsupported filter after a successful older-API capability response', async () => {
    const capability = { input: { parameters: {} } };
    vi.mocked(fetchIpAddressIndexCapability).mockResolvedValue({
      data: capability, envelope: { status: true, response: capability },
    });
    vi.mocked(fetchIpAddresses).mockImplementation(async (opts) => ({
      data: opts?.version === 4 && opts.role === 'public_access' ? [ip(1), ip(2, false)] : [],
      envelope: { status: true },
    }));
    const { result } = renderSuggestions();
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.data.map((row) => row.id)).toEqual([1]);
    expect(fetchIpAddresses).toHaveBeenCalledTimes(3);
    for (const [opts] of vi.mocked(fetchIpAddresses).mock.calls) {
      expect(opts).toMatchObject({ limit: 50 });
      expect(opts).not.toHaveProperty('networkEnabled');
    }
  });

  it('reports a failed capability lookup rather than treating it as an older API', async () => {
    vi.mocked(fetchIpAddressIndexCapability).mockRejectedValue(new Error('Capability unavailable'));
    const { result } = renderSuggestions();
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toEqual(new Error('Capability unavailable'));
    expect(fetchIpAddresses).not.toHaveBeenCalled();
  });
});
