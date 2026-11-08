import { expect, test, type Page } from '@playwright/test';
import { bootstrapVpsAdminWindow, installHaveApiMock, setUiSettingsLocalStorage } from '../../fixtures';
import { expectNoDocumentHorizontalOverflow } from '../../helpers/horizontalOverflow';

type Language = 'cs' | 'en';
async function setup(page: Page, language: Language, level: number) {
  await bootstrapVpsAdminWindow(page, {
    sessionToken: 'SYNTHETIC_SUMMARY',
    webuiNext: { serverTimeZone: 'UTC', uiSettings: { persistence: 'local' } },
  });
  await setUiSettingsLocalStorage(page, { language, theme: language === 'cs' ? 'dark' : 'light' });
  const state = {
    count: 2,
    countState: 'ready' as 'ready' | 'error' | 'loading',
    paidUntil: '2027-01-01T00:30:00Z' as string | null,
    monthlyPayment: 12345 as number | null,
    reads: [] as string[],
    writes: [] as string[],
    errors: [] as string[],
  };
  page.on('pageerror', error => state.errors.push(String(error)));
  page.on('request', request => {
    const path = new URL(request.url()).pathname;
    if (!path.startsWith('/api/')) return;
    if (request.method() === 'GET') state.reads.push(path);
    else state.writes.push(`${request.method()} ${path}`);
  });
  await installHaveApiMock(page, {
    user: { id: 7, login: 'summary-example', level, time_zone: 'America/Los_Angeles' },
    handlers: {
      'GET users/current': () => ({ user: { id: 7, login: 'summary-example', level, time_zone: 'America/Los_Angeles', paid_until: state.paidUntil, monthly_payment: state.monthlyPayment } }),
      'GET vpses': () => ({ vpses: [], _meta: { total_count: 8 } }),
      'GET datasets': () => ({ datasets: [], _meta: { total_count: 42 } }),
      'GET dns_zones': () => {
        if (state.countState === 'error') return { status: 503, contentType: 'application/json', body: JSON.stringify({ status: false, message: 'Synthetic read failure' }) };
        if (state.countState === 'loading') return new Promise<never>(() => {});
        return { dns_zones: [], _meta: { total_count: state.count } };
      },
      'GET cluster/full_stats': () => ({ cluster: { user_count: 10, vps_count: 81, node_count: 3 } }),
      'GET nodes/public_status': () => ({ nodes: [] }),
      'GET outages': () => ({ outages: [] }),
      'GET news_logs': () => ({ news_logs: [] }),
      'GET security_advisories': () => ({ security_advisories: [] }),
    },
  });
  return state;
}

for (const actor of [{ mode: 'app', level: 1 }, { mode: 'app', level: 21 }, { mode: 'app', level: 100 }, { mode: 'admin', level: 21 }, { mode: 'admin', level: 100 }] as const) {
  for (const language of ['cs', 'en'] as const) {
    test(`@pr-smoke @pr-smoke-mobile Summary scope and membership ${actor.mode}/${actor.level}/${language}`, async ({ page, isMobile }, info) => {
      await page.setViewportSize(isMobile ? { width: 320, height: 844 } : { width: 1440, height: 1000 });
      const state = await setup(page, language, actor.level);
      const counts = [2];
      for (const count of counts) {
        state.count = count;
        await page.goto(`/${actor.mode}?user=84`);
        const summary = page.getByTestId('app.dashboard.summary-grid');
        await expect(summary.getByRole('heading', { name: language === 'cs' ? 'Souhrn' : 'Summary', exact: true })).toBeVisible();
        await expect(summary.getByTestId('app.dashboard.kpi.vps.open')).toHaveCount(0);
        await expect(summary.getByTestId('app.dashboard.kpi.dns.open')).toHaveCount(0);
        const noun = language === 'cs' ? (count === 1 ? 'DNS zóna' : count >= 2 && count <= 4 ? 'DNS zóny' : 'DNS zón') : count === 1 ? 'DNS zone' : 'DNS zones';
        await expect(summary.getByTestId('app.dashboard.kpi.dns')).toHaveText(`${count}${noun}`);
        if (actor.mode === 'app') {
          const paid = summary.getByTestId('app.dashboard.kpi.paid-until');
          await expect(paid).toContainText(language === 'cs' ? '31. 12. 2026' : '12/31/2026');
          await expect(summary.getByTestId('app.dashboard.kpi.monthly-payment')).toHaveText(language === 'cs' ? 'Měsíční příspěvek12\u00a0345' : 'Monthly membership fee12,345');
          const link = paid.getByRole('link', { name: language === 'cs' ? 'Platební údaje' : 'Payment details' });
          await expect(link).toHaveAttribute('href', '/app/payments');
          await link.focus();
          await expect(link).toBeFocused();
          const ring = await link.evaluate(el => getComputedStyle(el).boxShadow);
          expect(ring).not.toBe('none');
          if (isMobile) expect((await link.boundingBox())!.height).toBeGreaterThanOrEqual(44);
          await expect(summary.getByTestId('app.dashboard.kpi.datasets')).toHaveCount(0);
        } else {
          await expect(summary.getByTestId('app.dashboard.summary-scope')).toHaveText(language === 'cs' ? 'Všechny dostupné objekty' : 'All accessible objects');
          await expect(summary.getByTestId('app.dashboard.kpi.vps')).toContainText('81');
          await expect(summary.getByTestId('app.dashboard.kpi.datasets')).toContainText('42');
          await expect(summary.getByTestId('app.dashboard.kpi.paid-until')).toHaveCount(0);
          await expect(summary.getByTestId('app.dashboard.kpi.monthly-payment')).toHaveCount(0);
        }
        await expectNoDocumentHorizontalOverflow(page);
        if (count === 2) await summary.screenshot({ path: info.outputPath('summary.png') });
      }
      expect(state.reads.some(path => /payment|sysconfig/i.test(path))).toBe(false);
      expect(state.writes).toEqual([]);
      expect(state.errors).toEqual([]);
    });
  }
}

for (const language of ['cs', 'en'] as const) {
  for (const count of [1, 11]) {
    test(`@pr-smoke @pr-smoke-mobile Summary DNS plural ${language}/${count}`, async ({ page }) => {
      const state = await setup(page, language, 1);
      state.count = count;
      await page.goto('/app');
      const noun = language === 'cs' ? (count === 1 ? 'DNS zóna' : 'DNS zón') : count === 1 ? 'DNS zone' : 'DNS zones';
      await expect(page.getByTestId('app.dashboard.kpi.dns')).toHaveText(`${count}${noun}`);
      expect(state.writes).toEqual([]);
      expect(state.errors).toEqual([]);
    });
  }
  test(`@pr-smoke @pr-smoke-mobile Summary unavailable values and zero contribution ${language}`, async ({ page }) => {
    const state = await setup(page, language, 1);
    state.paidUntil = null;
    state.monthlyPayment = 0;
    state.countState = 'loading';
    await page.goto('/app');
    const summary = page.getByTestId('app.dashboard.summary-grid');
    await expect(summary.getByTestId('app.dashboard.kpi.dns')).toContainText('…');
    await expect(summary.getByTestId('app.dashboard.kpi.paid-until')).toContainText('—');
    await expect(summary.getByTestId('app.dashboard.kpi.monthly-payment')).toHaveText(language === 'cs' ? 'Měsíční příspěvek0' : 'Monthly membership fee0');
    state.countState = 'error';
    state.monthlyPayment = null;
    state.paidUntil = 'invalid';
    await page.reload();
    await expect(summary.getByTestId('app.dashboard.kpi.dns')).toContainText('—');
    await expect(summary.getByTestId('app.dashboard.kpi.monthly-payment')).toContainText('—');
    // Preserve the existing shared formatter's malformed-value fallback.
    await expect(summary.getByTestId('app.dashboard.kpi.paid-until')).toContainText('invalid');
    expect(state.writes).toEqual([]);
    expect(state.errors).toEqual([]);
  });
}
