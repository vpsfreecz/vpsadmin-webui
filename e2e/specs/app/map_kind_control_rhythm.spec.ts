import { expect, test } from '@playwright/test';
import { bootstrapVpsAdminWindow, installHaveApiMock, setUiSettingsLocalStorage } from '../../fixtures';

for (const language of ['cs', 'en'] as const)
  for (const theme of ['light', 'dark'] as const) {
    test(`@pr-smoke @pr-smoke-mobile native map kind field ${language} ${theme}`, async ({ page }, info) => {
      const touch = info.project.name.startsWith('mobile');
      const writes: string[] = [],
        errors: string[] = [];
      page.on('pageerror', (e) => errors.push(String(e)));
      page.on('request', (r) => {
        if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(r.method()))
          writes.push(r.method() + ' ' + new URL(r.url()).pathname);
      });
      await page.setViewportSize(touch ? { width: 390, height: 844 } : { width: 1440, height: 1000 });
      await page.clock.setFixedTime(new Date('2026-11-07T12:00:00Z'));
      await bootstrapVpsAdminWindow(page, { sessionToken: 'SYNTHETIC_NATIVE_FIELD' });
      await setUiSettingsLocalStorage(page, { language, theme });
      const user = {
        id: 1,
        login: 'audit-member',
        level: 100,
        full_name: 'Ověřovací člen s dlouhým českým jménem a příjmením',
        email: 'fixture@example.test',
      };
      const namespace = {
        id: 101,
        size: 65536,
        user: { id: 1, login: 'audit-member' },
        offset: 100000,
        block_count: 1,
      };
      const map = {
        id: 501,
        label: 'Ověřovací přístup a konfigurace s dlouhým českým názvem',
        user_namespace: namespace,
        user: { id: 1, login: 'audit-member' },
      };
      await installHaveApiMock(page, {
        user,
        handlers: {
          'GET users/1': () => ({ user }),
          'GET user_namespaces': () => ({ user_namespaces: [namespace] }),
          'GET user_namespaces/101': () => ({ user_namespace: namespace }),
          'GET user_namespace_maps': () => ({ user_namespace_maps: [map] }),
          'GET user_namespace_maps/501': () => ({ user_namespace_map: map }),
          'GET user_namespace_maps/501/entries': () => ({
            entries: [{ id: 1001, kind: 'uid', vps_id: 0, ns_id: 100000, count: 65536 }],
          }),
          'GET vpses': () => ({ vpses: [], _meta: { total_count: 0 } }),
        },
      });
      await page.goto('/admin/profile/user-namespaces/maps/501');
      const kind = page.getByTestId('profile.userns.map.add.kind');
      await expect(kind).toBeEnabled();
      await kind.selectOption('gid');
      await expect(kind).toHaveValue('gid');
      for (const [field, value] of [
        ['vps_id', '201'],
        ['ns_id', '100100'],
        ['count', '100'],
      ] as const)
        await page.getByTestId('profile.userns.map.add.' + field).fill(value);
      for (const suffix of ['kind', 'vps_id', 'ns_id', 'count', 'submit']) {
        const field = page.getByTestId('profile.userns.map.add.' + suffix);
        await expect(field).toBeVisible();
        expect((await field.boundingBox())?.height).toBe(touch ? 44 : 36);
      }
      await kind.focus();
      await page.keyboard.press('Shift+Tab');
      await page.keyboard.press('Tab');
      await expect(kind).toBeFocused();
      expect(await kind.evaluate((el) => el.matches(':focus-visible'))).toBe(true);
      await page.screenshot({ path: info.outputPath('normal.png'), fullPage: false });
      await page.setViewportSize({ width: 320, height: 750 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(321);
      await kind.scrollIntoViewIfNeeded();
      expect((await kind.boundingBox())?.height).toBe(touch ? 44 : 36);
      await page.screenshot({ path: info.outputPath('narrow.png'), fullPage: false });
      expect(errors).toEqual([]);
      expect(
        writes.filter((w) => !/^PUT \/api\/v7\.0\/webui_user_settings\/(ui|ui_setting)\/settings$/.test(w))
      ).toEqual([]);
    });
  }
