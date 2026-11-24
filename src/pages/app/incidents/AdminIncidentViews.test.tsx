import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { enOps_incidents } from '../../../i18n/locales/en/ops/incidents';
import { csOps_incidents } from '../../../i18n/locales/cs/ops/incidents';
import { adminIncidentMeta, evaluationFixture, exposureFixture } from '../../../test/adminIncidentFixtures';
import { AdminIncidentHistoryRows, AdminIncidentOverviewRows, AdminIncidentPaging } from './AdminIncidentViews';
import { AdminIncidentsTabs } from './AdminIncidentsTabs';

function label(language: string, key: string, vars?: Record<string, unknown>) {
  const dict: Record<string, string> = language === 'cs' ? csOps_incidents : enOps_incidents;
  return Object.entries(vars ?? {}).reduce((s, [k, v]) => s.replaceAll(`{${k}}`, String(v)), dict[key] ?? key);
}
const context = vi.hoisted(() => ({ language: 'en', mode: 'admin', role: 'admin' }));
vi.mock('../../../app/appMode', () => ({
  useAppMode: () => ({ mode: context.mode, basePath: context.mode === 'admin' ? '/admin' : '/app' }),
}));
vi.mock('../../../app/auth', () => ({ useAuth: () => ({ role: context.role }) }));
vi.mock('../../../app/i18n', () => ({
  useI18n: () => ({ t: (key: string, vars?: Record<string, unknown>) => label(context.language, key, vars) }),
}));
afterEach(() => {
  cleanup();
  Object.assign(context, { language: 'en', mode: 'admin', role: 'admin' });
});
function primaryText(element: HTMLElement) {
  const copy = element.cloneNode(true) as HTMLElement;
  copy.querySelectorAll('details').forEach((details) => details.remove());
  return copy.textContent ?? '';
}
function overview(rows: ReturnType<typeof exposureFixture>[]) {
  render(
    <MemoryRouter>
      <AdminIncidentOverviewRows rows={rows} />
    </MemoryRouter>
  );
  return screen.getByTestId('incidents.admin.overview.rows');
}
function history(rows: ReturnType<typeof evaluationFixture>[]) {
  render(
    <MemoryRouter>
      <AdminIncidentHistoryRows rows={rows} />
    </MemoryRouter>
  );
  return screen.getByTestId('incidents.admin.history.rows');
}

describe.each(['en', 'cs'])('compact admin rows in %s', (language) => {
  it('keeps server order, four columns and remaining counts while normal secondary facts are closed', () => {
    context.language = language;
    const table = overview([
      exposureFixture({ id: '12:beta', policy_key: 'beta', label: 'Beta' }),
      exposureFixture({ label: 'Alpha' }),
    ]);
    expect(within(table).getAllByRole('columnheader')).toHaveLength(4);
    expect(
      within(table)
        .getAllByRole('row')
        .slice(1)
        .map((row) => within(row).getAllByRole('cell')[0]!.textContent)
    ).toEqual(['#12 stopped.example.testdemo-owner (#4)Beta', '#12 stopped.example.testdemo-owner (#4)Alpha']);
    expect(primaryText(table)).toContain(label(language, 'incidentAdmin.remainingCompact', { count: 1 }));
    expect(primaryText(table)).not.toContain('node.example.test');
    const details = table.querySelector('details')!;
    expect(details.open).toBe(false);
    expect(details.textContent).toContain('node.example.test');
    expect(details.querySelector('summary')?.getAttribute('aria-label')).toContain('Beta');
    fireEvent.click(details.querySelector('summary')!);
    // Native browser toggling is covered by the later allocated browser run.
    expect(details.textContent).toContain(label(language, 'incidentAdmin.globalMode'));
  });
  it('keeps invalid config and failed shared work prominent, and distinguishes false from unknown restriction', () => {
    context.language = language;
    const table = overview([
      exposureFixture({
        configuration_valid: false,
        warning_limit: null,
        stop_limit: null,
        warning_remaining: null,
        stop_remaining: null,
        status: null,
        stop_enforced: null,
        owner_active: false,
        transfer_pending: true,
        outstanding_stop_state: 'uncertain',
        outstanding_stop_chain_id: 100,
      }),
    ]);
    const text = primaryText(table);
    expect(text).toContain(label(language, 'incidentAdmin.status.invalid'));
    expect(text).toContain(label(language, 'incidentAdmin.action.uncertain'));
    expect(text).not.toContain(label(language, 'incidentAdmin.shutdownDisabled'));
    expect(text).not.toContain(label(language, 'incidentAdmin.thresholdReached'));
    expect(table.querySelector('details')!.textContent).toContain(label(language, 'incidentAdmin.ownerInactive'));
    cleanup();
    expect(primaryText(overview([exposureFixture({ stop_enforced: false })]))).toContain(
      label(language, 'incidentAdmin.shutdownDisabled')
    );
  });
  it('shows saved none beside a reached threshold without inventing an explanation or current action', () => {
    context.language = language;
    const table = history([
      evaluationFixture({
        decision: 'none',
        action_id: null,
        action_kind: null,
        action_state: null,
        mail_state: null,
        threshold_status: 'stop_threshold',
        count_30d: 10,
      }),
    ]);
    const text = primaryText(table);
    expect(text).toContain(label(language, 'incidentAdmin.decision.none'));
    expect(text).toContain(label(language, 'incidentAdmin.status.stop_threshold'));
    expect(text).toContain(label(language, 'incidentAdmin.noAction'));
    expect(text).not.toContain(label(language, 'incidentAdmin.confirmedStopShort'));
    expect(text).not.toMatch(/cooldown|exempt|duplicate|ochrann|výjim/i);
    expect(
      within(table)
        .getByRole('link', { name: label(language, 'incidentAdmin.report', { id: 70 }) })
        .getAttribute('href')
    ).toBe('/admin/incidents/70');
  });
  it('keeps completed warning and suppressed mail distinct from confirmed shutdown and delivery', () => {
    context.language = language;
    const table = history([evaluationFixture()]);
    const text = primaryText(table);
    expect(text).toContain(label(language, 'incidentAdmin.completedRequest'));
    expect(text).toContain(label(language, 'incidentAdmin.mail_state.suppressed'));
    expect(text).not.toContain(label(language, 'incidentAdmin.confirmedStopShort'));
    expect(text).not.toContain(label(language, 'incidentAdmin.mail_state.sent'));
    const details = table.querySelector('details')!;
    expect(details.open).toBe(false);
    expect(details.textContent).toContain('retired-policy');
    expect(details.textContent).toContain('original-owner');
    expect(details.textContent).toContain(label(language, 'incidentAdmin.savedStopEnforced'));
  });
  it('retains saved unknown/error state, retired identities and complete technical evidence in Details', () => {
    context.language = language;
    const table = history([
      evaluationFixture({
        state: 'error',
        matched: null,
        vps_id: null,
        hostname: null,
        user_id: 9,
        user_login: null,
        stop_enforced: null,
      }),
    ]);
    expect(primaryText(table)).toContain(label(language, 'incidentAdmin.evaluation.error'));
    expect(primaryText(table)).toContain(label(language, 'incidentAdmin.matchUnknown'));
    expect(table.querySelector('details')!.textContent).toContain('#9');
  });
  it('requires explicit stop proof and preserves the shared physical stop reference per saved row', () => {
    context.language = language;
    const table = history([
      evaluationFixture({
        action_kind: 'stop',
        decision: 'stop',
        physical_stop_action_id: 95,
        stop_completed_at: '2026-11-24T10:00:00Z',
        mail_state: 'failed',
      }),
      evaluationFixture({ id: 81, action_kind: 'stop', physical_stop_action_id: 95 }),
    ]);
    const text = primaryText(table);
    expect(text.split(label(language, 'incidentAdmin.confirmedStopShort'))).toHaveLength(2);
    expect(text).toContain(label(language, 'incidentAdmin.completedRequest'));
    expect(table.querySelectorAll('details')).toHaveLength(2);
    for (const details of table.querySelectorAll('details'))
      expect(details.textContent).toContain(label(language, 'incidentAdmin.physicalStop', { id: 95 }));
  });
});

it.each(['pending', 'queued', 'failed', 'uncertain', 'suppressed', 'sent'])(
  'keeps explicit mail state %s visible in the concise current outcome',
  (state) => {
    const table = history([evaluationFixture({ mail_state: state })]);
    expect(primaryText(table)).toContain(label('en', `incidentAdmin.mail_state.${state}`));
  }
);
it('follows exact next_offset rather than page-size arithmetic', () => {
  const offset = vi.fn();
  render(
    <AdminIncidentPaging
      meta={{ ...adminIncidentMeta, limit: 25, total_count: 40, next_offset: 2 }}
      rowCount={2}
      pending={false}
      onOffset={offset}
      onLimit={vi.fn()}
    />
  );
  fireEvent.click(screen.getByText('pagination.next'));
  expect(offset).toHaveBeenCalledWith(2);
});
it('retains the Reports URL and actual-admin tab gate', () => {
  render(
    <MemoryRouter initialEntries={['/admin/incidents?policy_key=retired']}>
      <AdminIncidentsTabs />
    </MemoryRouter>
  );
  expect(screen.getByRole('link', { name: 'Reports' }).getAttribute('href')).toBe(
    '/admin/incidents?policy_key=retired'
  );
  cleanup();
  context.role = 'support';
  render(
    <MemoryRouter>
      <AdminIncidentsTabs />
    </MemoryRouter>
  );
  expect(screen.queryByTestId('incidents.admin.tabs')).toBeNull();
});
it.each([
  { offset: 25, count: 2, first: 26, last: 27 },
  { offset: 50, count: 0, first: 0, last: 0 },
])('retains actual row range %j', ({ offset, count, first, last }) => {
  render(
    <AdminIncidentPaging
      meta={{ ...adminIncidentMeta, offset, total_count: 40 }}
      rowCount={count}
      pending={false}
      onOffset={vi.fn()}
      onLimit={vi.fn()}
    />
  );
  expect(screen.getByText(label('en', 'incidentAdmin.page', { first, last, total: 40 }))).toBeTruthy();
});
