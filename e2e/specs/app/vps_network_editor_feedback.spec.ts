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
    const ipAddresses = [
      {
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
            : {
                ip_address: { ...ipAddresses[0], user: { id: 77, login: 'new-owner' } },
                _meta: { action_state_id: 913 },
              };
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
    await expect(page.getByTestId('vps.network.host_addresses.assign.interface')).toHaveValue('501');
    await page.getByTestId('vps.network.host_addresses.assign.submit').click();
    await expect(page.getByTestId('vps.network.host_addresses.assign.error')).toContainText(
      'Interface assignment changed on the server.'
    );
    await expect(page.getByTestId('vps.network.host_addresses.assign.interface')).toHaveValue('501');
    await page.getByTestId('vps.network.host_addresses.assign.submit').click();
    await expect(page.getByTestId('vps.network.host_addresses.assign')).toBeHidden();

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
