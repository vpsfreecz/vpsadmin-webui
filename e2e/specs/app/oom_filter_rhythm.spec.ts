import { expect, test, type Locator } from '@playwright/test';
import { bootstrapVpsAdminWindow, installHaveApiMock, setUiSettingsLocalStorage } from '../../fixtures';
import { expectNoDocumentHorizontalOverflow } from '../../helpers/horizontalOverflow';

async function height(control: Locator) {
  const box = await control.boundingBox();
  expect(box).not.toBeNull();
  return Math.round(box!.height);
}

for (const [language, theme] of [
  ['cs', 'dark'],
  ['en', 'light'],
] as const) {
  for (const mode of ['member', 'admin', 'mine', 'support'] as const) {
    test(`@pr-smoke @pr-smoke-mobile OOM filter dimensions ${language} ${mode}`, async ({ page }, testInfo) => {
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
        user: { id: 90, login: mode, level: mode === 'member' ? 1 : mode === 'support' ? 30 : 100 },
        handlers: {
          'GET oom_reports': ({ url }) => {
            queries.push(url);
            return { oom_reports: [], _meta: { total_count: 0 } };
          },
          'GET nodes': () => ({ nodes: [] }),
          'GET locations': () => ({ locations: [] }),
          'GET environments': () => ({ environments: [] }),
          'GET users': () => ({ users: [{ id: 42, login: 'owner', level: 1 }] }),
          'GET users/42': () => ({ user: { id: 42, login: 'owner', level: 1 } }),
        },
      });
      const route = mode === 'admin' || mode === 'support' ? 'admin' : 'app';
      await page.goto(`/${route}/oom-reports?cgroup=%2Fexample.slice&limit=25${mode === 'admin' ? '&user=42' : ''}`);
      await expect.poll(() => queries.length).toBeGreaterThan(0);
      const input = page.getByTestId('oom.smart_filter.input');
      const help = page.getByTestId('oom.smart_filter.help_btn');
      const advanced = page.getByTestId('oom.filters.advanced');
      const copy = page.getByTestId('oom.filters.copy_link');
      const clear = page.getByTestId('oom.filters.clear');
      await expect(clear).toBeVisible();
      expect(await height(input)).toBe(44);
      for (const action of [help, advanced, copy, clear]) {
        expect(await height(action)).toBe(baseline && !mobile ? 32 : 44);
        if (!baseline) expect((await action.boundingBox())!.width).toBeGreaterThanOrEqual(44);
      }
      if (!mobile && !baseline) {
        const box = (await input.boundingBox())!;
        for (const action of [advanced, copy, clear]) {
          expect(Math.abs((await action.boundingBox())!.y - box.y)).toBeLessThanOrEqual(1);
        }
      }
      const owner = mode === 'admin' ? '42' : mode === 'mine' ? '90' : null;
      expect(queries[0]!.searchParams.get('oom_report[user]')).toBe(owner);
      expect(queries[0]!.searchParams.get('oom_report[cgroup]')).toBe('/example.slice');
      if (language === 'cs' && mode === 'admin') {
        await page
          .getByTestId('oom.list.filters')
          .screenshot({ path: testInfo.outputPath(`oom-filter-${baseline ? 'before' : 'after'}.png`), scale: 'css' });
      }
      await help.focus();
      await page.keyboard.press('Enter');
      const dialog = page.getByRole('dialog');
      await expect(dialog).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(dialog).toBeHidden();
      await expect(help).toBeFocused();
      await advanced.focus();
      await page.keyboard.press('Enter');
      await expect(page.getByTestId('oom.filters.drawer')).toBeVisible();
      await expect(page.getByTestId('oom.advanced.cgroup')).toHaveValue('/example.slice');
      await expect(page.getByTestId('oom.advanced.user')).toHaveCount(mode === 'admin' ? 1 : 0);
      await page.keyboard.press('Escape');
      await expect(advanced).toBeFocused();
      await input.fill('unsupported:value');
      await input.press('Enter');
      await expect(page.getByTestId('oom.chip.err.0')).toBeVisible();
      expect(queries.every((url) => !url.searchParams.has('oom_report[unsupported]'))).toBe(true);
      await input.fill('');
      await input.press('Escape');
      await page.evaluate(() =>
        Object.defineProperty(navigator, 'clipboard', {
          configurable: true,
          value: {
            writeText: async (value: string) => {
              document.documentElement.dataset['copiedOomLink'] = value;
            },
          },
        })
      );
      await copy.focus();
      await page.keyboard.press('Enter');
      await expect.poll(() => page.evaluate(() => document.documentElement.dataset['copiedOomLink'])).toBe(page.url());
      await clear.click();
      await expect(clear).toHaveCount(0);
      await expect(page.getByTestId('oom.chip.err.0')).toHaveCount(0);
      await expect.poll(() => new URL(page.url()).searchParams.get('cgroup')).toBe(null);
      await expect.poll(() => queries.at(-1)?.searchParams.get('oom_report[cgroup]')).toBe(null);
      expect(queries.at(-1)?.searchParams.get('oom_report[user]')).toBe(mode === 'mine' ? '90' : null);
      await expectNoDocumentHorizontalOverflow(page);
      if (mobile) {
        await page.setViewportSize({ width: 320, height: 750 });
        await expectNoDocumentHorizontalOverflow(page);
      }
      const preference = /^PUT \/api\/v7\.0\/webui_user_settings\/(ui|ui_setting)\/settings$/;
      expect(writes.filter((write) => !preference.test(write))).toEqual([]);
      expect(writes.filter((write) => preference.test(write)).length).toBeLessThanOrEqual(1);
    });
  }
}
