// i18n-ignore-file
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { I18nProvider } from '../../../app/i18n';
import { fetchIpAddresses } from '../../../lib/api/ipAddresses';
import { fetchLocations } from '../../../lib/api/infra';
import { IpAddressesPage } from './IpAddressesPage';

const state = vi.hoisted(() => ({ language: 'en' as 'en' | 'cs', role: 'admin' as 'admin' | 'user' }));
vi.mock('../../../app/uiSettings', () => ({ useUiSettings: () => ({ settings: { language: state.language } }) }));
vi.mock('../../../app/appMode', () => ({ useAppMode: () => ({ mode: 'admin', basePath: '/admin' }) }));
vi.mock('../../../app/auth', () => ({
  useAuth: () => ({ status: 'authenticated', role: state.role, user: { id: 9 } }),
}));
vi.mock('../../../app/toasts', () => ({ useToasts: () => ({ pushToast: vi.fn() }) }));
vi.mock('../../../lib/api/ipAddresses', () => ({ fetchIpAddresses: vi.fn() }));
vi.mock('../../../lib/api/infra', () => ({ fetchLocations: vi.fn() }));
vi.mock('./ipAddresses/IpAddressesFilters', () => ({ IpAddressesFilters: () => null }));

function renderPage(url = '/admin/ip-addresses?vps=1') {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const router = createMemoryRouter([{ path: '/admin/ip-addresses', element: <IpAddressesPage /> }], {
    initialEntries: [url],
  });
  render(
    <QueryClientProvider client={queryClient}>
      <I18nProvider><RouterProvider router={router} /></I18nProvider>
    </QueryClientProvider>,
  );
  return { router };
}

const ips = (start: number, count: number) => Array.from({ length: count }, (_, index) => ({
  id: start + index, addr: `203.0.113.${start + index}`, routed: false,
}));

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(fetchLocations).mockResolvedValue({ data: [] } as never);
});
afterEach(() => { state.language = 'en'; state.role = 'admin'; });

describe('IP address inventory', () => {
  it('traverses admin rows in ascending ID even when the display sort is descending', async () => {
    vi.mocked(fetchIpAddresses).mockImplementation(async (opts) => ({
      data: opts?.fromId === 250 ? ips(251, 50) : ips(1, 250),
      meta: { total_count: 300 },
    } as never));
    renderPage();
    expect(await screen.findByTestId('admin.ip_addresses.row.300')).toBeInTheDocument();
    expect(fetchIpAddresses).toHaveBeenCalledTimes(2);
    expect(fetchIpAddresses).toHaveBeenCalledWith(expect.objectContaining({ order: 'asc', limit: 250, count: true }));
    expect(fetchIpAddresses).toHaveBeenCalledWith(expect.objectContaining({ order: 'asc', fromId: 250 }));
    expect(screen.queryByTestId('admin.ip_addresses.partial')).not.toBeInTheDocument();
  });

  it.each([
    ['en', 'Loading stopped. Loaded addresses: 250. More may exist. Retry or narrow the filters.'],
    ['cs', 'Načítání se zastavilo. Načtených adres: 250. Mohou existovat další. Zkus to znovu nebo upřesni filtry.'],
  ] as const)('renders verified rows and a %s failure notice after a late page error', async (lang, copy) => {
    state.language = lang;
    vi.mocked(fetchIpAddresses).mockImplementation(async (opts) => {
      if (opts?.fromId) throw new Error('late page failed');
      return { data: ips(1, 250), meta: { total_count: 300 } } as never;
    });
    renderPage();
    expect(await screen.findByText(copy)).toBeInTheDocument();
    expect(screen.getByTestId('admin.ip_addresses.row.250')).toBeInTheDocument();
    expect(screen.getByText(lang === 'en' ? 'Sort applies only to loaded addresses.' : 'Řazení platí jen pro načtené adresy.')).toBeInTheDocument();
  });

  it('uses one bounded response for a non-admin owner-grouped list', async () => {
    state.role = 'user';
    vi.mocked(fetchIpAddresses).mockResolvedValue({
      data: [{ id: 100 }, { id: 101 }, { id: 1 }, { id: 2 }], meta: { total_count: 4 },
    } as never);
    renderPage();
    expect(await screen.findByTestId('admin.ip_addresses.row.101')).toBeInTheDocument();
    expect(fetchIpAddresses).toHaveBeenCalledTimes(1);
    expect(fetchIpAddresses).toHaveBeenCalledWith(expect.objectContaining({ limit: 1000, order: 'asc', count: true }));
    expect(vi.mocked(fetchIpAddresses).mock.calls[0]?.[0]).not.toHaveProperty('user');
  });

  it('blocks the admin-only user filter for a non-admin actor without fallback', async () => {
    state.role = 'user';
    renderPage('/admin/ip-addresses?user=7');
    expect(await screen.findByTestId('admin.ip_addresses.unsupported_filter')).toBeInTheDocument();
    expect(fetchIpAddresses).not.toHaveBeenCalled();
  });

  it('resets an unsafe cursor URL before issuing a fresh traversal', async () => {
    vi.mocked(fetchIpAddresses).mockResolvedValue({ data: [], meta: { total_count: 0 } } as never);
    renderPage('/admin/ip-addresses?vps=1&from_id=90');
    expect(await screen.findByTestId('admin.ip_addresses.legacy_reset')).toBeInTheDocument();
    await waitFor(() => expect(fetchIpAddresses).toHaveBeenCalled());
    expect(vi.mocked(fetchIpAddresses).mock.calls[0]?.[0]).not.toHaveProperty('fromId', 90);
  });
});
