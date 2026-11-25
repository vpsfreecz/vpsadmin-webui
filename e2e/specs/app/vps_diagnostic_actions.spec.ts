import { expect, test } from '@playwright/test';
import { bootstrapVpsAdminWindow, installHaveApiMock, setUiSettingsLocalStorage } from '../../fixtures';

for (const language of ['cs', 'en'] as const) {
  for (const mode of ['member', 'admin', 'support'] as const) {
    test(`@pr-smoke @pr-smoke-mobile VPS diagnostic actions preserve context: ${mode}, ${language}`, async ({
      page,
    }, info) => {
      await bootstrapVpsAdminWindow(page, { sessionToken: 'DIAGNOSTIC_ACTIONS' });
      await setUiSettingsLocalStorage(page, { language, theme: language === 'cs' ? 'dark' : 'light' });
      await installHaveApiMock(page, {
        user: { id: 7, login: 'synthetic-diagnostics', level: mode === 'admin' ? 99 : mode === 'support' ? 50 : 1 },
        handlers: {
          'GET vpses/123': () => ({
            vps: {
              id: 123,
              hostname: 'diagnostics.example.test',
              user: { id: 7 },
              object_state: 'active',
              is_running: true,
              node: { id: 1 },
            },
          }),
          'GET oom_reports': () => ({ oom_reports: [] }),
          'GET ip_addresses': () => ({ ip_addresses: [] }),
          'GET incidents': () => ({ incidents: [] }),
        },
      });
      const base = mode === 'member' ? '/app' : '/admin';
      await page.goto(`${base}/vps/123`);
      const actions = page.getByTestId('vps.diagnostics.actions');
      if (mode === 'support') {
        await expect(page.getByTestId('vps.overview.control_center')).toBeVisible();
        await expect(actions).toHaveCount(0);
        return;
      }
      await expect(actions.getByRole('link')).toHaveCount(3);
      const destinations = [
        ['oom_reports', `${base}/oom-reports?vps=123`],
        ['oom_rules', `${base}/oom-reports/rules/123`],
        ['incidents', `${base}/incidents?vps=123`],
      ];
      for (const [key, href] of destinations) {
        const action = page.getByTestId(`vps.diagnostics.${key}`);
        await expect(action).toBeVisible();
        await expect(action).toHaveAttribute('href', href!);
        const size = await action.boundingBox();
        expect(size!.height).toBeGreaterThanOrEqual(info.project.name.includes('mobile') ? 44 : 32);
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.screenshot({ path: info.outputPath(`diagnostics-${language}-${mode}.png`), fullPage: true });
      await page.getByTestId('vps.diagnostics.incidents').focus();
      await page.keyboard.press('Enter');
      await expect(page).toHaveURL(new RegExp(`${base}/incidents\\?vps=123$`));
    });
  }
}
