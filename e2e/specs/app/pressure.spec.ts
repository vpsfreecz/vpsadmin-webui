import { expect, test } from '@playwright/test';
import { installPressureFixture } from '../../fixtures/pressure';
import { expectNoDocumentHorizontalOverflow } from '../../helpers/horizontalOverflow';
import { enVps_pressure } from '../../../src/i18n/locales/en/vps/pressure';
import { csVps_pressure } from '../../../src/i18n/locales/cs/vps/pressure';

test.beforeEach(async ({ page }) => {
  await page.route('**/*', (route) =>
    ['127.0.0.1', 'localhost'].includes(new URL(route.request().url()).hostname)
      ? route.fallback()
      : route.abort('blockedbyclient')
  );
});
for (const language of ['en', 'cs'] as const) {
  for (const mobile of [false, true]) {
    test(`@pr-smoke @pr-smoke-mobile memory pressure ${language} mobile=${mobile}`, async ({ page }, testInfo) => {
      const copy = language === 'en' ? enVps_pressure : csVps_pressure;
      await page.setViewportSize(mobile ? { width: 390, height: 844 } : { width: 1280, height: 1000 });
      const fixture = await installPressureFixture(page, language);
      await page.goto('/admin/pressure?offset=25');
      const overview = page.getByTestId('pressure.overview');
      await expect(overview.getByTestId(mobile ? 'pressure.mobile' : 'pressure.rows')).toBeVisible();
      await expect.poll(() => fixture.rootQueries.length).toBe(1);
      expect(fixture.rootQueries[0]?.['offset']).toBe('25');
      for (const [key, value] of Object.entries({ user: '4', vps: '12', node: '5', location: '3', environment: '1' }))
        await overview.locator(`input[name="${key}"]`).fill(value);
      await overview.locator('button[type="submit"]').click();
      await expect
        .poll(() => fixture.rootQueries.at(-1))
        .toEqual({ user: '4', vps: '12', node: '5', location: '3', environment: '1', offset: '0', limit: '25' });
      await expect(
        overview.getByRole('link', { name: 'node5.example.test', exact: true }).filter({ visible: true })
      ).toHaveAttribute('href', '/admin/nodes/5');
      await expect(overview.getByRole('meter')).toHaveAttribute('value', '100');
      await expect(overview.getByRole('meter')).toHaveAttribute('aria-valuetext', /70.*000.*125 µs/);
      await expectNoDocumentHorizontalOverflow(page);
      await page.screenshot({ path: testInfo.outputPath('pressure-overview.png'), fullPage: true, scale: 'css' });

      await overview
        .getByRole('link', { name: /#12 pressure-12/ })
        .filter({ visible: true })
        .click();
      const detail = page.getByTestId('pressure.detail');
      await expect(detail.getByRole('meter')).toHaveAttribute('aria-valuetext', /125 µs/);
      const history = page.getByTestId('pressure.history');
      await expect(history.getByRole('row')).toHaveCount(8);
      await expect(history.getByRole('columnheader', { name: copy['pressure.period'] })).toBeVisible();
      await expect(history.getByText(copy['pressure.noRecordedData'], { exact: true })).toHaveCount(6);
      await expect(history.getByText(copy['pressure.inProgress'], { exact: true })).toBeVisible();
      await expect(history.getByRole('meter')).toHaveCount(0);
      await history.getByRole('combobox').focus();
      await page.keyboard.press('End');
      await page.keyboard.press('Enter');
      await expect.poll(() => fixture.historyQueries.at(-1)?.['days']).toBe('30');
      await expect(history.getByRole('row')).toHaveCount(31);
      await expect(history.getByRole('meter')).toHaveCount(0);
      await expectNoDocumentHorizontalOverflow(page);
      await page.screenshot({ path: testInfo.outputPath('pressure-history.png'), fullPage: true, scale: 'css' });

      await page.goto('/app/pressure');
      await expect(
        page.getByTestId('pressure.overview').getByTestId(mobile ? 'pressure.mobile' : 'pressure.rows')
      ).toBeVisible();
      await expect.poll(() => fixture.rootQueries.at(-1)?.['user']).toBe('4');
      await expect(page.getByTestId('pressure.overview').locator('input[name="user"]')).toHaveCount(0);
      await expect(
        page.getByTestId('pressure.overview').locator('a[href="/admin/users/4"], a[href="/admin/nodes/5"]')
      ).toHaveCount(0);
      await expect(page.getByTestId('pressure.overview').locator('a[href="/app/vps/37/pressure"]')).toHaveCount(0);
      await expectNoDocumentHorizontalOverflow(page);
      await page.screenshot({ path: testInfo.outputPath('pressure-my-view.png'), fullPage: true, scale: 'css' });
      const count = fixture.historyQueries.length;
      const methodCount = fixture.pressureMethods.length;
      await page.goto('/app/vps/37/pressure');
      await expect(page.getByTestId('vps.scope-mismatch').or(page.getByTestId('forbidden.page'))).toBeVisible();
      expect(fixture.historyQueries).toHaveLength(count);
      expect(fixture.pressureMethods).toHaveLength(methodCount);
      expect(fixture.pressureMethods.every((method) => method === 'GET')).toBe(true);
      await testInfo.attach('synthetic-pressure-requests', {
        body: Buffer.from(JSON.stringify({ synthetic: true, ...fixture })),
        contentType: 'application/json',
      });
    });
  }
}
