import { expect, test } from '@playwright/test';

import { bootstrapVpsAdminWindow, installHaveApiMock, setUiSettingsLocalStorage } from '../../fixtures';

for (const language of ['en', 'cs'] as const) {
  for (const mode of ['member', 'admin'] as const) {
    test(`@pr-smoke @pr-smoke-mobile optional DNS flags remain unknown (${language}, ${mode})`, async ({ page }, testInfo) => {
      await bootstrapVpsAdminWindow(page);
      await setUiSettingsLocalStorage(page, { language, theme: 'dark' });
      let nullZoneFlag = false;
      await installHaveApiMock(page, { user: { id: 1, login: 'demo', level: mode === 'admin' ? 100 : 1 }, handlers: {
        'GET dns_zones/10': () => ({ dns_zone: {
          id: 10, name: 'flags.example.test', source: 'internal_source', dnssec_enabled: false,
          ...(nullZoneFlag ? { enabled: null } : {}), user: { id: 1, login: 'demo' }, default_ttl: 3600,
        } }),
        'GET transaction_chains': () => ({ transaction_chains: [] }),
        'GET dns_record_logs': () => ({ dns_record_logs: [] }),
        'GET dns_records': () => ({ dns_records: [
          { id: 601, name: 'missing', type: 'A', content: '192.0.2.1', ttl: 3600 },
          { id: 602, name: 'null', type: 'A', content: '192.0.2.2', ttl: 3600, enabled: null, dynamic: null },
          { id: 603, name: 'disabled', type: 'A', content: '192.0.2.3', ttl: 3600, enabled: false, dynamic: false },
          { id: 604, name: 'enabled', type: 'A', content: '192.0.2.4', ttl: 3600, enabled: true, dynamic: true },
        ] }),
      } });
      for (const state of ['missing', 'null'] as const) {
        nullZoneFlag = state === 'null';
        if (state === 'missing') await page.goto(`${mode === 'admin' ? '/admin' : '/app'}/dns/zones/10`);
        else await page.reload();
        const mobile = testInfo.project.name.includes('mobile');
        const item = (id: number) => page.getByTestId(`dns.record.${mobile ? 'card' : 'row'}.${id}`);
        await expect(item(604)).toBeVisible();
        await page.screenshot({ path: testInfo.outputPath(`dns-flags-${state}-${language}-${mode}.png`), fullPage: true, scale: 'css' });
        const unknown = language === 'cs' ? 'Neznámý stav' : 'Unknown';
        await expect.soft(page.getByTestId('dns.zone.header')).toContainText(unknown, { timeout: 1_000 });
        for (const id of [601, 602]) {
          await expect.soft(item(id)).toContainText(unknown, { timeout: 1_000 });
          if (mobile) await expect.soft(item(id)).toContainText('DDNS', { timeout: 1_000 });
        }
        await expect(item(603)).toContainText(language === 'cs' ? 'Zakázáno' : 'Disabled');
        await expect(item(604)).toContainText(language === 'cs' ? 'Povoleno' : 'Enabled');
      }
    });
  }
}

test.describe('DNS zone records live API contract', () => {
  let recordRequestQueries: string[];

  test.beforeEach(async ({ page }) => {
    recordRequestQueries = [];
    await bootstrapVpsAdminWindow(page, {
      sessionToken: 'TEST',
    });

    const zone = {
      id: 10,
      name: 'zone10.example',
      role: 'primary',
      enabled: true,
      dnssec_enabled: false,
      serial: 2026012601,
      default_ttl: 3600,
    };

    const records = Array.from({ length: 100 }, (_, i) => 300 - i).map((id) => ({
      id,
      dns_zone: { id: 10 },
      name: `host${id}`,
      ttl: 3600,
      type: id % 3 === 0 ? 'A' : id % 3 === 1 ? 'AAAA' : 'TXT',
      content:
        id % 3 === 2 ? `"hello-${id}"` : id % 3 === 1 ? `2001:db8::${id}` : `192.0.2.${id % 255}`,
      priority: null,
      enabled: id % 2 === 0,
      managed: id === 300,
      dynamic: id % 5 === 0,
      comment: id % 7 === 0 ? 'note' : null,
      dynamic_update_url: null,
    }));

    await installHaveApiMock(page, {
      user: { id: 1, login: 'test', level: 1 },
      handlers: {
        'GET dns_zones/10': () => ({ dns_zone: zone }),
        'GET dns_record_logs': () => ({ dns_record_logs: [], _meta: { total_count: 0 } }),
        'GET dns_records': ({ searchParams }) => {
          recordRequestQueries.push(searchParams.toString());
          const allowedParams = new Set(['dns_record[dns_zone]']);
          const unsupportedParams = Array.from(searchParams.keys()).filter(
            (key) => key.startsWith('dns_record[') && !allowedParams.has(key)
          );

          if (unsupportedParams.length > 0) {
            return { status: false, message: `Unsupported parameters: ${unsupportedParams.join(', ')}`, response: null };
          }

          if (searchParams.get('dns_record[dns_zone]') !== '10') {
            return { dns_records: [], _meta: { total_count: 0 } };
          }

          return { dns_records: records, _meta: { total_count: records.length } };
        },
      },
    });
  });

  test('@pr-smoke @pr-smoke-mobile loads the complete zone, searches locally and keeps managed records read-only', async ({
    page,
  }, testInfo) => {
    const mobile = testInfo.project.name === 'mobile-chrome';
    const itemKind = mobile ? 'card' : 'row';

    await page.goto('/app/dns/zones/10?from_id=251&page=2&limit=50');

    await expect(page.getByTestId('dns.records.list')).toBeVisible();
    await expect(page).toHaveURL((url) =>
      !url.searchParams.has('from_id') && !url.searchParams.has('page') && !url.searchParams.has('limit')
    );

    await expect(page.getByTestId(`dns.record.${itemKind}.300`)).toBeVisible();
    await expect(page.getByTestId(`dns.record.${itemKind}.300.managed`)).toBeVisible();
    await expect(page.getByTestId(`dns.record.${itemKind}.300.read_only`)).toBeVisible();
    await expect(page.getByTestId(`dns.record.${itemKind}.300.edit`)).toHaveCount(0);
    await expect(page.getByTestId(`dns.record.${itemKind}.300.delete`)).toHaveCount(0);

    await expect(page.getByTestId(`dns.record.${itemKind}.299.edit`)).toBeVisible();
    await expect(page.getByTestId(`dns.record.${itemKind}.299.delete`)).toBeVisible();
    await expect(page.getByTestId('dns.records.pagination.desktop')).toHaveCount(0);
    await expect(page.getByTestId('dns.records.pagination.mobile')).toHaveCount(0);

    await expect.poll(() => recordRequestQueries.length).toBeGreaterThan(0);
    expect(recordRequestQueries.every((query) => {
      const params = new URLSearchParams(query);
      return params.get('dns_record[dns_zone]') === '10'
        && !params.has('dns_record[limit]')
        && !params.has('dns_record[from_id]')
        && !params.has('dns_record[q]');
    })).toBe(true);

    const requestsBeforeSearch = recordRequestQueries.length;
    await page.getByTestId('dns.records.search.input').fill('host201');
    await expect(page).toHaveURL((url) => url.searchParams.get('q') === 'host201');
    await expect(page.getByTestId(`dns.record.${itemKind}.201`)).toBeVisible();
    await expect(page.getByTestId(`dns.record.${itemKind}.300`)).toHaveCount(0);
    await page.waitForTimeout(250);
    expect(recordRequestQueries).toHaveLength(requestsBeforeSearch);
  });
});
