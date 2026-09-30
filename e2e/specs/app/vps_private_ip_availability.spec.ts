import { expect, test } from '@playwright/test';
import { bootstrapVpsAdminWindow, failEnvelope, installHaveApiMock } from '../../fixtures';

const vps = {
  id: 123, hostname: 'staging.example', user: { id: 7 }, object_state: 'active',
  is_running: false, node: { id: 11, location: { id: 11, environment: { id: 2 } } },
};
const ips = [
  { id: 81, addr: '10.20.0.1', prefix: 32, network: {
    id: 31, ip_version: 4, role: 'private_access', purpose: 'any',
    primary_location: { id: 11, environment: { id: 2 } },
  } },
  { id: 82, addr: '10.21.0.1', prefix: 32, network: {
    id: 32, ip_version: 4, role: 'private_access', purpose: 'vps',
    primary_location: { id: 10, environment: { id: 1 } },
  } },
];

for (const role of ['admin', 'member'] as const) {
  test(`@pr-smoke @pr-smoke-mobile ${role} assigns private IPv4 from a shared staging network`, async ({ page }) => {
    await bootstrapVpsAdminWindow(page);
    let compatibleRequest = false;
    await installHaveApiMock(page, {
      user: { id: 7, login: role, level: role === 'admin' ? 90 : 2 },
      handlers: {
        'GET vpses/123': () => ({ vps }),
        'GET network_interfaces': () => ({ network_interfaces: [{ id: 8, name: 'eth0' }] }),
        'GET host_ip_addresses': () => ({ host_ip_addresses: [] }),
        'GET network_interface_accountings': () => ({ network_interface_accountings: [] }),
        'GET transaction_chains': () => ({ transaction_chains: [] }),
        'GET ip_addresses': ({ searchParams }) => {
          if (searchParams.get('ip_address[assigned_to_interface]') !== 'false') return { ip_addresses: [] };
          compatibleRequest = searchParams.get('ip_address[location]') === '11'
            && searchParams.get('ip_address[role]') === 'private_access'
            && searchParams.get('ip_address[usable_for]') === 'vps'
            && !searchParams.has('ip_address[purpose]');
          return { ip_addresses: compatibleRequest ? ips : [] };
        },
        'POST ip_addresses/82/assign': () => ({
          ip_address: { ...ips[1], network_interface: { id: 8 } },
          _meta: { action_state_id: 9082 },
        }),
        'GET action_states/9082': () => ({ action_state: { id: 9082, finished: true, status: true } }),
      },
    });
    await page.goto('/app/vps/123/network');
    await page.getByTestId('vps.network.ip_addresses.add').click();
    await page.getByTestId('network.user.assign.kind').selectOption('ipv4_private');
    await page.getByTestId('network.user.assign.continue').click();
    const addresses = page.getByTestId('network.user.assign.address');
    await expect(addresses).toContainText('10.20.0.1/32');
    await expect(addresses).toContainText('10.21.0.1/32');
    expect(compatibleRequest).toBe(true);
    await addresses.selectOption('82');
    const request = page.waitForRequest(req => req.method() === 'POST' && req.url().includes('/ip_addresses/82/assign'));
    await page.getByTestId('network.user.assign.submit').click();
    expect((await request).postDataJSON()).toEqual({ ip_address: { network_interface: 8 } });
    await expect(page.getByTestId('vps.network.ip_addresses.add_modal')).not.toBeVisible();
  });
}

test('@pr-smoke IP availability errors remain visible and prevent submission', async ({ page }) => {
  await bootstrapVpsAdminWindow(page);
  await installHaveApiMock(page, {
    user: { id: 7, login: 'member', level: 2 },
    handlers: {
      'GET vpses/123': () => ({ vps }),
      'GET network_interfaces': () => ({ network_interfaces: [{ id: 8, name: 'eth0' }] }),
      'GET ip_addresses': ({ searchParams }) => searchParams.get('ip_address[assigned_to_interface]') === 'false'
        ? failEnvelope('IP availability service unavailable') : { ip_addresses: [] },
      'GET host_ip_addresses': () => ({ host_ip_addresses: [] }),
      'GET transaction_chains': () => ({ transaction_chains: [] }),
      'GET network_interface_accountings': () => ({ network_interface_accountings: [] }),
    },
  });
  await page.goto('/app/vps/123/network');
  await page.getByTestId('vps.network.ip_addresses.add').click();
  await page.getByTestId('network.user.assign.kind').selectOption('ipv4_private');
  await page.getByTestId('network.user.assign.continue').click();
  await expect(page.getByTestId('network.user.assign.error')).toContainText('IP availability service unavailable');
  await expect(page.getByTestId('network.user.assign.submit')).toBeDisabled();
});
