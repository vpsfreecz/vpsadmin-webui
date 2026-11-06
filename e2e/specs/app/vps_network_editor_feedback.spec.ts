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

test.describe('@pr-smoke @pr-smoke-mobile VPS network state', () => {
  for (const enabled of [true, false]) {
    test(`shows the VPS network and interface states separately (${enabled})`, async ({ page, isMobile }, testInfo) => {
      await bootstrapVpsAdminWindow(page, { sessionToken: 'TEST' });
      await setUiSettingsLocalStorage(page, { language: 'en', theme: 'dark' });
      await installHaveApiMock(page, {
        user: { id: 7, login: 'member', level: 1 },
        handlers: {
          'GET vpses/123': () => ({ vps: { ...baseVps, enable_network: enabled } }),
          'GET network_interfaces': () => ({ network_interfaces: [
            { ...networkInterface, enable: true },
            { id: 502, name: 'eth1', enable: false, vps: { id: 123 } },
          ] }),
          'GET network_interface_accountings': () => ({ network_interface_accountings: [] }),
          'GET ip_addresses': () => ({ ip_addresses: [] }),
          'GET host_ip_addresses': () => ({ host_ip_addresses: [] }),
        },
      });
      await page.goto('/app/vps/123/network');
      const summary = page.getByTestId('vps.network.summary');
      await expect(summary.getByText(enabled ? 'Network enabled' : 'Network disabled', { exact: true })).toBeVisible();
      if (enabled) {
        await expect(summary.getByTestId('vps.network.overview.state')).toHaveCount(0);
      } else {
        await expect(summary.getByTestId('vps.network.overview.state')).toContainText('until an admin enables it again');
      }
      const row = isMobile ? 'card' : 'row';
      await expect(page.getByTestId(`vps.network.interfaces.${row}.502`).getByText('Disabled', { exact: true })).toBeVisible();
      await expect(page.getByTestId(`vps.network.interfaces.${row}.501`).getByText('Disabled', { exact: true })).toHaveCount(0);
      if (enabled) {
        await summary.screenshot({ path: testInfo.outputPath('network-status.png'), scale: 'css' });
      }
    });
  }
});

test.describe('@pr-smoke @pr-smoke-mobile VPS monthly traffic', () => {
  for (const language of ['en', 'cs'] as const) {
    test(`keeps Refresh anchored and distinguishes traffic measurements (${language})`, async ({ page, isMobile }, testInfo) => {
      await page.setViewportSize({ width: isMobile ? 320 : 1440, height: 900 });
      await page.clock.setFixedTime(new Date('2026-11-06T12:00:00Z'));
      await bootstrapVpsAdminWindow(page, { sessionToken: 'TEST' });
      await setUiSettingsLocalStorage(page, { language, theme: 'dark' });

      let enabled = true;
      let rows: { id: number; bytes_in?: number; bytes_out?: number }[] = [
        { id: 1, bytes_in: 0, bytes_out: 2048 },
      ];
      let error = false;
      await installHaveApiMock(page, {
        user: { id: 7, login: 'member', level: 1 },
        handlers: {
          'GET vpses/123': () => ({ vps: { ...baseVps, enable_network: enabled } }),
          'GET network_interfaces': () => ({ network_interfaces: [networkInterface] }),
          'GET network_interface_accountings': () => error
            ? { status: 503, contentType: 'application/json', body: '{"status":false}' }
            : { network_interface_accountings: rows },
          'GET ip_addresses': () => ({ ip_addresses: [] }),
          'GET host_ip_addresses': () => ({ host_ip_addresses: [] }),
        },
      });

      await page.goto('/app/vps/123/network');
      const summary = page.getByTestId('vps.network.summary');
      const refresh = summary.getByTestId('vps.network.accounting.refresh');
      const monthly = summary.getByTestId('vps.network.accounting.monthly');
      const inbound = summary.getByTestId('vps.network.accounting.in');
      const outbound = summary.getByTestId('vps.network.accounting.out');
      const missing = language === 'cs' ? 'Bez měření' : 'No measurement';
      await expect(monthly.getByRole('heading')).toHaveText(language === 'cs' ? 'Provoz tento měsíc' : 'Traffic this month');
      await expect(monthly).toContainText('2026-11');
      await expect(inbound).toContainText('0 B');
      await expect(outbound).toContainText('2.0 KiB');
      await expect(inbound).toContainText(language === 'cs' ? 'Příchozí' : 'Ingress');
      await expect(outbound).toContainText(language === 'cs' ? 'Odchozí' : 'Egress');

      if (language === 'cs') {
        await summary.locator(':scope > div').first().screenshot({ path: testInfo.outputPath('network-header.png'), scale: 'css' });
        await summary.locator(':scope > div').last().screenshot({ path: testInfo.outputPath('monthly-traffic.png'), scale: 'css' });
      }
      const enabledX = (await refresh.boundingBox())!.x;
      const rightGap = (await summary.boundingBox())!.x + (await summary.boundingBox())!.width - enabledX - (await refresh.boundingBox())!.width;
      expect(rightGap).toBeLessThan(22);
      expect(rightGap).toBeGreaterThan(8);
      enabled = false;
      await page.reload();
      await expect(summary.getByText(language === 'cs' ? 'Síť zakázána' : 'Network disabled', { exact: true })).toBeVisible();
      expect((await refresh.boundingBox())!.x).toBeCloseTo(enabledX, 0);
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
        await page.evaluate(() => document.documentElement.clientWidth + 1),
      );

      rows = [{ id: 1, bytes_out: 4096 }];
      await refresh.click();
      await expect(inbound).toContainText(missing);
      await expect(outbound).toContainText('4.0 KiB');
      rows = [];
      await refresh.click();
      await expect(outbound).toContainText(missing);

      error = true;
      await refresh.click();
      await expect(monthly.getByRole('status')).toHaveText(
        language === 'cs' ? 'Nepodařilo se načíst účtování.' : 'Failed to load accounting.',
      );
      await expect(inbound).toHaveCount(0);
    });
  }
});
