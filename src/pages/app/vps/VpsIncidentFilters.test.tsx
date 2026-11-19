import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { VpsIncidentFilters } from './VpsIncidentFilters';
const policies = [
  { key: 'alpha', label: 'A', warning_period_days: 7, stop_period_days: 30 },
  { key: 'beta', label: 'B', warning_period_days: 7, stop_period_days: 30 },
];

const state = vi.hoisted(() => ({
  params: new URLSearchParams('user=7&incident_policy=alpha&from_id=30&page=2'),
  write: vi.fn(),
}));
vi.mock('react-router-dom', () => ({ useSearchParams: () => [state.params, state.write] }));
vi.mock('../../../app/i18n', () => ({ useI18n: () => ({ t: (key: string) => key }) }));
vi.mock('../../../app/auth', () => ({ useAuth: () => ({ role: 'admin' }) }));
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  state.params = new URLSearchParams('user=7&incident_policy=alpha&from_id=30&page=2');
});

it('merges consecutive selections with canonical pagination before the router commits', () => {
  render(<VpsIncidentFilters policies={policies} mode="admin" limit={50} />);
  // Keep router params at the last committed location across both events.
  fireEvent.change(screen.getByLabelText('incidentEscalation.filterStatus'), { target: { value: 'near_limit' } });
  fireEvent.change(screen.getByLabelText('incidentEscalation.filterEnforcement'), { target: { value: 'false' } });
  const latest: URLSearchParams = state.write.mock.calls.at(-1)![0];
  expect(latest.get('incident_status')).toBe('near_limit');
  expect(latest.get('incident_enforcement_enabled')).toBe('false');
  expect(latest.get('user')).toBe('7');
  expect(latest.get('page')).toBe('1');
  expect(latest.has('from_id')).toBe(false);
  // Pagination would otherwise normalize an earlier URL while the next
  // selection is pending, replacing it with the earlier filter snapshot.
  expect(state.write.mock.calls[0]![0].get('limit')).toBe('50');
  expect(latest.get('limit')).toBe('50');
  expect(state.write.mock.calls.every(([, options]) => options?.flushSync === true)).toBe(true);
});

it('adopts external and Back navigation before merging another selection', () => {
  const { rerender } = render(<VpsIncidentFilters policies={policies} mode="admin" limit={50} />);
  fireEvent.change(screen.getByLabelText('incidentEscalation.filterStatus'), { target: { value: 'warning' } });
  // A committed external location, including Back, replaces the pending base.
  state.params = new URLSearchParams('user=9&incident_policy=beta&incident_status=clear&limit=100&from_id=60&page=2');
  rerender(<VpsIncidentFilters policies={policies} mode="admin" limit={100} />);
  fireEvent.change(screen.getByLabelText('incidentEscalation.filterEnforcement'), { target: { value: 'false' } });
  const latest: URLSearchParams = state.write.mock.calls.at(-1)![0];
  expect(latest.get('incident_status')).toBe('clear');
  expect(latest.get('incident_enforcement_enabled')).toBe('false');
  expect(latest.get('user')).toBe('9');
  expect(latest.get('page')).toBe('1');
  expect(latest.has('from_id')).toBe(false);
  expect(latest.get('limit')).toBe('100');
});

it('changing the selected policy clears only status while preserving the other filters', () => {
  render(<VpsIncidentFilters policies={policies} mode="admin" limit={100} />);
  fireEvent.change(screen.getByLabelText('incidentEscalation.filterStatus'), { target: { value: 'warning' } });
  fireEvent.change(screen.getByLabelText('incidentEscalation.type'), { target: { value: 'beta' } });
  const latest: URLSearchParams = state.write.mock.calls.at(-1)![0];
  expect(latest.get('incident_policy')).toBe('beta');
  expect(latest.has('incident_status')).toBe(false);
  expect(latest.get('user')).toBe('7');
  expect(latest.get('limit')).toBe('100');
});
it('does not render unavailable registry filters', () => {
  render(<VpsIncidentFilters policies={[]} mode="admin" limit={50} />);
  expect(screen.queryByTestId('vps.incident.filters')).not.toBeInTheDocument();
});
