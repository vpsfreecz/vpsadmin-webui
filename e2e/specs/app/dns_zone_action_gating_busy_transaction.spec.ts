import { expect, test } from '@playwright/test';

import { bootstrapVpsAdminWindow, installHaveApiMock, setUiSettingsLocalStorage } from '../../fixtures';

test.describe('DNS zone action gating (busy transaction)', () => {
  test('disables record create and settings save while a transaction chain is active', async ({ page }) => {
    await bootstrapVpsAdminWindow(page, { sessionToken: 'TEST' });

    await installHaveApiMock(page, {
      user: { id: 1, login: 'test', level: 1 },
      handlers: {
        'GET dns_zones/10': () => ({
          dns_zone: { id: 10, name: 'example.com', object_state: 'active' },
        }),
        'GET dns_records': () => ({ dns_records: [] }),
        'GET dns_record_logs': () => ({ dns_record_logs: [] }),
        'GET transaction_chains': (ctx) => {
          const cls = ctx.searchParams.get('transaction_chain[class_name]');
          const rowId = ctx.searchParams.get('transaction_chain[row_id]');
          if (cls === 'DnsZone' && rowId === '10') {
            return {
              transaction_chains: [
                {
                  id: 999,
                  state: 'staged',
                  name: 'DnsZone#10 update',
                  progress: 0,
                  size: 1,
                },
              ],
            };
          }
          return { transaction_chains: [] };
        },
        'GET transaction_chains/999': () => ({
          transaction_chain: { id: 999, state: 'staged', name: 'DnsZone#10 update', progress: 0, size: 1 },
        }),
      },
    });

    await page.goto('/app/dns/zones/10');
    await expect(page.getByTestId('dns.records.list')).toBeVisible();

    // Attempt to open "Add record" while the zone is busy.
    await expect(page.getByTestId('dns.records.create.open')).toBeVisible();
    await page.getByTestId('dns.records.create.open').click({ force: true });

    // We should get the generic disabled-reason modal, not the create form.
    await expect(page.getByTestId('dns.records.create.open.reason')).toBeVisible();
    await expect(page.getByTestId('dns.records.create.modal')).toBeHidden();

    // Settings save should also be blocked.
    await page.goto('/app/dns/zones/10/settings');
    await expect(page.getByTestId('dns.settings.save')).toBeVisible();

    await page.getByTestId('dns.settings.save').click({ force: true });
    await expect(page.getByTestId('dns.settings.save.reason')).toBeVisible();
  });
});

test('@content-storage-dns recent DNS history preserves labels, progress and read failure', async ({ page }, testInfo) => {
  const language = testInfo.project.name === 'mobile-chrome' ? 'cs' : 'en';
  await bootstrapVpsAdminWindow(page, { sessionToken: 'TEST' });
  await setUiSettingsLocalStorage(page, { language, theme: 'dark' });
  let logsFailed = false;
  const chains = [
    {
      id: 701, label: null, state: 'done', progress: 10, size: 10,
      created_at: '2026-11-04T12:00:00Z',
      concerns: [{ class_name: 'DnsZone', row_id: 10 }],
    },
    {
      id: 702, label: 'Update DNS records', state: 'failed', progress: 4, size: 10,
      created_at: '2026-11-04T11:00:00Z',
      concerns: [{ class_name: 'DnsZone', row_id: 10 }],
    },
  ];
  await installHaveApiMock(page, {
    user: { id: 1, login: 'test', level: 1 },
    handlers: {
      'GET dns_zones/10': () => ({ dns_zone: {
        id: 10, name: 'example.com', role: 'primary', source: 'internal_source',
        user: { id: 1, login: 'test' }, object_state: 'active',
        enabled: true, dnssec_enabled: false, default_ttl: 3600,
      } }),
      'GET dns_records': () => ({ dns_records: [] }),
      'GET dns_record_logs': () => logsFailed
        ? { status: 503, contentType: 'application/json', body: JSON.stringify({ status: false, message: 'DNS record history unavailable' }) }
        : { dns_record_logs: [] },
      'GET transaction_chains': ({ searchParams }) => ({ transaction_chains:
        searchParams.get('transaction_chain[class_name]') === 'DnsZone' &&
        searchParams.get('transaction_chain[row_id]') === '10' ? chains : [],
      }),
    },
  });

  await page.goto('/app/dns/zones/10');
  await expect(page.getByTestId('dns.records.list')).toBeVisible();
  await expect(page.getByText(language === 'cs'
    ? 'Seznam nemusí obsahovat všechny transakce týkající se této zóny.'
    : 'This list may not include every transaction related to this zone.', { exact: true })).toBeVisible();
  const fallback = page.getByRole('link', { name: '#701', exact: true });
  const fallbackRow = fallback.locator('xpath=ancestor::li[1]');
  const named = page.getByRole('link', { name: 'Update DNS records', exact: true });
  const namedRow = named.locator('xpath=ancestor::li[1]');
  await expect(fallback).toBeVisible();
  await expect(fallback).toHaveAttribute('href', '/app/transactions/701');
  await expect(fallbackRow).toContainText('10/10 (100%)');
  expect((await fallbackRow.innerText()).match(/#701/g)).toHaveLength(1);
  await expect(namedRow).toContainText('#702');
  await expect(namedRow).toContainText('4/10 (40%)');
  await expect(namedRow).toHaveClass(/\bbg-danger-row\b/);
  await expect(page.locator('a[href="/app/transactions/items?transaction_chain=701"]')).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath(`recent-history-${language}.png`), fullPage: true, scale: 'css' });

  logsFailed = true;
  await page.reload();
  await expect(page.getByText(language === 'cs'
    ? 'Načtení transakčních řetězců selhalo.' : 'Failed to load transaction chains.', { exact: true })).toBeVisible();
  await expect(fallback).toHaveCount(0);
  await page.screenshot({ path: testInfo.outputPath(`recent-history-error-${language}.png`), fullPage: true, scale: 'css' });
});
