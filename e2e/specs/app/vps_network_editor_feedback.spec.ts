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
    const hostAssignmentRequests: string[] = [];
    const ipAddresses = [
      {
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
      },
    ];
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
            : {
                ip_address: { ...ipAddresses[0], user: { id: 77, login: 'new-owner' } },
                _meta: { action_state_id: 913 },
              };
        },
        'PUT vpses/123': (ctx) => {
          const body = ctx.request.postDataJSON();
          if (
            !body ||
            typeof body !== 'object' ||
            !('vps' in body) ||
            !body.vps ||
            typeof body.vps !== 'object' ||
            !('enable_network' in body.vps) ||
            typeof body.vps.enable_network !== 'boolean'
          ) {
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
        'GET action_states/911': () => ({
          action_state: { id: 911, finished: true, status: true, current: 1, total: 1 },
        }),
        'GET action_states/912': () => ({
          action_state: { id: 912, finished: true, status: true, current: 1, total: 1 },
        }),
        'GET action_states/913': () => ({
          action_state: { id: 913, finished: true, status: true, current: 1, total: 1 },
        }),
        'GET action_states/914': () => ({
          action_state: { id: 914, finished: true, status: true, current: 1, total: 1 },
        }),
        'GET action_states/915': () => ({
          action_state: { id: 915, finished: true, status: true, current: 1, total: 1 },
        }),
      },
    });

    await page.goto('/admin/vps/123/network');

    await page.getByTestId('vps.network.host_addresses.row.50.ptr').click();
    await page.getByTestId('vps.network.host_addresses.ptr.value').fill('new.example.test.');
    await page.getByTestId('vps.network.host_addresses.ptr.submit').click();
    await expect(page.getByTestId('vps.network.host_addresses.ptr.error')).toContainText(
      'PTR record changed on the server.'
    );
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
    await expect(page.getByTestId('vps.network.host_addresses.assign.error')).toContainText(
      'Interface assignment changed on the server.'
    );
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
    await expect(page.getByTestId('vps.network.ip_addresses.owner.error')).toContainText(
      'Address ownership changed on the server.'
    );
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
          'GET network_interfaces': () => ({
            network_interfaces: [
              { ...networkInterface, enable: true },
              { id: 502, name: 'eth1', enable: false, vps: { id: 123 } },
            ],
          }),
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
        await expect(summary.getByTestId('vps.network.overview.state')).toContainText(
          'until an admin enables it again'
        );
      }
      const row = isMobile ? 'card' : 'row';
      await expect(
        page.getByTestId(`vps.network.interfaces.${row}.502`).getByText('Disabled', { exact: true })
      ).toBeVisible();
      await expect(
        page.getByTestId(`vps.network.interfaces.${row}.501`).getByText('Disabled', { exact: true })
      ).toHaveCount(0);
      if (enabled) {
        await summary.screenshot({ path: testInfo.outputPath('network-status.png'), scale: 'css' });
      }
    });
  }
});

test.describe('@pr-smoke @pr-smoke-mobile VPS monthly traffic', () => {
  for (const language of ['en', 'cs'] as const) {
    test(`keeps Refresh anchored and distinguishes traffic measurements (${language})`, async ({
      page,
      isMobile,
    }, testInfo) => {
      await page.setViewportSize({ width: isMobile ? 320 : 1440, height: 900 });
      await page.clock.setFixedTime(new Date('2026-11-06T12:00:00Z'));
      await bootstrapVpsAdminWindow(page, { sessionToken: 'TEST' });
      await setUiSettingsLocalStorage(page, { language, theme: 'dark' });

      let enabled = true;
      let rows: { id: number; bytes_in?: number; bytes_out?: number }[] = [{ id: 1, bytes_in: 0, bytes_out: 2048 }];
      let error = false;
      await installHaveApiMock(page, {
        user: { id: 7, login: 'member', level: 1 },
        handlers: {
          'GET vpses/123': () => ({ vps: { ...baseVps, enable_network: enabled } }),
          'GET network_interfaces': () => ({ network_interfaces: [networkInterface] }),
          'GET network_interface_accountings': () =>
            error
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
      await expect(monthly.getByRole('heading')).toHaveText(
        language === 'cs' ? 'Provoz tento měsíc' : 'Traffic this month'
      );
      await expect(monthly).toContainText('2026-11');
      await expect(inbound).toContainText('0 B');
      await expect(outbound).toContainText('2.0 KiB');
      await expect(inbound).toContainText(language === 'cs' ? 'Příchozí' : 'Ingress');
      await expect(outbound).toContainText(language === 'cs' ? 'Odchozí' : 'Egress');

      if (language === 'cs') {
        await summary
          .locator(':scope > div')
          .first()
          .screenshot({ path: testInfo.outputPath('network-header.png'), scale: 'css' });
        await summary
          .locator(':scope > div')
          .last()
          .screenshot({ path: testInfo.outputPath('monthly-traffic.png'), scale: 'css' });
      }
      const enabledX = (await refresh.boundingBox())!.x;
      const rightGap =
        (await summary.boundingBox())!.x +
        (await summary.boundingBox())!.width -
        enabledX -
        (await refresh.boundingBox())!.width;
      expect(rightGap).toBeLessThan(22);
      expect(rightGap).toBeGreaterThan(8);
      enabled = false;
      await page.reload();
      await expect(
        summary.getByText(language === 'cs' ? 'Síť zakázána' : 'Network disabled', { exact: true })
      ).toBeVisible();
      expect((await refresh.boundingBox())!.x).toBeCloseTo(enabledX, 0);
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
        await page.evaluate(() => document.documentElement.clientWidth + 1)
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
        language === 'cs' ? 'Nepodařilo se načíst účtování.' : 'Failed to load accounting.'
      );
      await expect(inbound).toHaveCount(0);
    });
  }
});

test.describe('@pr-smoke @pr-smoke-mobile VPS address workflow', () => {
  test('shows route steps, inline interfaces and editable PTRs at narrow widths', async ({
    page,
    isMobile,
  }, testInfo) => {
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
        'GET host_ip_addresses': () => ({
          host_ip_addresses: [
            {
              id: 51,
              addr: '192.0.2.1',
              assigned: true,
              ip_address: ipRoute,
              reverse_record_value: 'host.example.test.',
            },
            { id: 52, addr: '2001:db8::2', assigned: false, ip_address: secondRoute, reverse_record_value: null },
          ],
        }),
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
    await expect(existing.getByText('192.0.2.1', { exact: true }).locator('..')).toContainText(
      'PTR host.example.test.'
    );
    await expect(missing.getByText('2001:db8::2', { exact: true }).locator('..')).not.toContainText('PTR');
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      await page.evaluate(() => document.documentElement.clientWidth + 1)
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

test.describe('@pr-smoke @pr-smoke-mobile VPS interface address wrapping', () => {
  for (const [language, theme] of [
    ['cs', 'dark'],
    ['en', 'light'],
  ] as const) {
    test(`retains full IPv6 within a narrow interface card (${language})`, async ({ page, isMobile }, info) => {
      const address = '2001:0db8:1234:5678:90ab:cdef:1234:5678';
      await page.setViewportSize({ width: isMobile ? 390 : 1440, height: 900 });
      await bootstrapVpsAdminWindow(page, { sessionToken: 'TEST' });
      await setUiSettingsLocalStorage(page, { language, theme });
      await installHaveApiMock(page, {
        user: { id: 7, login: 'member', level: 1 },
        handlers: {
          'GET vpses/123': () => ({ vps: { ...baseVps, enable_network: true } }),
          'GET network_interfaces': () => ({ network_interfaces: [{ ...networkInterface, enable: true }] }),
          'GET network_interface_accountings': () => ({ network_interface_accountings: [] }),
          'GET ip_addresses': () => ({
            ip_addresses: [
              {
                id: 2,
                addr: address,
                prefix: 64,
                routed: true,
                network_interface: networkInterface,
                user: { id: 7 },
                network: { id: 2, ip_version: 6, role: 'public_access', purpose: 'vps' },
              },
            ],
          }),
          'GET host_ip_addresses': () => ({ host_ip_addresses: [] }),
        },
      });
      await page.goto('/app/vps/123/network');
      await expect(page.getByTestId('vps.network.interfaces.' + (isMobile ? 'card' : 'row') + '.501')).toBeVisible();
      await page.setViewportSize({ width: 320, height: 750 });
      // Other route cards on the experiment base have independent pending fixes.
      // Integrated artifact checks retain the normal and320px page-overflow assertions.
      const card = page.getByTestId('vps.network.interfaces.card.501');
      await expect(card).toBeVisible();
      await expect(card.getByText(language === 'cs' ? 'Limit TX' : 'Max TX', { exact: true })).toBeVisible();
      await expect(card.getByText(language === 'cs' ? 'Limit RX' : 'Max RX', { exact: true })).toBeVisible();
      await expect(card).not.toContainText('{value}');
      const value = card.getByText(address, { exact: true });
      await expect(value).toBeVisible();
      await expect(value).toHaveText(address);
      const bounds = await value.evaluate((el) => {
        const range = document.createRange();
        range.selectNodeContents(el);
        return Array.from(range.getClientRects()).map((b) => ({ left: b.left, right: b.right }));
      });
      const cardBounds = await card.boundingBox();
      expect(cardBounds).not.toBeNull();
      expect(cardBounds!.x).toBeGreaterThanOrEqual(0);
      expect(cardBounds!.x + cardBounds!.width).toBeLessThanOrEqual(320);
      expect(await card.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
      expect(bounds.length).toBeGreaterThan(1);
      expect(bounds.every((b) => b.left >= cardBounds!.x && b.right <= cardBounds!.x + cardBounds!.width)).toBe(true);
      await card.scrollIntoViewIfNeeded();
      await page.screenshot({ path: info.outputPath('interface-full-ipv6-320.png'), scale: 'css' });
    });
  }
});
