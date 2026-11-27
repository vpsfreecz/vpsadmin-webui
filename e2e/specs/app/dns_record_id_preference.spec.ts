import { expect, test } from '@playwright/test';
import { bootstrapVpsAdminWindow, installHaveApiMock } from '../../fixtures';

for (const language of ['cs', 'en'] as const) {
  for (const mode of ['member', 'admin'] as const) {
    test(`@pr-smoke @pr-smoke-mobile DNS technical IDs are optional and persist: ${mode}, ${language}`, async ({
      page,
    }, info) => {
      await bootstrapVpsAdminWindow(page, {
        sessionToken: 'DNS_ID_PREFERENCE',
        webuiNext: { uiSettings: { persistence: 'local' } },
      });
      await page.addInitScript(
        (settings) => {
          if (localStorage.getItem('vpsadmin.uiSettings.v1') === null)
            localStorage.setItem('vpsadmin.uiSettings.v1', JSON.stringify(settings));
        },
        { language, theme: language === 'cs' ? 'dark' : 'light' }
      );
      await installHaveApiMock(page, {
        user: { id: 7, login: 'synthetic-dns-ids', level: mode === 'admin' ? 99 : 1 },
        handlers: {
          'GET dns_zones/10': () => ({
            dns_zone: {
              id: 10,
              name: 'ids.example.test',
              user: { id: 7 },
              role: 'forward_role',
              source: 'internal_source',
              enabled: true,
              dnssec_enabled: false,
              default_ttl: 3600,
            },
          }),
          'GET dns_records': () => ({
            dns_records: [
              {
                id: 501,
                dns_zone: { id: 10 },
                name: 'www',
                type: 'A',
                content: '198.51.100.10',
                ttl: 3600,
                enabled: true,
                managed: false,
              },
            ],
          }),
        },
      });
      const base = mode === 'admin' ? '/admin' : '/app';
      await page.goto(`${base}/dns/zones/10`);
      const record = page.locator(
        '[data-testid="dns.record.row.501"]:visible,[data-testid="dns.record.card.501"]:visible'
      );
      const preference = page.getByTestId('dns.records.show_ids');
      await expect(record).toContainText('198.51.100.10');
      await expect(preference).not.toBeChecked();
      await expect(record.getByText('#501', { exact: true })).toHaveCount(0);
      await page.screenshot({
        path: info.outputPath(`dns-ids-hidden-${mode}-${language}.png`),
        fullPage: true,
        scale: 'css',
      });
      await preference.check();
      await expect(record.getByText('#501', { exact: true })).toBeVisible();
      await page.reload();
      await expect(preference).toBeChecked();
      await expect(record.getByText('#501', { exact: true })).toBeVisible();
      await page.screenshot({
        path: info.outputPath(`dns-ids-visible-${mode}-${language}.png`),
        fullPage: true,
        scale: 'css',
      });
      await preference.uncheck();
      await page.reload();
      await expect(preference).not.toBeChecked();
      await expect(record.getByText('#501', { exact: true })).toHaveCount(0);
      await page.getByTestId('dns.records.search.input').fill('#501');
      await expect(record).toContainText('www');
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    });
  }
}
