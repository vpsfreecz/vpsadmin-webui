import { expect, test } from '@playwright/test';
import { bootstrapVpsAdminWindow, installHaveApiMock, setUiSettingsLocalStorage } from '../../fixtures';

const addresses = [
  { id: 1, addr: '192.0.2.10', prefix: 32, network: { id: 1, ip_version: 4, role: 'public_access' } },
  { id: 2, addr: '2001:db8::10', prefix: 128, network: { id: 2, ip_version: 6 } },
  { id: 3, addr: '198.51.100.20', prefix: 32, network: { id: 1, ip_version: 4, role: 'public_access' } },
  { id: 4, addr: '10.0.0.10', prefix: 32, network: { id: 3, ip_version: 4, role: 'private_access' } },
  { id: 5, addr: '2001:db8::20', prefix: 128, network: { id: 2, ip_version: 6 } },
  { id: 6, addr: '2001:0db8:1234:5678:90ab:cdef:1234:5678', prefix: 128, network: { id: 2, ip_version: 6 } },
];

for (const mode of ['admin', 'app'] as const) {
  for (const language of ['cs', 'en'] as const) {
    test(`@pr-smoke @pr-smoke-mobile ${mode} ${language} VPS overview shows and copies every IP address`, async ({
      page,
      isMobile,
    }, testInfo) => {
      await bootstrapVpsAdminWindow(page, { sessionToken: 'OVERVIEW_IPS_TEST' });
      await setUiSettingsLocalStorage(page, { language, theme: 'dark' });
      await page.addInitScript(() => {
        Object.defineProperty(navigator, 'clipboard', {
          configurable: true,
          value: {
            writeText: async (text: string) => {
              document.documentElement.dataset['copiedAddress'] = text;
            },
          },
        });
      });
      await installHaveApiMock(page, {
        user: { id: 1, login: 'fixture', level: mode === 'admin' ? 99 : 1 },
        handlers: {
          'GET vpses/123': () => ({
            vps: {
              id: 123,
              hostname: 'all-addresses.example.test',
              object_state: 'active',
              is_running: true,
              enable_network: true,
              user: { id: 1, login: 'fixture' },
              node: { id: 1, domain_name: 'node.example.test' },
            },
          }),
          'GET ip_addresses': () => ({ ip_addresses: addresses }),
        },
      });
      await page.goto(`/${mode}/vps/123`);
      const card = page.getByTestId('vps.overview.network.card');
      const rows = card.locator('li');
      await expect(rows).toHaveCount(addresses.length);
      for (const [index, address] of addresses.entries()) {
        const row = rows.nth(index);
        const label = row.locator('.font-mono');
        await expect(label).toHaveText(`${address.addr}/${address.prefix}`);
        await expect(label).toBeVisible();
        expect(await label.evaluate((element) => element.scrollWidth <= element.clientWidth + 1)).toBe(true);
        const copy = row.getByRole('button');
        if (isMobile) await copy.tap();
        else await copy.click();
        await expect(page.locator('html')).toHaveAttribute('data-copied-address', `${address.addr}/${address.prefix}`);
      }
      await expect(card).not.toContainText(/\+\d+ (dalších|more)/);
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)
      ).toBe(true);
      await card.scrollIntoViewIfNeeded();
      if (mode === 'admin' && language === 'cs') {
        await expect(card.getByRole('button', { name: /^(Zkopírováno|Copied)$/ })).toHaveCount(0);
        await card.evaluate((element) => element.scrollIntoView({ block: 'start' }));
        await page.evaluate(() => window.scrollBy(0, -100));
        await card.screenshot({ path: testInfo.outputPath('network-card.png'), scale: 'css' });
        await page.screenshot({ path: testInfo.outputPath('all-ip-addresses.png'), fullPage: true, scale: 'css' });
      }
    });
  }
}
