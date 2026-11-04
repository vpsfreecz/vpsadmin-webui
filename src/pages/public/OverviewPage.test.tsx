// i18n-ignore-file

import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { markSessionExpiredNotice } from '../../lib/auth/sessionExpiredNotice';
import { fetchNews, fetchOutages, fetchPublicNodeStatus, fetchPublicStats } from '../../lib/api/public';
import { OverviewPage } from './OverviewPage';

vi.mock('../../app/config', () => ({
  getRuntimeConfig: () => ({
    apiBaseUrl: '/api',
    publicStatus: {
      ipv4Warn: 100,
      ipv4Critical: 20,
    },
  }),
}));

vi.mock('../../app/i18n', () => ({
  useI18n: () => ({
    t: (key: string, vars?: Record<string, unknown>) => (vars?.['count'] == null ? key : `${key}:${vars['count']}`),
    tc: (key: string, count: number) => `${key}:${count}`,
    preferredLanguageCodes: ['en', 'cs'],
  }),
}));

vi.mock('../../lib/api/public', () => ({
  fetchNews: vi.fn(),
  fetchOutages: vi.fn(),
  fetchPublicNodeStatus: vi.fn(),
  fetchPublicStats: vi.fn(),
}));

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location.search">{location.search}</div>;
}

function renderPage(initialEntry = '/?session=expired') {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  render(
    <React.StrictMode>
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[initialEntry]}>
          <Routes>
            <Route
              path="/"
              element={
                <>
                  <LocationProbe />
                  <OverviewPage />
                </>
              }
            />
            <Route path="/outages" element={<div data-testid="outages.route" />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    </React.StrictMode>,
  );
}

function installOverviewMocks() {
  vi.mocked(fetchPublicStats).mockResolvedValue({
    data: {
      user_count: 42,
      vps_count: 13,
      ipv4_left: 1000,
    },
    envelope: { status: true, response: {} }, meta: {}, httpStatus: 200,
  });
  vi.mocked(fetchPublicNodeStatus).mockResolvedValue({
    data: [],
    envelope: { status: true, response: {} }, meta: {}, httpStatus: 200,
  });
  vi.mocked(fetchOutages).mockResolvedValue({
    data: [],
    envelope: { status: true, response: {} }, meta: {}, httpStatus: 200,
  });
  vi.mocked(fetchNews).mockResolvedValue({
    data: [],
    envelope: { status: true, response: {} }, meta: {}, httpStatus: 200,
  });
}

afterEach(() => {
  sessionStorage.clear();
  vi.clearAllMocks();
});

describe('OverviewPage session expiry notice', () => {
  it('does not show a stale expired-session URL as an inactivity warning', async () => {
    installOverviewMocks();

    renderPage();

    await waitFor(() => {
      expect(screen.getByTestId('location.search')).toHaveTextContent('');
    });

    expect(screen.queryByTestId('auth.session-expired.notice')).not.toBeInTheDocument();
  });

  it('keeps a fresh session-expired warning visible under StrictMode', async () => {
    installOverviewMocks();
    markSessionExpiredNotice();

    renderPage();

    expect(await screen.findByTestId('auth.session-expired.notice')).toBeVisible();
    await waitFor(() => {
      expect(screen.getByTestId('location.search')).toHaveTextContent('');
    });
  });
});

describe('OverviewPage operational evidence', () => {
  it('keeps missing-node evidence without claiming a healthy cluster after an empty outage read', async () => {
    installOverviewMocks();
    renderPage('/');
    expect(await screen.findByText('public.overview.nodes.empty')).toBeVisible();
    await waitFor(() => expect(screen.queryByTestId('public.outages.card')).not.toBeInTheDocument());
    expect(screen.queryByText('public.overview.nominal.title')).not.toBeInTheDocument();
  });

  it('keeps independent node and outage read errors visible', async () => {
    installOverviewMocks();
    vi.mocked(fetchPublicNodeStatus).mockRejectedValue(new Error('Nodes unavailable'));
    vi.mocked(fetchOutages).mockRejectedValue(new Error('Outages unavailable'));
    renderPage('/');
    expect(await screen.findByText('public.overview.nodes.error')).toBeVisible();
    expect(await screen.findByText('public.overview.outages.error')).toBeVisible();
    expect(screen.queryByText('public.overview.nominal.title')).not.toBeInTheDocument();
  });

  it('retains the current-outage destination and IPv4 scarcity warning', async () => {
    installOverviewMocks();
    vi.mocked(fetchOutages).mockResolvedValue({
      data: [{ id: 71, state: 'announced', begins_at: '2026-01-01T10:00:00Z', en_summary: 'Storage maintenance' }],
      envelope: { status: true, response: {} }, meta: {}, httpStatus: 200,
    });
    vi.mocked(fetchPublicStats).mockResolvedValue({
      data: { user_count: 42, vps_count: 13, ipv4_left: 10 },
      envelope: { status: true, response: {} }, meta: {}, httpStatus: 200,
    });
    renderPage('/');
    expect(await screen.findByText('public.overview.outage_alert.title:1')).toBeVisible();
    expect(screen.getByRole('link', { name: 'public.overview.outage_alert.link' })).toHaveAttribute('href', '/outages');
    expect(await screen.findByTestId('public.ipv4.alert')).toHaveTextContent('public.overview.ipv4_critical.body:10');
  });
});
