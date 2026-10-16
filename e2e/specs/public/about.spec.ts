import { expect, test } from '@playwright/test';
import {
  bootstrapVpsAdminWindow,
  failEnvelope,
  installHaveApiMock,
  jsonFulfill,
  setUiSettingsLocalStorage,
} from '../../fixtures';

for (const language of ['cs', 'en'] as const) {
  test(`@pr-smoke @pr-smoke-mobile anonymous About page: ${language}`, async ({ page }, testInfo) => {
    await setUiSettingsLocalStorage(page, { language, theme: language === 'cs' ? 'dark' : 'light' });
    await bootstrapVpsAdminWindow(page);
    await installHaveApiMock(page, {
      handlers: { 'GET users/current': () => jsonFulfill(failEnvelope('Unauthorized'), 401) },
    });
    await page.goto('/about');
    const content = page.getByTestId('about.page');
    await expect(
      content.getByRole('heading', { name: language === 'cs' ? 'O aplikaci' : 'About', exact: true })
    ).toBeVisible();
    for (const name of ['Jakub Skokan', 'Pavel Šnajdr', 'Michal Janoušek']) await expect(content).toContainText(name);
    await expect(content).toContainText('ISC');
    await expect(content).not.toContainText('Adminizio');
    const commit = content.locator('a[href*="/commit/"]');
    await expect(commit).toHaveAttribute('href', /github\.com\/vpsfreecz\/vpsadmin-webui\/commit\/[a-f0-9]{40}$/);
    const sha = await commit.textContent();
    await expect(page.getByTestId('build.footer')).toContainText(sha!.slice(0, 12));
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath(`about-${language}.png`), fullPage: true, scale: 'css' });
  });
  for (const mode of ['user', 'admin'] as const) {
    test(`@pr-smoke @pr-smoke-mobile sidebar build footer: ${mode} ${language}`, async ({ page }, testInfo) => {
      await setUiSettingsLocalStorage(page, { language, theme: 'dark' });
      await bootstrapVpsAdminWindow(page, { sessionToken: 'ABOUT_FIXTURE' });
      await installHaveApiMock(page, {
        user: { id: 10, login: 'about-review', level: mode === 'admin' ? 99 : 1 },
        handlers: { 'GET vpses': () => ({ vpses: [] }) },
      });
      await page.goto(`${mode === 'admin' ? '/admin' : '/app'}/vps`);
      const mobile = page.viewportSize()!.width < 768;
      if (mobile) await page.getByTestId('shell.mobile-nav-button').click();
      const container = page.getByTestId(mobile ? 'nav.drawer' : 'shell.sidebar');
      const footer = container.getByTestId('build.footer');
      await footer.scrollIntoViewIfNeeded();
      await expect(footer).toBeVisible();
      await expect(footer.locator('a[href*="/commit/"]')).toHaveText(/^[a-f0-9]{12}\*?$/);
      if (!mobile) {
        const box = await footer.boundingBox();
        expect(box!.y + box!.height).toBeLessThanOrEqual(page.viewportSize()!.height);
      }
      await page.screenshot({ path: testInfo.outputPath(`footer-${mode}-${language}.png`), scale: 'css' });
      await footer.getByRole('link', { name: language === 'cs' ? 'O aplikaci' : 'About', exact: true }).click();
      await expect(page).toHaveURL(/\/about$/);
      await expect(page.getByTestId('about.page')).toBeVisible();
      await expect(page.getByTestId('nav.drawer')).toBeHidden();
    });
  }
}
