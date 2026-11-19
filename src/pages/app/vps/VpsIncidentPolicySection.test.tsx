import { useState } from 'react';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { enVps_incidentEscalation } from '../../../i18n/locales/en/vps/incidentEscalation';
import { csVps_incidentEscalation } from '../../../i18n/locales/cs/vps/incidentEscalation';
import { VpsIncidentPolicySection } from './VpsIncidentPolicySection';
import { VpsIncidentLimitFields, type IncidentLimitDraft } from './VpsIncidentLimitFields';
import { VpsIncidentThresholdAlert } from './VpsIncidentThresholdAlert';
import { VpsIncidentsContent } from './VpsIncidentsPage';
import { IncidentPolicySavedSection } from '../incidents/IncidentPolicySavedSection';

const locale = vi.hoisted(() => ({ value: 'en' }));
vi.mock('../../../app/i18n', () => ({
  useI18n: () => {
    const dict: Record<string, string> = locale.value === 'cs' ? csVps_incidentEscalation : enVps_incidentEscalation;
    const t = (key: string, vars?: Record<string, unknown>) =>
      Object.entries(vars ?? {}).reduce(
        (text, [name, value]) => text.replaceAll(`{${name}}`, String(value)),
        dict[key] ?? key
      );
    return {
      t,
      tc: (key: string, count: number, vars?: Record<string, unknown>) =>
        t(`${key}.${new Intl.PluralRules(locale.value).select(count)}`, { count, ...vars }),
    };
  },
}));
afterEach(cleanup);

function sections() {
  return (
    <MemoryRouter>
      <VpsIncidentPolicySection
        policyKey="alpha"
        label="API label A"
        description="Plain registry description"
        warning={{ count: 0, limit: 5, days: 7 }}
        shutdown={{ count: 0, limit: 10, days: 30 }}
        configurationValid
        status="clear"
        historyHref="/app/incidents?vps=12&policy_key=alpha"
        details={<a href="/app/incidents/77">Saved evaluation #77</a>}
      />
      <VpsIncidentPolicySection
        policyKey="other_key"
        label="API label B"
        warning={{ count: 8, limit: 3, days: 7 }}
        shutdown={{ count: 12, limit: 9, days: 30 }}
        configurationValid
        status="stop_threshold"
        historyHref="/app/incidents?vps=12&policy_key=other_key"
      />
    </MemoryRouter>
  );
}

describe.each(['en', 'cs'])('generic policy sections in %s', (language) => {
  it('shows distinct configured zero-count and reached-limit policies without a source-specific label', () => {
    locale.value = language;
    render(sections());
    expect(screen.getByRole('heading', { name: 'API label A' })).toBeVisible();
    expect(screen.getByRole('heading', { name: 'API label B' })).toBeVisible();
    const first = screen.getByTestId('vps.incidents.policy.alpha');
    const second = screen.getByTestId('vps.incidents.policy.other_key');
    const headings = within(first)
      .getAllByRole('columnheader')
      .map((header) => header.textContent);
    expect(headings).toEqual(
      language === 'en' ? ['Period', 'Incidents', 'Limit', 'Action'] : ['Období', 'Počet incidentů', 'Limit', 'Akce']
    );
    expect(within(first).getAllByRole('row')[1]).toHaveTextContent(
      language === 'en' ? '7 days05Warning' : '7 dní05Upozornění'
    );
    expect(within(first).getAllByRole('row')[2]).toHaveTextContent(
      language === 'en' ? '30 days010VPS stop' : '30 dní010Vypnutí VPS'
    );
    expect(within(second).getAllByRole('row')[2]).toHaveTextContent(
      language === 'en' ? '30 days129VPS stop' : '30 dní129Vypnutí VPS'
    );
    expect(first).toHaveAttribute('id', 'incident-policy-alpha');
    expect(screen.getByTestId('vps.incidents.policy.other_key')).toHaveTextContent(
      language === 'en'
        ? 'Too many incident reports: VPS shutdown limit reached'
        : 'Počet hlášení incidentů dosáhl limitu pro vypnutí VPS'
    );
    expect(screen.getAllByRole('link').map((link) => link.getAttribute('href'))).toContain(
      '/app/incidents?vps=12&policy_key=other_key'
    );
    expect(screen.getByText('Saved evaluation #77')).toBeVisible();
    expect(screen.getByText('Saved evaluation #77').closest('details')).toBeNull();
    expect(screen.queryByText(/oomd|memory pressure/i)).not.toBeInTheDocument();
  });
});

it('reports invalid configuration without inventing a zero limit or clear status', () => {
  locale.value = 'en';
  render(
    <MemoryRouter>
      <VpsIncidentPolicySection
        policyKey="invalid"
        label="Invalid policy"
        warning={{ count: 4, limit: null, days: 7 }}
        shutdown={{ count: 8, limit: null, days: 30 }}
        configurationValid={false}
        status={null}
        historyHref="/app/incidents?policy_key=invalid"
      />
    </MemoryRouter>
  );
  expect(screen.getByText(enVps_incidentEscalation['incidentEscalation.misconfigured'])).toBeVisible();
  expect(screen.queryByText('Below limits')).not.toBeInTheDocument();
  expect(screen.getByTestId('vps.incidents.policy.invalid')).not.toHaveTextContent('/ 0');
});

it.each([
  { warningCount: 0, shutdownCount: 0, text: null },
  { warningCount: 2, shutdownCount: 0, text: 'Too many incident reports: warning limit reached' },
  { warningCount: 2, shutdownCount: 1, text: 'Too many incident reports: VPS shutdown limit reached' },
])('overview exposes only a reached threshold: $warningCount/$shutdownCount', ({ text, ...counts }) => {
  locale.value = 'en';
  render(
    <MemoryRouter>
      <VpsIncidentThresholdAlert {...counts} href="/admin/vps/12/incidents?user=7" />
    </MemoryRouter>
  );
  if (text) {
    expect(screen.getByText(text)).toBeVisible();
    expect(screen.getByRole('link', { name: 'View incidents' })).toHaveAttribute(
      'href',
      '/admin/vps/12/incidents?user=7'
    );
  } else expect(screen.queryByTestId('vps.incidents.threshold')).not.toBeInTheDocument();
});

it('the inherit control clears only its own draft without submitting a write', async () => {
  locale.value = 'en';
  const submitted = vi.fn();
  function Fields() {
    const [value, onChange] = useState<IncidentLimitDraft>({
      warning: { value: '8', inherited: false },
      shutdown: { value: '12', inherited: false },
    });
    return (
      <form onSubmit={submitted}>
        <VpsIncidentLimitFields value={value} onChange={onChange} />
      </form>
    );
  }
  render(<Fields />);
  await userEvent.setup().click(screen.getByRole('button', { name: 'Use inherited limits' }));
  expect(screen.getByLabelText('Warning limit')).toHaveValue('');
  expect(screen.getByLabelText('Shutdown limit')).toHaveValue('');
  expect(submitted).not.toHaveBeenCalled();
});

it('uses supplied saved periods and keeps absent facts empty rather than substituting current limits', () => {
  locale.value = 'en';
  render(
    <MemoryRouter>
      <IncidentPolicySavedSection
        label="Saved policy"
        warning={{ days: 14, count: 2, limit: 4 }}
        stop={{ days: undefined, count: 0, limit: null }}
        currentHref="/app/vps/12/incidents#incident-policy-alpha"
        historyHref="/app/incidents?vps=12&policy_key=alpha"
      />
    </MemoryRouter>
  );
  const rows = screen.getAllByRole('row');
  expect(rows[1]).toHaveTextContent('14 days24Warning');
  expect(rows[2]).toHaveTextContent('common.na0common.naVPS stop');
  expect(screen.getByRole('link', { name: 'View policy' })).toHaveAttribute(
    'href',
    '/app/vps/12/incidents#incident-policy-alpha'
  );
  expect(screen.getByRole('link', { name: 'Incident history' })).toHaveAttribute(
    'href',
    '/app/incidents?vps=12&policy_key=alpha'
  );
});

it('scrolls to the requested policy when its asynchronously loaded section mounts', () => {
  locale.value = 'en';
  const scroll = vi.fn();
  const old = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'scrollIntoView');
  Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', { configurable: true, value: scroll });
  try {
    render(
      <MemoryRouter initialEntries={['/app/vps/12/incidents#incident-policy-beta']}>
        <VpsIncidentPolicySection
          policyKey="beta"
          label="Target policy"
          warning={{ count: 1, limit: 5, days: 7 }}
          shutdown={{ count: 2, limit: 10, days: 30 }}
          configurationValid
          status="clear"
          historyHref="/app/incidents?vps=12&policy_key=beta"
        />
      </MemoryRouter>
    );
    expect(scroll).toHaveBeenCalledWith({ block: 'start' });
    expect(scroll.mock.contexts[0]).toBe(screen.getByTestId('vps.incidents.policy.beta'));
  } finally {
    if (old) Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', old);
    else Reflect.deleteProperty(HTMLElement.prototype, 'scrollIntoView');
  }
});

it('renders policy and shared facts directly without the disclosure or a replacement strip', () => {
  locale.value = 'en';
  render(
    <VpsIncidentsContent permission={false} sharedDetails={<a href="/saved">Shared saved fact</a>}>
      {sections()}
    </VpsIncidentsContent>
  );
  expect(screen.getByText('Shared saved fact')).toBeVisible();
  expect(screen.getByText('Shared saved fact').closest('details')).toBeNull();
  expect(screen.queryByText('Details')).not.toBeInTheDocument();
  expect(screen.getByText('Not allowed')).toBeVisible();
});

describe.each(['en', 'cs'])('complete limit values in %s', (language) => {
  it.each([1, 3, 5])('renders %i reports with the supplied period and plural category', (count) => {
    locale.value = language;
    render(
      <VpsIncidentLimitFields
        value={{ warning: { value: String(count), inherited: true }, shutdown: { value: '10', inherited: false } }}
        inheritedWarning={count}
        warningPeriod={7}
        shutdownPeriod={14}
        onChange={() => undefined}
      />
    );
    expect(
      screen.getByText(
        language === 'en' ? `${count} report${count === 1 ? '' : 's'} in 7 days` : `${count} hlášení za 7 dní`
      )
    ).toBeVisible();
    expect(screen.getByText(language === 'en' ? '10 reports in 14 days' : '10 hlášení za 14 dní')).toBeVisible();
    expect(screen.getByLabelText(language === 'en' ? 'Warning limit' : 'Limit pro upozornění')).toHaveValue(
      String(count)
    );
  });
});
