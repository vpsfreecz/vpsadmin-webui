import { expect, test } from '@playwright/test';

import {
  bootstrapVpsAdminWindow,
  failEnvelope,
  installHaveApiMock,
  jsonFulfill,
  setUiSettingsLocalStorage,
} from '../../fixtures';

test('@pr-smoke @pr-smoke-mobile rejected migration plan actions stay in their dialog for retry', async ({ page }) => {
  await bootstrapVpsAdminWindow(page, { sessionToken: 'MIGRATION_PLAN_ACTION_RETRY' });

  let attempts = 0;
  await installHaveApiMock(page, {
    user: { id: 1, login: 'admin', level: 100 },
    handlers: {
      'GET migration_plans/2': () => ({
        migration_plan: {
          id: 2,
          state: 'staged',
          locked: false,
          concurrency: 2,
          stop_on_error: true,
          use_maintenance_windows: false,
          cleanup_data: false,
          send_mail: false,
          reason: null,
        },
      }),
      'GET migration_plans/2/vps_migrations': () => [],
      'GET nodes': () => [{ id: 1, domain_name: 'node1.example' }],
      'GET transaction_chains': () => ({ transaction_chains: [] }),
      'POST migration_plans/2/start': () => {
        attempts += 1;
        if (attempts === 1) return failEnvelope('Migration plan start was rejected');
        return { migration_plan: { id: 2, state: 'running' }, _meta: { action_state_id: 702 } };
      },
    },
  });

  await page.goto('/admin/migration-plans/2');
  await page.getByTestId('admin.migration_plan.start').click();

  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: /start|spustit/i }).click();
  await expect(dialog).toContainText('Migration plan start was rejected');
  await expect(dialog).toBeVisible();

  await dialog.getByRole('button', { name: /start|spustit/i }).click();
  await expect(dialog).toHaveCount(0);
  expect(attempts).toBe(2);
});

for (const language of ['cs', 'en'] as const) {
  for (const theme of ['light', 'dark'] as const) {
    for (const level of [100, 21]) {
      test(`@pr-smoke @pr-smoke-mobile migration read errors are labelled and readable ${language} ${theme} role${level}`, async ({
        page,
      }) => {
        const writes: string[] = [];
        page.on('request', (request) => {
          if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method())) {
            writes.push(request.method() + ' ' + new URL(request.url()).pathname);
          }
        });
        await setUiSettingsLocalStorage(page, { language, theme });
        await bootstrapVpsAdminWindow(page, {
          sessionToken: 'MIGRATION_READ_ERRORS',
          webuiNext: { uiSettings: { persistence: 'local' } },
        });
        await installHaveApiMock(page, {
          user: { id: 7, login: 'migration-readability', level },
          handlers: {
            'GET migration_plans/300': () => ({
              migration_plan: {
                id: 300,
                state: 'staged',
                concurrency: 10,
                stop_on_error: true,
                send_mail: true,
                reason: 'Ověřovací migrační plán v Českých Budějovicích',
              },
            }),
            'GET migration_plans/300/vps_migrations': () =>
              jsonFulfill(failEnvelope('Synthetic migration rows read failure'), 503),
            'GET nodes': () => jsonFulfill(failEnvelope('Synthetic node lookup read failure'), 503),
            'GET transaction_chains': () => ({ transaction_chains: [] }),
          },
        });
        await page.goto('/admin/migration-plans/300');
        const expectedBodies = {
          nodes: language === 'cs' ? 'Nepodařilo se načíst nody pro výběr.' : 'Failed to load nodes for selection.',
          migrations: 'Synthetic migration rows read failure',
        };
        for (const kind of ['nodes', 'migrations'] as const) {
          const error = page.getByTestId(`admin.migration_plan.${kind}.error`);
          await expect(error).toContainText(language === 'cs' ? 'Chyba' : 'Error');
          await expect(error).toContainText(expectedBodies[kind]);
          const contrast = await error.evaluate((element) => {
            const text = element.querySelector('.text-muted');
            if (!text) throw new Error('Missing readable error body');
            const channels = (value: string) =>
              value
                .match(/[\d.]+/g)
                ?.slice(0, 3)
                .map(Number) ?? [];
            const luminance = (color: number[]) =>
              color.reduce((sum, value, index) => {
                const channel = value / 255;
                const linear = channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
                return sum + linear * ([0.2126, 0.7152, 0.0722][index] ?? 0);
              }, 0);
            const foreground = channels(getComputedStyle(text).color);
            const background = channels(getComputedStyle(element).backgroundColor);
            if (foreground.length !== 3 || background.length !== 3) throw new Error('Missing opaque semantic colors');
            const a = luminance(foreground),
              b = luminance(background);
            return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
          });
          expect(contrast).toBeGreaterThanOrEqual(4.5);
        }
        await expect(page.locator('main select').first()).toBeDisabled();
        await page.setViewportSize({ width: 320, height: 750 });
        expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(321);
        for (const kind of ['nodes', 'migrations']) {
          const error = page.getByTestId(`admin.migration_plan.${kind}.error`);
          expect(await error.evaluate((element) => element.scrollWidth <= element.clientWidth + 1)).toBe(true);
        }
        expect(writes).toEqual([]);
      });
    }
  }
}

for (const language of ['cs', 'en'] as const) {
  for (const theme of ['light', 'dark'] as const) {
    test(`@pr-smoke @pr-smoke-mobile migration verification read errors remain readable ${language} ${theme}`, async ({
      page,
    }) => {
      const writes: string[] = [];
      let verifying = false;
      page.on('request', (request) => {
        if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method())) writes.push(request.method());
      });
      await setUiSettingsLocalStorage(page, { language, theme });
      await bootstrapVpsAdminWindow(page, {
        sessionToken: 'MIGRATION_VERIFY_ERROR',
        webuiNext: { uiSettings: { persistence: 'local' } },
      });
      await page.addInitScript(() => {
        const lock = {
          key: 'MigrationPlan:300',
          kind: 'MigrationPlan',
          id: 300,
          acquiredAt: Date.now(),
          expiresAt: Number.MAX_SAFE_INTEGER,
          uncertaintyId: 'readability-generation',
          uncertain: true,
        };
        localStorage.setItem(
          'webui-next.local_locks.user-7.uncertain.' + encodeURIComponent(lock.key) + '.' + lock.uncertaintyId,
          JSON.stringify(lock)
        );
      });
      await installHaveApiMock(page, {
        user: { id: 7, login: 'migration-readability', level: 100 },
        handlers: {
          'GET migration_plans/300': () =>
            verifying
              ? jsonFulfill(failEnvelope('Synthetic verification read failure'), 503)
              : { migration_plan: { id: 300, state: 'staged', concurrency: 10 } },
          'GET migration_plans/300/vps_migrations': () => ({ vps_migrations: [] }),
          'GET nodes': () => ({ nodes: [] }),
          'GET transaction_chains': () => ({ transaction_chains: [] }),
        },
      });
      await page.goto('/admin/migration-plans/300');
      const prefix = 'admin.migration_plan.mutation.recovery';
      await expect(page.getByTestId(prefix + '.uncertain')).toBeVisible();
      await expect(page.getByTestId(prefix + '.verify')).toBeDisabled();
      await page.getByTestId(prefix + '.open_tasks').click();
      await expect(page.getByRole('dialog')).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(page.getByRole('dialog')).toHaveCount(0);
      verifying = true;
      await page.getByTestId(prefix + '.verify').click();
      const error = page.getByTestId(prefix + '.error');
      await expect(error).toContainText(language === 'cs' ? 'Nepodařilo se načíst aktuální stav' : 'The latest affected-object and task state could not be loaded.');
      await expect(page.getByTestId(prefix + '.acknowledge')).toBeDisabled();
      const contrast = await error.evaluate((element) => {
        let background: Element | null = element;
        while (background && getComputedStyle(background).backgroundColor === 'rgba(0, 0, 0, 0)')
          background = background.parentElement;
        if (!background) throw new Error('Missing opaque warning background');
        const channels = (value: string) =>
          value
            .match(/[\d.]+/g)
            ?.slice(0, 3)
            .map(Number) ?? [];
        const luminance = (color: number[]) =>
          color.reduce((sum, value, index) => {
            const channel = value / 255;
            const linear = channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
            return sum + linear * ([0.2126, 0.7152, 0.0722][index] ?? 0);
          }, 0);
        const a = luminance(channels(getComputedStyle(element).color)),
          b = luminance(channels(getComputedStyle(background).backgroundColor));
        return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
      });
      expect(contrast).toBeGreaterThanOrEqual(4.5);
      await page.setViewportSize({ width: 320, height: 750 });
      expect(await error.evaluate((element) => element.scrollWidth <= element.clientWidth + 1)).toBe(true);
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(321);
      expect(writes).toEqual([]);
    });
  }
}
