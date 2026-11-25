import { expect, test } from '@playwright/test';
import { bootstrapVpsAdminWindow, installHaveApiMock, setUiSettingsLocalStorage } from '../../fixtures';

for (const language of ['cs', 'en'] as const) {
  for (const mode of ['member', 'admin'] as const) {
    test(`@pr-smoke @pr-smoke-mobile DNS type and authority role remain distinct: ${mode}, ${language}`, async ({
      page,
    }, info) => {
      await bootstrapVpsAdminWindow(page, { sessionToken: 'DNS_TERMS' });
      await setUiSettingsLocalStorage(page, { language, theme: language === 'cs' ? 'dark' : 'light' });
      const zones = [
        { id: 1, name: 'primary.example.test', role: 'forward_role', source: 'internal_source' },
        { id: 2, name: '100.51.198.in-addr.arpa', role: 'reverse_role', source: 'internal_source' },
        { id: 3, name: 'secondary.example.test', role: 'forward_role', source: 'external_source' },
        { id: 4, name: 'unknown.example.test', role: 'forward_role' },
      ].map((zone) => ({ ...zone, enabled: true, user: { id: 7 }, dnssec_enabled: false, default_ttl: 3600 }));
      await installHaveApiMock(page, {
        user: { id: 7, login: 'synthetic-dns-terms', level: mode === 'admin' ? 99 : 1 },
        handlers: {
          'GET dns_zones': () => ({ dns_zones: zones }),
          'GET dns_zones/1': () => ({ dns_zone: zones[0] }),
          'GET dns_records': () => ({ dns_records: [] }),
        },
      });
      const base = mode === 'admin' ? '/admin' : '/app';
      await page.goto(`${base}/dns`);
      await expect(page.locator('[data-testid="dns.zones.authority.1"]:visible')).toHaveText(
        language === 'cs' ? 'Role zóny: Primární' : 'Zone role: Primary'
      );
      await expect(page.locator('[data-testid="dns.zones.authority.3"]:visible')).toHaveText(
        language === 'cs' ? 'Role zóny: Sekundární' : 'Zone role: Secondary'
      );
      await expect(page.locator('[data-testid="dns.zones.authority.4"]:visible')).toContainText('—');
      const reverse = page.locator('[data-testid="dns.zones.row.2"]:visible,[data-testid="dns.zones.card.2"]:visible');
      await expect(reverse).toContainText(language === 'cs' ? 'Reverzní' : 'Reverse');
      await expect(reverse).toContainText(language === 'cs' ? 'Primární' : 'Primary');
      await page.screenshot({ path: info.outputPath(`dns-list-${mode}-${language}.png`), fullPage: true });
      await page.getByTestId('dns.zones.create.open').click();
      await expect(page.getByRole('dialog')).toContainText(language === 'cs' ? 'Role zóny' : 'Zone role');
      await expect(page.getByRole('dialog')).toContainText(
        language === 'cs' ? 'dopředné a reverzní' : 'forward and reverse'
      );
      await page.getByTestId('dns.zones.create.kind.secondary').click();
      await expect(page.getByTestId('dns.zones.create.kind.secondary')).toHaveAttribute('aria-pressed', 'true');
      await page.getByTestId('dns.zones.create.cancel').click();
      await page.goto(`${base}/dns/zones/1`);
      await expect(page.getByTestId('dns.zone.authority')).toHaveText(
        language === 'cs' ? 'Role zóny: Primární' : 'Zone role: Primary'
      );
      await expect(page.getByTestId('dns.zone.header')).toContainText(
        language === 'cs' ? 'Typ zóny: Dopředná' : 'Zone type: Forward'
      );
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.screenshot({ path: info.outputPath(`dns-detail-${mode}-${language}.png`), fullPage: true });
    });
  }
}
