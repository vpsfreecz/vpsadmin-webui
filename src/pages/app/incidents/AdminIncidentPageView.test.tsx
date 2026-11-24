import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { AdminIncidentPageView } from './AdminIncidentPageView';
import { adminIncidentMeta } from '../../../test/adminIncidentFixtures';

vi.mock('../../../app/i18n', () => ({ useI18n: () => ({ t: (key: string) => key }) }));
vi.mock('../../../app/appMode', () => ({ useAppMode: () => ({ mode: 'admin' }) }));
vi.mock('../../../app/auth', () => ({ useAuth: () => ({ role: 'admin' }) }));
afterEach(cleanup);
const callbacks = () => ({
  onRetry: vi.fn(),
  onChange: vi.fn(),
  onApply: vi.fn(),
  onRefresh: vi.fn(),
  onOffset: vi.fn(),
});
it.each(['overview', 'history'] as const)(
  'omits the long %s banner and retains compact cutoff/read-time facts',
  (view) => {
    render(
      <MemoryRouter>
        <AdminIncidentPageView
          view={view}
          rows={[]}
          meta={adminIncidentMeta}
          search={new URLSearchParams()}
          pending={false}
          unavailable={false}
          {...callbacks()}
        />
      </MemoryRouter>
    );
    expect(screen.queryByText('incidentAdmin.snapshotHelp')).toBeNull();
    expect(screen.queryByText('incidentAdmin.actionHelp')).toBeNull();
    expect(screen.queryByText('incidentAdmin.historyHelp')).toBeNull();
    const times = screen.getByTestId('incidents.admin.asOf');
    expect(times.textContent).toContain('incidentAdmin.asOf');
    const details = times.querySelector('details')!;
    expect(details.open).toBe(false);
    expect(details.textContent).toContain('incidentAdmin.readAt');
  }
);
it('keeps outstanding scope separate from bounded evaluation period', () => {
  render(
    <MemoryRouter>
      <AdminIncidentPageView
        view="history"
        rows={[]}
        meta={{ ...adminIncidentMeta, from: null, to: null }}
        search={new URLSearchParams('scope=outstanding')}
        pending={false}
        unavailable={false}
        {...callbacks()}
      />
    </MemoryRouter>
  );
  expect(screen.getByText('incidentAdmin.outstandingPeriod')).toBeTruthy();
});
