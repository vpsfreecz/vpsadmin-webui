import { expect, test } from '@playwright/test';

import { bootstrapVpsAdminWindow, failEnvelope, installHaveApiMock } from '../../fixtures';

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
      'GET migration_plans/2/vps_migrations': () => ({ vps_migrations: [] }),
      'GET nodes': () => ({ nodes: [{ id: 1, domain_name: 'node1.example' }] }),
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

test('captures an accepted cancellation request while the migration plan remains running', async ({
  page,
}, testInfo) => {
  const { setUiSettingsLocalStorage } = await import('../../fixtures');
  const { enAdmin_migration_plan } = await import('../../../src/i18n/locales/en/admin/migration_plan');
  const { csAdmin_migration_plan } = await import('../../../src/i18n/locales/cs/admin/migration_plan');
  const mobile = testInfo.project.name === 'mobile-chrome';
  const copy = mobile ? csAdmin_migration_plan : enAdmin_migration_plan;
  await bootstrapVpsAdminWindow(page, { sessionToken: 'MIGRATION_CANCEL_NONTERMINAL' });
  await setUiSettingsLocalStorage(page, { language: mobile ? 'cs' : 'en', theme: mobile ? 'dark' : 'light' });
  let attempts = 0;
  const plan = { id: 2, state: 'running', locked: false, concurrency: 2, stop_on_error: true, send_mail: false };
  await installHaveApiMock(page, {
    user: { id: 1, login: 'admin', level: 100 },
    handlers: {
      'GET migration_plans/2': () => ({ migration_plan: plan }),
      'GET migration_plans/2/vps_migrations': () => ({ vps_migrations: [] }),
      'GET nodes': () => ({ nodes: [{ id: 1, domain_name: 'node1.example' }] }),
      'GET transaction_chains': () => ({ transaction_chains: [] }),
      'POST migration_plans/2/cancel': () => {
        attempts += 1;
        if (attempts === 1) return failEnvelope('Cancellation request was rejected');
        return { migration_plan: plan, _meta: { action_state_id: 703 } };
      },
      'GET action_states/703': () => ({
        action_state: {
          id: 703,
          label: 'Cancellation request',
          status: true,
          finished: false,
          current: 1,
          total: 2,
          created_at: '2026-11-04T12:00:00Z',
          updated_at: '2026-11-04T12:00:01Z',
        },
      }),
    },
  });
  await page.goto('/admin/migration-plans/2');
  await page.getByTestId('admin.migration_plan.cancel').click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toContainText(copy['admin.migration_plan.confirm.cancel.description']);
  const confirm = dialog.getByRole('button', { name: mobile ? 'Zrušit' : 'Cancel', exact: true }).last();
  await dialog.screenshot({ path: testInfo.outputPath('cancel-request-review.png'), scale: 'css' });
  await confirm.click();
  await expect(dialog).toContainText('Cancellation request was rejected');
  await dialog.screenshot({ path: testInfo.outputPath('cancel-request-rejected.png'), scale: 'css' });
  await confirm.click();
  await expect(dialog).toHaveCount(0);
  const notice = page.getByText(
    mobile ? 'Požadavek na zrušení migračního plánu byl přijat.' : 'Migration plan cancellation requested.',
    { exact: true }
  );
  await expect(notice).toBeVisible();
  await notice
    .locator('..')
    .screenshot({ path: testInfo.outputPath('cancel-request-accepted-nonterminal.png'), scale: 'css' });
  await expect(page.getByTestId('admin.migration_plan.cancel')).toHaveAttribute('aria-disabled', 'true');
  await page.getByTestId('admin.migration_plan.header').screenshot({
    path: testInfo.outputPath('cancel-request-nonterminal-header.png'),
    scale: 'css',
  });
  await page.getByTestId('tasks.open-button').click();
  await expect(page.getByTestId('tasks.row.703')).toBeVisible();
  await expect(page.getByTestId('tasks.row.703')).toContainText('#2');
  await page
    .getByTestId('tasks.drawer')
    .screenshot({ path: testInfo.outputPath('cancel-request-tracked.png'), scale: 'css' });
  expect(attempts).toBe(2);
  expect(plan.state).toBe('running');
});
