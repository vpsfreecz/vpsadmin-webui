// i18n-ignore-file
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { I18nProvider } from '../../../../app/i18n';
import { fetchNetworkTrafficUserTop } from '../../../../lib/api/networking';
import { NetworkTrafficUsersPage } from './NetworkTrafficUsersPage';

vi.mock('../../../../app/uiSettings', () => ({ useUiSettings: () => ({ settings: { language: 'en' } }) }));
vi.mock('../../../../lib/api/networking', () => ({ fetchNetworkTrafficUserTop: vi.fn() }));

function renderPage(url: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const router = createMemoryRouter([{ path: '/traffic', element: <NetworkTrafficUsersPage /> }], {
    initialEntries: [url],
  });
  render(
    <QueryClientProvider client={client}>
      <I18nProvider>
        <RouterProvider router={router} />
      </I18nProvider>
    </QueryClientProvider>
  );
  return router;
}
beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(fetchNetworkTrafficUserTop).mockResolvedValue({
    data: [],
    meta: {},
    envelope: { status: true },
    httpStatus: 200,
  });
});

describe('traffic list supported filters', () => {
  it('removes a legacy text query and cursor visibly while preserving the date filters', async () => {
    const router = renderPage('/traffic?q=member&year=2025&month=3&from_bytes=99&page=2');
    expect(await screen.findByTestId('admin.network_traffic_users.search_removed')).toHaveTextContent(
      'Text search is unavailable here.'
    );
    await waitFor(() => expect(fetchNetworkTrafficUserTop).toHaveBeenCalled());
    const params = new URLSearchParams(router.state.location.search);
    expect(params.has('q')).toBe(false);
    expect(params.has('from_bytes')).toBe(false);
    expect(params.get('page') ?? '1').toBe('1');
    expect(params.get('year')).toBe('2025');
    expect(params.get('month')).toBe('3');
    for (const [options] of vi.mocked(fetchNetworkTrafficUserTop).mock.calls) {
      expect(options).not.toHaveProperty('q');
      expect(options).toMatchObject({ year: 2025, month: 3 });
      expect(options?.fromBytes).toBeUndefined();
    }
    expect(screen.queryByTestId('admin.network_traffic_users.filter.q')).not.toBeInTheDocument();
  });

  it('retains the supported byte cursor when no unsupported search was removed', async () => {
    renderPage('/traffic?year=2025&month=3&from_bytes=99');
    await waitFor(() =>
      expect(fetchNetworkTrafficUserTop).toHaveBeenCalledWith(
        expect.objectContaining({ year: 2025, month: 3, fromBytes: 99 })
      )
    );
    expect(screen.queryByTestId('admin.network_traffic_users.search_removed')).not.toBeInTheDocument();
  });
});
