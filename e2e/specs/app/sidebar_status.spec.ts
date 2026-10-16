import { expect, test } from '@playwright/test';
import { bootstrapVpsAdminWindow, installHaveApiMock, setUiSettingsLocalStorage } from '../../fixtures';

for (const language of ['cs', 'en'] as const) {
  for (const scenario of [
    { name: 'member', level: 1, base: '/app' },
    { name: 'admin-personal', level: 99, base: '/app' },
    { name: 'admin', level: 99, base: '/admin' },
    { name: 'support', level: 21, base: '/admin' },
  ]) {
    test(`@pr-smoke @pr-smoke-mobile status footer: ${scenario.name} ${language}`, async ({ page }, testInfo) => {
      await setUiSettingsLocalStorage(page, { language, theme: language === 'cs' ? 'dark' : 'light' });
      await bootstrapVpsAdminWindow(page, { sessionToken: 'STATUS_FIXTURE' });
      await installHaveApiMock(page, {
        user: { id: 10, login: 'status-review', level: scenario.level },
        handlers: {
          'GET vpses': () => ({ vpses: [] }),
          'GET outages': () => ({ outages: [] }),
          'GET security_advisories': () => ({ security_advisories: [] }),
          'GET environments': () => ({ environments: [] }),
          'GET locations': () => ({ locations: [] }),
          'GET nodes': () => ({ nodes: [] }),
          'GET components': () => ({ components: [] }),
        },
      });
      await page.goto(`${scenario.base}/vps`);
      const mobile = page.viewportSize()!.width < 768;
      const surface = mobile ? 'drawer' : 'sidebar';
      if (mobile) await page.getByTestId('shell.mobile-nav-button').click();
      const container = page.getByTestId(mobile ? 'nav.drawer' : 'shell.sidebar');
      const status = page.getByTestId(`nav.${surface}.status`);
      await status.scrollIntoViewIfNeeded();
      await expect(status).toBeVisible();
      const outages = status.getByTestId(`nav.${surface}.outages`);
      const advisories = status.getByTestId(`nav.${surface}.security-advisories`);
      await expect(outages).toHaveText(language === 'cs' ? 'Odstávky a výpadky' : 'Outages');
      await expect(advisories).toHaveText(language === 'cs' ? 'Bezpečnostní upozornění' : 'Security advisories');
      await expect(container.getByTestId(`nav.${surface}.security-advisories`)).toHaveCount(1);
      await expect(outages).toHaveAttribute('href', scenario.base === '/admin' ? '/admin/outages' : '/outages');
      const advisoryPath = scenario.name === 'admin' ? '/admin/security-advisories' : '/security-advisories';
      await expect(advisories).toHaveAttribute('href', advisoryPath);
      const statusBox = (await status.boundingBox())!;
      const aboutBox = (await container.getByTestId('build.footer').boundingBox())!;
      expect(statusBox.y + statusBox.height).toBeLessThanOrEqual(aboutBox.y);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.screenshot({ path: testInfo.outputPath(`status-${scenario.name}-${language}.png`), scale: 'css' });
      await outages.click();
      await expect(page).toHaveURL(new RegExp(`${scenario.base === '/admin' ? '/admin' : ''}/outages$`));
      await expect(page.getByTestId('nav.drawer')).toBeHidden();
      if (scenario.name === 'admin') {
        await page.getByTestId('admin.outages.new').click();
        await expect(page.getByTestId('admin.outages.create.modal')).toBeVisible();
        await page.screenshot({ path: testInfo.outputPath(`outage-create-${language}.png`), scale: 'css' });
        await page.keyboard.press('Escape');
      } else {
        await expect(page.getByTestId('admin.outages.new')).toHaveCount(0);
      }
      await page.goto(`${scenario.base}/vps`);
      if (mobile) await page.getByTestId('shell.mobile-nav-button').click();
      await page.getByTestId(`nav.${surface}.security-advisories`).click();
      await expect(page).toHaveURL(new RegExp(`${advisoryPath}$`));
      await expect(page.getByTestId('nav.drawer')).toBeHidden();
    });
  }
}
