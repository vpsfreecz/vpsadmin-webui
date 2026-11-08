import fs from 'node:fs';
import path from 'node:path';
import { expect, test } from '@playwright/test';
import { bootstrapVpsAdminWindow, installHaveApiMock } from '../../fixtures';
import { defaultHaveApiDescription } from '../../fixtures/haveapi';
import { expectNoDocumentHorizontalOverflow } from '../../helpers/horizontalOverflow';

function readinessDescription() {
  const output = (fields: Record<string, string>) => ({
    actions: {
      index: {
        output: { parameters: Object.fromEntries(Object.entries(fields).map(([key, type]) => [key, { type }])) },
      },
    },
  });
  return {
    ...defaultHaveApiDescription(),
    resources: {
      dns_server_zone: output({ zone_status: 'String' }),
      dns_zone_transfer: output({
        transfer_check_status: 'String',
        last_transfer_check_at: 'Datetime',
        transfer_check_failed_count: 'Integer',
        transfer_check_success_count: 'Integer',
        transfer_check_pending_count: 'Integer',
        transfer_check_server_count: 'Integer',
      }),
      dns_server_zone_primary_transfer_state: output({
        status: 'String',
        evidence_current: 'Boolean',
        last_attempt_at: 'Datetime',
        dns_server_zone: 'Resource',
        dns_zone_transfer: 'Resource',
        last_attempt_kind: 'String',
      }),
      dns_server_zone_transfer_log: output({ attempt_kind: 'String' }),
    },
  };
}

for (const language of ['en', 'cs'] as const) {
  for (const admin of [false, true]) {
    test(`DNS direct readiness and serving stay separate (${language}, ${admin ? 'admin' : 'member'})`, async ({
      page,
    }, testInfo) => {
      await page.addInitScript((language) => {
        localStorage.setItem('vpsadmin.uiSettings.v1', JSON.stringify({ language }));
      }, language);
      await bootstrapVpsAdminWindow(page);
      let missing = false;
      let recovered = false;
      let readded = false;
      const checkedAt = '2026-11-08T15:00:00Z';
      const transfer = {
        id: 3,
        peer_type: 'primary_type',
        dns_zone: { id: 42 },
        host_ip_address: {
          id: 4,
          addr: '192.0.2.53',
          ip_address: { id: 5, user: { id: 10 }, network_interface: null },
        },
        transfer_check_status: 'failed',
        transfer_check_failed_count: 1,
        transfer_check_success_count: 0,
        transfer_check_pending_count: 1,
        transfer_check_server_count: 2,
        last_transfer_check_at: checkedAt,
      };
      await installHaveApiMock(page, {
        description: readinessDescription(),
        user: { id: admin ? 1 : 10, login: admin ? 'admin' : 'member', level: admin ? 90 : 1 },
        handlers: {
          'GET dns_record_logs': () => ({ dns_record_logs: [] }),
          'GET dns_zones/42': () => ({
            dns_zone: { id: 42, name: 'example.test', source: 'external_source', enabled: true, user: { id: 10 } },
          }),
          'GET dns_zone_transfers': ({ searchParams }) => {
            const current = {
              ...transfer,
              transfer_check_status: readded ? 'pending' : recovered ? 'success' : 'failed',
            };
            return {
              // The independent existence check sees a primary even when the current page is empty.
              dns_zone_transfers:
                searchParams.get('dns_zone_transfer[peer_type]') === 'primary_type'
                  ? missing
                    ? []
                    : [current]
                  : missing
                    ? []
                    : [current, { id: 2, peer_type: 'secondary_type', host_ip_address: { id: 8 } }],
            };
          },
          'GET dns_server_zones': () => ({
            dns_server_zones: [
              {
                id: 20,
                type: 'secondary_type',
                dns_server: { id: 30, name: 'ns3.example.test' },
                zone_status: 'serving',
                serial: 1234,
                last_check_at: checkedAt,
              },
            ],
          }),
          'GET dns_server_zone_primary_transfer_states': () => ({
            dns_server_zone_primary_transfer_states: missing
              ? []
              : [
                  {
                    id: 1,
                    status: recovered ? 'success' : 'failed',
                    evidence_current: !readded,
                    last_attempt_kind: 'ixfr_probe',
                    last_attempt_at: checkedAt,
                    reason: recovered ? null : 'Synthetic primary connection failure',
                    primary_serial: 1234,
                    secondary_serial: 1234,
                    dns_server_zone: { id: 20, dns_server: { name: 'ns3.example.test' } },
                    dns_zone_transfer: transfer,
                    secondary_source_addr: '192.0.2.3',
                  },
                  {
                    id: 2,
                    status: 'success',
                    evidence_current: false,
                    last_attempt_kind: 'ixfr_probe',
                    last_attempt_at: checkedAt,
                    last_success_at: checkedAt,
                    dns_server_zone: { id: 21, dns_server: { name: 'ns4.example.test' } },
                    dns_zone_transfer: transfer,
                  },
                ],
          }),
          'GET dns_server_zone_transfer_logs': () => ({
            dns_server_zone_transfer_logs: [
              {
                id: 5,
                status: 'success',
                attempt_kind: 'transfer',
                primary_addr: '192.0.2.4',
                serial: 1234,
                event_at: checkedAt,
                message: 'Synthetic peer transfer',
              },
              { id: 4, status: 'failed', attempt_kind: 'legacy', primary_addr: '192.0.2.53', event_at: checkedAt },
            ],
          }),
        },
      });
      const base = admin ? '/admin' : '/app';
      await page.goto(`${base}/dns/zones/42/transfers`);
      const failed = page.getByTestId('dns.readiness.path.1');
      const stale = page.getByTestId('dns.readiness.path.2');
      await expect(failed).toContainText('Synthetic primary connection failure');
      await expect(failed).toContainText(language === 'cs' ? 'selhání' : 'Failed');
      await expect(stale).toContainText(language === 'cs' ? 'čeká' : 'Pending');
      await expect(page.getByTestId('dns.transfers.status')).toContainText(language === 'cs' ? 'poskytuje' : 'Serving');
      await expect(page.getByTestId('dns.primary.missing')).toHaveCount(0);
      await expect(page.locator('[data-testid="dns.primary.detached.3"]:visible')).toBeVisible();
      await expect(page.getByTestId('dns.transfers.log')).toContainText(
        language === 'cs' ? 'Historický' : 'Historical'
      );
      await expectNoDocumentHorizontalOverflow(page);
      if (process.env['E2E_SCREENSHOT_DIR']) {
        fs.mkdirSync(process.env['E2E_SCREENSHOT_DIR'], { recursive: true });
        await page.screenshot({
          path: path.join(
            process.env['E2E_SCREENSHOT_DIR'],
            `dns-readiness-${language}-${admin ? 'admin' : 'member'}-${testInfo.project.name}.png`
          ),
          fullPage: true,
        });
      }
      recovered = true;
      await page.reload();
      await expect(failed).toContainText(language === 'cs' ? 'připraveno' : 'Ready');
      await expect(page.getByTestId('dns.transfers.status')).toContainText('1234');
      missing = true;
      await page.reload();
      await expect(page.getByTestId('dns.primary.missing')).toBeVisible();
      await expect(page.getByTestId('dns.transfers.status')).toContainText(language === 'cs' ? 'poskytuje' : 'Serving');
      missing = false;
      readded = true;
      await page.reload();
      await expect(page.getByTestId('dns.primary.missing')).toHaveCount(0);
      await expect(failed).toContainText(language === 'cs' ? 'čeká' : 'Pending');
    });
  }
}

test('old DNS API keeps ordinary controls and history without readiness requests', async ({ page }) => {
  await bootstrapVpsAdminWindow(page);
  let pathsCalled = false;
  await installHaveApiMock(page, {
    handlers: {
      'GET dns_zones/42': () => ({
        dns_zone: { id: 42, source: 'external_source', name: 'example.test', user: { id: 1 } },
      }),
      'GET dns_zone_transfers': () => ({ dns_zone_transfers: [] }),
      'GET dns_server_zones': () => ({ dns_server_zones: [] }),
      'GET dns_server_zone_transfer_logs': () => ({
        dns_server_zone_transfer_logs: [{ id: 1, status: 'failed', reason: 'Historical attempt' }],
      }),
      'GET dns_server_zone_primary_transfer_states': () => {
        pathsCalled = true;
        return {};
      },
    },
  });
  await page.goto('/app/dns/zones/42/transfers');
  await expect(page.getByTestId('dns.readiness.unavailable')).toBeVisible();
  await expect(page.getByTestId('dns.transfers.create.open')).toBeEnabled();
  await expect(page.getByTestId('dns.transfers.log')).toContainText('Historical attempt');
  expect(pathsCalled).toBe(false);
});
