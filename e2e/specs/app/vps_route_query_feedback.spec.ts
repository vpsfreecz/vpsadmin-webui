import { expect, test } from '@playwright/test';
import { bootstrapVpsAdminWindow, installHaveApiMock, setUiSettingsLocalStorage } from '../../fixtures';
import { expectNoDocumentHorizontalOverflow } from '../../helpers/horizontalOverflow';

for (const [language, theme] of [
  ['cs', 'dark'],
  ['en', 'light'],
] as const) {
  for (const phase of ['read', 'write'] as const) {
    test(`@pr-smoke @pr-smoke-mobile route assignment ${phase} failure has its correct meaning (${language})`, async ({
      page,
      isMobile,
    }, info) => {
      await page.setViewportSize({ width: isMobile ? 390 : 1440, height: 900 });
      await page.clock.setFixedTime(new Date('2026-11-08T12:00:00Z'));
      await bootstrapVpsAdminWindow(page, { sessionToken: 'SYNTHETIC_ROUTE_QUERY_FEEDBACK' });
      await setUiSettingsLocalStorage(page, { language, theme });
      let failRead = phase === 'read';
      let assignments = 0;
      const location = { id: 10, label: 'Synthetic location', environment: { id: 3 } };
      const vps = {
        id: 123,
        hostname: 'synthetic-route-target.example.test',
        object_state: 'active',
        enable_network: true,
        user: { id: 7, login: 'synthetic-member' },
        node: { id: 3, location },
      };
      const netif = { id: 501, name: 'eth0', vps: { id: 123 }, enable: true };
      const ip = {
        id: 3,
        addr: '198.51.100.30',
        prefix: 32,
        user: { id: 7 },
        network_interface: null,
        network: {
          id: 20,
          role: 'public_access',
          purpose: 'vps',
          enabled: true,
          ip_version: 4,
          primary_location: location,
        },
      };
      const unavailable = (message: string) => ({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({ status: false, message, response: null }),
      });
      await installHaveApiMock(page, {
        user: { id: 7, login: 'synthetic-member', level: 1 },
        handlers: {
          'GET vpses/123': () => ({ vps }),
          'GET transaction_chains': () => ({ transaction_chains: [] }),
          'GET network_interfaces': () => ({ network_interfaces: [netif] }),
          'GET network_interface_accountings': () => ({ network_interface_accountings: [] }),
          'GET host_ip_addresses': () => ({ host_ip_addresses: [] }),
          'GET ip_addresses': ({ searchParams }) =>
            searchParams.has('ip_address[location]')
              ? failRead
                ? unavailable('Synthetic route list unavailable')
                : { ip_addresses: [ip] }
              : { ip_addresses: [] },
          'GET ip_addresses/3': () => ({ ip_address: ip }),
          'POST ip_addresses/3/assign': ({ request }) => {
            expect(request.postDataJSON()).toEqual({ ip_address: { network_interface: 501 } });
            assignments += 1;
            return unavailable('Synthetic assignment unavailable');
          },
        },
      });
      await page.goto('/app/vps/123/network');
      await page.getByTestId('vps.network.ip_addresses.add').click();
      await expect(page.getByTestId('network.user.assign.interface')).toHaveValue('501');
      await page.getByTestId('network.user.assign.continue').click();
      const dialog = page.getByTestId('vps.network.ip_addresses.add_modal');
      if (phase === 'read') {
        const error = page.getByTestId('network.user.assign.error');
        await expect(error).toContainText('Synthetic route list unavailable');
        await expect(error).not.toContainText(language === 'cs' ? 'Předchozí operace' : 'previous operation');
        await expect(page.getByTestId('network.user.assign.address')).toBeDisabled();
        await expect(page.getByTestId('network.user.assign.submit')).toBeDisabled();
        await expect(page.getByTestId('network.user.assign.uncertain')).toHaveCount(0);
        expect(assignments).toBe(0);
        await dialog.screenshot({ path: info.outputPath('route-read-error.png') });
        await page.getByTestId('network.user.assign.back').click();
        failRead = false;
        await expect(page.getByTestId('network.user.assign.interface')).toHaveValue('501');
        await page.getByTestId('network.user.assign.continue').click();
        await expect(page.getByTestId('network.user.assign.address')).toHaveValue('3');
        await expect(error).toBeHidden();
        await expect(page.getByTestId('network.user.assign.submit')).toBeEnabled();
        expect(assignments).toBe(0);
      } else {
        await expect(page.getByTestId('network.user.assign.address')).toHaveValue('3');
        await page.getByTestId('network.user.assign.submit').click();
        await expect(page.getByTestId('network.user.assign.uncertain')).toBeVisible();
        await expect(page.getByTestId('network.user.assign.uncertain.acknowledge')).toBeDisabled();
        await expect(page.getByTestId('network.user.assign.submit')).toBeDisabled();
        expect(assignments).toBe(1);
        await dialog.screenshot({ path: info.outputPath('route-write-uncertain.png') });
      }
      await page.setViewportSize({ width: 320, height: 750 });
      await expectNoDocumentHorizontalOverflow(page);
      await dialog.screenshot({ path: info.outputPath(`route-${phase}-320.png`) });
    });
  }
}
