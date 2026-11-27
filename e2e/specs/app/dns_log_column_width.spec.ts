import { expect, test } from '@playwright/test';
import { bootstrapVpsAdminWindow, installHaveApiMock, setUiSettingsLocalStorage } from '../../fixtures';
import { expectNoDocumentHorizontalOverflow } from '../../helpers/horizontalOverflow';

const recordName = `${'a'.repeat(63)}.${'b'.repeat(63)}.${'c'.repeat(45)}`;
const changes = {
  content: [
    'Dlouhý český obsah záznamu v Českých Budějovicích se zachovanou původní hodnotou',
    'Dlouhý český obsah záznamu v Českých Budějovicích po změně se zachovanou novou hodnotou',
  ],
};

for (const language of ['cs', 'en'] as const) {
  for (const theme of ['light', 'dark'] as const) {
    for (const width of [768, 1024, 1440]) {
      test(`@pr-smoke @pr-smoke-mobile DNS log columns preserve long values ${language} ${theme} ${width}`, async ({
        page,
      }, info) => {
        const base = language === 'cs' ? '/app' : '/admin';
        const writes: string[] = [];
        const errors: string[] = [];
        page.on('pageerror', (error) => errors.push(String(error)));
        page.on('request', (request) => {
          if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method())) {
            writes.push(request.method() + ' ' + new URL(request.url()).pathname);
          }
        });
        await page.setViewportSize({ width, height: 1000 });
        await page.clock.setFixedTime(new Date('2026-11-09T00:00:00Z'));
        await setUiSettingsLocalStorage(page, { language, theme });
        await bootstrapVpsAdminWindow(page, {
          sessionToken: 'TEST_SESSION',
          webuiNext: { uiSettings: { persistence: 'local' } },
        });
        await installHaveApiMock(page, {
          user: { id: 7, login: 'dns-log-layout', level: language === 'cs' ? 1 : 100 },
          handlers: {
            'GET dns_zones/42': () => ({
              dns_zone: {
                id: 42,
                name: 'overovaci.example.test',
                source: 'internal_source',
                role: 'forward_role',
                enabled: true,
              },
            }),
            'GET dns_record_logs': () => ({
              dns_record_logs: [
                {
                  id: 81,
                  name: recordName,
                  type: 'TXT',
                  change_type: 'update_record',
                  transaction_chain: { id: 502 },
                  created_at: '2026-11-08T23:00:00Z',
                  attr_changes: changes,
                },
              ],
            }),
            'GET transaction_chains': () => ({ transaction_chains: [] }),
          },
        });
        await page.goto(base + '/dns/zones/42/logs');
        const row = page.getByTestId('dns.logs.row.81');
        await expect(row).toBeVisible();
        await expect(page.getByTestId('dns.logs.loading')).toHaveCount(0);
        const name = row.locator('td').nth(2);
        const pre = row.locator('pre');
        await expect(name).toContainText(recordName);
        await expect(pre).toHaveText(JSON.stringify(changes, null, 2));
        const metrics = await row.evaluate((el) => ({
          name: el.querySelectorAll('td')[2]!.getBoundingClientRect().width,
          changes: el.querySelector('pre')!.getBoundingClientRect().width,
          height: el.getBoundingClientRect().height,
        }));
        expect(metrics.name, 'long name keeps a bounded column').toBeLessThanOrEqual(280);
        expect(metrics.changes, 'change details keep a readable column').toBeGreaterThanOrEqual(255);
        expect(metrics.height, 'details do not wrap into a thin vertical strip').toBeLessThan(240);
        await expectNoDocumentHorizontalOverflow(page);
        const scroll = page.locator('.overflow-x-auto').filter({ has: row }).first();
        await scroll.evaluate((el) => {
          el.scrollLeft = el.scrollWidth;
        });
        const link = row.locator(`a[href="${base}/transactions/502"]`);
        await link.focus();
        await expect(link).toBeFocused();
        await expect(pre).toHaveText(JSON.stringify(changes, null, 2));
        await scroll.screenshot({
          path: info.outputPath('desktop-log-right.png'),
          animations: 'disabled',
          scale: 'css',
        });
        await scroll.evaluate((el) => {
          el.scrollLeft = 0;
        });
        await scroll.screenshot({
          path: info.outputPath('desktop-log-left.png'),
          animations: 'disabled',
          scale: 'css',
        });
        for (const mobileWidth of [390, 320]) {
          await page.setViewportSize({ width: mobileWidth, height: 844 });
          const card = page.getByTestId('dns.logs.card.81');
          await expect(card).toBeVisible();
          await expect(card).toContainText(recordName);
          const details = card.locator('details');
          if (!(await details.evaluate((el) => (el as HTMLDetailsElement).open)))
            await details.locator('summary').click();
          await expect(card.locator('pre')).toHaveText(JSON.stringify(changes, null, 2));
          await expect(card.locator(`a[href="${base}/transactions/502"]`)).toBeVisible();
          await expectNoDocumentHorizontalOverflow(page);
          await card.screenshot({
            path: info.outputPath(`mobile-log-${mobileWidth}.png`),
            animations: 'disabled',
            scale: 'css',
          });
        }
        expect(writes).toEqual([]);
        expect(errors).toEqual([]);
        await test
          .info()
          .attach('actual-column-metrics', { body: JSON.stringify(metrics), contentType: 'application/json' });
      });
    }
  }
}
