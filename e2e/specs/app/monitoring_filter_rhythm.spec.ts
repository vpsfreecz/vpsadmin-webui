import { expect, test } from '@playwright/test';
import { bootstrapVpsAdminWindow, installHaveApiMock, setUiSettingsLocalStorage } from '../../fixtures';
import { expectNoDocumentHorizontalOverflow } from '../../helpers/horizontalOverflow';

for (const [language, theme] of [
  ['cs', 'dark'],
  ['en', 'light'],
] as const) {
  for (const mode of ['member', 'admin', 'mine', 'support'] as const) {
    test(`@pr-smoke @pr-smoke-mobile monitoring filter dimensions ${language} ${mode}`, async ({ page }, info) => {
      const mobile = info.project.name.startsWith('mobile');
      const baseline = process.env['CAPTURE_SIDE']?.startsWith('baseline') ?? false;
      await page.setViewportSize(mobile ? { width: 390, height: 844 } : { width: 1440, height: 1000 });
      await bootstrapVpsAdminWindow(page);
      await setUiSettingsLocalStorage(page, { language, theme });
      const queries: URL[] = [],
        writes: string[] = [];
      page.on('request', (r) => {
        if (r.method() !== 'GET') writes.push(r.method() + ' ' + new URL(r.url()).pathname);
      });
      await installHaveApiMock(page, {
        user: { id: 90, login: mode, level: mode === 'member' ? 1 : mode === 'support' ? 30 : 100 },
        handlers: {
          'GET monitored_events': ({ url }) => {
            queries.push(url);
            return { monitored_events: [] };
          },
          'GET users': () => ({ users: [{ id: 42, login: 'owner', level: 1 }] }),
          'GET users/42': () => ({ user: { id: 42, login: 'owner', level: 1 } }),
        },
      });
      const admin = mode === 'admin' || mode === 'support';
      await page.goto(
        `/${admin ? 'admin' : 'app'}/monitoring?monitor=probe&order=longest&limit=25${mode === 'admin' ? '&user=42' : ''}`
      );
      await expect.poll(() => queries.length).toBeGreaterThan(0);
      const input = page.getByTestId('monitoring.smart_filter.input');
      const help = input.locator('..').getByRole('button');
      const order = page.getByTestId('monitoring.events.filter.order');
      const advanced = page.getByTestId('monitoring.events.advanced.open');
      const copy = page.getByTestId('monitoring.events.copy_link');
      const clear = page.getByTestId('monitoring.events.clear_filters');
      for (const [control, oldHeight] of [
        [input, 44],
        [help, 32],
        [order, 36],
        [advanced, 32],
        [copy, 32],
        [clear, 32],
      ] as const) {
        await expect(control).toBeVisible();
        expect(Math.round((await control.boundingBox())!.height)).toBe(baseline && !mobile ? oldHeight : 44);
      }
      expect(queries[0]!.searchParams.get('monitored_event[user]')).toBe(
        mode === 'admin' ? '42' : mode === 'mine' ? '90' : null
      );
      expect(queries[0]!.searchParams.get('monitored_event[monitor]')).toBe('probe');
      if (language === 'cs' && mode === 'admin')
        await page
          .getByTestId('monitoring.events.filters')
          .screenshot({
            path: info.outputPath(`monitoring-filter-${baseline ? 'before' : 'after'}.png`),
            scale: 'css',
          });
      await help.focus();
      await page.keyboard.press('Enter');
      await expect(page.getByRole('dialog')).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(help).toBeFocused();
      await advanced.focus();
      await page.keyboard.press('Enter');
      await expect(page.getByTestId('monitoring.events.advanced.monitor')).toHaveValue('probe');
      await expect(page.getByTestId('monitoring.events.advanced.user.lookup')).toHaveCount(admin ? 1 : 0);
      await page.keyboard.press('Escape');
      await expect(advanced).toBeFocused();
      await order.selectOption('shortest');
      await expect.poll(() => queries.at(-1)?.searchParams.get('monitored_event[order]')).toBe('shortest');
      await page.evaluate(() =>
        Object.defineProperty(navigator, 'clipboard', {
          configurable: true,
          value: {
            writeText: async (s: string) => {
              document.documentElement.dataset['copiedMonitoring'] = s;
            },
          },
        })
      );
      await copy.focus();
      await page.keyboard.press('Enter');
      await expect
        .poll(() => page.evaluate(() => document.documentElement.dataset['copiedMonitoring']))
        .toBe(page.url());
      await clear.click();
      await expect(clear).toHaveCount(0);
      await expect.poll(() => queries.at(-1)?.searchParams.get('monitored_event[monitor]')).toBe(null);
      expect(queries.at(-1)?.searchParams.get('monitored_event[user]')).toBe(mode === 'mine' ? '90' : null);
      await expect(order).toHaveValue('shortest');
      await expectNoDocumentHorizontalOverflow(page);
      if (mobile) {
        await page.setViewportSize({ width: 320, height: 750 });
        await expectNoDocumentHorizontalOverflow(page);
      }
      expect(
        writes.filter((w) => !/^PUT \/api\/v7\.0\/webui_user_settings\/(ui|ui_setting)\/settings$/.test(w))
      ).toEqual([]);
    });
  }
}
