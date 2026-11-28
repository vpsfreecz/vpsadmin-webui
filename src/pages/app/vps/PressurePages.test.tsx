import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { MemoryRouter, useLocation, useNavigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { enVps_pressure } from '../../../i18n/locales/en/vps/pressure';
import {
  pressureHistoryFixture,
  pressurePageFixture,
  pressureReadMeta,
  pressureRowFixture,
} from '../../../test/pressureFixtures';
import { PressureOverviewPage } from './PressureOverviewPage';
import { VpsPressurePage } from './VpsPressurePage';
import { usePressureUrl } from './usePressureUrl';

const state = vi.hoisted(() => ({
  auth: { status: 'authenticated', role: 'admin', user: { id: 4, time_zone: null as string | null } },
  serverZone: 'Europe/Prague',
  mode: 'user',
  vps: { id: 12, user: { id: 4 }, incident_accounting_since: null as string | null },
  capabilities: vi.fn(),
  page: vi.fn(),
  detail: vi.fn(),
  history: vi.fn(),
}));
vi.mock('../../../app/config', () => ({ getRuntimeConfig: () => ({ serverTimeZone: state.serverZone }) }));
vi.mock('../../../app/auth', () => ({ useAuth: () => state.auth }));
vi.mock('../../../app/appMode', () => ({
  useAppMode: () => ({ mode: state.mode, basePath: state.mode === 'admin' ? '/admin' : '/app' }),
}));
vi.mock('../../../app/i18n', () => ({
  useI18n: () => ({ lang: 'en', t: (key: string) => (enVps_pressure as Record<string, string>)[key] ?? key }),
}));
vi.mock('./VpsContext', () => ({ useVps: () => ({ vps: state.vps }) }));
vi.mock('../../../lib/api/vpsPressureCapabilities', () => ({
  fetchVpsPressureCapabilities: (...args: unknown[]) => state.capabilities(...args),
}));
vi.mock('../../../lib/api/vpsPressure', () => ({
  fetchPressurePage: (...args: unknown[]) => state.page(...args),
  fetchPressureDetail: (...args: unknown[]) => state.detail(...args),
  fetchPressureHistory: (...args: unknown[]) => state.history(...args),
}));
const clients: QueryClient[] = [];
const caps = () => ({
  data: { overview: true, detail: true, history: true, filters: ['user', 'vps', 'node', 'location', 'environment'] },
});
beforeEach(() => {
  vi.clearAllMocks();
  state.mode = 'user';
  state.auth.role = 'admin';
  state.auth.user.id = 4;
  state.auth.user.time_zone = null;
  state.vps = { id: 12, user: { id: 4 }, incident_accounting_since: null };
  state.capabilities.mockResolvedValue(caps());
  state.page.mockImplementation(async (params: { offset: number; limit: number }) => {
    const result = pressurePageFixture();
    return {
      ...result,
      meta: { ...result.meta, offset: params.offset, limit: params.limit, total_count: params.offset + 1 },
    };
  });
  state.detail.mockResolvedValue({ data: [pressureRowFixture()], meta: pressureReadMeta });
  state.history.mockImplementation(async (_vps: number, days: 7 | 30) => pressureHistoryFixture(days));
});
afterEach(() => {
  cleanup();
  clients.splice(0).forEach((client) => client.clear());
});
function app(element: ReactNode, route = '/app/pressure') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  clients.push(client);
  const wrap = (child: ReactNode) => (
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[route]}>{child}</MemoryRouter>
    </QueryClientProvider>
  );
  const view = render(wrap(element));
  return { ...view, rerenderPage: (child: ReactNode) => view.rerender(wrap(child)) };
}

it('constrains an administrator My-view request to its actual owner and hides privileged controls/links', async () => {
  app(<PressureOverviewPage />);
  await screen.findAllByText('1m 10.000125s');
  expect(state.page).toHaveBeenCalledWith({ user: 4, offset: 0, limit: 25 }, expect.anything());
  expect(screen.queryByLabelText('vps.list.filter.user.placeholder')).toBeNull();
  expect(screen.queryByRole('link', { name: 'user4' })).toBeNull();
  expect(screen.queryByRole('link', { name: 'node5.example.test' })).toBeNull();
  expect(screen.getAllByRole('link')[0]).toHaveAttribute('href', '/app/vps/12/pressure');
});

it('allows all five administrator filters and resets the offset on apply', async () => {
  state.mode = 'admin';
  app(<PressureOverviewPage />, '/admin/pressure?node=5&offset=25');
  await screen.findAllByText('1m 10.000125s');
  expect(screen.getAllByRole('link', { name: 'user4' })[0]).toHaveAttribute('href', '/admin/users/4');
  await userEvent.type(screen.getByLabelText('vps.list.filter.user.placeholder'), '4');
  await userEvent.type(screen.getByLabelText('incidentAdmin.filter.vps'), '12');
  await userEvent.type(screen.getByLabelText('vps.list.filter.location.label'), '3');
  await userEvent.type(screen.getByLabelText('common.environment'), '1');
  await userEvent.click(screen.getByRole('button', { name: 'incidentAdmin.apply' }));
  await waitFor(() =>
    expect(state.page).toHaveBeenLastCalledWith(
      { user: 4, vps: 12, node: 5, location: 3, environment: 1, offset: 0, limit: 25 },
      expect.anything()
    )
  );
});

it('does not issue a fleet request when privileged My-view owner filtering is unavailable', async () => {
  state.capabilities.mockResolvedValue({ data: { ...caps().data, filters: ['vps'] } });
  app(<PressureOverviewPage />);
  await screen.findByText('Memory pressure data is unavailable.');
  expect(state.page).not.toHaveBeenCalled();
});

it('distinguishes invalid effective settings from an empty filtered result and retains supported filters', async () => {
  const page = pressurePageFixture();
  state.page.mockResolvedValue({
    data: [],
    meta: { ...page.meta, total_count: 0, configuration_valid: false, unavailable_signals: ['rtnl_latency'] },
  });
  app(<PressureOverviewPage />);
  await screen.findByText('Memory pressure data is unavailable.');
  expect(screen.queryByText('No recorded time matches these filters.')).toBeNull();
  expect(screen.getByLabelText('incidentAdmin.filter.vps')).toBeEnabled();
});

it('refuses an unsupported supplied filter instead of silently broadening the query', async () => {
  state.auth.role = 'user';
  state.capabilities.mockResolvedValue({ data: { ...caps().data, filters: ['vps'] } });
  app(<PressureOverviewPage />, '/app/pressure?node=5');
  await screen.findByText('incidentAdmin.invalidFilters');
  expect(state.page).not.toHaveBeenCalled();
});

it('queries current and history independently and changes only the bounded history range', async () => {
  app(<VpsPressurePage />, '/app/vps/12/pressure');
  const selector = await screen.findByRole('combobox', { name: 'History' });
  expect(state.detail).toHaveBeenCalledWith(12, expect.anything());
  expect(state.history).toHaveBeenCalledWith(12, 7, expect.anything());
  const section = screen.getByRole('heading', { name: 'History' }).closest('section')!;
  expect(within(section).getAllByRole('row')).toHaveLength(8);
  await userEvent.selectOptions(selector, '30');
  await waitFor(() => expect(state.history).toHaveBeenLastCalledWith(12, 30, expect.anything()));
  await waitFor(() =>
    expect(
      within(screen.getByRole('heading', { name: 'History' }).closest('section')!).getAllByRole('row')
    ).toHaveLength(31)
  );
  expect(state.detail).toHaveBeenCalledTimes(1);
});

it('keeps current data usable without history capability and denies a foreign My-view detail before requests', async () => {
  state.capabilities.mockResolvedValue({ data: { ...caps().data, history: false } });
  const view = app(<VpsPressurePage />, '/app/vps/12/pressure');
  await screen.findAllByText('1m 10.000125s');
  expect(screen.getByText('History is unavailable.')).toBeVisible();
  expect(state.history).not.toHaveBeenCalled();
  state.vps = { id: 13, user: { id: 8 }, incident_accounting_since: null };
  state.detail.mockClear();
  view.rerenderPage(<VpsPressurePage />);
  expect(screen.getByTestId('forbidden.page')).toBeVisible();
  expect(state.detail).not.toHaveBeenCalled();
});

it('does not reuse the prior owner epoch history when the VPS context refreshes', async () => {
  const view = app(<VpsPressurePage />, '/app/vps/12/pressure');
  await screen.findByRole('combobox', { name: 'History' });
  expect(state.history).toHaveBeenCalledTimes(1);
  state.vps.incident_accounting_since = '2026-11-28T11:00:00.000001Z';
  view.rerenderPage(<VpsPressurePage />);
  await waitFor(() => expect(state.history).toHaveBeenCalledTimes(2));
  expect(state.detail).toHaveBeenCalledTimes(2);
});

it('retains newly applied filters through a pending page event and browser back/forward', async () => {
  function Harness() {
    const url = usePressureUrl();
    const location = useLocation();
    const navigate = useNavigate();
    return (
      <>
        <output>{location.search}</output>
        <button
          onClick={() => {
            url.apply({ node: '5' });
            url.page(25);
          }}
        >
          apply-page
        </button>
        <button onClick={() => navigate(-1)}>back</button>
        <button onClick={() => navigate(1)}>forward</button>
      </>
    );
  }
  app(<Harness />);
  await userEvent.click(screen.getByText('apply-page'));
  expect(screen.getByRole('status')).toHaveTextContent('?node=5&offset=25');
  await userEvent.click(screen.getByText('back'));
  expect(screen.getByRole('status')).toHaveTextContent('?node=5');
  expect(screen.getByRole('status')).not.toHaveTextContent('offset');
  await userEvent.click(screen.getByText('forward'));
  expect(screen.getByRole('status')).toHaveTextContent('?node=5&offset=25');
});

it('honors native back parameters before router publication and ignores departed-route callbacks', async () => {
  const original = window.location.href;
  window.history.replaceState(null, '', '/app/pressure?node=5');
  function Harness() {
    const url = usePressureUrl();
    const location = useLocation();
    return (
      <>
        <output>{location.search}</output>
        <button
          onClick={() => {
            window.history.replaceState(null, '', '/app/pressure?vps=12');
            window.dispatchEvent(new PopStateEvent('popstate'));
            url.page(25);
          }}
        >
          native-back-page
        </button>
        <button
          onClick={() => {
            window.history.replaceState(null, '', '/app/vps');
            url.apply({ node: '8' });
          }}
        >
          depart
        </button>
      </>
    );
  }
  try {
    app(<Harness />, '/app/pressure?node=5');
    await userEvent.click(screen.getByText('native-back-page'));
    expect(screen.getByRole('status')).toHaveTextContent('?vps=12&offset=25');
    expect(screen.getByRole('status')).not.toHaveTextContent('node');
    await userEvent.click(screen.getByText('depart'));
    expect(window.location.pathname).toBe('/app/vps');
    expect(window.location.search).toBe('');
    expect(screen.getByRole('status')).not.toHaveTextContent('node=8');
  } finally {
    window.history.replaceState(null, '', original);
  }
});

it('applies unchanged empty default filters normally, resets paging, and keeps My owner scope', async () => {
  app(<PressureOverviewPage />, '/app/pressure?offset=25');
  await screen.findAllByText('1m 10.000125s');
  expect(screen.getByRole('heading', { name: 'VPS issues' })).toBeVisible();
  await userEvent.click(screen.getByRole('button', { name: 'incidentAdmin.apply' }));
  await waitFor(() =>
    expect(state.page).toHaveBeenLastCalledWith({ user: 4, offset: 0, limit: 25 }, expect.anything())
  );
  await screen.findAllByText('1m 10.000125s');
  await userEvent.click(screen.getByRole('button', { name: 'incidentAdmin.apply' }));
  expect(screen.queryByText('incidentAdmin.invalidFilters')).toBeNull();
  expect(state.page.mock.calls.every(([params]) => params.user === 4)).toBe(true);
});

it.each([null, 'America/Los_Angeles'])(
  'uses account preference %s before server fallback for current and history',
  async (preference) => {
    state.auth.user.time_zone = preference;
    const expectedZone = preference ?? 'Europe/Prague';
    app(<VpsPressurePage />, '/app/vps/12/pressure');
    await screen.findByRole('combobox', { name: 'History' });
    expect(screen.getByText(expectedZone)).toBeVisible();
    const time = document.querySelector('time')!;
    expect(time).toHaveTextContent(
      new Date(time.dateTime).toLocaleString('en', { timeZone: expectedZone, timeZoneName: 'shortOffset' })
    );
    const fixture = pressureRowFixture();
    const expectedWindow = [fixture.window_from, fixture.window_to]
      .map((date) => new Date(date!).toLocaleString('en', { timeZone: expectedZone }))
      .join(' – ');
    expect(screen.getAllByText('1d')[0]).toHaveAttribute('title', expectedWindow);
    expect(state.history).toHaveBeenCalledWith(12, 7, expect.anything());
  }
);
