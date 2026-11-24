import { expect, test, type Page } from '@playwright/test';
import { installAdminIncidentFixture } from '../../fixtures/adminIncidentPolicies';
import { expectNoDocumentHorizontalOverflow } from '../../helpers/horizontalOverflow';
import { enOps_incidents } from '../../../src/i18n/locales/en/ops/incidents';
import { csOps_incidents } from '../../../src/i18n/locales/cs/ops/incidents';

interface SyntheticDiagnostics {
  consoleErrors: string[];
  pageErrors: string[];
  failedRequests: string[];
  blockedExternal: string[];
}
const observed = new WeakMap<Page, SyntheticDiagnostics>();
test.beforeEach(async ({ page }) => {
  const diagnostics: SyntheticDiagnostics = {
    consoleErrors: [],
    pageErrors: [],
    failedRequests: [],
    blockedExternal: [],
  };
  observed.set(page, diagnostics);
  page.on('console', (message) => {
    if (message.type() === 'error') diagnostics.consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => diagnostics.pageErrors.push(error.message));
  page.on('requestfailed', (request) =>
    diagnostics.failedRequests.push(`${request.method()} ${request.url()} ${request.failure()?.errorText}`)
  );
  await page.route('**/*', (route) => {
    const url = new URL(route.request().url());
    if (['127.0.0.1', 'localhost'].includes(url.hostname)) return route.fallback();
    diagnostics.blockedExternal.push(route.request().url());
    return route.abort('blockedbyclient');
  });
});
test.afterEach(async ({ page }, testInfo) => {
  await testInfo.attach('synthetic-diagnostics', {
    body: Buffer.from(JSON.stringify({ synthetic: true, ...observed.get(page) })),
    contentType: 'application/json',
  });
});

async function geometry(page: Page, view: 'overview' | 'history', mobile: boolean) {
  await expectNoDocumentHorizontalOverflow(page);
  if (mobile) return { viewport: 390, document: await page.evaluate(() => document.documentElement.scrollWidth) };
  const widths = await page.getByTestId(`incidents.admin.${view}.rows`).evaluate((table) => ({
    content: table.parentElement!.clientWidth,
    scroll: table.parentElement!.scrollWidth,
    right: table.querySelector('th:last-child')!.getBoundingClientRect().right,
    columns: table.querySelectorAll('th').length,
    firstRowHeight: table.querySelector('tbody tr')!.getBoundingClientRect().height,
    fontSize: getComputedStyle(table).fontSize,
  }));
  expect(widths.scroll).toBeLessThanOrEqual(widths.content + 1);
  expect(widths.right).toBeLessThanOrEqual(1280);
  expect(widths.columns).toBe(view === 'overview' ? 4 : 3);
  // The earlier seven-column fixture captured rows around150px high at1280.
  // Record actual current geometry; no font-size reduction is allowed.
  expect(widths.firstRowHeight).toBeLessThan(145);
  expect(widths.fontSize).toBe('14px');
  return widths;
}
async function keyboardToggle(details: ReturnType<Page['locator']>, opened: boolean) {
  const summary = details.locator(':scope > summary');
  await summary.focus();
  await summary.press('Enter');
  await expect.poll(() => details.evaluate((element) => (element as HTMLDetailsElement).open)).toBe(opened);
}

for (const language of ['en', 'cs'] as const) {
  for (const mobile of [false, true]) {
    test(`admin policy Overview/History ${language} mobile=${mobile}`, async ({ page }, testInfo) => {
      await page.setViewportSize(mobile ? { width: 390, height: 844 } : { width: 1280, height: 1000 });
      const fixture = await installAdminIncidentFixture(page, language);
      await page.goto('/admin/incidents/overview');
      const overview = page.getByTestId(mobile ? 'incidents.admin.overview.mobile' : 'incidents.admin.overview.rows');
      await expect(overview).toBeVisible();
      await expect(page.getByTestId('incidents.admin.paging')).toBeVisible();
      await expect.poll(() => new URL(page.url()).searchParams.has('as_of')).toBe(true);
      expect(fixture.overviewQueries).toHaveLength(1);
      const more = page.getByTestId('incidents.admin.moreFilters');
      await expect.poll(() => more.evaluate((element) => (element as HTMLDetailsElement).open)).toBe(false);
      await expect(page.locator('input[name="vps"]')).toBeEnabled();
      await expect(page.locator('input[name="vps"]')).not.toBeVisible();
      const rowDetails = overview.locator('details').first();
      await expect.poll(() => rowDetails.evaluate((element) => (element as HTMLDetailsElement).open)).toBe(false);
      const overviewGeometry = await geometry(page, 'overview', mobile);
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.screenshot({
        path: testInfo.outputPath(`initial-overview-${language}-${mobile ? 'mobile' : 'desktop'}.png`),
        fullPage: false,
      });
      if (process.env['E2E_ADMIN_INITIAL_CAPTURES_ONLY'] === '1') {
        await page.getByTestId('incidents.admin.tabs').locator('a[href="/admin/incidents/history"]').click();
        await expect(page.getByTestId('incidents.admin.history.rows')).toBeVisible();
        const historyGeometry = await geometry(page, 'history', false);
        await page.evaluate(() => window.scrollTo(0, 0));
        await page.screenshot({
          path: testInfo.outputPath(`initial-history-${language}-desktop.png`),
          fullPage: false,
        });
        await testInfo.attach('compact-geometry', {
          body: Buffer.from(JSON.stringify({ language, mobile, overview: overviewGeometry, history: historyGeometry })),
          contentType: 'application/json',
        });
        return;
      }
      await keyboardToggle(rowDetails, true);
      await expect(rowDetails).toContainText('node.example.test');
      expect(fixture.overviewQueries).toHaveLength(1);
      await rowDetails.scrollIntoViewIfNeeded();
      await page.screenshot({
        path: testInfo.outputPath(`opened-overview-${language}-${mobile ? 'mobile' : 'desktop'}.png`),
        fullPage: false,
      });
      await keyboardToggle(rowDetails, false);
      await page.getByTestId('incidents.admin.paging').getByRole('button').last().click();
      await expect.poll(() => Number(fixture.overviewQueries.at(-1)?.['offset'])).toBe(25);
      const cutoff = fixture.overviewQueries.at(-1)?.['as_of'];
      expect(cutoff).toBeTruthy();
      await page.goBack();
      await expect.poll(() => Number(new URL(page.url()).searchParams.get('offset') ?? 0)).toBe(0);
      expect(new URL(page.url()).searchParams.get('as_of')).toBe(cutoff);
      await keyboardToggle(more, true);
      await page.locator('input[name="vps"]').fill('12');
      await page
        .locator('form')
        .filter({ has: page.locator('input[name="vps"]') })
        .locator('button[type="submit"]')
        .click();
      await expect.poll(() => Number(fixture.overviewQueries.at(-1)?.['vps'])).toBe(12);
      expect(Number(fixture.overviewQueries.at(-1)?.['offset'])).toBe(0);
      expect(fixture.overviewQueries.at(-1)?.['as_of']).toBe(cutoff);
      await expect.poll(() => more.evaluate((element) => (element as HTMLDetailsElement).open)).toBe(true);
      await keyboardToggle(more, false);
      await expect(page.locator('input[name="vps"]')).toBeEnabled();
      await expect(page.locator('input[name="vps"]')).toHaveValue('12');
      await page
        .locator('form')
        .filter({ has: page.locator('input[name="vps"]') })
        .locator('button[type="submit"]')
        .click();
      expect(new URL(page.url()).searchParams.get('vps')).toBe('12');
      const reads = fixture.overviewQueries.length;
      await page
        .locator('form')
        .filter({ has: page.locator('input[name="vps"]') })
        .locator('button[type="button"]')
        .click();
      await expect.poll(() => fixture.overviewQueries.length).toBe(reads + 1);
      expect(fixture.overviewQueries.at(-1)?.['as_of']).toBeUndefined();
      expect(Number(fixture.overviewQueries.at(-1)?.['vps'])).toBe(12);
      await expect.poll(() => new URL(page.url()).searchParams.get('as_of')).not.toBe(cutoff);
      // A fresh document with nondefault URL fields must open More filters too.
      await page.reload();
      await expect.poll(() => more.evaluate((element) => (element as HTMLDetailsElement).open)).toBe(true);
      await expect(page.locator('input[name="vps"]')).toHaveValue('12');
      await page.getByTestId('incidents.admin.tabs').locator('a[href="/admin/incidents/history"]').click();
      const history = page.getByTestId(mobile ? 'incidents.admin.history.mobile' : 'incidents.admin.history.rows');
      await expect(history).toBeVisible();
      await expect.poll(() => fixture.historyQueries.length).toBeGreaterThan(0);
      await expect.poll(() => more.evaluate((element) => (element as HTMLDetailsElement).open)).toBe(false);
      const historyDetails = history.locator('details').first();
      await expect.poll(() => historyDetails.evaluate((element) => (element as HTMLDetailsElement).open)).toBe(false);
      const historyGeometry = await geometry(page, 'history', mobile);
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.screenshot({
        path: testInfo.outputPath(`initial-history-${language}-${mobile ? 'mobile' : 'desktop'}.png`),
        fullPage: false,
      });
      const historyReads = fixture.historyQueries.length;
      await keyboardToggle(historyDetails, true);
      const catalog = language === 'cs' ? csOps_incidents : enOps_incidents;
      await expect(historyDetails).toContainText(catalog['incidentAdmin.physicalStop'].replace('{id}', '95'));
      expect(fixture.historyQueries).toHaveLength(historyReads);
      await historyDetails.scrollIntoViewIfNeeded();
      await page.screenshot({
        path: testInfo.outputPath(`opened-history-${language}-${mobile ? 'mobile' : 'desktop'}.png`),
        fullPage: false,
      });
      await keyboardToggle(historyDetails, false);
      expect(fixture.historyQueries.at(-1)).not.toHaveProperty('sort');
      await expect(page.locator('select').filter({ has: page.locator('option[value="evaluated_at"]') })).toHaveCount(0);
      await page
        .locator('select')
        .filter({ has: page.locator('option[value="outstanding"]') })
        .selectOption('outstanding');
      await expect.poll(() => fixture.historyQueries.at(-1)?.['scope']).toBe('outstanding');
      await expect(page.locator('input[name="from"]')).toBeDisabled();
      await expect(page.locator('input[name="to"]')).toBeDisabled();
      await page.getByTestId('incidents.admin.tabs').locator('a[href="/admin/incidents"]').click();
      await expect(page.getByTestId('incidents.list.header')).toBeVisible();
      expect(new URL(page.url()).pathname).toBe('/admin/incidents');
      await expect(page.getByTestId('nav.sidebar.incidents')).toHaveAttribute('href', '/admin/incidents/overview');
      await testInfo.attach('compact-geometry', {
        body: Buffer.from(JSON.stringify({ language, mobile, overview: overviewGeometry, history: historyGeometry })),
        contentType: 'application/json',
      });
    });
  }
}

for (const level of [1, 21]) {
  test(`new admin policy routes deny role level ${level} without endpoint reads`, async ({ page }) => {
    const fixture = await installAdminIncidentFixture(page, 'en', level);
    await page.goto('/admin/incidents/overview');
    if (level === 1)
      await expect(page.getByRole('heading', { name: 'Admin access required', exact: true })).toBeVisible();
    else await expect(page.getByTestId('forbidden.page')).toBeVisible();
    expect(fixture.overviewQueries).toHaveLength(0);
    expect(fixture.historyQueries).toHaveLength(0);
  });
}
test('missing new capabilities keep Reports reachable without endpoint reads', async ({ page }) => {
  const fixture = await installAdminIncidentFixture(page, 'en', 90, false);
  await page.goto('/admin/incidents/overview');
  await expect(page.getByTestId('incidents.admin.overview')).toBeVisible();
  await expect(page.getByTestId('incidents.admin.paging')).toHaveCount(0);
  expect(fixture.overviewQueries).toHaveLength(0);
  await page.getByTestId('incidents.admin.tabs').locator('a[href="/admin/incidents"]').click();
  await expect(page.getByTestId('incidents.list.header')).toBeVisible();
});
