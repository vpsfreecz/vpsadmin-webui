// i18n-ignore-file
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { I18nProvider } from '../../../../app/i18n';
import { fetchHostIpAddress, fetchHostIpAddresses } from '../../../../lib/api/networking';
import { HostIpAddressesPage } from './HostIpAddressesPage';

const state = vi.hoisted(() => ({ language: 'en' as 'en' | 'cs', role: 'admin' as 'admin' | 'user' }));
vi.mock('../../../../app/uiSettings', () => ({
  useUiSettings: () => ({ settings: { language: state.language } }),
}));
vi.mock('../../../../app/auth', () => ({
  useAuth: () => ({ status: 'authenticated', role: state.role, user: { id: 9 } }),
}));
vi.mock('../../../../app/toasts', () => ({ useToasts: () => ({ pushToast: vi.fn() }) }));
vi.mock('../../../../lib/api/networking', () => ({
  fetchHostIpAddresses: vi.fn(), fetchHostIpAddress: vi.fn(),
  assignHostIpAddress: vi.fn(), deleteHostIpAddress: vi.fn(),
  freeHostIpAddress: vi.fn(), updateHostIpAddress: vi.fn(),
}));

function renderPage(url = '/admin/networking/host-ip-addresses') {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const router = createMemoryRouter([
    { path: '/admin/networking/host-ip-addresses', element: <HostIpAddressesPage /> },
  ], { initialEntries: [url] });
  render(
    <QueryClientProvider client={queryClient}>
      <I18nProvider><RouterProvider router={router} /></I18nProvider>
    </QueryClientProvider>,
  );
  return { router };
}

const hostRows = (start: number, count: number) => Array.from({ length: count }, (_, index) => ({
  id: start + index, addr: `203.0.113.${start + index}`, assigned: true, user_created: true,
}));

afterEach(() => { state.language = 'en'; state.role = 'admin'; });
beforeEach(() => vi.clearAllMocks());

describe('host IP inventory', () => {
  it.each([
    ['en', 'Loading stopped. Loaded addresses: 250. More may exist. Retry or narrow the filters.'],
    ['cs', 'Načítání se zastavilo. Načtených adres: 250. Mohou existovat další. Zkus to znovu nebo upřesni filtry.'],
  ] as const)('renders %s partial rows, blocks state actions and keeps verified PTR editing', async (lang, expected) => {
    state.language = lang;
    vi.mocked(fetchHostIpAddresses).mockImplementation(async (opts) => {
      if (opts?.fromId) throw new Error('late page failed');
      return { data: hostRows(1, 250), meta: { total_count: 300 } } as never;
    });
    vi.mocked(fetchHostIpAddress).mockResolvedValue({ data: hostRows(1, 1)[0] } as never);
    renderPage();

    expect(await screen.findByText(expected)).toBeInTheDocument();
    expect(screen.getByTestId('admin.host_ip_addresses.row.1')).toBeInTheDocument();
    expect(screen.queryByTestId('admin.host_ip_addresses.row.1.free')).not.toBeInTheDocument();
    expect(screen.queryByTestId('admin.host_ip_addresses.row.1.delete')).not.toBeInTheDocument();
    expect(fetchHostIpAddresses).toHaveBeenCalledWith(expect.objectContaining({ order: 'asc', limit: 250, count: true }));
    expect(fetchHostIpAddresses).toHaveBeenCalledWith(expect.objectContaining({ fromId: 250, order: 'asc' }));
    fireEvent.click(screen.getByTestId('admin.host_ip_addresses.row.1.ptr'));
    await waitFor(() => expect(fetchHostIpAddress).toHaveBeenCalledWith(1));
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
  });

  it('does not open stale PTR detail after the address filter changes', async () => {
    let resolveDetail!: (value: unknown) => void;
    vi.mocked(fetchHostIpAddresses).mockResolvedValue({ data: hostRows(1, 1), meta: { total_count: 1 } } as never);
    vi.mocked(fetchHostIpAddress).mockImplementation(() => new Promise((resolve) => { resolveDetail = resolve; }) as never);
    renderPage();
    const ptr = await screen.findByTestId('admin.host_ip_addresses.row.1.ptr');
    fireEvent.click(ptr);
    await waitFor(() => expect(fetchHostIpAddress).toHaveBeenCalledWith(1));
    fireEvent.change(screen.getByTestId('admin.host_ip_addresses.filter.addr'), { target: { value: '203.0.113.8' } });
    resolveDetail({ data: hostRows(1, 1)[0] });
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('rejects a user filter under a non-admin API role without making a request', async () => {
    state.role = 'user';
    renderPage('/admin/networking/host-ip-addresses?user=7');
    expect(await screen.findByTestId('admin.host_ip_addresses.unsupported_filter')).toBeInTheDocument();
    expect(fetchHostIpAddresses).not.toHaveBeenCalled();
  });

  it('resets unsupported q and cursor settings visibly before requesting exact filters', async () => {
    vi.mocked(fetchHostIpAddresses).mockResolvedValue({ data: [], meta: { total_count: 0 } } as never);
    renderPage('/admin/networking/host-ip-addresses?q=old&from_id=10');
    expect(await screen.findByTestId('admin.host_ip_addresses.legacy_reset')).toBeInTheDocument();
    await waitFor(() => expect(fetchHostIpAddresses).toHaveBeenCalled());
    for (const [opts] of vi.mocked(fetchHostIpAddresses).mock.calls) {
      expect(opts).not.toHaveProperty('q');
      expect(opts).not.toHaveProperty('fromId', 10);
    }
  });
});
