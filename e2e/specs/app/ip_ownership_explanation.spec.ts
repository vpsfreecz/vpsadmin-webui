import { expect, test } from '@playwright/test';
import { bootstrapVpsAdminWindow, installHaveApiMock, setUiSettingsLocalStorage } from '../../fixtures';

for (const language of ['cs', 'en'] as const)
  for (const level of [1, 99]) {
    test(`@pr-smoke @pr-smoke-mobile IP route removal preserves ownership ${language} level ${level}`, async ({
      page,
      hasTouch,
    }, info) => {
      await bootstrapVpsAdminWindow(page, { sessionToken: 'SYNTHETIC_IP_HELP' });
      await setUiSettingsLocalStorage(page, { language, theme: language === 'cs' ? 'dark' : 'light' });
      const owner = { id: 42, login: 'synthetic-member' };
      const vps = {
        id: 123,
        hostname: 'network.example',
        object_state: 'active',
        is_running: true,
        enable_network: true,
        user: owner,
        node: { id: 1, location: { id: 2, label: 'Praha' } },
      };
      const netif = { id: 501, name: 'eth0', type: 'veth', vps: { id: 123 } };
      let attached = true;
      const writes: string[] = [];
      const address = () => ({
        id: 101,
        addr: '198.51.100.10',
        prefix: 32,
        user: owner,
        network_interface: attached ? netif : null,
        routed: attached,
        network: {
          id: 11,
          ip_version: 4,
          role: 'public_access',
          purpose: 'vps',
          enabled: true,
          primary_location: { id: 2, label: 'Praha' },
        },
      });
      page.on('request', (r) => {
        if (new URL(r.url()).pathname.startsWith('/api/') && !['GET', 'HEAD', 'OPTIONS'].includes(r.method()))
          writes.push(r.method() + ' ' + new URL(r.url()).pathname);
      });
      await installHaveApiMock(page, {
        user: { ...owner, level },
        handlers: {
          'GET help_boxes': () => ({ help_boxes: [] }),
          'GET webui_user_settings': () => ({
            webui_user_settings: [
              {
                id: 1,
                namespace: 'ui',
                key: 'settings',
                value: JSON.stringify({ language, theme: language === 'cs' ? 'dark' : 'light' }),
              },
            ],
          }),
          'GET vpses': () => ({ vpses: [vps] }),
          'GET vpses/123': () => ({ vps }),
          'GET ip_address_assignments': () => ({
            ip_address_assignments: attached ? [{ id: 801, ip_address: address(), vps, user: owner }] : [],
          }),
          'GET ip_addresses': () => ({ ip_addresses: [address()] }),
          'GET network_interfaces': () => ({ network_interfaces: [netif] }),
          'GET network_interface_accountings': () => ({ network_interface_accountings: [] }),
          'GET host_ip_addresses': () => ({ host_ip_addresses: [] }),
          'GET transaction_chains': () => ({ transaction_chains: [] }),
          'POST ip_addresses/101/free': () => {
            attached = false;
            return { ip_address: address(), _meta: { action_state_id: 901 } };
          },
          'GET action_states/901': () => ({
            action_state: { id: 901, finished: true, status: true, current: 1, total: 1 },
          }),
        },
      });
      await page.goto('/app/networking');
      await expect(page.getByTestId('network.user.page')).toBeVisible();
      const help = page.getByTestId('network.user.ownership_help'),
        summary = help.locator('summary');
      await expect(help).not.toHaveAttribute('open', '');
      const originalUrl = page.url();
      await summary.focus();
      await summary.press('Enter');
      await expect(help).toHaveAttribute('open', '');
      await expect(help).toContainText(language === 'cs' ? 'Odebrat routu' : 'Free route');
      await expect(help).toContainText(
        language === 'cs' ? 'zůstane přiřazená tvému účtu' : 'remains allocated to your account'
      );
      await expect(help).toContainText(language === 'cs' ? 'administrátorský tým' : 'administrator team');
      await expect(page).toHaveURL(originalUrl);
      expect(writes).toEqual([]);
      await summary.press('Enter');
      await expect(help).not.toHaveAttribute('open', '');
      if (hasTouch) await summary.tap();
      else await summary.click();
      await expect(help).toHaveAttribute('open', '');
      await page.screenshot({ path: info.outputPath('ip-ownership-help.png'), fullPage: true, animations: 'disabled' });
      const item = () =>
        page.locator(
          '[data-testid="network.user.ip.row.101"]:visible,[data-testid="network.user.ip.card.101"]:visible'
        );
      await expect(item()).toBeVisible();
      await item()
        .getByRole('link', { name: language === 'cs' ? 'Otevřít síť VPS' : 'Open VPS network', exact: true })
        .click();
      await expect(page).toHaveURL(/\/app\/vps\/123\/network$/);
      await page.getByTestId('vps.network.ip_addresses.item.101.free_route').click();
      const confirm = page.getByTestId('vps.network.ip_addresses.free_route_confirm');
      await expect(confirm).toContainText('198.51.100.10');
      await expect(confirm).toContainText(
        language === 'cs' ? 'Vlastnictví adresy se tím nemění.' : 'This does not change address ownership.'
      );
      await page.screenshot({
        path: info.outputPath('ip-removal-confirmation.png'),
        fullPage: true,
        animations: 'disabled',
      });
      await page.getByTestId('vps.network.ip_addresses.free_route_confirm.confirm').click();
      await expect(confirm).toBeHidden();
      expect(writes).toEqual(['POST /api/v7.0/ip_addresses/101/free']);
      await page.goto('/app/networking');
      await expect(item()).toContainText('198.51.100.10');
      await expect(item()).toContainText(language === 'cs' ? 'Ano' : 'Yes');
      await expect(item()).not.toContainText('eth0');
      await expect(item().getByTestId('network.user.ip.101.assign')).toBeVisible();
      expect(address().user).toEqual(owner);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    });
  }
