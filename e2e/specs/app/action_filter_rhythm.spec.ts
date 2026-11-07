import { expect, test } from '@playwright/test';
import { bootstrapVpsAdminWindow, installHaveApiMock, setUiSettingsLocalStorage } from '../../fixtures';
import { expectNoDocumentHorizontalOverflow } from '../../helpers/horizontalOverflow';

for (const language of ['cs', 'en'] as const) {
  for (const theme of ['dark', 'light'] as const) {
    for (const mode of ['member', 'admin', 'mine', 'support'] as const) {
      test(`@pr-smoke @pr-smoke-mobile action filter dimensions ${language} ${theme} ${mode}`, async ({
        page,
      }, info) => {
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
        const actions = ['Restart VPS #16', 'Automatic backup retention cleanup', 'Evacuate node #4'].map(
          (label, i) => ({
            id: 301 + i,
            label: label + ' · Kontrolní úloha s dlouhým českým názvem pro ověření čitelnosti',
            created_at: '2026-01-26T00:00:00.000Z',
            updated_at: '2026-01-26T00:01:00.000Z',
            state: 'done',
            finished: true,
            status: false,
            can_cancel: false,
          })
        );
        await installHaveApiMock(page, {
          user: { id: 90, login: mode, level: mode === 'member' ? 1 : mode === 'support' ? 30 : 100 },
          handlers: {
            'GET action_states': ({ url }) => {
              queries.push(url);
              return { action_states: actions };
            },
          },
        });
        await page.goto(
          `/${mode === 'admin' || mode === 'support' ? 'admin' : 'app'}/action-states?errors=1&order=newest&limit=25`
        );
        await expect(page.getByTestId('action_states.row.301')).toBeVisible();
        const input = page.getByTestId('action_states.smart_filter.input');
        const help = page.getByTestId('action_states.smart_filter.help');
        const order = page.getByTestId('action_states.order.select');
        const advanced = page.getByTestId('action_states.advanced.open');
        const refresh = page.getByTestId('action_states.refresh');
        const copy = page.getByTestId('action_states.copy_link');
        const clear = page.getByTestId('action_states.clear_filters');
        const controls = [
          [input, 44],
          [help, 32],
          [order, 36],
          [advanced, 32],
          [refresh, 32],
          [copy, 32],
          [clear, 32],
        ] as const;
        for (const [control, oldHeight] of controls) {
          await expect(control).toBeVisible();
          expect(Math.round((await control.boundingBox())!.height)).toBe(baseline && !mobile ? oldHeight : 44);
        }
        for (const visibility of ['all', 'user', 'system', 'admin']) {
          expect(
            Math.round((await page.getByTestId(`action_states.visibility.${visibility}`).boundingBox())!.height)
          ).toBe(baseline && !mobile ? 32 : 44);
        }
        if (language === 'cs' && theme === 'dark' && mode === 'admin') {
          await page
            .getByTestId('action_states.list.filters')
            .screenshot({ path: info.outputPath(`action-filter-${baseline ? 'before' : 'after'}.png`), scale: 'css' });
        }
        await help.focus();
        await page.keyboard.press('Enter');
        await expect(page.getByRole('dialog')).toBeVisible();
        await page.keyboard.press('Escape');
        await expect(help).toBeFocused();
        await advanced.focus();
        await page.keyboard.press('Enter');
        await expect(page.getByTestId('action_states.advanced.errors')).toBeChecked();
        await expect(page.getByTestId('action_states.advanced.q')).toHaveValue('');
        await page.keyboard.press('Escape');
        await expect(advanced).toBeFocused();
        await order.selectOption('oldest');
        await expect.poll(() => queries.at(-1)?.searchParams.get('action_state[order]')).toBe('oldest');
        await page.getByTestId('action_states.visibility.system').focus();
        await page.keyboard.press('Enter');
        await expect(page.getByTestId('action_states.row.302')).toBeVisible();
        await expect(page.getByTestId('action_states.row.301')).toHaveCount(0);
        await expect(page.getByTestId('action_states.row.303')).toHaveCount(0);
        await page.evaluate(() =>
          Object.defineProperty(navigator, 'clipboard', {
            configurable: true,
            value: {
              writeText: async (s: string) => {
                document.documentElement.dataset['copiedAction'] = s;
              },
            },
          })
        );
        await copy.focus();
        await page.keyboard.press('Enter');
        await expect.poll(() => page.evaluate(() => document.documentElement.dataset['copiedAction'])).toBe(page.url());
        const beforeRefresh = queries.length;
        await refresh.click();
        await expect.poll(() => queries.length).toBeGreaterThan(beforeRefresh);
        await clear.click();
        await expect(clear).toHaveCount(0);
        await expect(page.getByTestId('action_states.row.301')).toBeVisible();
        await expect(order).toHaveValue('oldest');
        expect(new URL(page.url()).searchParams.has('errors')).toBe(false);
        expect(new URL(page.url()).searchParams.has('visibility')).toBe(false);
        expect(
          queries.every(
            (url) =>
              !url.searchParams.has('action_state[visibility]') &&
              !url.searchParams.has('action_state[errors]') &&
              !url.searchParams.has('action_state[user]')
          )
        ).toBe(true);
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
}
