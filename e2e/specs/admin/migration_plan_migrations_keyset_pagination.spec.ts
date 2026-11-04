import { expect, test } from '@playwright/test';

import { bootstrapVpsAdminWindow, failEnvelope, installHaveApiMock, setUiSettingsLocalStorage } from '../../fixtures';
import { enAdmin_migration_plan as copy } from '../../../src/i18n/locales/en/admin/migration_plan';

test('admin migration plan detail: migrations list keyset pagination (from_id)', async ({ page }, testInfo) => {
  await bootstrapVpsAdminWindow(page, { sessionToken: 'TEST' });
  await setUiSettingsLocalStorage(page, { language: 'en' });
  let mode = 'pending';
  let release!: () => void;
  const pending = new Promise<void>((resolve) => {
    release = resolve;
  });

  await installHaveApiMock(page, {
    user: { id: 1, login: 'admin', level: 100 },
    handlers: {
      'GET migration_plans/777': () => ({
        migration_plan: {
          id: 777,
          state: 'staged',
          concurrency: 10,
          stop_on_error: true,
          send_mail: true,
          user: { id: 42, login: 'root' },
          created_at: '2025-01-01T00:00:00Z',
          finished_at: null,
          reason: null,
        },
      }),
      'GET nodes': () => ({
        nodes: [
          { id: 1, domain_name: 'node1.example.test', location: { label: 'DC1' } },
          { id: 2, domain_name: 'node2.example.test', location: { label: 'DC1' } },
        ],
      }),
      'GET migration_plans/777/vps_migrations': async (ctx) => {
        if (mode === 'pending') await pending;
        if (mode === 'error') return failEnvelope('Migrations unavailable');
        if (mode === 'empty') return { vps_migrations: [] };
        const fromId = ctx.searchParams.get('vps_migration[from_id]');
        const limitStr = ctx.searchParams.get('vps_migration[limit]');
        const limit = limitStr ? Number(limitStr) : 50;

        const startId = fromId ? Number(fromId) - 1 : 1000;
        const count = Number.isFinite(limit) && limit > 0 ? limit : 50;

        const vps_migrations = Array.from({ length: count }, (_, i) => {
          const id = startId - i;
          return {
            id,
            state: id % 3 === 0 ? 'done' : id % 3 === 1 ? 'running' : 'staged',
            vps: { id: 10_000 + id },
            src_node: { id: 1, domain_name: 'node1.example.test' },
            dst_node: { id: 2, domain_name: 'node2.example.test' },
            transaction_chain: { id: 9_000 + id },
            created_at: '2025-01-01T00:00:00Z',
            started_at: null,
            finished_at: null,
          };
        });

        return { vps_migrations };
      },
    },
  });

  await page.goto('/admin/migration-plans/777');

  const header = page.getByTestId('admin.migration_plan.header');
  const summary = page
    .getByText(copy['admin.migration_plan.section.scheduled_migrations'], { exact: true })
    .locator('..');
  const migrations = page
    .getByRole('heading', { name: copy['admin.migration_plan.migrations.title'], exact: true })
    .locator('xpath=../../..');
  try {
    await expect(header).toBeVisible();
    await expect(summary).toHaveCount(0);
    await expect(migrations).toContainText('Loading');
    await page.screenshot({
      path: testInfo.outputPath('migration-child-pending-context.png'),
      fullPage: false,
      scale: 'css',
    });
    await migrations.screenshot({ path: testInfo.outputPath('migration-child-pending-list.png'), scale: 'css' });
    mode = 'error';
    release();
    await expect(migrations).toContainText('Migrations unavailable');
    await expect(summary).toHaveCount(0);
    await page.screenshot({
      path: testInfo.outputPath('migration-child-error-context.png'),
      fullPage: false,
      scale: 'css',
    });
    await migrations.screenshot({ path: testInfo.outputPath('migration-child-error-list.png'), scale: 'css' });
    mode = 'empty';
    await header.getByRole('button', { name: 'Refresh', exact: true }).click();
    await expect(page.getByText(copy['admin.migration_plan.migrations.empty'], { exact: true })).toBeVisible();
    await expect(summary).toContainText('On this page: 0');
    await summary.screenshot({ path: testInfo.outputPath('migration-child-known-empty-summary.png'), scale: 'css' });
    mode = 'populated';
    await header.getByRole('button', { name: 'Refresh', exact: true }).click();
  } finally {
    release();
  }

  const firstRow = page.getByTestId('admin.migration_plan.migrations.row.1000');
  await expect(firstRow).toBeVisible();
  await expect(firstRow.locator('a[href="/admin/transactions?class_name=Vps&row_id=11000"]')).toBeVisible();
  await expect(firstRow.locator('a[href="/admin/transactions/items?node=1"]')).toBeVisible();
  await expect(firstRow.locator('a[href="/admin/transactions/items?node=2"]')).toBeVisible();
  await expect(firstRow.locator('a[href="/admin/transactions/items?transaction_chain=10000"]')).toBeVisible();
  await expect(summary).toContainText('On this page: 50');
  await summary.screenshot({ path: testInfo.outputPath('migration-child-page-one-summary.png'), scale: 'css' });
  const scheduling = page
    .getByText(copy['admin.migration_plan.migrations.schedule.title'], { exact: true })
    .locator('..');
  await scheduling.getByPlaceholder(copy['admin.migration_plan.migrations.schedule.vps_id_placeholder']).fill('11000');
  await scheduling.getByRole('combobox').selectOption('2');
  await scheduling.screenshot({ path: testInfo.outputPath('migration-single-schedule-options.png'), scale: 'css' });
  await scheduling.getByText(copy['admin.migration_plan.migrations.schedule.batch.title'], { exact: true }).click();
  const batch = scheduling.locator('details');
  await batch.locator('textarea').fill('11000 11001 11000');
  await expect(batch).toContainText(/Parsed IDs:\s*2/);
  await batch.screenshot({ path: testInfo.outputPath('migration-batch-preview-options.png'), scale: 'css' });

  await page.getByTestId('admin.migration_plan.migrations.pagination.next').click();
  await expect(page.getByTestId('admin.migration_plan.migrations.row.950')).toBeVisible();
  await expect(summary).toContainText('On this page: 50');
  await summary.screenshot({ path: testInfo.outputPath('migration-child-keyset-page-two-summary.png'), scale: 'css' });

  await page.getByTestId('admin.migration_plan.migrations.pagination.prev').click();
  await expect(page.getByTestId('admin.migration_plan.migrations.row.1000')).toBeVisible();
});
