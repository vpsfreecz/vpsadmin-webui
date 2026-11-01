import { expect, test } from '@playwright/test';
import { bootstrapVpsAdminWindow, installHaveApiMock } from '../../fixtures';
import { expectNoDocumentHorizontalOverflow } from '../../helpers/horizontalOverflow';

test.use({ locale: 'en-US', colorScheme: 'dark' });
for (const width of [320, 768, 1280]) {
  test(`@pr-smoke @pr-smoke-mobile anonymous theme choices persist at ${width}px`, async ({ page, hasTouch }, testInfo) => {
    await page.setViewportSize({ width, height: 850 });
    await bootstrapVpsAdminWindow(page, { sessionToken: '' });
    const privateCalls: string[] = [];
    page.on('request', (request) => {
      if (/webui_user_settings/.test(request.url())) privateCalls.push(request.url());
    });
    await installHaveApiMock(page, { handlers: { 'GET news_logs': () => ({ news_logs: [] }) } });
    const activate = async (id: string) => {
      const button = page.getByTestId(id);
      if (hasTouch) await button.tap(); else await button.click();
    };
    const openMenu = async () => {
      if (width < 640) {
        const button = page.getByRole('button', { name: 'Open menu', exact: true });
        if (hasTouch) await button.tap(); else await button.click();
      }
    };
    const prefix = width < 640 ? 'public.theme.mobile' : 'public.theme.desktop';
    await page.goto('/news');
    await expect(page.getByRole('heading', { name: 'News', exact: true })).toBeVisible();
    await openMenu();
    await activate(`${prefix}.light`);
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    await expect(page.getByTestId(`${prefix}.light`)).toHaveAttribute('aria-pressed', 'true');
    await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('vpsadmin.uiSettings.v1')!).theme)).toBe('light');
    const light = await page.locator('body').evaluate((el) => getComputedStyle(el).backgroundColor);
    await expectNoDocumentHorizontalOverflow(page);
    await page.locator('header').screenshot({ path: testInfo.outputPath('anonymous-theme-light.png') });
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    await openMenu();
    await activate(`${prefix}.dark`);
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await activate(`${prefix}.system`);
    await expect(page.locator('html')).not.toHaveAttribute('data-theme');
    await page.emulateMedia({ colorScheme: 'light' });
    await expect.poll(() => page.locator('body').evaluate((el) => getComputedStyle(el).backgroundColor)).toBe(light);
    expect(privateCalls).toEqual([]);
  });
}
