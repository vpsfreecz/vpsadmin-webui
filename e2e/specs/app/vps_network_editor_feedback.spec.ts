import { expect, test } from '@playwright/test';

import { bootstrapVpsAdminWindow, installHaveApiMock, setUiSettingsLocalStorage } from '../../fixtures';

const baseVps = {
  id: 123,
  hostname: 'vps123.example',
  object_state: 'active',
  is_running: true,
  cpus: 2,
  memory: 2048,
  swap: 0,
  diskspace: 20480,
  user: { id: 7, login: 'member' },
  node: { id: 3, location: { id: 10, label: 'Prague' } },
};

const networkInterface = { id: 501, name: 'eth0', vps: { id: 123 } };

const rejected = (message: string) => ({
  status: 409,
  contentType: 'application/json',
  body: JSON.stringify({ status: false, message, response: null }),
});

test.describe('@pr-smoke @pr-smoke-mobile VPS network editor failure feedback', () => {
  test('keeps rejected network edits and toggles in their dialogs for retry', async ({ page }) => {
    await bootstrapVpsAdminWindow(page, { sessionToken: 'TEST' });

    let networkEnabled = true;
    let ptrAttempts = 0;
    let assignAttempts = 0;
    let ownerAttempts = 0;
    let disableAttempts = 0;
    let enableAttempts = 0;
    const ipAddresses = [{
      id: 1,
      addr: '198.51.100.10',
      network_interface: networkInterface,
      routed: true,
      user: { id: 20, login: 'old-owner' },
      network: {
        role: 'public_access',
        purpose: 'vps',
        ip_version: 4,
        location: { id: 10, label: 'Prague' },
        primary_location: { id: 10, label: 'Prague' },
      },
    }];
    const hostAddresses = [
      {
        id: 50,
        addr: '198.51.100.20',
        assigned: true,
        user_created: true,
        reverse_record_value: 'old.example.test.',
        ip_address: { id: 1, addr: '198.51.100.10', network_interface: networkInterface },
      },
      {
        id: 51,
        addr: '198.51.100.21',
        assigned: false,
        user_created: true,
        ip_address: { id: 1, addr: '198.51.100.10', network_interface: networkInterface },
      },
    ];

    await installHaveApiMock(page, {
      user: { id: 1, login: 'admin', level: 90 },
      handlers: {
        'GET vpses/123': () => ({ vps: { ...baseVps, enable_network: networkEnabled } }),
        'GET network_interfaces': () => ({ network_interfaces: [networkInterface] }),
        'GET network_interface_accountings': () => ({ network_interface_accountings: [] }),
        'GET ip_addresses': () => ({ ip_addresses: ipAddresses }),
        'GET host_ip_addresses': () => ({ host_ip_addresses: hostAddresses }),
        'GET environments': () => ({ environments: [{ id: 3, label: 'env-test' }] }),
        'GET transaction_chains': () => ({ transaction_chains: [] }),
        'PUT host_ip_addresses/50': () => {
          ptrAttempts += 1;
          return ptrAttempts === 1
            ? rejected('PTR record changed on the server.')
            : { host_ip_address: hostAddresses[0], _meta: { action_state_id: 911 } };
        },
        'POST host_ip_addresses/51/assign': () => {
          assignAttempts += 1;
          return assignAttempts === 1
            ? rejected('Interface assignment changed on the server.')
            : { host_ip_address: { ...hostAddresses[1], assigned: true }, _meta: { action_state_id: 912 } };
        },
        'PUT ip_addresses/1': () => {
          ownerAttempts += 1;
          return ownerAttempts === 1
            ? rejected('Address ownership changed on the server.')
            : { ip_address: { ...ipAddresses[0], user: { id: 77, login: 'new-owner' } }, _meta: { action_state_id: 913 } };
        },
        'PUT vpses/123': (ctx) => {
          const body = ctx.request.postDataJSON?.() as { vps?: { enable_network?: boolean } };
          const requested = body.vps?.enable_network;
          if (requested === false) {
            disableAttempts += 1;
            if (disableAttempts === 1) return rejected('Network disable was rejected.');
            networkEnabled = false;
            return { vps: { ...baseVps, enable_network: false }, _meta: { action_state_id: 914 } };
          }
          enableAttempts += 1;
          if (enableAttempts === 1) return rejected('Network enable was rejected.');
          networkEnabled = true;
          return { vps: { ...baseVps, enable_network: true }, _meta: { action_state_id: 915 } };
        },
        'GET action_states/911': () => ({ action_state: { id: 911, finished: true, status: true, current: 1, total: 1 } }),
        'GET action_states/912': () => ({ action_state: { id: 912, finished: true, status: true, current: 1, total: 1 } }),
        'GET action_states/913': () => ({ action_state: { id: 913, finished: true, status: true, current: 1, total: 1 } }),
        'GET action_states/914': () => ({ action_state: { id: 914, finished: true, status: true, current: 1, total: 1 } }),
        'GET action_states/915': () => ({ action_state: { id: 915, finished: true, status: true, current: 1, total: 1 } }),
      },
    });

    await page.goto('/admin/vps/123/network');

    await page.getByTestId('vps.network.host_addresses.row.50.ptr').click();
    await page.getByTestId('vps.network.host_addresses.ptr.value').fill('new.example.test.');
    await page.getByTestId('vps.network.host_addresses.ptr.submit').click();
    await expect(page.getByTestId('vps.network.host_addresses.ptr.error')).toContainText('PTR record changed on the server.');
    await expect(page.getByTestId('vps.network.host_addresses.ptr.value')).toHaveValue('new.example.test.');
    await page.getByTestId('vps.network.host_addresses.ptr.submit').click();
    await expect(page.getByTestId('vps.network.host_addresses.ptr')).toBeHidden();

    await page.getByTestId('vps.network.host_addresses.row.51.assign').click();
    await expect(page.getByTestId('vps.network.host_addresses.assign.interface')).toHaveValue('501');
    await page.getByTestId('vps.network.host_addresses.assign.submit').click();
    await expect(page.getByTestId('vps.network.host_addresses.assign.error')).toContainText('Interface assignment changed on the server.');
    await expect(page.getByTestId('vps.network.host_addresses.assign.interface')).toHaveValue('501');
    await page.getByTestId('vps.network.host_addresses.assign.submit').click();
    await expect(page.getByTestId('vps.network.host_addresses.assign')).toBeHidden();

    await page.getByTestId('vps.network.ip_addresses.item.1.owner').click();
    await page.getByTestId('vps.network.ip_addresses.owner.user').fill('77');
    await page.getByTestId('vps.network.ip_addresses.owner.environment').selectOption('3');
    await page.getByTestId('vps.network.ip_addresses.owner.submit').click();
    await expect(page.getByTestId('vps.network.ip_addresses.owner.error')).toContainText('Address ownership changed on the server.');
    await expect(page.getByTestId('vps.network.ip_addresses.owner.user')).toHaveValue('77');
    await expect(page.getByTestId('vps.network.ip_addresses.owner.environment')).toHaveValue('3');
    await page.getByTestId('vps.network.ip_addresses.owner.submit').click();
    await expect(page.getByTestId('vps.network.ip_addresses.owner')).toBeHidden();

    await page.getByTestId('vps.network.admin_settings.toggle').click();
    await page.getByTestId('vps.network.disable').click();
    await page.getByTestId('vps.network.disable.reason').fill('maintenance window');
    await page.getByTestId('vps.network.disable_confirm.confirm').click();
    await expect(page.getByTestId('vps.network.disable_confirm.error')).toContainText('Network disable was rejected.');
    await expect(page.getByTestId('vps.network.disable.reason')).toHaveValue('maintenance window');
    await page.getByTestId('vps.network.disable_confirm.confirm').click();
    await expect(page.getByTestId('vps.network.disable_confirm')).toBeHidden();

    await expect(page.getByTestId('vps.network.enable')).toBeVisible();
    await page.getByTestId('vps.network.enable').click();
    await page.getByTestId('vps.network.enable_confirm.confirm').click();
    await expect(page.getByTestId('vps.network.enable_confirm.error')).toContainText('Network enable was rejected.');
    await page.getByTestId('vps.network.enable_confirm.confirm').click();
    await expect(page.getByTestId('vps.network.enable_confirm')).toBeHidden();

    expect({ ptrAttempts, assignAttempts, ownerAttempts, disableAttempts, enableAttempts }).toEqual({
      ptrAttempts: 2,
      assignAttempts: 2,
      ownerAttempts: 2,
      disableAttempts: 2,
      enableAttempts: 2,
    });
  });
});

test.describe('@pr-smoke @pr-smoke-mobile VPS address workflow', () => {
  test('shows route steps, inline interfaces and editable PTRs at narrow widths', async ({ page, isMobile }, testInfo) => {
    await page.setViewportSize({ width: isMobile ? 320 : 1440, height: 900 });
    await bootstrapVpsAdminWindow(page, { sessionToken: 'TEST' });
    await setUiSettingsLocalStorage(page, { language: 'cs', theme: 'dark' });
    const secondInterface = { id: 502, name: 'vps-private-very-long-network-interface-name', vps: { id: 123 } };
    const ipRoute = { id: 1, addr: '192.0.2.0', prefix: 28, network_interface: networkInterface, routed: true };
    const secondRoute = { id: 2, addr: '2001:db8::', prefix: 64, network_interface: secondInterface, routed: true };
    await installHaveApiMock(page, {
      user: { id: 7, login: 'member', level: 1 },
      handlers: {
        'GET vpses/123': () => ({ vps: { ...baseVps, enable_network: true } }),
        'GET network_interfaces': () => ({ network_interfaces: [networkInterface, secondInterface] }),
        'GET network_interface_accountings': () => ({ network_interface_accountings: [] }),
        'GET ip_addresses': () => ({ ip_addresses: [ipRoute, secondRoute] }),
        'GET host_ip_addresses': () => ({ host_ip_addresses: [
          { id: 51, addr: '192.0.2.1', assigned: true, ip_address: ipRoute, reverse_record_value: 'host.example.test.' },
          { id: 52, addr: '2001:db8::2', assigned: false, ip_address: secondRoute, reverse_record_value: null },
        ] }),
      },
    });
    await page.goto('/app/vps/123/network');

    const section = page.getByTestId('vps.network.addresses');
    const routes = section.getByTestId('vps.network.ip_addresses');
    const hosts = section.getByTestId('vps.network.host_addresses');
    const route = routes.getByTestId('vps.network.ip_addresses.item.2');
    const existing = hosts.getByTestId('vps.network.host_addresses.row.51');
    const missing = hosts.getByTestId('vps.network.host_addresses.row.52');
    await expect(routes.getByRole('heading', { name: 'Routy k VPS' })).toBeVisible();
    await expect(hosts.getByRole('heading', { name: 'Adresy rozhraní a PTR' })).toBeVisible();
    await expect(routes.getByText('1', { exact: true })).toBeVisible();
    await expect(hosts.getByText('2', { exact: true })).toBeVisible();
    await expect(routes.getByTestId('vps.network.ip_addresses.item.1')).toContainText('Rozhraní: eth0');
    const inline = route.getByText('2001:db8::/64', { exact: true }).locator('..');
    await expect(inline).toContainText(secondInterface.name);
    await expect(existing.getByText('192.0.2.1', { exact: true }).locator('..')).toContainText('PTR host.example.test.');
    await expect(missing.getByText('2001:db8::2', { exact: true }).locator('..')).not.toContainText('PTR');
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      await page.evaluate(() => document.documentElement.clientWidth + 1),
    );

    await section.screenshot({ path: testInfo.outputPath('address-steps.png'), scale: 'css' });
    await route.screenshot({ path: testInfo.outputPath('route-interface.png'), scale: 'css' });
    await hosts.screenshot({ path: testInfo.outputPath('host-ptr.png'), scale: 'css' });

    const ptrEditor = page.getByTestId('vps.network.host_addresses.ptr.value');
    await existing.getByRole('button', { name: 'Upravit PTR' }).click();
    await expect(ptrEditor).toHaveValue('host.example.test.');
    await page.getByTestId('vps.network.host_addresses.ptr.cancel').click();
    await missing.getByRole('button', { name: 'Přidat PTR' }).click();
    await expect(ptrEditor).toHaveValue('');
  });
});
