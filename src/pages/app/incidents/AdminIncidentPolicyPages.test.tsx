import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { adminIncidentMeta, evaluationFixture, exposureFixture } from '../../../test/adminIncidentFixtures';
import { AdminIncidentHistoryPage, AdminIncidentOverviewPage } from './AdminIncidentPolicyPages';

const api = vi.hoisted(() => ({ capabilities: vi.fn(), overview: vi.fn(), history: vi.fn() }));
const context = vi.hoisted(() => ({ mode: 'admin', role: 'admin' }));
vi.mock('../../../lib/api/adminIncidentCapabilities', () => ({ fetchAdminIncidentCapabilities: api.capabilities }));
vi.mock('../../../lib/api/adminIncidents', () => ({
  fetchAdminIncidentExposures: api.overview,
  fetchAdminIncidentEvaluations: api.history,
}));
vi.mock('../../../app/appMode', () => ({ useAppMode: () => ({ mode: context.mode }) }));
vi.mock('../../../app/auth', () => ({ useAuth: () => ({ role: context.role, user: { id: 7 } }) }));
vi.mock('../../../app/i18n', () => ({ useI18n: () => ({ t: (key: string) => key }) }));
vi.mock('../../ForbiddenPage', () => ({ ForbiddenPage: () => <div>Forbidden</div> }));

function Location() {
  const location = useLocation();
  return <output data-testid="url">{location.search}</output>;
}
function mount(history = false, search = '') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[`/admin/incidents/${history ? 'history' : 'overview'}${search}`]}>
        {history ? <AdminIncidentHistoryPage /> : <AdminIncidentOverviewPage />}
        <Location />
      </MemoryRouter>
    </QueryClientProvider>
  );
  return client;
}
function receipt<T>(data: T, meta = adminIncidentMeta) {
  return { data, meta, status: true, errors: {}, httpStatus: 200, envelope: { status: true } };
}
beforeEach(() => {
  vi.clearAllMocks();
  context.mode = 'admin';
  context.role = 'admin';
  api.capabilities.mockResolvedValue(receipt({ overview: true, history: true }));
  api.overview.mockImplementation(async (filters) =>
    receipt([exposureFixture()], {
      ...adminIncidentMeta,
      offset: filters.offset,
      as_of: filters.as_of ?? adminIncidentMeta.as_of,
      total_count: 26,
      next_offset: filters.offset === 0 ? 25 : null,
    })
  );
  api.history.mockResolvedValue(receipt([evaluationFixture()], { ...adminIncidentMeta, total_count: 1 }));
});
afterEach(cleanup);

it('anchors once, preserves cutoff across paging/filtering and refreshes without cached initial reuse', async () => {
  mount();
  await screen.findAllByText('Synthetic policy alpha');
  await waitFor(() => expect(screen.getByTestId('url').textContent).toContain('as_of='));
  expect(api.overview).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByText('pagination.next'));
  await waitFor(() => expect(api.overview).toHaveBeenCalledTimes(2));
  expect(api.overview.mock.calls[1]?.[0]).toMatchObject({ offset: 25, as_of: adminIncidentMeta.as_of });
  await waitFor(() => expect(screen.getByText('pagination.prev').closest('button')?.disabled).toBe(false));
  fireEvent.change(screen.getByLabelText('incidentAdmin.filter.vps'), { target: { value: '12' } });
  fireEvent.click(screen.getByText('incidentAdmin.apply'));
  await waitFor(() => expect(api.overview).toHaveBeenCalledTimes(3));
  expect(api.overview.mock.calls[2]?.[0]).toMatchObject({ offset: 0, vps: 12, as_of: adminIncidentMeta.as_of });
  await waitFor(() => expect(screen.getByText('incidentAdmin.refresh').closest('button')?.disabled).toBe(false));
  api.overview.mockImplementationOnce(async (filters) =>
    receipt([exposureFixture()], {
      ...adminIncidentMeta,
      as_of: '2026-11-24T12:02:00Z',
      read_at: '2026-11-24T12:02:00Z',
      total_count: 1,
      offset: filters.offset,
    })
  );
  fireEvent.click(screen.getByText('incidentAdmin.refresh'));
  await waitFor(() => expect(api.overview).toHaveBeenCalledTimes(4));
  expect(api.overview.mock.calls[3]?.[0]).toMatchObject({ offset: 0, vps: 12, as_of: undefined });
  await waitFor(() => expect(screen.getByTestId('url').textContent).toContain('12%3A02%3A00Z'));
  expect(api.overview).toHaveBeenCalledTimes(4);
});

it.each(['member', 'support'])('denies %s before discovery or endpoint reads', (role) => {
  context.role = role;
  mount();
  expect(screen.getByText('Forbidden')).toBeTruthy();
  expect(api.capabilities).not.toHaveBeenCalled();
  expect(api.overview).not.toHaveBeenCalled();
  expect(api.history).not.toHaveBeenCalled();
});
it('refreshes the unfiltered first page instead of reusing its cached initial cutoff', async () => {
  mount();
  await waitFor(() => expect(screen.getByTestId('url').textContent).toContain('as_of='));
  expect(api.overview).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByText('incidentAdmin.refresh'));
  await waitFor(() => expect(api.overview).toHaveBeenCalledTimes(2));
  await waitFor(() => expect(screen.getByTestId('url').textContent).toContain('as_of='));
  expect(api.overview.mock.calls[1]?.[0].as_of).toBeUndefined();
  expect(api.overview).toHaveBeenCalledTimes(2);
});
it('anchors empty metadata once and exposes an honest empty state', async () => {
  api.overview.mockResolvedValue(receipt([], { ...adminIncidentMeta, total_count: 0 }));
  mount();
  await screen.findByText('incidentAdmin.overviewEmpty');
  await waitFor(() => expect(screen.getByTestId('url').textContent).toContain('as_of='));
  expect(api.overview).toHaveBeenCalledTimes(1);
});
it('does not call an endpoint with missing permissions or required fields/meta', async () => {
  api.capabilities.mockResolvedValue(receipt({ overview: false, history: true }));
  mount();
  await screen.findByText('incidentAdmin.unavailable');
  expect(api.overview).not.toHaveBeenCalled();
  expect(screen.getByRole('link', { name: 'incidentAdmin.reports' }).getAttribute('href')).toBe('/admin/incidents');
});
it('rejects invalid URL filters before any new endpoint call', async () => {
  mount(false, '?offset=-1');
  await screen.findByText('incidentAdmin.invalidFilters');
  expect(api.overview).not.toHaveBeenCalled();
});
it('uses direction-only outstanding history and keeps periods disabled', async () => {
  api.history.mockResolvedValue(
    receipt([evaluationFixture()], { ...adminIncidentMeta, total_count: 1, from: null, to: null })
  );
  mount(true, '?scope=outstanding&from=bad&sort=evaluated_at&direction=asc');
  await screen.findAllByText('Synthetic retired policy');
  expect(api.history).toHaveBeenCalledTimes(1);
  expect(api.history.mock.calls[0]?.[0]).toMatchObject({
    scope: 'outstanding',
    direction: 'asc',
    from: undefined,
    to: undefined,
  });
  expect(api.history.mock.calls[0]?.[0]).not.toHaveProperty('sort');
  expect(screen.queryByLabelText('incidentAdmin.filter.sort')).toBeNull();
  expect((screen.getByLabelText('incidentAdmin.filter.from') as HTMLInputElement).disabled).toBe(true);
});
