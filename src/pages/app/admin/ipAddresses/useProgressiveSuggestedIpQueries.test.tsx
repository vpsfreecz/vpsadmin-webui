// i18n-ignore-file
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { fetchIpAddresses, fetchIpAddressIndexCapability, type IpAddress } from '../../../../lib/api/ipAddresses';
import { useProgressiveSuggestedIpQueries } from './useProgressiveSuggestedIpQueries';

vi.mock('../../../../lib/api/ipAddresses', () => ({
  fetchIpAddresses: vi.fn(), fetchIpAddressIndexCapability: vi.fn(),
}));

const locations = [{ id: 10, label: 'Prague', environment: { id: 1, label: 'Production' } }];
function ip(id: number, enabled?: boolean): IpAddress {
  return {
    id, addr: `192.0.2.${id}`, prefix: 32,
    network: { id: 100 + id, enabled, ip_version: 4, role: 'public_access',
      primary_location: { id: 10 } },
  };
}

function renderSuggestions() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return renderHook(() => useProgressiveSuggestedIpQueries(locations, true), { wrapper });
}

beforeEach(() => {
  vi.resetAllMocks();
  const capability = { input: { parameters: { network_enabled: {} } } };
  vi.mocked(fetchIpAddressIndexCapability).mockResolvedValue({
    data: capability, envelope: { status: true, response: capability },
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
