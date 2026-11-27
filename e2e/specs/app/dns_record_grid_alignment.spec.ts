import { expect, test } from '@playwright/test';
import { bootstrapVpsAdminWindow, installHaveApiMock, setUiSettingsLocalStorage } from '../../fixtures';
import { expectNoDocumentHorizontalOverflow } from '../../helpers/horizontalOverflow';

for (const language of ['cs', 'en'] as const) for (const role of ['member', 'admin'] as const) {
  test(`@pr-smoke @pr-smoke-mobile DNS record columns and complete names ${language} ${role}`, async ({ page, hasTouch }, info) => {
    const writes: string[] = [], errors: string[] = [];
    page.on('pageerror', error => errors.push(String(error)));
    page.on('request', request => { if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method())) writes.push(request.url()); });
    await bootstrapVpsAdminWindow(page, { webuiNext: { uiSettings: { persistence: 'local' } } });
    await setUiSettingsLocalStorage(page, { language, theme: language === 'cs' ? 'dark' : 'light' });
    const name = 'long-record-label-for-column-width-review.subdomain-for-records';
    const content = 'synthetic-unbroken-TXT-record-content'.repeat(10);
    const rows = [
      { id: 101, name: 'www', type: 'A', content: '192.0.2.10', ttl: 600, managed: false },
      { id: 102, name, type: 'AAAA', content: '2001:db8:1111:2222:3333:4444:5555:6666', ttl: null, managed: false },
      { id: 103, name: '_verification', type: 'TXT', content, ttl: null, managed: false },
      { id: 104, name: 'managed', type: 'A', content: '192.0.2.11', ttl: 3600, managed: true },
    ].map(row => ({ ...row, dns_zone: { id: 21 }, enabled: true, dynamic_update_enabled: false }));
    await installHaveApiMock(page, { user: { id: 7, login: 'grid-review', level: role === 'admin' ? 99 : 1 }, handlers: {
      'GET dns_zones/21': () => (({ dns_zone: { id: 21, name: 'example.test', source: 'internal_source', user: { id: 7 }, enabled: true, default_ttl: 7200 } })),
      'GET dns_records': () => ({ dns_records: rows }), 'GET dns_record_logs': () => ({ dns_record_logs: [] }),
      'GET transaction_chains': () => ({ transaction_chains: [] }),
    } });
    for (const width of hasTouch ? [390, 320] : [1920, 2560, 1024]) {
      await page.setViewportSize({ width, height: 1000 });
      await page.goto(`/${role === 'admin' ? 'admin' : 'app'}/dns/zones/21`);
      const kind = width < 768 ? 'card' : 'row';
      const longName = page.getByTestId(`dns.record.${kind}.102.name`);
      await expect(longName).toHaveText(name); await expect(longName).toBeVisible();
      expect(await longName.evaluate(element => element.scrollWidth <= element.clientWidth + 1)).toBe(true);
      await expect(page.getByTestId(`dns.record.${kind}.103`)).toContainText(content);
      await expect(page.getByTestId(`dns.record.${kind}.103.validation`)).toBeVisible();
      await expect(page.getByTestId(`dns.record.${kind}.104.read_only`)).toBeVisible();
      await expect(page.getByTestId(`dns.record.${kind}.104.edit`)).toHaveCount(0);
      const edit = page.getByTestId(`dns.record.${kind}.102.edit`);
      if (width >= 768) {
        const metrics = await page.getByTestId('dns.records.table').evaluate(table => {
          const headers = Array.from(table.querySelectorAll('th')).map(e => e.getBoundingClientRect());
          const rows = Array.from(table.querySelectorAll('tbody tr')).map(row => Array.from(row.querySelectorAll('td')).map(e => e.getBoundingClientRect()));
          return { width: table.getBoundingClientRect().width, container: table.parentElement!.clientWidth,
            maxColumnDelta: Math.max(...rows.flatMap(row => row.map((cell, i) => Math.abs(cell.left - headers[i]!.left) + Math.abs(cell.right - headers[i]!.right)))),
            contentFits: Array.from(table.querySelectorAll('td')).every(e => e.scrollWidth <= e.clientWidth + 1) };
        });
        expect(metrics.width).toBeLessThanOrEqual(Math.max(metrics.container, 840) + 1);
        expect(metrics.maxColumnDelta).toBeLessThanOrEqual(1); expect(metrics.contentFits).toBe(true);
        await page.getByTestId('dns.records.table').evaluate(table => { table.parentElement!.scrollLeft = table.parentElement!.scrollWidth; });
        const buttonBox = await edit.boundingBox(); const tableBox = await page.getByTestId('dns.records.table').locator('..').boundingBox();
        expect(buttonBox!.x).toBeGreaterThanOrEqual(tableBox!.x); expect(buttonBox!.x + buttonBox!.width).toBeLessThanOrEqual(tableBox!.x + tableBox!.width + 1);
      }
      await expectNoDocumentHorizontalOverflow(page);
      await edit.focus(); await page.keyboard.press('Shift+Tab'); await page.keyboard.press('Tab'); await expect(edit).toBeFocused();
      await page.keyboard.press('Enter'); await expect(page.getByTestId('dns.records.edit.modal')).toBeVisible();
      await page.keyboard.press('Escape'); await expect(page.getByTestId('dns.records.edit.modal')).not.toBeVisible();
      if (process.env['AUDIT_CLEAN_CAPTURE'] === '1') await page.screenshot({ path: info.outputPath(`records-${width}.png`), fullPage: true, scale: 'css' });
    }
    expect(writes).toEqual([]); expect(errors).toEqual([]);
  });
}
