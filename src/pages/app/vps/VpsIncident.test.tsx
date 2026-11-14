import { render, screen, cleanup, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Vps } from '../../../lib/api/vps';
import { enVps_incidentEscalation } from '../../../i18n/locales/en/vps/incidentEscalation';
import { csVps_incidentEscalation } from '../../../i18n/locales/cs/vps/incidentEscalation';
import { VpsIncidentCard } from './VpsIncidentCard';
import { VpsIncidentIndicator } from './VpsIncidentIndicator';
import { VpsIncidentFilters } from './VpsIncidentFilters';

const state = vi.hoisted(() => ({
  locale: 'en', mode: 'app', role: 'user',
  update: vi.fn(), fetch: vi.fn(), preflight: vi.fn(), refetch: vi.fn(),
  lock: vi.fn(), settle: vi.fn(), track: vi.fn(),
}));
vi.mock('../../../app/i18n', () => ({ useI18n: () => ({ t: (key: string, vars?: Record<string, unknown>) => {
  const dict: Record<string, string> = state.locale === 'cs' ? csVps_incidentEscalation : enVps_incidentEscalation;
  return Object.entries(vars ?? {}).reduce((text, [name, value]) => text.replaceAll(`{${name}}`, String(value)), dict[key] ?? key);
} }) }));
vi.mock('../../../app/appMode', () => ({ useAppMode: () => ({ mode: state.mode, basePath: state.mode === 'admin' ? '/admin' : '/app' }) }));
vi.mock('../../../app/auth', () => ({ useAuth: () => ({ role: state.role }) }));
vi.mock('../../../components/layout/ChromeContext', () => ({ useChrome: () => ({
  acquireLocalLock: state.lock, settleLocalLock: state.settle, trackActionState: state.track,
}) }));
vi.mock('./VpsContext', () => ({ useVps: () => ({ canMutateVps: true, busyTransaction: false, busyLocalLock: false, refetch: state.refetch }) }));
vi.mock('./vpsPreflight', () => ({ preflightVpsNotBusy: state.preflight }));
vi.mock('../../../lib/api/vps', async original => ({ ...await original<typeof import('../../../lib/api/vps')>(),
  updateVps: state.update, fetchVps: state.fetch,
}));
const vps: Vps = {
  id: 12, hostname: 'example.test', object_state: 'active',
  incident_policy: 'oomd', incident_policy_label: 'VPS memory-pressure incidents',
  incident_count_7d: 4, incident_count_30d: 10, incident_warning_limit: 5, incident_stop_limit: 10,
  incident_warning_limit_override: 5, incident_stop_limit_override: 10,
  incident_enforcement_enabled: true, incident_stop_enforced: true, incident_mode: 'enforce',
  incident_status: 'stop_threshold', incident_action_state: 'none',
  incident_last_stop_at: '2026-10-29T12:00:00Z', incident_next_stop_allowed_at: '2026-10-30T12:00:00Z',
};
function show(element: React.ReactNode) {
  return render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })}>
    <MemoryRouter>{element}</MemoryRouter>
  </QueryClientProvider>);
}
afterEach(cleanup);
beforeEach(() => {
  vi.clearAllMocks(); state.locale = 'en'; state.mode = 'app'; state.role = 'user';
  state.update.mockResolvedValue({ meta: {} });
  state.fetch.mockResolvedValue({ data: { ...vps, incident_warning_limit_override: null, incident_stop_limit_override: null } });
});
describe.each(['en', 'cs'])('Incident summary in %s', locale => {
  beforeEach(() => { state.locale = locale; });
  it('shows server counts and inclusive new-incident cooldown wording without admin fields', () => {
    const label = locale === 'en' ? 'VPS memory-pressure incidents' : 'Incidenty přetížení paměti VPS';
    show(<VpsIncidentCard vps={{ ...vps, incident_policy_label: label }} />);
    const text = screen.getByTestId('vps.incident').textContent;
    expect(text).toContain(label);
    expect(text).toContain(locale === 'en' ? 'Last 7 days: 4 / 5' : 'Za posledních 7 dní: 4 / 5');
    expect(text).toContain(locale === 'en' ? 'at or after' : 'nebo později');
    expect(text).toContain(locale === 'en' ? 'No stop is scheduled' : 'není naplánované vypnutí');
    expect(screen.queryByTestId('vps.incident.settings')).not.toBeInTheDocument();
    expect(screen.getByRole('link')).toHaveAttribute('href', '/app/incidents?vps=12&codename=oomd');
  });
  it('hides the feature for older API responses', () => {
    const old: Vps = { id: 12, hostname: 'example.test' };
    show(<><VpsIncidentCard vps={old} /><VpsIncidentIndicator vps={old} basePath="/app" /></>);
    expect(screen.queryByTestId('vps.incident')).not.toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });
  it.each(['pending', 'failed', 'uncertain'] as const)('keeps %s outstanding stops distinct from confirmed history', action => {
    show(<VpsIncidentCard vps={{ ...vps, incident_action_state: action, incident_action_chain_id: 90 }} />);
    const dict = locale === 'en' ? enVps_incidentEscalation : csVps_incidentEscalation;
    expect(screen.getByText(dict[`incidentEscalation.action.${action}`])).toBeInTheDocument();
    expect(screen.getByRole('link', { name: locale === 'en' ? 'Transaction #90' : 'Transakce č. 90' })).toHaveAttribute('href', '/app/transactions/90');
    expect(screen.queryByText(/at or after|nebo později/)).not.toBeInTheDocument();
  });
  it('does not promise automatic stops or active threshold warnings in observation mode with an exemption', () => {
    show(<VpsIncidentCard vps={{ ...vps, incident_enforcement_enabled: false, incident_stop_enforced: false, incident_mode: 'observe' }} />);
    const dict = locale === 'en' ? enVps_incidentEscalation : csVps_incidentEscalation;
    expect(screen.queryByText(/at or after|nebo později/)).not.toBeInTheDocument();
    expect(screen.queryByText(dict['incidentEscalation.exemptionHelp'])).not.toBeInTheDocument();
  });
});
it.each(['user', 'support'])('keeps admin editor and filters hidden from %s', role => {
  state.role = role; state.mode = 'admin';
  show(<><VpsIncidentCard vps={vps} /><VpsIncidentFilters available mode="admin" limit={50} /></>);
  expect(screen.queryByTestId('vps.incident.settings')).not.toBeInTheDocument();
  expect(screen.queryByTestId('vps.incident.filters')).not.toBeInTheDocument();
});
it('resets both overrides using explicit null, verifies the synchronous save, and preserves exemption', async () => {
  state.role = 'admin'; state.mode = 'admin';
  show(<VpsIncidentCard vps={vps} />);
  const user = userEvent.setup();
  await user.click(screen.getByRole('button', { name: 'Use default limits' }));
  expect(state.update).not.toHaveBeenCalled();
  await user.click(screen.getByRole('button', { name: 'Save incident settings' }));
  await user.click(screen.getByTestId('vps.incident.confirm.confirm'));
  await waitFor(() => expect(state.refetch).toHaveBeenCalled());
  expect(state.update).toHaveBeenCalledWith(12, { incident_policy: 'oomd', incident_warning_limit_override: null, incident_stop_limit_override: null, incident_enforcement_enabled: true });
  expect(state.fetch).toHaveBeenCalledWith(12, { incidentPolicy: 'oomd' });
  expect(state.preflight).toHaveBeenCalled();
  expect(state.lock).toHaveBeenCalled();
});
it('retains drafts and shows synchronous verification failure', async () => {
  state.role = 'admin'; state.mode = 'admin'; state.fetch.mockResolvedValue({ data: vps });
  show(<VpsIncidentCard vps={vps} />);
  const user = userEvent.setup();
  await user.click(screen.getByRole('button', { name: 'Use default limits' }));
  await user.click(screen.getByRole('button', { name: 'Save incident settings' }));
  await user.click(screen.getByTestId('vps.incident.confirm.confirm'));
  await waitFor(() => expect(screen.getAllByText(/saved settings could not be verified/)).toHaveLength(2));
  expect(screen.getByLabelText('Warning limit override (7 days)')).toHaveValue('');
  expect(state.refetch).not.toHaveBeenCalled();
});

it('isolates a synthetic second rule label/counts/limits/history without memory-specific help', () => {
  show(<VpsIncidentCard vps={{ ...vps, incident_policy: 'test_rule', incident_policy_label: 'Synthetic incident type',
    incident_count_7d: 2, incident_count_30d: 3, incident_warning_limit: 8, incident_stop_limit: 15,
    incident_enforcement_enabled: false, incident_stop_enforced: false }} />);
  const card = screen.getByTestId('vps.incident');
  expect(card).toHaveTextContent('Synthetic incident type');
  expect(card).toHaveTextContent('Last 7 days: 2 / 8');
  expect(card).toHaveTextContent('Last 30 days: 3 / 15');
  expect(card).toHaveTextContent('shared across incident types for this VPS');
  expect(card).not.toHaveTextContent("The node's memory protection remains active.");
  expect(screen.getByRole('link')).toHaveAttribute('href', '/app/incidents?vps=12&codename=test_rule');
});
it('renders an API-provided registered label as escaped text', () => {
  show(<VpsIncidentCard vps={{ ...vps, incident_policy_label: '<img src=x onerror=alert(1)>' }} />);
  expect(screen.getByTestId('vps.incident')).toHaveTextContent('<img src=x onerror=alert(1)>');
  expect(screen.getByTestId('vps.incident').querySelector('img')).toBeNull();
});
it('reads back the selected second rule after an exemption-only change', async () => {
  state.role = 'admin'; state.mode = 'admin';
  const second = { ...vps, incident_policy: 'test_rule', incident_policy_label: 'Synthetic incident type',
    incident_warning_limit_override: 8, incident_stop_limit_override: 15 };
  state.fetch.mockResolvedValue({ data: { ...second, incident_enforcement_enabled: false } });
  show(<VpsIncidentCard vps={second} />);
  const user = userEvent.setup();
  await user.click(screen.getByRole('checkbox'));
  await user.click(screen.getByRole('button', { name: 'Save incident settings' }));
  await user.click(screen.getByTestId('vps.incident.confirm.confirm'));
  await waitFor(() => expect(state.refetch).toHaveBeenCalled());
  expect(state.update).toHaveBeenCalledWith(12, { incident_policy: 'test_rule', incident_warning_limit_override: 8,
    incident_stop_limit_override: 15, incident_enforcement_enabled: false });
  expect(state.fetch).toHaveBeenCalledWith(12, { incidentPolicy: 'test_rule' });
});
