import { expect, test, type Locator } from '@playwright/test';

import { bootstrapVpsAdminWindow, failEnvelope, installHaveApiMock, setUiSettingsLocalStorage } from '../../fixtures';

async function expectCompleteText(target: Locator, label: string) {
  const geometry = await target.evaluate((element) => {
    const box = element.getBoundingClientRect();
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
    const rects: Array<{ left: number; right: number }> = [];
    let node: Node | null;
    while ((node = walker.nextNode())) {
      if (!node.textContent?.trim()) continue;
      const range = document.createRange();
      range.selectNodeContents(node);
      rects.push(...Array.from(range.getClientRects(), (rect) => ({ left: rect.left, right: rect.right })));
    }
    return { left: box.left, right: box.right, text: element.textContent, rects };
  });
  await test.info().attach(label, { body: JSON.stringify(geometry), contentType: 'application/json' });
  expect(geometry.rects.length).toBeGreaterThan(0);
  for (const rect of geometry.rects) {
    expect.soft(rect.left, label).toBeGreaterThanOrEqual(geometry.left - 1);
    expect.soft(rect.right, label).toBeLessThanOrEqual(geometry.right + 1);
  }
}

for (const language of ['cs', 'en'] as const) {
  for (const theme of ['light', 'dark'] as const) {
    test(`@pr-smoke @pr-smoke-mobile host address text stays complete ${language} ${theme}`, async ({ page }, info) => {
      await page.clock.setFixedTime(new Date('2026-11-11T03:00:00Z'));
      await bootstrapVpsAdminWindow(page, { sessionToken: 'TEST' });
      await setUiSettingsLocalStorage(page, { language, theme });
      const netif = { id: 501, name: 'eth0', enable: true, vps: { id: 123 } };
      const route = {
        id: 2,
        addr: '2001:0db8:1234:5678:90ab:cdef:1234:5678',
        prefix: 64,
        routed: true,
        network_interface: netif,
        user: { id: 7 },
        network: { id: 21, ip_version: 6, role: 'public_access', purpose: 'vps' },
      };
      const address = '2001:db8:1234:5678:90ab:cdef:1234:5680';
      const writes: unknown[] = [];
      await installHaveApiMock(page, {
        user: { id: 7, login: 'synthetic-member', level: 1 },
        handlers: {
          'GET vpses/123': () => ({
            vps: {
              id: 123,
              hostname: 'synthetic-host.example.test',
              object_state: 'active',
              is_running: true,
              enable_network: true,
              user: { id: 7 },
              node: { id: 3, location: { id: 10 } },
            },
          }),
          'GET transaction_chains': () => ({ transaction_chains: [] }),
          'GET network_interfaces': () => ({ network_interfaces: [netif] }),
          'GET network_interface_accountings': () => ({ network_interface_accountings: [] }),
          'GET ip_addresses': () => ({ ip_addresses: [route] }),
          'GET host_ip_addresses': () => ({ host_ip_addresses: [] }),
          'POST host_ip_addresses': () => ({
            status: 403,
            contentType: 'application/json',
            body: JSON.stringify(failEnvelope('Synthetic denial; keep the complete failed address and draft.')),
          }),
        },
      });
      page.on('request', (request) => {
        if (request.method() === 'POST' && new URL(request.url()).pathname.endsWith('/host_ip_addresses')) {
          writes.push(request.postDataJSON());
        }
      });
      await page.setViewportSize({ width: 320, height: 900 });
      await page.goto('/app/vps/123/network');
      const addHosts = page.getByTestId('vps.network.ip_addresses.item.2.add_hosts');
      await expect(addHosts).toBeVisible();
      await expectCompleteText(
        page.getByTestId('vps.network.interfaces.card.501').getByText(route.addr, { exact: true }),
        'complete-interface-route'
      );
      await expectCompleteText(page.getByText(`${route.addr}/64`, { exact: true }), 'complete-route-card');
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(321);
      await page.getByTestId('vps.network.ip_addresses.item.2.add_hosts').click();
      const modal = page.getByTestId('vps.network.host_addresses.create');
      await expect(modal).toBeVisible();
      await expectCompleteText(modal.locator('div.text-sm.text-muted').first(), 'complete-route-introduction');
      await page.getByTestId('vps.network.host_addresses.create.addresses').fill(address);
      await page.getByTestId('vps.network.host_addresses.create.submit').click();
      const error = modal.getByText(language === 'cs' ? 'Chyba' : 'Error', { exact: true }).locator('..');
      await expect(error).toContainText(address);
      await expectCompleteText(error, 'complete-failed-address');
      await expect(page.getByTestId('vps.network.host_addresses.create.addresses')).toHaveValue(address);
      expect(writes).toEqual([{ host_ip_address: { addr: address, ip_address: 2 } }]);
      const modalBounds = await modal.boundingBox();
      expect(modalBounds).not.toBeNull();
      expect(modalBounds!.x).toBeGreaterThanOrEqual(0);
      expect(modalBounds!.x + modalBounds!.width).toBeLessThanOrEqual(321);
      const pageError = page
        .getByTestId('vps.network.host_addresses')
        .getByText(language === 'cs' ? 'Síťová akce selhala' : 'Network action failed', { exact: true })
        .locator('..');
      await expectCompleteText(pageError, 'complete-network-action-failure');
      await modal.screenshot({
        path: info.outputPath('host-address-error-320.png'),
        animations: 'disabled',
        scale: 'css',
      });
      await page.setViewportSize({ width: 1280, height: 900 });
      await expectCompleteText(error, 'desktop-failed-address');
      const desktopBounds = await modal.boundingBox();
      expect(desktopBounds).not.toBeNull();
      expect(desktopBounds!.x + desktopBounds!.width).toBeLessThanOrEqual(1281);
      await modal.screenshot({
        path: info.outputPath('host-address-error-1280.png'),
        animations: 'disabled',
        scale: 'css',
      });
    });
  }
}
