import { expect, test } from '@playwright/test';
import { bootstrapVpsAdminWindow, failEnvelope, installHaveApiMock, setUiSettingsLocalStorage } from '../../fixtures';

for (const [language, theme] of [
  ['cs', 'dark'],
  ['cs', 'light'],
  ['en', 'dark'],
  ['en', 'light'],
] as const) {
  test(`@pr-smoke @pr-smoke-mobile error recovery action alignment ${language} ${theme}`, async ({ page }, info) => {
    const writes: string[] = [],
      errors: string[] = [];
    page.on('pageerror', (error) => errors.push(String(error)));
    await bootstrapVpsAdminWindow(page, { webuiNext: { uiSettings: { persistence: 'local' } } });
    await setUiSettingsLocalStorage(page, { language, theme });
    let recovered = false,
      reads = 0;
    await installHaveApiMock(page, {
      user: { id: 7, login: 'synthetic-admin', level: 100 },
      handlers: {
        'GET users/42': () => {
          reads += 1;
          return recovered
            ? {
                user: {
                  id: 42,
                  login: 'synthetic-subject',
                  level: 1,
                  full_name: 'Synthetic Subject',
                  email: 'subject@example.test',
                  created_at: '2026-02-01T00:00:00Z',
                  last_activity_at: '2026-02-02T00:00:00Z',
                },
              }
            : {
                status: 503,
                contentType: 'application/json',
                body: JSON.stringify(
                  failEnvelope(
                    'Ověřovací dočasná nedostupnost s dlouhým českým vysvětlením a zachovanými podrobnostmi pro pozdější opakování požadavku.'
                  )
                ),
              };
        },
      },
    });
    await page.route('**/api/**', (route) => {
      if (!['GET', 'HEAD', 'OPTIONS'].includes(route.request().method())) {
        writes.push(route.request().method() + ' ' + new URL(route.request().url()).pathname);
        return route.abort();
      }
      return route.fallback();
    });
    await page.goto('/admin/users/42');
    const root = page.getByTestId('admin.user.error');
    await expect(root).toBeVisible({ timeout: 20_000 });
    const measurements = [];
    for (const width of [1280, 320, 768]) {
      await page.setViewportSize({ width, height: 1000 });
      const controls = [];
      for (const suffix of ['retry', 'back', 'status', 'copy_details']) {
        const action = page.getByTestId('admin.user.error.' + suffix);
        await expect(action).toBeVisible();
        const rect = await action.boundingBox();
        expect(rect).not.toBeNull();
        if (!rect) throw new Error('Missing action rectangle');
        expect(rect.height).toBe((await page.evaluate(() => matchMedia('(any-pointer: coarse)').matches)) ? 44 : 36);
        expect(rect.x).toBeGreaterThanOrEqual(-1);
        expect(rect.x + rect.width).toBeLessThanOrEqual(width + 1);
        await action.focus();
        await page.keyboard.press('Tab');
        await page.keyboard.press('Shift+Tab');
        await expect(action).toBeFocused();
        expect(await action.evaluate((e) => e.matches(':focus-visible'))).toBe(true);
        controls.push({ suffix, rect });
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width + 1);
      measurements.push({ width, controls });
    }
    await expect(page.getByTestId('admin.user.error.back')).toHaveAttribute('href', '/admin/users');
    const details = page.getByTestId('admin.user.error.details');
    await details.locator('summary').click();
    await expect(details.locator('pre')).toContainText('Ověřovací dočasná nedostupnost');
    await details.locator('summary').click();
    const before = reads;
    recovered = true;
    await page.getByTestId('admin.user.error.retry').click();
    await expect(page.getByTestId('admin.user.header')).toBeVisible();
    await expect(root).toBeHidden();
    expect(reads).toBeGreaterThan(before);
    expect(writes).toEqual([]);
    expect(errors).toEqual([]);
    await info.attach('error-action-measurements', {
      body: JSON.stringify({ language, theme, measurements, reads, writes, errors, fixtureOnly: true }),
      contentType: 'application/json',
    });
  });
}
