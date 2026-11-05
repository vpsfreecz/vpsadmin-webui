import { expect, test } from '@playwright/test';

import { bootstrapVpsAdminWindow, installHaveApiMock } from '../../fixtures';

test.describe('@smoke Admin cluster system config', () => {
  test.beforeEach(async ({ page }) => {
    await bootstrapVpsAdminWindow(page, { sessionToken: 'TEST' });

    const systemConfigs = [
      {
        category: 'core',
        name: 'api_url',
        type: 'String',
        value: 'https://api.example.test',
        label: 'API URL',
        description: 'Base API endpoint',
        min_user_level: 90,
      },
      {
        category: 'core',
        name: 'transaction_key',
        type: 'String',
        value: 'super-secret',
        label: 'Transaction key',
        description: 'Used to authenticate transaction callbacks',
        min_user_level: 90,
      },
    ];

    await installHaveApiMock(page, {
      user: { id: 1, login: 'admin', level: 90 },
      handlers: {
        'GET system_configs': () => ({ system_configs: systemConfigs, _meta: { total_count: systemConfigs.length } }),
        'PUT system_configs/core/api_url': () => ({ system_config: systemConfigs[0] }),
      },
    });
  });

  test('lists and edits a config value', async ({ page }, testInfo) => {
    const puts: any[] = [];
    page.on('request', (req) => {
      if (req.method() !== 'PUT') return;
      const url = new URL(req.url());
      if (!url.pathname.endsWith('/system_configs/core/api_url')) return;
      puts.push(req.postDataJSON());
    });

    await page.goto('/admin/cluster/system-config');
    await expect(page.getByTestId('admin.cluster.system_config.page')).toBeVisible();

    await expect(page.getByTestId('admin.cluster.system_config.row.core.api_url')).toBeVisible();

    await page.getByTestId('admin.cluster.system_config.row.core.api_url.edit').click();
    await expect(page.getByTestId('admin.cluster.system_config.edit')).toBeVisible();

    await page.getByTestId('admin.cluster.system_config.edit.value').fill('https://api.changed.test');
    await page.getByTestId('admin.cluster.system_config.edit.save').click();

    expect(puts.length).toBeGreaterThan(0);
    expect(puts[puts.length - 1]).toEqual({ system_config: { value: 'https://api.changed.test' } });
    await expect(page.getByTestId('admin.cluster.system_config.edit')).toBeHidden();
    await page.getByTestId('admin.cluster.system_config.row.core.transaction_key.edit').click();
    const secretEditor = page.getByTestId('admin.cluster.system_config.edit');
    await expect(page.getByTestId('admin.cluster.system_config.edit.secret.field')).not.toHaveValue('super-secret');
    await secretEditor.screenshot({ path: testInfo.outputPath('system-config-secret-hidden.png'), scale: 'css' });
    await page.getByTestId('admin.cluster.system_config.edit.secret.reveal').click();
    await expect(page.getByTestId('admin.cluster.system_config.edit.value')).toHaveValue('super-secret');
    await page.getByTestId('admin.cluster.system_config.edit.value').fill('fixture-secret-draft');
    await expect(page.getByTestId('admin.cluster.system_config.edit.reset')).toBeEnabled();
    await secretEditor.screenshot({ path: testInfo.outputPath('system-config-secret-edit.png'), scale: 'css' });
    await page.getByTestId('admin.cluster.system_config.edit.reset').click();
    await expect(page.getByTestId('admin.cluster.system_config.edit.value')).toHaveValue('super-secret');
    await page.getByTestId('admin.cluster.system_config.edit.secret.hide').click();
    await expect(page.getByTestId('admin.cluster.system_config.edit.value')).toHaveCount(0);
    await secretEditor.getByRole('button', { name: 'Cancel', exact: true }).click();
  });
});
