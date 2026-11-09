import { expect, test } from '@playwright/test';

import { bootstrapVpsAdminWindow, installHaveApiMock, setUiSettingsLocalStorage } from '../../fixtures';
import { expectNoDocumentHorizontalOverflow } from '../../helpers/horizontalOverflow';

for (const language of ['cs', 'en'] as const) {
  for (const theme of ['light', 'dark'] as const) {
    for (const role of ['member', 'admin'] as const) {
      test(`DNSSEC records stay contained and copy exactly ${language} ${theme} ${role}`, async ({ page }) => {
        const zoneName = 'dlouha-domena-pro-overeni.example.test';
        const pubkey = 'ABCDefgh1234'.repeat(22);
        const digest = '0123456789ABCDEF'.repeat(4);
        const values = [`${zoneName}. IN DNSKEY 257 3 13 ${pubkey}`, `${zoneName}. IN DS 12345 13 2 ${digest}`];
        const writes: string[] = [];
        const errors: string[] = [];
        page.on('pageerror', (error) => errors.push(String(error)));
        page.on('request', (request) => {
          if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method())) {
            writes.push(request.method() + ' ' + new URL(request.url()).pathname);
          }
        });
        await page.addInitScript(() => {
          const copied: string[] = [];
          Object.defineProperty(navigator, 'clipboard', {
            configurable: true,
            value: {
              writeText: async (text: string) => {
                copied.push(text);
              },
            },
          });
          Object.defineProperty(window, '__dnssecCopied', { value: copied });
        });
        await setUiSettingsLocalStorage(page, { language, theme });
        await bootstrapVpsAdminWindow(page, {
          sessionToken: 'TEST_SESSION',
          webuiNext: { uiSettings: { persistence: 'local' } },
        });
        await installHaveApiMock(page, {
          user: { id: 7, login: 'dnssec-audit', level: role === 'admin' ? 100 : 1 },
          handlers: {
            'GET dns_zones/42': () => ({
              dns_zone: {
                id: 42,
                name: zoneName,
                source: 'internal_source',
                enabled: true,
                dnssec_enabled: true,
                user: { id: 7 },
              },
            }),
            'GET transaction_chains': () => ({ transaction_chains: [] }),
            'GET dns_record_logs': () => ({ dns_record_logs: [] }),
            'GET dnssec_records': () => ({
              dnssec_records: [
                {
                  id: 91,
                  keyid: 12345,
                  dnskey_algorithm: 13,
                  dnskey_pubkey: pubkey,
                  ds_algorithm: 13,
                  ds_digest_type: 2,
                  ds_digest: digest,
                },
              ],
            }),
          },
        });
        await page.goto(`/${role === 'admin' ? 'admin' : 'app'}/dns/zones/42/dnssec`);
        const card = page.getByTestId('dns.dnssec.card.91');
        await expect(card).toBeVisible();
        for (const width of [1440, 390, 320]) {
          await page.setViewportSize({ width, height: 900 });
          await expectNoDocumentHorizontalOverflow(page);
          for (let index = 0; index < values.length; index += 1) {
            const pre = card.locator('pre').nth(index);
            await expect(pre).toHaveText(values[index]!);
            const bounds = await pre.evaluate((element) => {
              const box = element.getBoundingClientRect();
              const cardBox = element.closest('[data-testid="dns.dnssec.card.91"]')!.getBoundingClientRect();
              element.scrollLeft = 0;
              const start = element.scrollLeft;
              element.scrollLeft = element.scrollWidth;
              const end = element.scrollLeft;
              return {
                left: box.left,
                right: box.right,
                cardLeft: cardBox.left,
                cardRight: cardBox.right,
                viewport: innerWidth,
                start,
                end,
                client: element.clientWidth,
                scroll: element.scrollWidth,
                overflow: getComputedStyle(element).overflowX,
              };
            });
            expect(bounds.left).toBeGreaterThanOrEqual(bounds.cardLeft);
            expect(bounds.right).toBeLessThanOrEqual(bounds.cardRight);
            expect(bounds.right).toBeLessThanOrEqual(bounds.viewport);
            expect(bounds.overflow).toBe('auto');
            if (width === 320) {
              expect(bounds.scroll).toBeGreaterThan(bounds.client);
              expect(bounds.end).toBeGreaterThan(bounds.start);
            }
          }
        }
        const buttons = card.getByRole('button');
        for (let index = 0; index < 2; index += 1) {
          const button = buttons.nth(index);
          await button.focus();
          await page.keyboard.press('Shift+Tab');
          await page.keyboard.press('Tab');
          await expect(button).toBeFocused();
          expect(await button.evaluate((element) => element.matches(':focus-visible'))).toBe(true);
          await page.keyboard.press('Enter');
          await expect
            .poll(() => page.evaluate(() => Reflect.get(window, '__dnssecCopied') as string[]))
            .toEqual(values.slice(0, index + 1));
        }
        expect(writes).toEqual([]);
        expect(errors).toEqual([]);
      });
    }
  }
}
