import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import type { VpsPressureRow } from '../../../lib/api/vpsPressureModels';
import { enVps_pressure } from '../../../i18n/locales/en/vps/pressure';
import { csVps_pressure } from '../../../i18n/locales/cs/vps/pressure';
import { PressureRows, PressureProgress } from './PressureRows';
import { PressureHistoryRows } from './PressureHistoryRows';
import { PressureFiltersForm } from './PressureFilters';
import { PressurePageView } from './PressurePageView';
import { VpsPressureView } from './VpsPressureView';
import { applyPressureFilters, pressureDuration, readPressureFilters, scopePressureFilters } from './pressureState';

const locale = vi.hoisted(() => ({ value: 'en' }));
vi.mock('../../../app/i18n', () => ({
  useI18n: () => ({
    lang: locale.value,
    t: (key: string, vars?: Record<string, unknown>) => {
      const dict: Record<string, string> = locale.value === 'cs' ? csVps_pressure : enVps_pressure;
      return Object.entries(vars ?? {}).reduce(
        (text, [name, value]) => text.replaceAll(`{${name}}`, String(value)),
        dict[key] ?? key
      );
    },
  }),
}));
afterEach(cleanup);

const row: VpsPressureRow = {
  id: '42:rtnl_latency',
  vps: { id: 42, hostname: '<script>host</script>' },
  user: { id: 7, login: '<owner>' },
  node: { id: 3, domain_name: '<node>' },
  signal: 'rtnl_latency',
  label: 'Internal signal label',
  credit_us: 125,
  window_seconds: 86400,
  window_from: '2026-11-27T12:00:00Z',
  window_to: '2026-11-28T12:00:00Z',
  threshold_seconds: 60,
  configuration_valid: true,
  reporting_enabled: false,
  observation_state: 'fresh',
  window_complete: false,
  last_observed_at: null,
};

describe.each(['en', 'cs'])('pressure rendering in %s', (lang) => {
  it('retains exact subsecond values, capped progress and invalid threshold absence', () => {
    locale.value = lang;
    const view = render(<PressureProgress row={row} />);
    expect(screen.getByRole('meter')).toHaveAttribute('aria-valuetext', expect.stringContaining('125 µs'));
    expect(screen.getByText('<1s')).toBeVisible();
    view.rerender(<PressureProgress row={{ ...row, credit_us: 70_000_000 }} />);
    expect(screen.getByRole('meter')).toHaveAttribute('value', '100');
    expect(screen.getByText('1m 10s')).toHaveAttribute('title', expect.stringContaining('70'));
    view.rerender(<PressureProgress row={{ ...row, credit_us: null, observation_state: 'no_data' }} />);
    expect(screen.queryByRole('meter')).toBeNull();
    expect(screen.getByText(lang === 'en' ? 'Unavailable' : 'nedostupné')).toBeVisible();
    view.rerender(
      <PressureProgress row={{ ...row, credit_us: null, threshold_seconds: null, configuration_valid: false }} />
    );
    expect(screen.queryByRole('meter')).toBeNull();
    expect(screen.getByText(lang === 'en' ? 'Unavailable' : 'nedostupné')).toBeVisible();
  });

  it('uses escaped links only in admin view and distinguishes no observations from a healthy zero', () => {
    locale.value = lang;
    const view = render(
      <MemoryRouter>
        <PressureRows rows={[{ ...row, credit_us: 0, observation_state: 'no_data' }]} basePath="/admin" admin />
      </MemoryRouter>
    );
    expect(screen.getAllByRole('link', { name: '<owner>' })[0]).toHaveAttribute('href', '/admin/users/7');
    expect(screen.getAllByRole('link', { name: '<node>' })[0]).toHaveAttribute('href', '/admin/nodes/3');
    expect(screen.getAllByText(lang === 'en' ? 'No observations' : 'bez pozorování')).toHaveLength(2);
    expect(screen.queryAllByRole('meter')).toHaveLength(0);
    expect(document.querySelector('script')).toBeNull();
    view.rerender(
      <MemoryRouter>
        <PressureRows rows={[row]} basePath="/app" admin={false} />
      </MemoryRouter>
    );
    expect(screen.queryByRole('link', { name: '<owner>' })).toBeNull();
    expect(screen.queryByRole('link', { name: '<node>' })).toBeNull();
    expect(screen.getAllByRole('link')[0]).toHaveAttribute('href', '/app/vps/42/pressure');
  });

  it('separates issue type from umbrella and removes observation boilerplate in desktop and mobile', () => {
    locale.value = lang;
    render(
      <MemoryRouter>
        <PressureRows
          rows={[{ ...row, observation_state: 'stale', last_observed_at: '2026-11-28T12:00:00Z' }]}
          basePath="/app"
          admin={false}
        />
      </MemoryRouter>
    );
    const table = screen.getByTestId('pressure.rows');
    expect(within(table).getAllByRole('columnheader')).toHaveLength(4);
    expect(screen.getAllByText(lang === 'en' ? 'Memory pressure' : 'Paměťová zátěž')).toHaveLength(2);
    expect(screen.queryByText(lang === 'en' ? 'VPS issues' : 'Problémy VPS')).toBeNull();
    expect(table).not.toHaveTextContent(/State|Observation|Read at|Incomplete|Last observed/);
    expect(screen.getByTestId('pressure.mobile')).not.toHaveTextContent(/common.state|neúplná|Poslední pozorování/);
    expect(screen.getAllByText('<1s')).toHaveLength(2);
    expect(within(table).getByRole('link')).toHaveAttribute('href', '/app/vps/42/pressure');
  });

  it('uses orange below 80 percent and red at the boundary while retaining true accessible duration', () => {
    locale.value = lang;
    const view = render(<PressureProgress row={{ ...row, threshold_seconds: 100, credit_us: 79_900_000 }} />);
    expect(screen.getByRole('meter')).toHaveAttribute('data-tone', 'warning');
    expect(screen.getByRole('meter')).toHaveAttribute('value', '79.9');
    view.rerender(<PressureProgress row={{ ...row, threshold_seconds: 100, credit_us: 80_000_000 }} />);
    expect(screen.getByRole('meter')).toHaveAttribute('data-tone', 'danger');
    view.rerender(<PressureProgress row={{ ...row, threshold_seconds: 100, credit_us: 125_000_000 }} />);
    expect(screen.getByRole('meter')).toHaveAttribute('value', '100');
    expect(screen.getByRole('meter')).toHaveAttribute(
      'aria-valuetext',
      expect.stringContaining(lang === 'en' ? '125,000,000 µs' : '125 000 000 µs')
    );
    view.rerender(<PressureProgress row={{ ...row, credit_us: 0 }} />);
    expect(screen.getByText('0s')).toBeVisible();
    expect(screen.getByRole('meter')).toHaveAttribute('data-tone', 'warning');
  });

  it('shows account-zone endpoints, unknown gaps and in-progress UTC buckets without historical thresholds', async () => {
    locale.value = lang;
    const change = vi.fn();
    render(
      <PressureHistoryRows
        days={7}
        timeZone="Europe/Prague"
        onDaysChange={change}
        ownerBound
        rows={[
          { from_at: '2026-03-29T00:00:00Z', to_at: '2026-03-30T00:00:00Z', recorded_us: null, partial_day: false },
          { from_at: '2026-03-30T00:00:00Z', to_at: '2026-03-31T00:00:00Z', recorded_us: 1_000_000, partial_day: true },
        ]}
      />
    );
    expect(screen.getByText(lang === 'en' ? 'No recorded data' : 'bez záznamů')).toBeVisible();
    expect(screen.getByText('1s')).toBeVisible();
    expect(screen.getByText(lang === 'en' ? 'In progress' : 'Probíhá')).toBeVisible();
    expect(screen.getByText(lang === 'en' ? 'Period' : 'Období')).toBeVisible();
    expect(screen.queryByRole('meter')).toBeNull();
    await userEvent.selectOptions(screen.getByRole('combobox'), '30');
    expect(change).toHaveBeenCalledWith(30);
  });
});

it.each([
  ['2026-03-29T00:00:00Z', '2026-03-30T00:00:00Z', 'GMT+1', 'GMT+2', '3/29/2026, 1:00:00 AM', '3/30/2026, 2:00:00 AM'],
  [
    '2026-10-25T00:00:00Z',
    '2026-10-26T00:00:00Z',
    'GMT+2',
    'GMT+1',
    '10/25/2026, 2:00:00 AM',
    '10/26/2026, 1:00:00 AM',
  ],
])('preserves exact UTC bucket %s across Prague DST', (from, to, fromOffset, toOffset, fromText, toText) => {
  locale.value = 'en';
  const rows = [{ from_at: from, to_at: to, recorded_us: 125, partial_day: false }];
  const before = JSON.stringify(rows);
  const { container } = render(
    <PressureHistoryRows days={7} rows={rows} onDaysChange={vi.fn()} timeZone="Europe/Prague" />
  );
  const times = container.querySelectorAll('time');
  expect(times[0]).toHaveAttribute('datetime', from);
  expect(times[0]).toHaveTextContent(fromText);
  expect(times[0]).toHaveTextContent(fromOffset);
  expect(times[1]).toHaveAttribute('datetime', to);
  expect(times[1]).toHaveTextContent(toText);
  expect(times[1]).toHaveTextContent(toOffset);
  expect(container).not.toHaveTextContent(/T00:00|Read at/);
  expect(screen.getByText('Europe/Prague')).toBeVisible();
  expect(JSON.stringify(rows)).toBe(before);
});

it('renders the previous local date west of UTC and formats both window endpoints without microseconds', () => {
  locale.value = 'en';
  const { container } = render(
    <MemoryRouter>
      <VpsPressureView
        vpsId={42}
        basePath="/app"
        admin={false}
        timeZone="America/Los_Angeles"
        rows={[{ ...row, window_from: '2026-03-29T00:00:00.123456Z', window_to: '2026-03-30T00:00:00.123456Z' }]}
        pending={false}
        unavailable={false}
        onRetry={vi.fn()}
        history={{
          rows: [
            { from_at: '2026-03-29T00:00:00Z', to_at: '2026-03-30T00:00:00Z', recorded_us: null, partial_day: true },
          ],
          days: 7,
          pending: false,
          unavailable: false,
          ownerBound: false,
          onRetry: vi.fn(),
          onDaysChange: vi.fn(),
        }}
      />
    </MemoryRouter>
  );
  const times = container.querySelectorAll('time');
  expect(times[0]).toHaveTextContent('3/28/2026, 5:00:00 PM');
  expect(times[1]).toHaveTextContent('3/29/2026, 5:00:00 PM');
  const currentPeriod = screen.getAllByText('1d')[0];
  expect(currentPeriod).toHaveAttribute('title', '3/28/2026, 5:00:00 PM – 3/29/2026, 5:00:00 PM');
  expect(container.textContent).not.toMatch(/123456|T00:00|Read at|Today/);
});

it('submits the actual default resource selects and all five unchanged optional filters without zero sentinels', async () => {
  locale.value = 'en';
  const apply = vi.fn();
  const props = {
    admin: true,
    supported: ['user', 'vps', 'node', 'location', 'environment'] as const,
    choices: {
      node: [{ value: '3', label: 'node3' }],
      location: [{ value: '2', label: 'location2' }],
      environment: [{ value: '1', label: 'environment1' }],
    },
    pending: false,
    onApply: apply,
    onRefresh: vi.fn(),
  };
  const { rerender } = render(<PressureFiltersForm {...props} search={new URLSearchParams()} />);
  await userEvent.click(screen.getByRole('button', { name: 'incidentAdmin.apply' }));
  const defaults = { user: '', vps: '', node: '', location: '', environment: '' };
  expect(apply).toHaveBeenLastCalledWith(defaults);
  expect(
    readPressureFilters(applyPressureFilters(new URLSearchParams('offset=25'), defaults), props.supported)
  ).toEqual({});
  const unchanged = { user: '7', vps: '42', node: '3', location: '2', environment: '1' };
  rerender(<PressureFiltersForm {...props} search={new URLSearchParams(unchanged)} />);
  await userEvent.click(screen.getByRole('button', { name: 'incidentAdmin.apply' }));
  expect(apply).toHaveBeenLastCalledWith(unchanged);
  expect(
    readPressureFilters(applyPressureFilters(new URLSearchParams('offset=25'), unchanged), props.supported)
  ).toEqual({ user: 7, vps: 42, node: 3, location: 2, environment: 1 });
});

it('presents only supported filters and never permits a My-view owner override', async () => {
  locale.value = 'en';
  const apply = vi.fn();
  render(
    <PressureFiltersForm
      admin={false}
      supported={['user', 'vps', 'node']}
      search={new URLSearchParams('vps=42')}
      choices={{ node: [{ value: '3', label: 'node3' }] }}
      pending={false}
      onApply={apply}
      onRefresh={vi.fn()}
    />
  );
  expect(screen.queryByLabelText('vps.list.filter.user.placeholder')).toBeNull();
  expect(screen.queryByLabelText('vps.list.filter.location.label')).toBeNull();
  await userEvent.selectOptions(screen.getByLabelText('common.node'), '3');
  await userEvent.click(screen.getByRole('button', { name: 'incidentAdmin.apply' }));
  expect(apply).toHaveBeenCalledWith({ vps: '42', node: '3' });
});

it('keeps duration null/zero distinct and rejects invalid or unsupported filters without broadening', () => {
  expect([null, 0, 125].map((value) => pressureDuration(value))).toEqual(['—', '0s', '<1s']);
  expect(readPressureFilters(new URLSearchParams('vps=42&node=3'), ['vps', 'node'])).toEqual({ vps: 42, node: 3 });
  for (const query of [
    'vps=0',
    'user=0',
    'node=0',
    'location=0',
    'environment=0',
    'vps=-1',
    'vps=x',
    'vps=1&vps=2',
    'user=7',
    'vps=9007199254740992',
  ]) {
    expect(() => readPressureFilters(new URLSearchParams(query), ['vps', 'node'])).toThrow();
  }
  const next = applyPressureFilters(new URLSearchParams('offset=50&limit=25&node=3'), { vps: '42' });
  expect(next.toString()).toBe('limit=25&vps=42');
  expect(next.has('offset')).toBe(false);
});

it('scopes a privileged My-view read to the signed-in owner and refuses unavailable scope', () => {
  expect(scopePressureFilters({ node: 3 }, 'user', 'admin', 7, ['user', 'node'])).toEqual({ node: 3, user: 7 });
  expect(() => scopePressureFilters({}, 'user', 'admin', 7, ['node'])).toThrow();
  expect(() => scopePressureFilters({ user: 8 }, 'user', 'admin', 7, ['user'])).toThrow();
  expect(scopePressureFilters({ user: 8 }, 'admin', 'admin', 7, ['user'])).toEqual({ user: 8 });
  expect(scopePressureFilters({ vps: 42 }, 'user', 'user', 7, ['vps'])).toEqual({ vps: 42 });
});

it('keeps a supported current detail readable when historical capability is absent', () => {
  locale.value = 'en';
  render(
    <MemoryRouter>
      <VpsPressureView
        vpsId={42}
        basePath="/app"
        admin={false}
        rows={[row]}
        pending={false}
        unavailable={false}
        onRetry={vi.fn()}
        history={{
          rows: [],
          days: 7,
          pending: false,
          unavailable: true,
          ownerBound: false,
          onRetry: vi.fn(),
          onDaysChange: vi.fn(),
        }}
      />
    </MemoryRouter>
  );
  expect(screen.getAllByText('<1s')).toHaveLength(2);
  expect(screen.getByText('History is unavailable.')).toBeVisible();
  expect(screen.getByRole('link', { name: 'incidentEscalation.history' })).toHaveAttribute(
    'href',
    '/app/incidents?vps=42'
  );
});

it('distinguishes an empty filtered page from unavailable capability', () => {
  locale.value = 'en';
  const props = {
    rows: [],
    search: new URLSearchParams(),
    supportedFilters: [],
    choices: {},
    basePath: '/app',
    admin: false,
    pending: false,
    onApply: vi.fn(),
    onRefresh: vi.fn(),
    onRetry: vi.fn(),
    onOffset: vi.fn(),
  };
  const view = render(
    <MemoryRouter>
      <PressurePageView {...props} unavailable={false} />
    </MemoryRouter>
  );
  expect(screen.getByText('No recorded time matches these filters.')).toBeVisible();
  view.rerender(
    <MemoryRouter>
      <PressurePageView {...props} unavailable />
    </MemoryRouter>
  );
  expect(screen.getByText('Memory pressure data is unavailable.')).toBeVisible();
  expect(screen.queryByText('No recorded time matches these filters.')).toBeNull();
});
