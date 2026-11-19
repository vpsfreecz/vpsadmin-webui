import { cleanup, render, screen, within, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { IncidentPolicyEvaluation } from '../../../lib/api/incidentPolicies';
import type { IncidentReport } from '../../../lib/api/incidents';
import { enVps_incidentEscalation } from '../../../i18n/locales/en/vps/incidentEscalation';
import { csVps_incidentEscalation } from '../../../i18n/locales/cs/vps/incidentEscalation';
import { IncidentPolicyHistory } from './IncidentPolicyHistory';

const state = vi.hoisted(() => ({ language: 'en', mode: 'user', role: 'user', evaluations: true, policies: true }));
const api = vi.hoisted(() => ({ capabilities: vi.fn(), history: vi.fn(), registry: vi.fn() }));
vi.mock('../../../app/appMode', () => ({
  useAppMode: () => ({ mode: state.mode, basePath: state.mode === 'admin' ? '/admin' : '/app' }),
}));
vi.mock('../../../app/auth', () => ({ useAuth: () => ({ role: state.role }) }));
vi.mock('../../../app/i18n', () => ({
  useI18n: () => {
    const dict: Record<string, string> = state.language === 'cs' ? csVps_incidentEscalation : enVps_incidentEscalation;
    const t = (key: string, vars?: Record<string, unknown>) =>
      Object.entries(vars ?? {}).reduce(
        (text, [key, value]) => text.replaceAll(`{${key}}`, String(value)),
        dict[key] ?? key
      );
    return {
      t,
      tc: (key: string, count: number) => t(`${key}.${new Intl.PluralRules(state.language).select(count)}`, { count }),
    };
  },
}));
vi.mock('../../../lib/api/incidentPolicies', () => ({
  fetchIncidentPolicyCapabilities: api.capabilities,
  fetchIncidentPolicyEvaluations: api.history,
  fetchIncidentPolicies: api.registry,
}));
const saved = (key: string, fields: Partial<IncidentPolicyEvaluation> = {}): IncidentPolicyEvaluation => ({
  policy_key: key,
  label: `Saved ${key}`,
  matched: true,
  state: 'recorded',
  warning_period_days: 7,
  stop_period_days: 30,
  count_7d: 2,
  count_30d: 4,
  warning_limit: 3,
  stop_limit: 9,
  decision: 'none',
  ...fields,
});
const report: IncidentReport = { id: 88, vps: { id: 12 }, codename: 'any_ordinary_category' };
function show(value = report) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <IncidentPolicyHistory report={value} />
      </MemoryRouter>
    </QueryClientProvider>
  );
}
beforeEach(() => {
  Object.assign(state, { language: 'en', mode: 'user', role: 'user', evaluations: true, policies: true });
  api.capabilities
    .mockReset()
    .mockImplementation(async () => ({ data: { evaluations: state.evaluations, policies: state.policies } }));
  api.history.mockReset().mockResolvedValue({ data: [saved('beta'), saved('alpha'), saved('retired')] });
  api.registry.mockReset().mockResolvedValue({ data: [{ key: 'alpha' }, { key: 'beta' }] });
});
afterEach(cleanup);

describe.each(['en', 'cs'])('saved policy detail in %s', (language) => {
  it('shows every matched policy in key order with current anchors and retired history', async () => {
    state.language = language;
    api.history.mockResolvedValue({
      data: [saved('beta', { warning_limit: 4 }), saved('alpha'), saved('retired', { warning_limit: 8 })],
    });
    show();
    await waitFor(() =>
      expect(
        screen.getAllByRole('link', { name: language === 'en' ? 'View policy' : 'Zobrazit pravidlo' })
      ).toHaveLength(2)
    );
    expect(screen.getAllByRole('heading', { level: 3 }).map((n) => n.textContent)).toEqual([
      'Saved alpha',
      'Saved beta',
      'Saved retired',
    ]);
    expect(document.querySelector('a[href="/app/vps/12/incidents#incident-policy-alpha"]')).not.toBeNull();
    expect(document.querySelector('a[href="/app/vps/12/incidents#incident-policy-beta"]')).not.toBeNull();
    expect(document.querySelector('a[href="/app/vps/12/incidents#incident-policy-retired"]')).toBeNull();
    expect(screen.getAllByRole('link').map((link) => link.getAttribute('href'))).toEqual([
      '/app/vps/12/incidents#incident-policy-alpha',
      '/app/incidents?vps=12&policy_key=alpha',
      '/app/vps/12/incidents#incident-policy-beta',
      '/app/incidents?vps=12&policy_key=beta',
      '/app/incidents?vps=12&policy_key=retired',
    ]);
    expect(screen.getAllByRole('table')).toHaveLength(3);
    const counts = screen.getAllByRole('table').map((table) => within(table).getAllByRole('row')[1]);
    expect(counts.map((row) => within(row!).getAllByRole('cell')[2]?.textContent)).toEqual(['3', '4', '8']);
    expect(api.registry).toHaveBeenCalledTimes(1);
    expect(api.history).toHaveBeenCalledWith(88);
  });
});
it('never labels false/null or matched configuration errors as member applicability', async () => {
  api.history.mockResolvedValue({
    data: [
      saved('not_matched', { matched: false, state: 'audit_only' }),
      saved('selection_error', { matched: null, state: 'error' }),
      saved('config_error', { matched: true, state: 'error', error_class: 'PrivateClass' }),
    ],
  });
  show();
  await waitFor(() => expect(api.history).toHaveBeenCalled());
  await waitFor(() => expect(screen.queryByText('common.loading')).not.toBeInTheDocument());
  expect(screen.getByText('Policy information is unavailable for this report.')).toBeVisible();
  expect(screen.queryByText('No matching policies')).not.toBeInTheDocument();
  expect(screen.queryByText(/PrivateClass|Other policy/)).not.toBeInTheDocument();
  expect(api.registry).not.toHaveBeenCalled();
});
it('keeps false/null/error diagnostics separate and admin-only without count/limit inventions', async () => {
  state.mode = 'admin';
  state.role = 'admin';
  api.history.mockResolvedValue({
    data: [
      saved('not_matched', { matched: false, state: 'audit_only' }),
      saved('selection_error', { matched: null, state: 'error', error_stage: 'selection', error_class: 'TypeError' }),
      saved('config_error', { matched: true, state: 'error' }),
    ],
  });
  show();
  const other = await screen.findByTestId('incidents.policyHistory.other');
  expect(other).not.toHaveAttribute('open');
  expect(other).toHaveTextContent('Did not match');
  expect(other).toHaveTextContent('Evaluation failed');
  expect(other).toHaveTextContent('selection · TypeError');
  expect(screen.queryByRole('table')).not.toBeInTheDocument();
  expect(screen.queryByRole('link')).not.toBeInTheDocument();
});
it('does not infer an authorized VPS association from a raw historical id', async () => {
  show({ ...report, vps: null, raw_vps_id: 12 });
  await screen.findByText('Saved alpha');
  expect(screen.queryByRole('link')).not.toBeInTheDocument();
  expect(api.registry).not.toHaveBeenCalled();
});
it('retains saved matched history when active discovery is unavailable', async () => {
  state.policies = false;
  show();
  await screen.findByText('Saved alpha');
  expect(screen.getAllByRole('link')).toHaveLength(3);
  expect(screen.queryByRole('link', { name: 'View policy' })).not.toBeInTheDocument();
  expect(api.registry).not.toHaveBeenCalled();
});
it.each(['capability', 'membership'])('uses neutral feedback for genuinely missing %s', async (missing) => {
  if (missing === 'capability') state.evaluations = false;
  else api.history.mockResolvedValue({ data: [saved('old', { matched: undefined })] });
  show();
  await screen.findByText('Policy information is unavailable for this report.');
  expect(screen.queryByRole('table')).not.toBeInTheDocument();
  expect(screen.queryByRole('link')).not.toBeInTheDocument();
  if (missing === 'capability') expect(api.history).not.toHaveBeenCalled();
});
it('uses the same authorized admin destinations without exposing error facts to support role', async () => {
  state.mode = 'admin';
  state.role = 'support';
  api.history.mockResolvedValue({
    data: [saved('alpha'), saved('secret', { state: 'error', error_class: 'HiddenClass' })],
  });
  show();
  await waitFor(() =>
    expect(document.querySelector('a[href="/admin/vps/12/incidents#incident-policy-alpha"]')).not.toBeNull()
  );
  expect(screen.queryByText(/HiddenClass|Saved secret/)).not.toBeInTheDocument();
});

it.each(['user', 'admin'])(
  'distinguishes a privacy-filtered empty collection from exhaustive evidence for %s',
  async (role) => {
    state.mode = role;
    state.role = role;
    api.history.mockResolvedValue({ data: [] });
    show();
    await screen.findByText(
      role === 'admin' ? 'No matching policies' : 'Policy information is unavailable for this report.'
    );
    expect(screen.getByText('Matched policies')).toBeVisible();
    expect(
      screen.queryByText(
        role === 'admin' ? 'Policy information is unavailable for this report.' : 'No matching policies'
      )
    ).not.toBeInTheDocument();
    expect(api.registry).not.toHaveBeenCalled();
  }
);
it('does not call forbidden saved history empty', async () => {
  api.history.mockRejectedValue({ status: 403 });
  show();
  await screen.findByText('Could not load saved policy evaluations');
  expect(screen.queryByText('No matching policies')).not.toBeInTheDocument();
});
