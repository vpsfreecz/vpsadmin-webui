import { expect, test, type Page } from '@playwright/test';
import { bootstrapVpsAdminWindow, installHaveApiMock, setUiSettingsLocalStorage } from '../../fixtures';
import { expectNoDocumentHorizontalOverflow } from '../../helpers/horizontalOverflow';
type FixtureRecord = { id: number; name: string; type: string; content: string; ttl?: number; enabled: boolean; dynamic_update_enabled?: boolean };

type Scope = 'app' | 'admin';
async function fixture(page: Page, scope: Scope, language: 'cs' | 'en') {
  await bootstrapVpsAdminWindow(page);
  await setUiSettingsLocalStorage(page, { language, theme: 'dark' });
  const zones = [
    { id: 10, name: 'primary.example.test.', source: 'internal_source', role: 'forward_role', dnssec_enabled: true },
    { id: 20, name: 'secondary.example.test.', source: 'external_source', role: 'forward_role', dnssec_enabled: false },
    { id: 30, name: '2.0.192.in-addr.arpa.', source: 'internal_source', role: 'reverse_role', dnssec_enabled: false },
    { id: 40, name: 'unknown.example.test.', role: 'forward_role' },
  ].map((zone) => ({ ...zone, user: { id: 7 }, enabled: true, email: 'dns@example.test', default_ttl: 600, object_state: 'active' }));
  let records: FixtureRecord[] = [{ id: 100, name: '*', type: 'A', content: '192.0.2.10', ttl: 600, enabled: true, dynamic_update_enabled: false }];
  const state = { updates: [] as unknown[], created: [] as unknown[], dnssecReads: 0 };
  await installHaveApiMock(page, { user: { id: 7, login: 'synthetic-dns-member', level: scope === 'admin' ? 99 : 1 }, handlers: {
    'GET dns_zones': () => ({ dns_zones: zones }),
    ...Object.fromEntries(zones.map((zone) => [`GET dns_zones/${zone.id}`, () => ({ dns_zone: zone })])),
    'GET dns_records': () => ({ dns_records: records }),
    'GET dns_record_logs': () => ({ dns_record_logs: [] }),
    'GET transaction_chains': () => ({ transaction_chains: [] }),
    'GET dns_zone_transfers': () => ({ dns_zone_transfers: [] }),
    'GET dns_server_zones': () => ({ dns_server_zones: [] }),
    'GET dnssec_records': () => { state.dnssecReads += 1; return { dnssec_records: [] }; },
    'PUT dns_zones/20': ({ reqJson }) => { state.updates.push(reqJson); return { dns_zone: zones[1] }; },
    'PUT dns_zones/10': ({ reqJson }) => { state.updates.push(reqJson); return { dns_zone: zones[0] }; },
    'POST dns_records': ({ reqJson }) => {
      state.created.push(reqJson);
      const payload = (reqJson as { dns_record: Omit<FixtureRecord, 'id'> }).dns_record;
      records = [...records, { ...payload, id: 101 }];
      return { dns_record: records.at(-1) };
    },
    'PUT dns_records/101': ({ reqJson }) => {
      const payload = (reqJson as { dns_record: Partial<FixtureRecord> }).dns_record;
      records = records.map((record) => record.id === 101 ? { ...record, ...payload } : record);
      return { dns_record: records.find((record) => record.id === 101) };
    },
  } });
  return state;
}

for (const scope of ['app', 'admin'] as const) for (const language of ['cs', 'en'] as const) {
  const primary = language === 'cs' ? 'Primární' : 'Primary';
  const secondary = language === 'cs' ? 'Sekundární' : 'Secondary';
  const forward = language === 'cs' ? 'Dopředná' : 'Forward';
  const reverse = language === 'cs' ? 'Reverzní' : 'Reverse';
  const unsigned = language === 'cs' ? 'Bez DNSSEC' : 'No DNSSEC';
  test(`@pr-smoke @pr-smoke-mobile ${scope} ${language} zone kinds and directions are distinct in list and detail`, async ({ page, isMobile }, info) => {
    await fixture(page, scope, language);
    await page.goto(`/${scope}/dns`);
    const prefix = `dns.zones.${isMobile ? 'card' : 'row'}`;
    await expect(page.getByTestId(`${prefix}.10`)).toContainText(primary);
    await expect(page.getByTestId(`${prefix}.10`)).toContainText(forward);
    await expect(page.getByTestId(`${prefix}.20`)).toContainText(secondary);
    await expect(page.getByTestId(`${prefix}.20`)).toContainText(forward);
    await expect(page.getByTestId(`${prefix}.20`)).not.toContainText('DNSSEC');
    await expect(page.getByTestId(`${prefix}.30`)).toContainText(primary);
    await expect(page.getByTestId(`${prefix}.30`)).toContainText(reverse);
    await expect(page.getByTestId(`${prefix}.40`)).not.toContainText(primary);
    await expect(page.getByTestId(`${prefix}.40`)).not.toContainText(unsigned);
    await page.getByTestId('dns.zones.help').locator('summary').click();
    await expect(page.getByTestId('dns.zones.help')).toContainText('DNSSEC');
    await expectNoDocumentHorizontalOverflow(page);
    if (scope === 'app' && language === 'cs') await page.screenshot({ path: info.outputPath('dns-list-cs.png'), fullPage: true });
    await page.goto(`/${scope}/dns/zones/20`);
    await expect(page.getByTestId('dns.transfers.page')).toBeVisible();
    await expect(page.getByTestId('dns.zone.header')).toContainText(secondary);
    await expect(page.getByTestId('dns.zone.header')).not.toContainText('DNSSEC');
    await page.goto(`/${scope}/dns/zones/10`);
    await expect(page.getByTestId('dns.zone.header')).toContainText(primary);
    await expect(page.getByTestId('dns.zone.header')).toContainText('DNSSEC');
  });

  test(`@pr-smoke @pr-smoke-mobile ${scope} ${language} secondary settings never send DNSSEC and a direct DNSSEC URL does not query keys`, async ({ page }) => {
    const state = await fixture(page, scope, language);
    await page.goto(`/${scope}/dns/zones/20/settings`);
    await expect(page.getByTestId('dns.settings.dnssec')).toHaveCount(0);
    await page.getByTestId('dns.settings.label').fill('changed label');
    await page.getByTestId('dns.settings.save').click();
    await expect.poll(() => state.updates.length).toBe(1);
    expect(state.updates[0]).toMatchObject({ dns_zone: { label: 'changed label' } });
    expect((state.updates[0] as { dns_zone: object }).dns_zone).not.toHaveProperty('dnssec_enabled');
    await page.goto(`/${scope}/dns/zones/20/dnssec`);
    await expect(page.getByTestId('dns.dnssec.managed_elsewhere')).toBeVisible();
    expect(state.dnssecReads).toBe(0);
    await page.goto(`/${scope}/dns/zones/10/settings`);
    await expect(page.getByTestId('dns.settings.dnssec')).toBeVisible();
    await expect(page.getByTestId('dns.settings.dnssec')).toBeChecked();
    await page.getByTestId('dns.settings.save').click();
    await expect.poll(() => state.updates.length).toBe(2);
    expect(state.updates[1]).toMatchObject({ dns_zone: { dnssec_enabled: true } });
  });

  test(`@pr-smoke @pr-smoke-mobile ${scope} ${language} bare wildcard records render and can be created and edited unchanged`, async ({ page, isMobile }) => {
    const state = await fixture(page, scope, language);
    await page.goto(`/${scope}/dns/zones/10`);
    const prefix = `dns.record.${isMobile ? 'card' : 'row'}`;
    await expect(page.getByTestId(`${prefix}.100`)).toContainText('*');
    await expect(page.getByTestId(`${prefix}.100.validation`)).toHaveCount(0);
    await page.getByTestId('dns.records.create.open').click();
    await page.getByTestId('dns.records.create.name').fill('*');
    await page.getByTestId('dns.records.create.type').selectOption('TXT');
    await page.getByTestId('dns.records.create.content').fill('synthetic wildcard');
    await expect(page.getByTestId('dns.records.create.submit')).toBeEnabled();
    await page.getByTestId('dns.records.create.submit').click();
    await expect(page.getByTestId(`${prefix}.101`)).toBeVisible();
    expect(state.created[0]).toMatchObject({ dns_record: { name: '*', type: 'TXT', content: 'synthetic wildcard' } });
    await page.getByTestId(`${prefix}.101.edit`).click();
    await page.getByTestId('dns.records.edit.content').fill('updated synthetic wildcard');
    await page.getByTestId('dns.records.edit.submit').click();
    await expect(page.getByTestId(`${prefix}.101`)).toContainText('updated synthetic wildcard');
    await expect(page.getByTestId(`${prefix}.101.validation`)).toHaveCount(0);
  });
}
