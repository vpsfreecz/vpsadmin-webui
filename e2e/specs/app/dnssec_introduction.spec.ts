import { expect, test } from '@playwright/test';
import { bootstrapVpsAdminWindow, installHaveApiMock, setUiSettingsLocalStorage } from '../../fixtures';

for (const language of ['cs', 'en'] as const) for (const role of ['member', 'admin'] as const) {
  test(`@pr-smoke @pr-smoke-mobile DNSSEC concise purpose and complete records ${language} ${role}`, async ({ page, hasTouch }, info) => {
    await page.setViewportSize({ width: hasTouch ? 320 : 1920, height: 1000 });
    await bootstrapVpsAdminWindow(page, { webuiNext: { uiSettings: { persistence: 'local' } } });
    await setUiSettingsLocalStorage(page, { language, theme: language === 'cs' ? 'dark' : 'light' });
    const copied: string[] = [], errors: string[] = [], writes: string[] = [];
    page.on('pageerror', e => errors.push(String(e)));
    page.on('request', r => { if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(r.method())) writes.push(r.url()); });
    await page.exposeFunction('captureDnssecCopy', (value: string) => copied.push(value));
    await page.addInitScript(() => Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async (text: string) => { await (Reflect.get(window, 'captureDnssecCopy') as (value: string) => Promise<void>)(text); } } }));
    const zoneName = 'example.test', pubkey = 'ABCDefgh1234'.repeat(22), digest = '0123456789ABCDEF'.repeat(4);
    const values = [`${zoneName}. IN DNSKEY 257 3 13 ${pubkey}`, `${zoneName}. IN DS 12345 13 2 ${digest}`];
    await installHaveApiMock(page, { user: { id: 7, login: 'dnssec-purpose', level: role === 'admin' ? 99 : 1 }, handlers: {
      'GET dns_zones/21': () => (({ dns_zone: { id: 21, name: zoneName, source: 'internal_source', enabled: true, dnssec_enabled: true, user: { id: 7 } } })),
      'GET transaction_chains': () => ({ transaction_chains: [] }), 'GET dns_record_logs': () => ({ dns_record_logs: [] }),
      'GET dnssec_records': () => ({ dnssec_records: [{ id: 91, keyid: 12345, dnskey_algorithm: 13, dnskey_pubkey: pubkey, ds_algorithm: 13, ds_digest_type: 2, ds_digest: digest }] }),
    } });
    await page.goto(`/${role === 'admin' ? 'admin' : 'app'}/dns/zones/21/dnssec`);
    const pageContent = page.getByTestId('dns.dnssec.page'), intro = pageContent.locator('p').first();
    const expected = language === 'cs' ? 'DNSKEY zóny a DS pro nadřazenou zónu.' : 'Zone DNSKEY and DS for the parent zone.';
    await expect(intro).toHaveText(expected); expect(expected.length).toBeLessThan(language === 'cs' ? 44 : 45);
    expect(await intro.evaluate(e => e.scrollWidth <= e.clientWidth + 1)).toBe(true);
    const card = page.getByTestId('dns.dnssec.card.91'); await expect(card).toBeVisible();
    for (let i = 0; i < 2; i += 1) {
      await expect(card.locator('pre').nth(i)).toHaveText(values[i]!);
      const button = card.getByRole('button').nth(i); await button.focus(); await page.keyboard.press('Shift+Tab'); await page.keyboard.press('Tab'); await expect(button).toBeFocused(); await page.keyboard.press('Enter');
      await expect.poll(() => copied).toEqual(values.slice(0, i + 1));
    }
    if (process.env['AUDIT_CLEAN_CAPTURE'] === '1') await page.screenshot({ path: info.outputPath('dnssec-purpose.png'), fullPage: true, scale: 'css' });
    expect(writes).toEqual([]); expect(errors).toEqual([]);
  });
}
