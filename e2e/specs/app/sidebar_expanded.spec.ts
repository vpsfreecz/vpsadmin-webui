import { expect, test } from '@playwright/test';
import { bootstrapVpsAdminWindow, installHaveApiMock, setUiSettingsLocalStorage } from '../../fixtures';

for (const language of ['cs', 'en'] as const) {
  for (const mode of ['user', 'admin'] as const) {
    test(`@pr-smoke @pr-smoke-mobile sidebar stays labelled: ${mode}, ${language}, legacy collapse preference`, async ({ page }, testInfo) => {
      await bootstrapVpsAdminWindow(page, { sessionToken: 'SIDEBAR_FIXTURE' });
      await setUiSettingsLocalStorage(page, { sidebarCollapsed: true, language, theme: 'dark' });
      await installHaveApiMock(page, {
        user: { id: 10, login: 'sidebar-review', level: mode === 'admin' ? 99 : 1 },
        handlers: { 'GET vpses': () => ({ vpses: [], _meta: { total_count: 0 } }) },
      });
      const base = mode === 'admin' ? '/admin' : '/app';
      await page.goto(`${base}/vps`);
      const mobile = (page.viewportSize()?.width ?? 1280) < 768;
      const surface = mobile ? 'drawer' : 'sidebar';
      if (mobile) await page.getByTestId('shell.mobile-nav-button').click();
      const vpsLink = page.getByTestId(`nav.${surface}.vps`);
      await expect(vpsLink).toHaveText('VPS');
      await expect(vpsLink.locator('span').last()).toBeVisible();
      const account = page.getByTestId(`nav.${surface}.account`);
      await account.scrollIntoViewIfNeeded();
      await expect(account).toHaveText(language === 'cs' ? 'Účet' : 'Account');
      await expect(page.getByRole('button', { name: /collapse sidebar|expand sidebar|sbalit panel|rozbalit panel/i })).toHaveCount(0);
      if (!mobile) await expect(page.getByTestId('shell.sidebar')).toHaveCSS('width', '256px');
      await page.screenshot({ path: testInfo.outputPath(`sidebar-${mode}-${language}.png`), fullPage: true });
      await vpsLink.click();
      if (mobile) await expect(page.getByTestId('nav.drawer')).not.toBeVisible();
      await page.reload();
      if (mobile) await page.getByTestId('shell.mobile-nav-button').click();
      await expect(page.getByTestId(`nav.${surface}.vps`).locator('span').last()).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    });
  }
}
