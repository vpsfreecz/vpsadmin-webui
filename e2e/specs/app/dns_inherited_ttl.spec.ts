import { expect, test } from '@playwright/test';
import { bootstrapVpsAdminWindow, installHaveApiMock, setUiSettingsLocalStorage } from '../../fixtures';
import { expectNoDocumentHorizontalOverflow } from '../../helpers/horizontalOverflow';

for (const language of ['cs', 'en'] as const) for (const role of ['member', 'admin'] as const) {
  test(`@pr-smoke @pr-smoke-mobile DNS known inherited TTL ${language} ${role}`, async ({ page, hasTouch }, info) => {
    await page.setViewportSize({ width: hasTouch ? 320 : 1920, height: 1000 });
    await bootstrapVpsAdminWindow(page, { webuiNext: { uiSettings: { persistence: 'local' } } });
    await setUiSettingsLocalStorage(page, { language, theme: language === 'cs' ? 'dark' : 'light' });
    const user = { id: 7, login: 'ttl-review', level: role === 'admin' ? 99 : 1 };
    const errors: string[] = [], payloads: { method: string; value: Record<string, unknown> }[] = [];
    page.on('pageerror', e => errors.push(String(e)));
    let rows = [
      { id: 101, name: 'www', ttl: 600 },
      { id: 102, name: 'inherited', ttl: null },
      { id: 103, name: 'omitted' },
    ].map(row => ({ ...row, type: 'A', content: '192.0.2.10', enabled: true, managed: false, dynamic_update_enabled: false }));
    const zone = (id: number) => ({ id, name: `zone${id}.example.test`, source: 'internal_source', user, enabled: true, ...(id === 21 ? { default_ttl: 7200 } : id === 23 ? { default_ttl: 0 } : {}) });
    await installHaveApiMock(page, { user, handlers: {
      'GET dns_zones/21': () => zone(21), 'GET dns_zones/22': () => zone(22), 'GET dns_zones/23': () => zone(23),
      'GET dns_records': () => ({ dns_records: rows }), 'GET dns_record_logs': () => ({ dns_record_logs: [] }), 'GET transaction_chains': () => ({ transaction_chains: [] }),
      'PUT dns_records/101': async ({ request }) => {
        const body: unknown = await request.postDataJSON();
        if (!body || typeof body !== 'object' || !('dns_record' in body) || !body.dns_record || typeof body.dns_record !== 'object') throw Error('Missing record payload');
        const value = body.dns_record as Record<string, unknown>;
        payloads.push({ method: 'PUT', value }); expect(value['ttl']).toBeNull();
        rows = rows.map(row => row.id === 101 ? { ...row, ttl: null } : row);
        return { dns_record: rows[0] };
      },
      'POST dns_records': async ({ request }) => {
        const body: unknown = await request.postDataJSON();
        if (!body || typeof body !== 'object' || !('dns_record' in body) || !body.dns_record || typeof body.dns_record !== 'object') throw Error('Missing record payload');
        const value = body.dns_record as Record<string, unknown>;
        payloads.push({ method: 'POST', value }); expect(value).not.toHaveProperty('ttl'); expect(value['dns_zone']).toBe(21);
        const created = { ...rows[0]!, id: 104, name: 'api', ttl: null }; rows = [...rows, created];
        return { dns_record: created };
      },
    } });
    const base = `/${role === 'admin' ? 'admin' : 'app'}/dns/zones/`;
    const kind = hasTouch ? 'card' : 'row';
    await page.goto(base + '21');
    const explicit = page.getByTestId(`dns.record.${kind}.101.ttl`), inherited = page.getByTestId(`dns.record.${kind}.102.ttl`), omitted = page.getByTestId(`dns.record.${kind}.103.ttl`);
    await expect(explicit).toHaveAttribute('data-ttl-source', 'explicit'); await expect(explicit).toContainText('600 s');
    await expect(inherited).toHaveAttribute('data-ttl-source', 'inherited'); await expect(inherited).toContainText('7200 s');
    await expect(omitted).toHaveAttribute('data-ttl-source', 'unknown'); await expect(omitted).not.toContainText('7200');
    await page.getByTestId(`dns.record.${kind}.102.edit`).click();
    const ttl = page.getByTestId('dns.records.edit.ttl'); await expect(ttl).toHaveValue(''); await expect(ttl).toHaveAttribute('placeholder', '7200');
    await expect(page.getByTestId('dns.records.edit.ttl.help')).toContainText('7200 s'); await expect(ttl).toHaveAttribute('aria-describedby', 'dns.records.edit.ttl.help');
    await ttl.focus(); await expect(ttl).toBeFocused(); await page.keyboard.press('Escape');
    await page.getByTestId(`dns.record.${kind}.101.edit`).click(); await ttl.fill(''); await page.getByTestId('dns.records.edit.submit').click();
    await expect(page.getByTestId('dns.records.edit.modal')).not.toBeVisible(); await expect(explicit).toHaveAttribute('data-ttl-source', 'inherited'); await expect(explicit).toContainText('7200 s');
    await page.getByTestId('dns.records.create.open').click(); await page.getByTestId('dns.records.create.name').fill('api'); await page.getByTestId('dns.records.create.content').fill('192.0.2.12');
    await expect(page.getByTestId('dns.records.create.ttl')).toHaveValue(''); await expect(page.getByTestId('dns.records.create.ttl.help')).toContainText('7200 s');
    await page.getByTestId('dns.records.create.submit').click(); await expect(page.getByTestId('dns.records.create.modal')).not.toBeVisible();
    expect(payloads.map(p => p.method)).toEqual(['PUT', 'POST']);
    for (const id of [22, 23]) {
      await page.goto(base + id);
      await expect(inherited).toHaveAttribute('data-ttl-source', 'inherited'); await expect(inherited).toContainText(language === 'cs' ? 'Neznámé' : 'Unknown');
      await expect(inherited).not.toContainText('3600'); await expect(inherited).not.toContainText('7200');
      await page.getByTestId(`dns.record.${kind}.102.edit`).click(); await expect(ttl).toHaveValue(''); await expect(ttl).not.toHaveAttribute('placeholder', '3600'); await expect(ttl).not.toHaveAttribute('placeholder', '7200');
      await expect(page.getByTestId('dns.records.edit.ttl.help')).toContainText(language === 'cs' ? 'není známá' : 'unknown');
      await expectNoDocumentHorizontalOverflow(page);
      if (process.env['AUDIT_CLEAN_CAPTURE'] === '1') await page.screenshot({ path: info.outputPath(`unknown-default-${id}.png`), fullPage: true, scale: 'css' });
      await page.keyboard.press('Escape');
    }
    await page.goto(base + '21'); await expect(inherited).toContainText('7200 s'); expect(payloads).toHaveLength(2); expect(errors).toEqual([]);
  });
}
