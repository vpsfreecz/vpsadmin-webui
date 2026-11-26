import { expect, test } from '@playwright/test';

import { bootstrapVpsAdminWindow, installHaveApiMock, jsonFulfill, failEnvelope } from '../../fixtures';

/**
 * Theme + language bootstrap.
 *
 * Validates that `index.html` applies explicit preferences BEFORE React mounts.
 *
 * Note: Playwright is not yet wired in CI (see `e2e/README.md`).
 */

test('bootstrap applies explicit theme + language from localStorage', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      'vpsadmin.uiSettings.v1',
      JSON.stringify({
        sidebarCollapsed: false,
        theme: 'dark',
        language: 'cs',
      })
    );
  });

  // Keep the page fully deterministic.
  await bootstrapVpsAdminWindow(page, { apiUrl: '/api', apiVersion: '7.0', sessionToken: 'TEST' });
  await installHaveApiMock(page, {
    user: { id: 1, login: 'test', level: 1 },
    handlers: {
      'GET cluster/public_stats': () => ({ cluster: { user_count: 0, vps_count: 0, ipv4_left: 999 } }),
      'GET nodes/public_status': () => ({ nodes: [] }),
      'GET outages': () => ({ outages: [] }),
      'GET news_logs': () => ({ news_logs: [] }),
      'GET help_boxes': () => ({ help_boxes: [] }),
    },
  });

  await page.goto('/');

  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.locator('html')).toHaveAttribute('lang', 'cs');
});

// TODO(e2e): add a locale-driven test for `System` language default:
// - en unless browser preferred language includes `cs`.

for (const theme of ['light', 'dark', 'auto'] as const) {
  test(`OAuth ${theme} return survives denied localStorage and is consumed once`, async ({ page, baseURL }, testInfo) => {
    if (!baseURL) throw new Error('An isolated fixture base URL is required');
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.context().addCookies([{
      name: 'vpsadmin_oauth_theme', value: `${theme}.light`, url: baseURL,
      sameSite: 'Lax', expires: Math.floor(Date.now() / 1000) + 120,
    }]);
    await page.addInitScript(() => {
      Object.defineProperty(window, 'localStorage', { get() { throw new DOMException('Denied', 'SecurityError'); } });
    });
    await bootstrapVpsAdminWindow(page, { webuiNext: { uiSettings: { persistence: 'local' } } });
    await installHaveApiMock(page, {
      user: { id: 1, login: 'fixture', level: 1 },
      handlers: {
        'GET users/current': () => jsonFulfill(failEnvelope('Not authenticated'), 401),
        'GET cluster/public_stats': () => ({ cluster: { user_count: 0, vps_count: 0, ipv4_left: 999 } }),
        'GET nodes/public_status': () => ({ nodes: [] }),
        'GET outages': () => ({ outages: [] }),
        'GET news_logs': () => ({ news_logs: [] }),
        'GET help_boxes': () => ({ help_boxes: [] }),
      },
    });
    // Pause the application module so the assertion observes only the head script.
    let prepaint: string | null | undefined;
    await page.route('**/src/bootstrap.ts', async (route) => {
      prepaint = await page.locator('html').getAttribute('data-theme');
      await route.continue();
    });
    await page.goto('/');
    const expected = theme === 'auto' ? null : theme;
    await expect.poll(() => prepaint).toBe(expected);
    await expect(page.getByTestId('public.main')).toBeVisible();
    expect(await page.locator('html').getAttribute('data-theme')).toBe(expected);
    await expect.poll(async () => (await page.context().cookies()).some((cookie) => cookie.name === 'vpsadmin_oauth_theme')).toBe(false);
    const login = new URL((await page.locator('a[href*="/oauth/login"]').first().getAttribute('href'))!);
    expect(login.searchParams.get('theme')).toBe(theme);
    expect(login.searchParams.get('theme_return')).toBe('1');
    await page.screenshot({ path: testInfo.outputPath(`oauth-return-${theme}.png`), fullPage: true });
    if (theme === 'auto') {
      const dark = await page.locator('body').evaluate((element) => getComputedStyle(element).backgroundColor);
      await page.emulateMedia({ colorScheme: 'light' });
      await expect.poll(() => page.locator('body').evaluate((element) => getComputedStyle(element).backgroundColor)).not.toBe(dark);
    }
  });
}
