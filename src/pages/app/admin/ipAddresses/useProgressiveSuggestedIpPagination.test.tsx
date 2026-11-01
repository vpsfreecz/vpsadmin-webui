// i18n-ignore-file
import React from 'react';
import { QueryClient, QueryClientProvider, } from '@tanstack/react-query';
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

const addressResult = (data: IpAddress[] = []) => ({ data, envelope: { status: true } });
const suggestionKey = () => ['ip_addresses', 'suggested_free', 10, 4, 'public_access', 'any'];
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

describe('primary-location suggestion pagination', () => {
  it('keeps the original deadline when a full foreign-location page requires another GET', async () => {
    vi.useFakeTimers();
    const first = deferred<ReturnType<typeof addressResult>>();
    const next = deferred<ReturnType<typeof addressResult>>();
    vi.mocked(fetchIpAddresses).mockImplementation((opts) => {
      if (opts?.version !== 4 || opts.role !== 'public_access') return Promise.resolve(addressResult());
      return opts.fromId === undefined ? first.promise : next.promise;
    });
    const { client, result } = renderSuggestions();
    await advance(11_000);
    first.resolve(addressResult(Array.from({ length: 50 }, (_, i) => ip(i + 1, true, 20))));
    await advance(1);
    const calls = vi.mocked(fetchIpAddresses).mock.calls
      .map(([opts]) => opts).filter((opts) => opts?.version === 4 && opts.role === 'public_access');
    expect(calls.map((opts) => opts?.fromId)).toEqual([undefined, 50]);
    expect(calls[0]?.signal).toBe(calls[1]?.signal);
    await advance(1_000);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toMatchObject({ name: 'AbortError' });
    next.resolve(addressResult([ip(51, true)]));
    await advance(1);
    expect(client.getQueryData(suggestionKey())).toBeUndefined();
    expect(result.current.data).toEqual([]);
  });

  it('continues past a full page from an associated location until primary-location addresses are found', async () => {
    const shared = Array.from({ length: 50 }, (_, i) => ip(i + 1, true, 20));
    const primary = [ip(51, true), ip(52, true), ip(53, true)];
    vi.mocked(fetchIpAddresses).mockImplementation(async (opts) => {
      if (opts?.version !== 4 || opts.role !== 'public_access') return addressResult();
      return addressResult(opts.fromId === undefined ? shared : primary);
    });
    const { result } = renderSuggestions();
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.data.map((row) => row.id)).toEqual([51, 52, 53]);
    const calls = vi.mocked(fetchIpAddresses).mock.calls
      .map(([opts]) => opts).filter((opts) => opts?.version === 4 && opts.role === 'public_access');
    expect(calls.map((opts) => opts?.fromId)).toEqual([undefined, 50]);
    expect(calls[1]?.signal).toBe(calls[0]?.signal);
  });

  it('stops after a full page already provides the sample', async () => {
    vi.mocked(fetchIpAddresses).mockImplementation(async (opts) => addressResult(
      opts?.version === 4 && opts.role === 'public_access'
        ? Array.from({ length: 50 }, (_, i) => ip(i + 1, true)) : [],
    ));
    const { result } = renderSuggestions();
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.data.map((row) => row.id)).toEqual([1, 2, 3]);
    expect(fetchIpAddresses).toHaveBeenCalledTimes(3);
  });

  it('rejects a repeated page instead of looping or reporting that a location has no addresses', async () => {
    const shared = Array.from({ length: 50 }, (_, i) => ip(i + 1, true, 20));
    vi.mocked(fetchIpAddresses).mockImplementation(async (opts) => addressResult(
      opts?.version === 4 && opts.role === 'public_access' ? shared : [],
    ));
    const { result } = renderSuggestions();
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toMatchObject({ message: 'Invalid IP suggestion cursor' });
    expect(fetchIpAddresses).toHaveBeenCalledTimes(4);
  });

  it('reports the scan bound instead of a false empty location', async () => {
    vi.mocked(fetchIpAddresses).mockImplementation(async (opts) => addressResult(
      opts?.version === 4 && opts.role === 'public_access'
        ? Array.from({ length: 50 }, (_, i) => ip((opts.fromId ?? 0) + i + 1, true, 20)) : [],
    ));
    const { result } = renderSuggestions();
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toMatchObject({ message: 'IP suggestion scan limit reached' });
    expect(fetchIpAddresses).toHaveBeenCalledTimes(22);
  });
});
