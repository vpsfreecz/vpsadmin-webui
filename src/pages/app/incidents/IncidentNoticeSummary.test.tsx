import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { IncidentReport } from '../../../lib/api/incidents';
import { enOps_incidents } from '../../../i18n/locales/en/ops/incidents';
import { csOps_incidents } from '../../../i18n/locales/cs/ops/incidents';
import { enVps_incidentEscalation } from '../../../i18n/locales/en/vps/incidentEscalation';
import { csVps_incidentEscalation } from '../../../i18n/locales/cs/vps/incidentEscalation';
import { IncidentNoticeSummary } from './IncidentNoticeSummary';

const state = vi.hoisted(() => ({ locale: 'en', basePath: '/app' }));
vi.mock('../../../app/appMode', () => ({ useAppMode: () => ({ basePath: state.basePath }) }));
vi.mock('../../../app/i18n', () => ({
  useI18n: () => ({
    t: (key: string, vars?: Record<string, unknown>) => {
      const dict: Record<string, string> =
        state.locale === 'cs'
          ? { ...csOps_incidents, ...csVps_incidentEscalation }
          : { ...enOps_incidents, ...enVps_incidentEscalation };
      return Object.entries(vars ?? {}).reduce(
        (text, [name, value]) => text.replaceAll(`{${name}}`, String(value)),
        dict[key] ?? key
      );
    },
  }),
}));
const report: IncidentReport = {
  id: 12,
  notice_kind: 'warning',
  trigger_incident_report_id: 7,
  notice_mail_state: 'pending',
};
function show(value: IncidentReport) {
  return render(
    <MemoryRouter>
      <IncidentNoticeSummary report={value} />
    </MemoryRouter>
  );
}
beforeEach(() => {
  state.locale = 'en';
  state.basePath = '/app';
});
afterEach(cleanup);

describe.each(['en', 'cs'])('scoped notice facts in %s', (locale) => {
  beforeEach(() => {
    state.locale = locale;
  });
  it.each(['pending', 'queued', 'sent', 'failed', 'uncertain', 'suppressed'] as const)(
    'keeps warning outcome separate from %s mail',
    (mail) => {
      const dict = locale === 'cs' ? csOps_incidents : enOps_incidents;
      show({ ...report, notice_mail_state: mail });
      expect(screen.getByTestId('incidents.notice')).toHaveTextContent(dict['incidents.notice.warning']);
      expect(screen.getByTestId('incidents.notice')).toHaveTextContent(dict[`incidents.notice.mail.${mail}`]);
      expect(screen.queryByText(dict['incidents.notice.stop_completed'])).not.toBeInTheDocument();
      expect(screen.getByRole('link')).toHaveAttribute('href', '/app/incidents/7');
    }
  );
  it('keeps a confirmed stop visible even when its notice mail failed', () => {
    const dict = locale === 'cs' ? csOps_incidents : enOps_incidents;
    show({ ...report, notice_kind: 'stop_completed', notice_mail_state: 'failed' });
    expect(screen.getByTestId('incidents.notice')).toHaveTextContent(dict['incidents.notice.stop_completed']);
    expect(screen.getByTestId('incidents.notice')).toHaveTextContent(dict['incidents.notice.mail.failed']);
  });
});
it.each(['/app', '/admin'])('uses existing authenticated detail navigation in %s', (basePath) => {
  state.basePath = basePath;
  show(report);
  expect(screen.getAllByRole('link')).toHaveLength(1);
  expect(screen.getByRole('link')).toHaveAttribute('href', `${basePath}/incidents/7`);
  expect(document.querySelector('a[href*="mail"]')).toBeNull();
});
it.each([undefined, null])('hides notice metadata on ordinary/old-API reports (%s)', (notice_kind) => {
  show({ id: 12, notice_kind, notice_mail_state: null, trigger_incident_report_id: null });
  expect(screen.queryByTestId('incidents.notice')).not.toBeInTheDocument();
});
it.each([null, undefined])('does not reconstruct an omitted/unsafe trigger link (%s)', (trigger_incident_report_id) => {
  show({ ...report, trigger_incident_report_id });
  expect(screen.getByTestId('incidents.notice')).toBeInTheDocument();
  expect(screen.queryByRole('link')).not.toBeInTheDocument();
});

it.each(['/app', '/admin'])(
  'shows only the saved originating notice policy and its authorized history in %s',
  (basePath) => {
    state.basePath = basePath;
    show({
      ...report,
      notice_policy_key: 'retired_policy',
      notice_policy_label: 'Saved originating policy',
      vps: { id: 123 },
      codename: 'unrelated_category',
    });
    expect(screen.getByTestId('incidents.notice.policy')).toHaveTextContent('Saved originating policy');
    expect(screen.getByTestId('incidents.notice.policy')).toHaveTextContent('retired_policy');
    expect(screen.getByRole('link', { name: 'Incident history' })).toHaveAttribute(
      'href',
      `${basePath}/incidents?vps=123&policy_key=retired_policy`
    );
    expect(screen.getByTestId('incidents.notice.policy')).not.toHaveTextContent('unrelated_category');
  }
);
it('does not create a notice policy or live VPS link from codename, raw VPS id or trigger', () => {
  show({ ...report, notice_policy_key: null, notice_policy_label: null, raw_vps_id: 123, codename: 'oomd' });
  expect(screen.queryByTestId('incidents.notice.policy')).not.toBeInTheDocument();
  expect(screen.getAllByRole('link')).toHaveLength(1);
  expect(screen.getByRole('link')).toHaveAttribute('href', '/app/incidents/7');
});
it('can identify an originating policy without inventing an unsafe VPS history link', () => {
  show({ ...report, notice_policy_key: 'retired_policy', notice_policy_label: 'Saved policy', raw_vps_id: 123 });
  expect(screen.getByTestId('incidents.notice.policy')).toHaveTextContent('Saved policy');
  expect(screen.queryByRole('link', { name: 'Incident history' })).not.toBeInTheDocument();
});
