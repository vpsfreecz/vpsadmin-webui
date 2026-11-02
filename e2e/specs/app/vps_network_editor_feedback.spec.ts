import { expect, test } from '@playwright/test';

import { bootstrapVpsAdminWindow, installHaveApiMock } from '../../fixtures';

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
    const hostAssignmentRequests: string[] = [];
    const ipAddresses = [{
      id: 1,
      addr: '198.51.100.10',
      network_interface: networkInterface,
      routed: true,
      user: { id: 20, login: 'old-owner' },
      charged_environment: { id: 3 },
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
        'GET host_ip_addresses/51': () => {
          hostAssignmentRequests.push('read');
          return { host_ip_address: hostAddresses[1] };
        },
        'GET environments': () => ({ environments: [{ id: 3, label: 'env-test' }] }),
        'GET transaction_chains': () => ({ transaction_chains: [] }),
        'PUT host_ip_addresses/50': (ctx) => {
          expect(ctx.request.postDataJSON()).toEqual({
            host_ip_address: { reverse_record_value: 'new.example.test.' },
          });
          ptrAttempts += 1;
          return ptrAttempts === 1
            ? rejected('PTR record changed on the server.')
            : { host_ip_address: hostAddresses[0], _meta: { action_state_id: 911 } };
        },
        'POST host_ip_addresses/51/assign': (ctx) => {
          expect(ctx.request.postDataJSON()).toEqual({ host_ip_address: {} });
          hostAssignmentRequests.push('assign');
          assignAttempts += 1;
          return assignAttempts === 1
            ? rejected('Interface assignment changed on the server.')
            : { host_ip_address: { ...hostAddresses[1], assigned: true }, _meta: { action_state_id: 912 } };
        },
        'PUT ip_addresses/1': (ctx) => {
          expect(ctx.request.postDataJSON()).toEqual({ ip_address: { user: 77, environment: 3 } });
          ownerAttempts += 1;
          return ownerAttempts === 1
            ? rejected('Address ownership changed on the server.')
            : { ip_address: { ...ipAddresses[0], user: { id: 77, login: 'new-owner' } }, _meta: { action_state_id: 913 } };
        },
        'PUT vpses/123': (ctx) => {
          const body = ctx.request.postDataJSON();
          if (!body || typeof body !== 'object' || !('vps' in body)
            || !body.vps || typeof body.vps !== 'object' || !('enable_network' in body.vps)
            || typeof body.vps.enable_network !== 'boolean') {
            throw new Error('Expected a VPS network toggle request');
          }
          const requested = body.vps.enable_network;
          if (requested === false) {
            expect(body).toEqual({ vps: { enable_network: false, change_reason: 'maintenance window' } });
            disableAttempts += 1;
            if (disableAttempts === 1) return rejected('Network disable was rejected.');
            networkEnabled = false;
            return { vps: { ...baseVps, enable_network: false }, _meta: { action_state_id: 914 } };
          }
          expect(body).toEqual({ vps: { enable_network: true } });
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
    const assignDialog = page.getByTestId('vps.network.host_addresses.assign');
    await expect(assignDialog).toContainText('198.51.100.21');
    await expect(assignDialog.getByTestId('vps.network.host_addresses.assign.target')).toContainText('vps123.example');
    await expect(assignDialog.getByTestId('vps.network.host_addresses.assign.target')).toContainText('#123');
    await expect(assignDialog.getByTestId('vps.network.host_addresses.assign.interface')).toContainText('eth0');
    await expect(assignDialog.getByRole('combobox')).toHaveCount(0);
    await page.getByTestId('vps.network.host_addresses.assign.submit').click();
    await expect(page.getByTestId('vps.network.host_addresses.assign.error')).toContainText('Interface assignment changed on the server.');
    await expect(assignDialog).toContainText('198.51.100.21');
    await expect(assignDialog.getByTestId('vps.network.host_addresses.assign.interface')).toContainText('eth0');
    await expect(assignDialog.getByRole('combobox')).toHaveCount(0);
    expect(hostAssignmentRequests).toEqual(['read', 'assign']);
    await page.getByTestId('vps.network.host_addresses.assign.submit').click();
    await expect(assignDialog).toBeHidden();
    expect(hostAssignmentRequests).toEqual(['read', 'assign', 'read', 'assign']);

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
