import { expect, test } from '@playwright/test';
import { writeFile } from 'node:fs/promises';
import { bootstrapVpsAdminWindow, installHaveApiMock, setUiSettingsLocalStorage } from '../../fixtures';
for (const language of ['cs', 'en'] as const)
  for (const theme of ['light', 'dark'] as const) {
    test(`@pr-smoke @pr-smoke-mobile pagination control rhythm ${language} ${theme}`, async ({ page }, info) => {
      await page.setViewportSize(
        info.project.name.startsWith('mobile') ? { width: 390, height: 844 } : { width: 1440, height: 1000 }
      );
      await page.clock.setFixedTime(new Date('2026-11-08T00:00:00Z'));
      await bootstrapVpsAdminWindow(page, { sessionToken: 'SYNTHETIC_PAGINATION' });
      await setUiSettingsLocalStorage(page, { language, theme });
      const user = { id: 1, login: 'audit-member', level: 1 };
      const requests: unknown[] = [];
      const writes: string[] = [];
      const rows = Array.from({ length: 151 }, (_, i) => ({
        id: i + 1,
        api_ip_addr: '203.0.113.10',
        client_ip_addr: '203.0.113.10',
        user_agent: 'Dlouhý ověřovací název prohlížeče a zařízení',
        created_at: '2026-11-07T12:00:00Z',
      }));
      page.on('request', (r) => {
        if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(r.method()))
          writes.push(r.method() + ' ' + new URL(r.url()).pathname);
      });
      await installHaveApiMock(page, {
        user,
        handlers: {
          'GET users/1': () => ({ user }),
          'GET users/1/totp_devices': () => ({ totp_devices: [] }),
          'GET users/1/webauthn_credentials': () => ({ webauthn_credentials: [] }),
          'GET users/1/known_devices': ({ searchParams }) => {
            const from = Number(searchParams.get('known_device[from_id]') ?? '0');
            const limit = Number(searchParams.get('known_device[limit]') ?? '25');
            requests.push({ from, limit });
            return { known_devices: rows.filter((r) => r.id > from).slice(0, limit), _meta: { total_count: 151 } };
          },
        },
      });
      const root = 'profile.mfa.known_devices.pagination';
      await page.goto('/app/profile/mfa?limit=25');
      await expect(page.getByTestId(root + '.next')).toBeEnabled();
      await page.getByTestId(root + '.next').click();
      await expect(page).toHaveURL(/from_id=25/);
      await expect(page.getByTestId(root + '.jump')).toBeVisible();
      for (let pageNumber = 3; pageNumber <= 7; pageNumber++) {
        await page.getByTestId(root + '.next').click();
        await expect(page).toHaveURL(new RegExp('page=' + pageNumber));
      }
      await page.getByTestId(root + '.jump').fill('4');
      await page.getByTestId(root + '.jump.submit').click();
      await expect(page).toHaveURL(/from_id=75/);
      await page.getByTestId(root).scrollIntoViewIfNeeded();
      const controls = page.getByTestId(root).locator('input,select,button');
      for (const control of await controls.all()) {
        await expect(control).toBeVisible();
        expect((await control.boundingBox())?.height).toBe(info.project.name.startsWith('mobile') ? 44 : 36);
      }
      await page.getByTestId(root + '.jump').focus();
      await page.keyboard.press('Shift+Tab');
      await page.keyboard.press('Tab');
      await expect(page.getByTestId(root + '.jump')).toBeFocused();
      expect(await page.getByTestId(root + '.jump').evaluate((el) => el.matches(':focus-visible'))).toBe(true);
      await page.screenshot({ path: info.outputPath('normal.png'), fullPage: false });
      await page.setViewportSize({ width: 320, height: 750 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(321);
      await page.getByTestId(root).scrollIntoViewIfNeeded();
      await page.screenshot({ path: info.outputPath('narrow.png'), fullPage: false });
      await page.getByTestId(root + '.jump').fill('1');
      await page.getByTestId(root + '.jump.submit').click();
      await expect(page).toHaveURL(/page=1/);
      await page.getByTestId(root + '.limit').selectOption('50');
      await expect.poll(() => requests).toContainEqual({ from: 0, limit: 51 });
      expect(
        writes.filter((w) => !/^PUT \/api\/v7\.0\/webui_user_settings\/(ui|ui_setting)\/settings$/.test(w))
      ).toEqual([]);
      await writeFile(
        info.outputPath('scope.json'),
        JSON.stringify(
          {
            requests,
            writes,
            fixture: true,
            source: 'working pagination-control source',
            language,
            theme,
            project: info.project.name,
          },
          null,
          2
        )
      );
    });
  }
