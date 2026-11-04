import React from 'react';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DashboardPage } from './DashboardPage';

const feeds = vi.hoisted(() => ({
  nodes: { data: [] as Record<string, unknown>[], isLoading: false, isError: false },
  outages: { data: [] as Record<string, unknown>[], isLoading: false, isError: false },
}));

vi.mock('@tanstack/react-query', () => ({
  useQuery: ({ queryKey }: { queryKey: unknown[] }) => {
    if (queryKey[1] === 'nodes') return feeds.nodes;
    if (queryKey[1] === 'outages') return feeds.outages;
    return { data: [], isLoading: false, isError: false };
  },
}));
vi.mock('../../app/appMode', () => ({ useAppMode: () => ({ mode: 'user', basePath: '/app' }) }));
vi.mock('../../app/auth', () => ({ useAuth: () => ({ user: { id: 1, login: 'member' }, role: 'user' }) }));
vi.mock('../../app/i18n', () => ({ useI18n: () => ({ t: (key: string) => key }) }));
vi.mock('../../app/objectScope', () => ({ useObjectScope: () => ({ scope: 'mine', mineUserId: 1 }) }));
vi.mock('../../lib/refreshTiers', () => ({ useTierBIntervalMs: () => 0, useTierSlowIntervalMs: () => 0 }));
vi.mock('./useDashboardSettings', () => ({
  useDashboardSettingsState: () => ({ dashboardSettings: { density: 'comfortable' }, setDashboardSettings: vi.fn() }),
}));
vi.mock('./DashboardPreferencesCard', () => ({ DashboardPreferencesCard: () => null }));
vi.mock('./DashboardSummaryCards', () => ({ DashboardSummaryCards: () => null }));
vi.mock('./DashboardWidgets', () => ({ DashboardWidgetGrid: () => null }));

const availableNode = { id: 1, name: 'node-a', status: true };

function dashboard() {
  return (
    <MemoryRouter>
      <DashboardPage />
    </MemoryRouter>
  );
}

describe('DashboardPage status notice', () => {
  beforeEach(() => {
    feeds.nodes.data = [availableNode];
    feeds.nodes.isLoading = false;
    feeds.nodes.isError = false;
    feeds.outages.data = [];
    feeds.outages.isLoading = false;
    feeds.outages.isError = false;
  });

  it.each(['loading', 'error', 'empty', 'unknown-node', 'unknown-outage'] as const)(
    'clears %s only after the feeds establish available nodes and known outages',
    (state) => {
      if (state === 'loading') feeds.nodes.isLoading = true;
      if (state === 'error') feeds.outages.isError = true;
      if (state === 'empty') feeds.nodes.data = [];
      if (state === 'unknown-node') feeds.nodes.data = [{ id: 1, name: 'node-a' }];
      if (state === 'unknown-outage') feeds.outages.data = [{ id: 55, state: 'announced' }];

      const view = render(dashboard());
      expect(screen.getByTestId('app.dashboard.status-alert')).toHaveTextContent(
        state === 'loading' ? 'dashboard.alert.loading.title' : 'dashboard.alert.partial.title'
      );

      feeds.nodes.isLoading = false;
      feeds.outages.isError = false;
      feeds.nodes.data = [availableNode];
      feeds.outages.data = [];
      view.rerender(dashboard());
      expect(screen.queryByTestId('app.dashboard.status-alert')).not.toBeInTheDocument();

      feeds.nodes.data = [{ id: 1, name: 'node-a', status: null }];
      view.rerender(dashboard());
      expect(screen.getByTestId('app.dashboard.status-alert')).toHaveTextContent('dashboard.alert.partial.title');
    }
  );

  it('retains the current-outage notice and link when a node is unknown', () => {
    feeds.nodes.data = [{ id: 1, name: 'node-a', status: null }];
    feeds.outages.data = [{ id: 55, state: 'announced', begins_at: '2020-01-01T00:00:00Z' }];

    render(dashboard());

    const notice = screen.getByTestId('app.dashboard.status-alert');
    expect(notice).toHaveTextContent('dashboard.alert.outage.title');
    expect(within(notice).getByRole('link', { name: 'dashboard.alert.outage.link' })).toHaveAttribute(
      'href',
      '/outages'
    );
  });
});
