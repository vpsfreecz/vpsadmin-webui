import { expect, test } from '@playwright/test';
import { bootstrapVpsAdminWindow, installHaveApiMock, setUiSettingsLocalStorage } from '../../fixtures';
import { expectNoDocumentHorizontalOverflow } from '../../helpers/horizontalOverflow';

for (const language of ['cs', 'en'] as const) {
  test.describe(`${language} member package assignment dates`, () => {
    test.use({ locale: language === 'cs' ? 'cs-CZ' : 'en-GB', timezoneId: 'America/Los_Angeles' });

    test('@pr-smoke @pr-smoke-mobile shows each assignment date in the operator time zone', async ({ page, isMobile }, info) => {
      await bootstrapVpsAdminWindow(page);
      await setUiSettingsLocalStorage(page, { language, theme: 'dark' });
      const writes: string[] = [];
      page.on('request', (request) => {
        if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method()) && request.url().includes('/api/')) writes.push(`${request.method()} ${new URL(request.url()).pathname}`);
      });
      const environment = { id: 7, label: 'Production' };
      const pkg = { id: 11, label: 'Standard Production', is_personal: false, created_at: '2020-01-01T00:00:00Z' };
      const assignments = [
        { id: 20, created_at: '2026-10-30T00:30:00Z', is_personal: true, cluster_resource_package: { id: 10, label: 'Personal package', is_personal: true } },
        { id: 21, created_at: '2026-10-31T00:15:00Z', cluster_resource_package: pkg, comment: 'Additional capacity' },
        { id: 22, created_at: '2026-09-15T10:45:00Z', cluster_resource_package: pkg },
        { id: 23, cluster_resource_package: pkg },
      ].map((row) => ({ ...row, user: { id: 53 }, environment, updated_at: '2026-11-01T12:00:00Z' }));
      await installHaveApiMock(page, { user: { id: 1, login: 'synthetic-admin', level: 99, time_zone: 'Asia/Tokyo' }, handlers: {
        'GET users/53': () => ({ user: { id: 53, login: 'sample-member', level: 2, time_zone: 'Europe/Prague' } }),
        'GET vpses': () => ({ vpses: [] }),
        'GET user_cluster_resources': () => ({ user_cluster_resources: [] }),
        'GET environments': () => ({ environments: [environment] }),
        'GET cluster_resource_packages': () => ({ cluster_resource_packages: [] }),
        'GET user_cluster_resource_packages': () => ({ user_cluster_resource_packages: assignments }),
        'GET cluster_resource_packages/10/items': () => ({ items: [] }),
        'GET cluster_resource_packages/11/items': () => ({ items: [{ id: 1, cluster_resource: { id: 1, name: 'memory', label: 'Memory' }, value: 4096 }] }),
      } });
      await page.goto('/admin/users/53/resources');
      const date = (id: number) => page.getByTestId(`admin.user.resources.assignment.${id}.assigned_at`);
      await expect(date(21)).toHaveText(language === 'cs' ? /Přiděleno: 31\.\s*10\.\s*2026 9:15:00/ : 'Assigned: 31/10/2026, 09:15:00');
      await expect(date(22)).toHaveText(language === 'cs' ? /Přiděleno: 15\.\s*9\.\s*2026 19:45:00/ : 'Assigned: 15/09/2026, 19:45:00');
      await expect(date(20)).toContainText('9:30:00');
      await expect(date(23)).toHaveText(`${language === 'cs' ? 'Přiděleno' : 'Assigned'}: —`);
      await expect(date(23).locator('time')).toHaveCount(0);
      await expect(date(21).locator('time')).toHaveAttribute('datetime', '2026-10-31T00:15:00Z');
      await expect(page.getByTestId('admin.user.resources.assignment.20.select')).toBeDisabled();
      const selection = page.getByTestId('admin.user.resources.assignment.21.select');
      if (isMobile) await selection.tap(); else await selection.click();
      await expect(selection).toBeChecked();
      await expect(date(21)).toBeVisible();
      await expectNoDocumentHorizontalOverflow(page);
      // The existing shell may synchronize stored UI preferences on first load.
      // Assignment display/selection must not trigger package or other writes.
      expect(writes.filter((write) => write !== 'PUT /api/v7.0/webui_user_settings/ui/settings')).toEqual([]);
      if (language === 'cs') {
        await page.evaluate(() => window.scrollTo(0, 0));
        await page.screenshot({ path: info.outputPath('package-assigned-date.png'), fullPage: true, scale: 'css' });
      }
    });
  });
}
