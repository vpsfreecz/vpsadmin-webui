import { expect, test } from '@playwright/test';

import { bootstrapVpsAdminWindow, installHaveApiMock, setUiSettingsLocalStorage } from '../../fixtures';

for (const language of ['en', 'cs'] as const) {
  test(`@pr-smoke @pr-smoke-mobile network availability retains service context and rejected drafts (${language})`, async ({ page }, testInfo) => {
    await bootstrapVpsAdminWindow(page, { sessionToken: 'TEST' });
    await setUiSettingsLocalStorage(page, { language });
    let enabled = true;
    let rejectNext = true;
    const writes: boolean[] = [];
    const capabilityMethods: string[] = [];
    const network = () => ({
      id: 101, label: 'Retained service', address: '192.0.2.0', prefix: 24,
      ip_version: 4, role: 'public_access', purpose: 'vps', managed: true,
      enabled, split_access: 'no_access', split_prefix: 32, assigned: 3, owned: 5,
    });
    await installHaveApiMock(page, {
      user: { id: 1, login: 'admin', level: 100 },
      handlers: {
        'GET locations': () => ({ locations: [] }),
        'GET networks': () => ({ networks: [network()] }),
        'OPTIONS networks/101': (ctx) => {
          expect(ctx.method).toBe('OPTIONS');
          expect(ctx.searchParams.get('method')).toBe('PUT');
          capabilityMethods.push(ctx.searchParams.get('method') ?? '');
          return {
            method: 'PUT', scope: 'network#update',
            input: { namespace: 'network', layout: 'object', parameters: { enabled: { type: 'Boolean' } } },
            output: { namespace: 'network', layout: 'object', parameters: {} },
          };
        },
        'PUT networks/101': (ctx) => {
          const input = ctx.reqJson as { network: { enabled: boolean } };
          expect(typeof input.network.enabled).toBe('boolean');
          writes.push(input.network.enabled);
          if (rejectNext) {
            rejectNext = false;
            return { status: false, message: 'Allocation policy rejected', response: null };
          }
          enabled = input.network.enabled;
          return { network: network() };
        },
      },
    });
    await page.goto('/admin/cluster/networks');
    await page.getByTestId('admin.cluster.networks.row.101.edit').click();
    const editor = page.getByTestId('admin.cluster.networks.editor');
    const toggle = page.getByTestId('admin.cluster.networks.editor.enabled').getByRole('checkbox');
    await expect(editor).toContainText('192.0.2.0/24 (#101)');
    await expect(editor).toContainText(language === 'en' ? 'Assigned: 3' : 'Přiřazeno: 3');
    await expect(editor).toContainText(language === 'en' ? 'Owned: 5' : 'Vlastněno: 5');
    await expect(toggle).toBeVisible();
    await expect(toggle).toBeChecked();
    expect(capabilityMethods).toEqual(['PUT']);
    await expect(editor).toContainText(language === 'en' ? 'Existing service continues' : 'Stávající provoz pokračuje');
    await toggle.uncheck();
    // Captures show the implemented UI with synthetic API fixtures.
    await page.screenshot({ path: testInfo.outputPath(`network-availability-${language}.png`), fullPage: true });
    await page.getByTestId('admin.cluster.networks.editor.save').click();
    await expect(editor).toContainText('Allocation policy rejected');
    await expect(toggle).not.toBeChecked();
    await page.getByTestId('admin.cluster.networks.editor.save').click();
    await expect(editor).toBeHidden();
    await expect(page.getByTestId('admin.cluster.networks.row.101.enabled')).toHaveText(language === 'en' ? 'Disabled' : 'Zakázáno');
    await page.getByTestId('admin.cluster.networks.row.101.edit').click();
    await toggle.check();
    await page.getByTestId('admin.cluster.networks.editor.save').click();
    await expect(editor).toBeHidden();
    await expect(page.getByTestId('admin.cluster.networks.row.101.enabled')).toHaveText(language === 'en' ? 'Enabled' : 'Povoleno');
    expect(writes).toEqual([false, false, true]);
  });
}

test('@pr-smoke @pr-smoke-mobile older APIs keep unknown state and omit unsupported availability fields', async ({ page }) => {
  await bootstrapVpsAdminWindow(page, { sessionToken: 'TEST' });
  await setUiSettingsLocalStorage(page, { language: 'en' });
  let saved = false;
  const capabilityMethods: string[] = [];
  const network = { id: 101, address: '192.0.2.0', prefix: 24, ip_version: 4, role: 'public_access',
    purpose: 'vps', managed: true, split_access: 'no_access', split_prefix: 32 };
  await installHaveApiMock(page, {
    user: { id: 1, login: 'admin', level: 100 },
    handlers: {
      'GET locations': () => ({ locations: [] }),
      'GET networks': () => ({ networks: [network] }),
      'OPTIONS networks/101': (ctx) => {
        expect(ctx.method).toBe('OPTIONS');
        expect(ctx.searchParams.get('method')).toBe('PUT');
        capabilityMethods.push(ctx.searchParams.get('method') ?? '');
        return {
          method: 'PUT', scope: 'network#update',
          input: { namespace: 'network', layout: 'object', parameters: { managed: { type: 'Boolean' } } },
          output: { namespace: 'network', layout: 'object', parameters: {} },
        };
      },
      'PUT networks/101': (ctx) => {
        expect((ctx.reqJson as { network: object }).network).not.toHaveProperty('enabled');
        saved = true;
        return { network };
      },
    },
  });
  await page.goto('/admin/cluster/networks');
  await expect(page.getByTestId('admin.cluster.networks.row.101.enabled')).not.toHaveText('Disabled');
  await page.getByTestId('admin.cluster.networks.row.101.edit').click();
  await expect(page.getByTestId('admin.cluster.networks.editor.label')).toBeVisible();
  await expect.poll(() => capabilityMethods).toEqual(['PUT']);
  await expect(page.getByTestId('admin.cluster.networks.editor.enabled')).toHaveCount(0);
  await page.getByTestId('admin.cluster.networks.editor.save').click();
  await expect(page.getByTestId('admin.cluster.networks.editor')).toBeHidden();
  expect(saved).toBe(true);
});

test('@pr-smoke @pr-smoke-mobile disabled detached owned addresses stay visible without assignment', async ({ page }) => {
  await bootstrapVpsAdminWindow(page, { sessionToken: 'TEST' });
  await setUiSettingsLocalStorage(page, { language: 'en' });
  const ip = { id: 102, addr: '192.0.2.10', prefix: 32, user: { id: 7 },
    network: { id: 11, enabled: false, ip_version: 4, role: 'public_access', purpose: 'vps' },
    network_interface: null };
  await installHaveApiMock(page, {
    user: { id: 7, login: 'member', level: 1 },
    handlers: {
      'GET vpses': () => ({ vpses: [] }),
      'GET ip_addresses': () => ({ ip_addresses: [ip] }),
      'GET ip_address_assignments': () => ({ ip_address_assignments: [] }),
      'GET user_cluster_resources': () => ({ user_cluster_resources: [] }),
    },
  });
  await page.goto('/app/networking');
  const visible = page.locator('[data-testid="network.user.ip.row.102"]:visible, [data-testid="network.user.ip.card.102"]:visible');
  await expect(visible).toContainText('192.0.2.10');
  await expect(visible).toContainText('Disabled');
  await expect(visible.getByTestId('network.user.ip.102.assign')).toBeDisabled();
});
