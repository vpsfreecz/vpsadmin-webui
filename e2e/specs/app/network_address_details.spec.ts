import { expect, test } from '@playwright/test';
import { bootstrapVpsAdminWindow, installHaveApiMock, setUiSettingsLocalStorage } from '../../fixtures';

for (const level of [1, 90]) {
  test(`@pr-smoke @pr-smoke-mobile IP interface, ownership and MAC facts in My view (${level})`, async ({
    page,
  }, testInfo) => {
    await bootstrapVpsAdminWindow(page, { sessionToken: 'TEST' });
    await setUiSettingsLocalStorage(page, { language: level === 90 ? 'cs' : 'en', theme: 'dark' });
    const vps = {
      id: 123,
      hostname: 'sample.example',
      object_state: 'active',
      user: { id: 7 },
      node: { id: 3, location: { id: 10, label: 'Praha' } },
    };
    const netif = { id: 501, name: 'eth0', type: 'veth', mac: '02:00:00:00:01:23', vps: { id: 123 } };
    const network = { id: 11, ip_version: 4, role: 'public_access', enabled: true };
    const owned = { id: 101, addr: '198.51.100.10', prefix: 32, network, user: { id: 7 }, network_interface: netif };
    const borrowed = { ...owned, id: 102, addr: '198.51.100.11', user: null };
    const detached = { ...owned, id: 103, addr: '198.51.100.12', network_interface: null };
    let includes = '';
    const writes: string[] = [];
    page.on('request', (request) => {
      if (
        /\/(vpses|ip_addresses|network_interfaces)(\/|$)/.test(new URL(request.url()).pathname) &&
        ['POST', 'PUT', 'DELETE', 'PATCH'].includes(request.method())
      )
        writes.push(request.url());
    });
    await installHaveApiMock(page, {
      user: { id: 7, login: 'member', level },
      handlers: {
        'GET vpses': () => ({ vpses: [vps] }),
        'GET vpses/123': () => ({ vps }),
        'GET network_interfaces': () => ({
          network_interfaces: [netif, { id: 502, name: 'venet0', type: 'venet', mac: null }],
        }),
        'GET ip_address_assignments': (ctx) => {
          includes = ctx.searchParams.get('_meta[includes]') ?? '';
          // Reproduce the real API's unresolved association: nested includes
          // do not guarantee assignment.ip_address is a full allocation.
          return {
            ip_address_assignments: [owned, borrowed].map((ip) => ({
              id: ip.id + 700,
              vps,
              ip_address: { id: ip.id, addr: ip.addr },
              ip_addr: ip.addr,
              ip_prefix: 32,
            })),
          };
        },
        'GET ip_addresses': (ctx) => ({
          ip_addresses: ctx.searchParams.has('ip_address[vps]') ? [owned, borrowed] : [detached],
        }),
        'GET transaction_chains': () => ({ transaction_chains: [] }),
        'GET network_interface_accountings': () => ({ network_interface_accountings: [] }),
        'GET host_ip_addresses': () => ({ host_ip_addresses: [] }),
      },
    });
    await page.goto('/app/networking');
    const item = (id: number) =>
      page.locator(
        `[data-testid="network.user.ip.row.${id}"]:visible, [data-testid="network.user.ip.card.${id}"]:visible`
      );
    await expect(item(101)).toContainText('eth0');
    expect(includes.split(',')).not.toContain('ip_address__user');
    await expect(item(101)).toContainText(level === 90 ? 'Ano' : 'Yes');
    await expect(item(102)).toContainText(level === 90 ? 'Ne' : 'No');
    await expect(item(103)).toContainText(level === 90 ? 'Ano' : 'Yes');
    await expect(item(103)).not.toContainText('eth0');
    await page.screenshot({ path: testInfo.outputPath('member-ip-facts.png'), fullPage: true, scale: 'css' });
    await page.goto('/app/vps/123/network');
    const interfaces = page.getByTestId('vps.network.interfaces');
    await expect(interfaces).toBeVisible();
    const row = page.locator(
      '[data-testid="vps.network.interfaces.row.501"]:visible, [data-testid="vps.network.interfaces.card.501"]:visible'
    );
    await expect(row).toContainText(netif.mac);
    await expect(page.getByTestId('vps.network.page')).not.toContainText(level === 90 ? 'Načítání' : 'Loading');
    await expect(interfaces).toContainText(level === 90 ? 'MAC adresa' : 'MAC address');
    const noMac = page.locator(
      '[data-testid="vps.network.interfaces.row.502"]:visible, [data-testid="vps.network.interfaces.card.502"]:visible'
    );
    await expect(noMac).toContainText('—');
    expect(writes).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath('vps-interface-mac.png'), fullPage: true, scale: 'css' });
  });
}
