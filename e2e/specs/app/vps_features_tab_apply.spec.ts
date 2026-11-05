import { expect, test } from '@playwright/test';

import { bootstrapVpsAdminWindow, installHaveApiMock } from '../../fixtures';

const vps = {
  id: 123,
  hostname: 'vps123.example',
  object_state: 'active',
  is_running: true,
  enable_network: true,
  cpus: 2,
  memory: 2048,
  swap: 0,
  diskspace: 20480,
  used_memory: 768,
  used_swap: 0,
  used_diskspace: 5120,
  uptime: 12345,
  loadavg1: 0.12,
  node: { id: 1, domain_name: 'node1.example' },
  os_template: { label: 'debian' },
  dns_resolver: null,
};

test.describe('VPS features tab', () => {
  test('applies feature changes via update_all', async ({ page }) => {
    await bootstrapVpsAdminWindow(page, { sessionToken: 'TEST' });

    const features = [
      { id: 1, name: 'fuse', label: 'FUSE', enabled: false },
      { id: 2, name: 'tun', label: 'TUN', enabled: true },
    ];

    await installHaveApiMock(page, {
      user: { id: 1, login: 'user', level: 1 },
      handlers: {
        'GET vpses/123': () => ({ vps }),
        'GET ip_addresses': () => ({ ip_addresses: [] }),
        'GET transaction_chains': () => ({ transaction_chains: [] }),
        'GET vpses/123/features': () => ({ features }),
        'POST vpses/123/features/update_all': () => ({ feature: {}, _meta: { action_state_id: 42 } }),
      },
    });

    await page.goto('/app/vps/123/features');

    await expect(page.getByTestId('vps.features.page')).toBeVisible();
    await expect(page.getByTestId('vps.features.card')).toBeVisible();

    // Flip FUSE from false -> true to create a dirty draft.
    await page.getByTestId('vps.features.item.1').click();

    await expect(page.getByTestId('vps.features.save')).toBeEnabled();
    await page.getByTestId('vps.features.save').click();

    await expect(page.getByTestId('vps.features.confirm')).toBeVisible();
    await expect(page.getByTestId('vps.features.confirm.target')).toContainText('vps123.example');
    await expect(page.getByTestId('vps.features.confirm.target')).toContainText('#123');

    const reqPromise = page.waitForRequest(
      (r) => r.method() === 'POST' && r.url().includes('/api/v7.0/vpses/123/features/update_all')
    );

    await page.getByTestId('vps.features.confirm.confirm').click();

    const req = await reqPromise;
    expect(req.postDataJSON()).toEqual({
      feature: {
        fuse: true,
        tun: true,
      },
    });

    await expect(page.getByTestId('vps.features.confirm')).toBeHidden();
  });

  test('keeps a rejected update in the confirmation and supports retry', async ({ page }, testInfo) => {
    await bootstrapVpsAdminWindow(page, { sessionToken: 'TEST' });

    const features = [
      { id: 1, name: 'fuse', label: 'FUSE', enabled: false },
      { id: 2, name: 'tun', label: 'TUN', enabled: true },
    ];
    let updateAttempts = 0;

    await installHaveApiMock(page, {
      user: { id: 1, login: 'admin', level: 90 },
      handlers: {
        'GET vpses/123': () => ({ vps }),
        'GET ip_addresses': () => ({ ip_addresses: [] }),
        'GET transaction_chains': () => ({ transaction_chains: [] }),
        'GET vpses/123/features': () => ({ features }),
        'POST vpses/123/features/update_all': () => {
          updateAttempts += 1;
          if (updateAttempts === 1) {
            return {
              status: 409,
              contentType: 'application/json',
              body: JSON.stringify({
                status: false,
                message: 'Feature configuration changed on the server. Review and retry.',
                response: null,
              }),
            };
          }

          return { feature: {}, _meta: { action_state_id: 43 } };
        },
      },
    });

    await page.goto('/admin/vps/123/features');
    await page.getByTestId('vps.features.item.1').click();
    await page.getByTestId('vps.features.save').click();

    const dialog = page.getByTestId('vps.features.confirm');
    await expect(dialog).toContainText('vps123.example');

    await page.getByTestId('vps.features.confirm.confirm').click();
    await expect(page.getByTestId('vps.features.confirm.error')).toContainText(
      'Feature configuration changed on the server. Review and retry.'
    );
    await expect(dialog).toContainText('vps123.example');
    await expect(page.getByTestId('vps.features.confirm.confirm')).toBeEnabled();
    await dialog.screenshot({ path: testInfo.outputPath('features-rejected-retry.png') });

    await page.getByTestId('vps.features.confirm.confirm').click();
    await expect(dialog).toBeHidden();
    expect(updateAttempts).toBe(2);
  });

  for (const view of [
    { name: 'editable', level: 90 },
    { name: 'read-only', level: 21 },
  ]) {
    test(`captures exact and distinct technical labels in ${view.name} features`, async ({ page }, testInfo) => {
      await bootstrapVpsAdminWindow(page, { sessionToken: 'TEST' });
      const features = [
        { id: 1, name: 'fuse', label: 'fuse', enabled: false },
        { id: 2, name: 'tun', label: 'TUN', enabled: true },
        { id: 3, name: 'impermanence', label: 'impermanence', enabled: null },
      ];
      let writes = 0;
      await installHaveApiMock(page, {
        user: { id: 1, login: view.name, level: view.level },
        handlers: {
          'GET vpses/123': () => ({ vps }),
          'GET ip_addresses': () => ({ ip_addresses: [] }),
          'GET transaction_chains': () => ({ transaction_chains: [] }),
          'GET vpses/123/features': () => ({ features }),
          'POST vpses/123/features/update_all': () => {
            writes += 1;
            return { status: 403, body: JSON.stringify({ status: false, message: 'Unexpected feature update' }) };
          },
        },
      });
      await page.goto('/admin/vps/123/features');
      const card = page.getByTestId('vps.features.card');
      const firstItem = page.getByTestId('vps.features.item.1');
      const secondItem = page.getByTestId('vps.features.item.2');
      const firstLabel = view.level === 90 ? firstItem.locator('..') : firstItem;
      const secondLabel = view.level === 90 ? secondItem.locator('..') : secondItem;
      await expect(firstLabel.getByText('fuse', { exact: true })).toHaveCount(1);
      await expect(secondLabel.getByText('TUN', { exact: true })).toHaveCount(1);
      await expect(secondLabel.getByText('tun', { exact: true })).toHaveCount(1);
      await expect(page.getByTestId('vps.features.item.3')).toContainText('—');
      await expect(page.getByTestId('vps.features.item.3').getByText('impermanence', { exact: true })).toHaveCount(1);
      if (view.level === 21) {
        await expect(page.getByTestId('vps.features.read_only')).toBeVisible();
        await expect(card.locator('input[type="checkbox"]')).toHaveCount(0);
        await expect(page.getByTestId('vps.features.save')).toHaveCount(0);
      } else {
        await expect(card.locator('input[type="checkbox"]')).toHaveCount(2);
        await expect(page.getByTestId('vps.features.save')).toBeDisabled();
      }
      await card.screenshot({ path: testInfo.outputPath(`features-exact-${view.name}.png`) });
      expect(writes).toBe(0);
    });
  }
});
