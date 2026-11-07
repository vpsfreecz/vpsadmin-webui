import { expect, test, type Locator } from '@playwright/test';
import { bootstrapVpsAdminWindow, installHaveApiMock, setUiSettingsLocalStorage } from '../../fixtures';
import { expectNoDocumentHorizontalOverflow } from '../../helpers/horizontalOverflow';

async function controlHeight(control: Locator) {
  const box = await control.boundingBox();
  expect(box).not.toBeNull();
  return Math.round(box!.height);
}
for (const [language, theme] of [
  ['cs', 'dark'],
  ['en', 'light'],
] as const) {
  for (const mode of ['app', 'admin'] as const) {
    test(`@pr-smoke @pr-smoke-mobile export filter dimensions ${language} ${mode}`, async ({ page }, testInfo) => {
      const mobile = testInfo.project.name.startsWith('mobile');
      const baseline = process.env['CAPTURE_SIDE']?.startsWith('baseline') ?? false;
      await page.setViewportSize(mobile ? { width: 390, height: 844 } : { width: 1440, height: 1000 });
      await bootstrapVpsAdminWindow(page);
      await setUiSettingsLocalStorage(page, { language, theme });
      const queries: URL[] = [],
        writes: string[] = [];
      page.on('request', (request) => {
        if (request.method() !== 'GET') writes.push(request.method() + ' ' + new URL(request.url()).pathname);
      });
      await installHaveApiMock(page, {
        user: { id: 1, login: mode === 'admin' ? 'admin' : 'member', level: mode === 'admin' ? 99 : 1 },
        handlers: {
          'GET exports': ({ url }) => {
            queries.push(url);
            return {
              exports: [
                {
                  id: 53,
                  dataset: { id: 54, name: 'archive', full_name: 'tank/owner/archive' },
                  snapshot: null,
                  user: { id: mode === 'admin' ? 42 : 1, login: 'owner' },
                  host_ip_address: { id: 55, addr: '192.0.2.24' },
                  path: '/tank/owner/archive',
                  all_vps: false,
                  rw: true,
                  sync: true,
                  enabled: true,
                  root_squash: true,
                  threads: 8,
                },
              ],
            };
          },
          'GET users/42': () => ({ user: { id: 42, login: 'owner', level: 1, object_state: 'active' } }),
          'GET users': () => ({ users: [{ id: 42, login: 'owner', level: 1 }] }),
          'GET vpses': () => ({ vpses: [] }),
        },
      });
      await page.goto(`/${mode}/exports${mode === 'admin' ? '?user=42' : ''}`);
      await expect(page.getByTestId(`exports.${mobile ? 'card' : 'row'}.53`)).toBeVisible();
      const input = page.getByTestId('exports.smart_filter.input');
      const help = page.getByTestId('exports.smart_filter.help'),
        copy = page.getByTestId('exports.copy_link');
      const clear = page.getByTestId('exports.filters.clear'),
        refresh = page.getByTestId('exports.refresh');
      // Unsupported text produces a local error chip, never a made-up API filter.
      await input.fill('unsupported:value');
      await input.press('Enter');
      await expect(page.getByTestId('exports.chip.err.0')).toBeVisible();
      await input.fill('');
      await input.press('Escape');
      expect(await controlHeight(input)).toBe(44);
      if (mode === 'admin') {
        expect(await controlHeight(page.getByTestId('exports.filter.user'))).toBe(baseline && !mobile ? 36 : 44);
      }
      for (const [control, oldHeight] of [
        [help, 32],
        [copy, 32],
        [clear, 36],
        [refresh, 36],
      ] as const) {
        expect(await controlHeight(control)).toBe(baseline && !mobile ? oldHeight : 44);
        if (!baseline) expect((await control.boundingBox())!.width).toBeGreaterThanOrEqual(44);
      }
      if (!mobile && !baseline) {
        const field = (await input.boundingBox())!;
        for (const action of [copy, clear, refresh]) {
          const box = (await action.boundingBox())!;
          expect(Math.abs(box.y - field.y)).toBeLessThanOrEqual(1);
        }
      }
      const first = queries[0]!;
      expect(first.searchParams.get('export[user]')).toBe(mode === 'admin' ? '42' : null);
      for (const query of queries) expect(query.searchParams.has('export[unsupported]')).toBe(false);
      if (language === 'cs' && mode === 'admin') {
        // The current baseline has no filter test id: locate the shared FilterBar by its field.
        const filters = input.locator('xpath=ancestor::div[contains(@class,"items-end")][1]');
        await filters.screenshot({
          path: testInfo.outputPath(`export-filter-${baseline ? 'before' : 'after'}.png`),
          scale: 'css',
        });
      }
      await help.focus();
      await page.keyboard.press('Enter');
      const dialog = page.getByRole('dialog', {
        name: language === 'cs' ? 'Najít export' : 'Find an export',
        exact: true,
      });
      await expect(dialog).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(dialog).toBeHidden();
      await expect(help).toBeFocused();
      await page.evaluate(() =>
        Object.defineProperty(navigator, 'clipboard', {
          configurable: true,
          value: {
            writeText: async (value: string) => {
              document.documentElement.dataset['copiedExportLink'] = value;
            },
          },
        })
      );
      await copy.focus();
      await page.keyboard.press('Enter');
      await expect
        .poll(() => page.evaluate(() => document.documentElement.dataset['copiedExportLink']))
        .toBe(page.url());
      const count = queries.length;
      await refresh.click();
      await expect.poll(() => queries.length).toBeGreaterThan(count);
      await clear.click();
      await expect(clear).toHaveCount(0);
      await expect(page.getByTestId('exports.chip.err.0')).toHaveCount(0);
      await expect.poll(() => new URL(page.url()).searchParams.get('user')).toBe(null);
      await expect.poll(() => queries.at(-1)?.searchParams.get('export[user]')).toBe(null);
      await expectNoDocumentHorizontalOverflow(page);
      if (mobile) {
        await page.setViewportSize({ width: 320, height: 750 });
        await expectNoDocumentHorizontalOverflow(page);
      }
      const preferenceWrite = /^PUT \/api\/v7\.0\/webui_user_settings\/(ui|ui_setting)\/settings$/;
      expect(writes.filter((write) => !preferenceWrite.test(write))).toEqual([]);
      expect(writes.filter((write) => preferenceWrite.test(write)).length).toBeLessThanOrEqual(1);
    });
  }
}
