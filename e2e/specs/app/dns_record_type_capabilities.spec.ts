import { expect, test } from '@playwright/test';
import type { DnsRecord__CreateOutput } from 'vpsadmin-typescript-client';

import { bootstrapVpsAdminWindow, installHaveApiMock } from '../../fixtures';

test.describe('DNS record type capabilities', () => {
  test('@pr-smoke @pr-smoke-mobile exposes and validates every live API record type', async ({ page }, testInfo) => {
    await bootstrapVpsAdminWindow(page, { sessionToken: 'TEST' });

    let createPayload: unknown;
    let records: DnsRecord__CreateOutput[] = [];

    await installHaveApiMock(page, {
      user: { id: 1, login: 'test', level: 1 },
      handlers: {
        'GET dns_zones/10': () => ({
          dns_zone: {
            id: 10,
            name: 'example.test.',
            enabled: true,
            dnssec_enabled: false,
            default_ttl: 600,
            object_state: 'active',
          },
        }),
        'GET dns_records': () => ({ dns_records: records }),
        'GET dns_record_logs': () => ({ dns_record_logs: [] }),
        'POST dns_records': async ({ request }) => {
          createPayload = await request.postDataJSON();
          if (!createPayload || typeof createPayload !== 'object' || !('dns_record' in createPayload)) {
            throw new Error('Expected a namespaced DNS record request');
          }
          const input = createPayload.dns_record;
          if (!input || typeof input !== 'object' || Array.isArray(input)) {
            throw new Error('Expected DNS record input fields');
          }
          const priority = 'priority' in input ? input.priority : undefined;
          if (priority !== undefined && priority !== null && typeof priority !== 'number') {
            throw new Error('Expected a numeric DNS record priority');
          }
          const created = {
            id: 101,
            ...input,
            dns_zone: { id: 10 },
            enabled: true,
            priority: priority ?? null,
            dynamic_update_url: null,
          };
          records = [created];
          return { dns_record: created };
        },
      },
    });

    await page.goto('/app/dns/zones/10');
    await page.getByTestId('dns.records.create.open').click();

    const modal = page.getByTestId('dns.records.create.modal');
    const typeSelect = page.getByTestId('dns.records.create.type');
    const content = page.getByTestId('dns.records.create.content');
    const submit = page.getByTestId('dns.records.create.submit');
    await expect(modal).toBeVisible();
    await expect(typeSelect.locator('option')).toHaveText([
      'A',
      'AAAA',
      'CAA',
      'CNAME',
      'DS',
      'MX',
      'NS',
      'PTR',
      'SRV',
      'SSHFP',
      'TLSA',
      'TXT',
    ]);

    await expect(page.getByTestId('dns.records.create.dynamic')).toBeVisible();
    await expect(page.getByTestId('dns.records.create.priority')).toHaveCount(0);
    await page.getByTestId('dns.records.create.dynamic').check();

    await typeSelect.selectOption('MX');
    await expect(page.getByTestId('dns.records.create.dynamic')).toHaveCount(0);
    await expect(page.getByTestId('dns.records.create.priority')).toBeVisible();
    await page.getByTestId('dns.records.create.priority').fill('10');
    await modal.screenshot({ path: testInfo.outputPath('dns-editor-mx-priority.png') });

    await typeSelect.selectOption('DS');
    await expect(page.getByTestId('dns.records.create.priority')).toHaveCount(0);
    await expect(page.getByTestId('dns.records.create.content.help')).toContainText('digest');
    await page.getByTestId('dns.records.create.name').fill('child');
    await content.fill(`60485 13 2 ${'A'.repeat(63)}`);
    await expect(page.getByTestId('dns.records.create.content.validation')).toBeVisible();
    await expect(submit).toBeDisabled();
    await modal.screenshot({ path: testInfo.outputPath('dns-editor-ds-invalid.png') });
    await content.fill(`60485 13 2 ${'A'.repeat(64)}`);
    await expect(page.getByTestId('dns.records.create.content.validation')).toHaveCount(0);
    await expect(submit).toBeEnabled();

    await typeSelect.selectOption('SSHFP');
    await expect(page.getByTestId('dns.records.create.content.help')).toContainText('fingerprint');
    await content.fill(`4 2 ${'B'.repeat(63)}`);
    await expect(submit).toBeDisabled();
    await modal.screenshot({ path: testInfo.outputPath('dns-editor-sshfp-invalid.png') });
    await content.fill(`4 2 ${'B'.repeat(64)}`);
    await expect(submit).toBeEnabled();

    await typeSelect.selectOption('TLSA');
    await expect(page.getByTestId('dns.records.create.content.help')).toContainText('association');
    await content.fill(`3 1 1 ${'C'.repeat(63)}`);
    await expect(submit).toBeDisabled();
    await modal.screenshot({ path: testInfo.outputPath('dns-editor-tlsa-invalid.png') });
    await content.fill(`3 1 1 ${'C'.repeat(64)}`);
    await expect(submit).toBeEnabled();

    await typeSelect.selectOption('DS');
    await content.fill(`60485 13 2 ${'A'.repeat(64)}`);

    const screenshot = process.env['E2E_DNS_RECORD_TYPES_SCREENSHOT']?.trim();
    if (screenshot) {
      await content.evaluate((input) => {
        input.scrollLeft = 0;
        input.blur();
      });
      const suffix = testInfo.project.name === 'mobile-chrome' ? '-mobile' : '-desktop';
      await page.screenshot({ path: screenshot.replace(/\.png$/i, `${suffix}.png`), fullPage: true });
    }

    await submit.click();

    await expect.poll(() => createPayload).toMatchObject({ dns_record: { type: 'DS' } });
    expect(createPayload).not.toHaveProperty('dns_record.priority');
    expect(createPayload).toMatchObject({ dns_record: { dynamic_update_enabled: false } });
    const recordItem = page.viewportSize()!.width < 768
      ? page.getByTestId('dns.record.card.101')
      : page.getByTestId('dns.record.row.101');
    await expect(recordItem).toContainText('DS');
  });
});
