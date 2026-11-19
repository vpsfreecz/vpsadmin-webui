import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { enVps_incidentEscalation } from '../../../i18n/locales/en/vps/incidentEscalation';
import { csVps_incidentEscalation } from '../../../i18n/locales/cs/vps/incidentEscalation';
import { IncidentPolicyFilter } from './IncidentPolicyFilter';

const state = vi.hoisted(() => ({ language: 'en', supported: true }));
const api = vi.hoisted(() => ({ capabilities: vi.fn(), registry: vi.fn() }));
vi.mock('../../../app/appMode', () => ({ useAppMode: () => ({ basePath: '/admin' }) }));
vi.mock('../../../app/i18n', () => ({
  useI18n: () => ({
    t: (key: string) => {
      const dict: Record<string, string> =
        state.language === 'cs' ? csVps_incidentEscalation : enVps_incidentEscalation;
      return dict[key] ?? key;
    },
  }),
}));
vi.mock('../../../lib/api/incidentPolicies', () => ({
  fetchIncidentPolicyCapabilities: api.capabilities,
  fetchIncidentPolicies: api.registry,
}));
vi.mock('../../../components/ui/ErrorState', () => ({
  ErrorState: ({ title, onRetry }: { title: string; onRetry: () => void }) => (
    <div role="alert">
      {title}
      <button onClick={onRetry}>Retry</button>
    </div>
  ),
}));
function Location() {
  return <output data-testid="location">{useLocation().search}</output>;
}
function show(
  path = '/admin/incidents?user=7&vps=12&codename=manual&limit=25&page=4&from_id=90&policy_key=retired_key'
) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const content = (key: string) => (
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[path]}>
        <IncidentPolicyFilter key={key} />
        <Location />
      </MemoryRouter>
    </QueryClientProvider>
  );
  const result = render(content('first'));
  return { remount: () => result.rerender(content('second')) };
}
beforeEach(() => {
  state.language = 'en';
  state.supported = true;
  api.capabilities.mockReset().mockImplementation(async () => ({ data: { policies: state.supported } }));
  api.registry.mockReset().mockResolvedValue({
    data: [
      { key: 'alpha', label: 'Policy A' },
      { key: 'beta', label: 'Policy B' },
    ],
  });
});
afterEach(cleanup);

it('selects actual cached active policies, retains a retired deep link, and resets only pagination', async () => {
  const view = show();
  const select = await screen.findByRole('combobox', { name: 'Policy' });
  await waitFor(() => expect(select).toBeEnabled());
  expect(screen.getAllByRole('option').map((o) => o.textContent)).toEqual([
    'All policies',
    'Policy A',
    'Policy B',
    'retired_key',
  ]);
  expect(select).toHaveValue('retired_key');
  const user = userEvent.setup();
  await user.selectOptions(select, 'beta');
  const params = new URLSearchParams(screen.getByTestId('location').textContent ?? '');
  expect(Object.fromEntries(params)).toEqual({
    user: '7',
    vps: '12',
    codename: 'manual',
    limit: '25',
    page: '1',
    policy_key: 'beta',
  });
  await user.selectOptions(select, '');
  expect(new URLSearchParams(screen.getByTestId('location').textContent ?? '').has('policy_key')).toBe(false);
  view.remount();
  await waitFor(() => expect(screen.getByRole('combobox')).toBeEnabled());
  expect(api.registry).toHaveBeenCalledTimes(1);
  expect(api.capabilities).toHaveBeenCalledTimes(1);
});
it('does not turn a failed registry into a successful empty selection', async () => {
  api.registry.mockRejectedValue(new Error('unavailable'));
  show();
  await screen.findByRole('alert');
  expect(screen.getByRole('combobox')).toBeDisabled();
  expect(screen.getByRole('combobox')).toHaveValue('retired_key');
  expect(new URLSearchParams(screen.getByTestId('location').textContent ?? '').get('policy_key')).toBe('retired_key');
});
it('distinguishes an empty active registry from missing capability and preserves historical filters', async () => {
  api.registry.mockResolvedValue({ data: [] });
  show();
  await waitFor(() => expect(screen.getByRole('combobox')).toBeEnabled());
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  expect(screen.getAllByRole('option').map((o) => o.textContent)).toEqual(['All policies', 'retired_key']);
});
it('shows approved Czech all-policy copy and honest old-API unavailability without a registry request', async () => {
  state.language = 'cs';
  state.supported = false;
  show();
  await screen.findByText('Incidenty nejsou dostupné');
  expect(screen.getByRole('option', { name: 'Všechna pravidla' })).toBeInTheDocument();
  expect(screen.getByRole('combobox')).toBeDisabled();
  expect(screen.getByRole('combobox')).toHaveValue('retired_key');
  expect(api.registry).not.toHaveBeenCalled();
});
