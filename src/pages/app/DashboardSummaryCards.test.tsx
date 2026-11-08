// i18n-ignore-file
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import { I18nProvider } from '../../app/i18n';
import { DashboardSummaryCards } from './DashboardSummaryCards';

const ui = vi.hoisted(() => ({ settings: { language: 'cs' as 'cs' | 'en' } }));
vi.mock('../../app/uiSettings', () => ({ useUiSettings: () => ui }));
// The real provider loads this large catalog asynchronously; warm the module before timing UI assertions.
beforeAll(async () => { await import('../../i18n/cs'); });

function show(options: { language?: 'cs' | 'en'; scope?: 'mine' | 'all'; count?: number; loading?: boolean; error?: boolean; missing?: boolean } = {}) {
  ui.settings.language = options.language ?? 'cs';
  const scope = options.scope ?? 'mine';
  render(<MemoryRouter basename="/preview" initialEntries={['/preview/app']}><I18nProvider>
    <DashboardSummaryCards appMode={scope === 'all' ? 'admin' : 'user'} scope={scope} basePath={scope === 'all' ? '/admin' : '/app'} density="compact"
      membership={options.missing ? { timeZone: 'America/Los_Angeles' } : { paidUntil: '2027-01-01T00:30:00Z', monthlyPayment: 0, timeZone: 'America/Los_Angeles' }}
      vps={{ isLoading: false, isError: false, totalCount: 8 }}
      datasets={{ isLoading: false, isError: false, totalCount: 42 }}
      dns={{ isLoading: options.loading ?? false, isError: options.error ?? false, totalCount: options.count }} />
  </I18nProvider></MemoryRouter>);
}

describe('dashboard Summary', () => {
  for (const language of ['cs', 'en'] as const) {
    for (const count of [0, 1, 2, 3, 4, 5, 11, 12, 13, 14, 21, 22]) {
      it(`uses catalog plural rules for ${language}/${count}`, async () => {
        show({ language, count });
        await screen.findByRole('heading', { name: language === 'cs' ? 'Souhrn' : 'Summary' });
        const expected = language === 'cs' ? (count === 1 ? 'DNS zóna' : count >= 2 && count <= 4 ? 'DNS zóny' : 'DNS zón') : count === 1 ? 'DNS zone' : 'DNS zones';
        expect(within(screen.getByTestId('app.dashboard.kpi.dns')).getByText(expected, { exact: true })).toBeVisible();
      });
    }
  }

  it('uses the account date, preserves zero fee and keeps a basename-aware payment link inside the date field', async () => {
    show();
    await screen.findByRole('heading', { name: 'Souhrn' });
    const date = screen.getByTestId('app.dashboard.kpi.paid-until');
    expect(date).toHaveTextContent('31. 12. 2026');
    expect(within(date).getByRole('link', { name: 'Platební údaje' })).toHaveAttribute('href', '/preview/app/payments');
    expect(screen.getByTestId('app.dashboard.kpi.monthly-payment')).toHaveTextContent('Měsíční příspěvek0');
    expect(screen.queryByTestId('app.dashboard.kpi.datasets')).not.toBeInTheDocument();
  });

  it('keeps administrator All counts and scope without personal finances', async () => {
    show({ scope: 'all', count: 2 });
    await screen.findByRole('heading', { name: 'Souhrn' });
    expect(screen.getByTestId('app.dashboard.summary-scope')).toHaveTextContent('Všechny dostupné objekty');
    expect(screen.getByTestId('app.dashboard.kpi.datasets')).toHaveTextContent('42');
    expect(screen.queryByTestId('app.dashboard.kpi.paid-until')).not.toBeInTheDocument();
    expect(screen.queryByTestId('app.dashboard.kpi.monthly-payment')).not.toBeInTheDocument();
  });

  it.each([{ loading: true, value: '…' }, { error: true, value: '—' }, { value: '—' }])('does not turn unavailable counts or membership fields into zero: %j', async ({ value, ...options }) => {
    show({ ...options, missing: true });
    await screen.findByRole('heading', { name: 'Souhrn' });
    expect(screen.getByTestId('app.dashboard.kpi.dns')).toHaveTextContent(`${value}DNS zón`);
    expect(screen.getByTestId('app.dashboard.kpi.paid-until')).toHaveTextContent('—');
    expect(screen.getByTestId('app.dashboard.kpi.monthly-payment')).toHaveTextContent('—');
  });
});
