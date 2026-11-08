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
    if (width < 640) {
      const language = page.getByTestId('public.language.mobile.switcher');
      const theme = page.getByTestId(prefix);
      const languageBox = (await language.boundingBox())!;
      const themeBox = (await theme.boundingBox())!;
      const controlsCenter = (languageBox.x + themeBox.x + themeBox.width) / 2;
      expect(Math.abs(controlsCenter - width / 2)).toBeLessThanOrEqual(1);
      expect(languageBox.x + languageBox.width).toBeLessThan(themeBox.x);
      expect(Math.abs(languageBox.y + languageBox.height / 2 - themeBox.y - themeBox.height / 2)).toBeLessThanOrEqual(1);
      for (const button of await language.getByRole('button').or(theme.getByRole('button')).all()) {
        const box = (await button.boundingBox())!;
        expect(Math.min(box.width, box.height)).toBeGreaterThanOrEqual(44);
      }
      await expect(theme.locator('button svg')).toHaveCount(3);
      for (const button of await theme.getByRole('button').all()) await expect(button).toHaveText('');
    }
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

for (const width of [320, 1280]) {
  for (const appearance of ['light', 'dark'] as const) {
    test(`@pr-smoke @pr-smoke-mobile language selection matches ${appearance} appearance at ${width}px`, async ({ page, hasTouch }, testInfo) => {
      await page.setViewportSize({ width, height: 850 });
      await bootstrapVpsAdminWindow(page, { sessionToken: '' });
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
      const languagePrefix = width < 640 ? 'public.language.mobile' : 'public.language';
      const themePrefix = width < 640 ? 'public.theme.mobile' : 'public.theme.desktop';
      await page.goto('/news');
      await openMenu();
      await activate(`${themePrefix}.${appearance}`);
      await expect(page.locator('html')).toHaveAttribute('data-theme', appearance);
      const colors = async (id: string) => page.getByTestId(id).evaluate((el) => {
        const style = getComputedStyle(el);
        return { background: style.backgroundColor, foreground: style.color };
      });
      const checkSelection = async (choice: string) => {
        const selected = page.getByTestId(`${languagePrefix}.${choice}`);
        await expect(selected).toHaveAttribute('aria-pressed', 'true');
        await expect(page.getByTestId(`${languagePrefix}.switcher`).getByRole('button', { pressed: true })).toHaveCount(1);
        // Measure generated CSS, including the resting state after pointer hover ends.
        await page.mouse.move(width - 1, 840);
        await expect.poll(async () => (await colors(`${languagePrefix}.${choice}`)).background).toBe('rgb(236, 140, 53)');
        await expect.poll(async () => colors(`${languagePrefix}.${choice}`)).toEqual(await colors(`${themePrefix}.${appearance}`));
        await expectNoDocumentHorizontalOverflow(page);
      };
      for (const choice of ['system', 'en', 'cs', 'system']) {
        await activate(`${languagePrefix}.${choice}`);
        await checkSelection(choice);
      }
      await page.reload();
      await openMenu();
      await checkSelection('system');
      await page.locator('header').screenshot({ path: testInfo.outputPath(`language-selection-${appearance}-${width}.png`) });
    });
  }
}
