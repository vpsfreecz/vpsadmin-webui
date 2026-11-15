import { expect, test, type Page } from '@playwright/test';
import { bootstrapVpsAdminWindow, installHaveApiMock, setUiSettingsLocalStorage } from '../../fixtures';
import { expectNoDocumentHorizontalOverflow } from '../../helpers/horizontalOverflow';

const serverName = 'ns-long-label-for-rendered-review.infrastructure.example.test';
const ipv6 = '2001:db8:1111:2222:3333:4444:5555:53';
const server = { id: 201, name: serverName, ipv4_addr: '192.0.2.53', ipv6_addr: ipv6 };
const owner = { id: 7, login: 'dns-report-fixture', level: 1 };
const primary = {
  id: 21,
  name: 'primary.example.test.',
  source: 'internal_source',
  role: 'forward_role',
  serial: 101,
  enabled: true,
  dnssec_enabled: false,
  default_ttl: 3600,
  user: owner,
};
const secondary = { ...primary, id: 22, name: 'secondary.example.test.', source: 'external_source', serial: 1 };
const report = {
  id: 301,
  dns_zone: { id: 22 },
  dns_server: server,
  type: 'secondary_type',
  serial: 2026111401,
  last_check_at: '2026-11-15T02:00:00Z',
  loaded_at: '2026-11-15T01:00:00Z',
  refresh_at: '2026-11-15T03:00:00Z',
  expires_at: '2026-11-16T01:00:00Z',
  last_transfer_at: '2026-11-15T01:30:00Z',
  last_transfer_status: 'failed',
  last_transfer_reason_code: 'refused',
  last_transfer_reason: 'Refused by primary',
};
const peers = Array.from({ length: 12 }, (_, i) => ({
  id: 400 + i,
  dns_zone: { id: 22 },
  host_ip_address: { id: 500 + i, addr: `192.0.2.${i + 10}` },
  peer_type: 'primary_type',
  dns_tsig_key: null,
}));

async function prepare(page: Page, language: 'cs' | 'en', level: number) {
  const writes: string[] = [];
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(String(error)));
  page.on('request', (request) => {
    if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method()))
      writes.push(`${request.method()} ${new URL(request.url()).pathname}`);
  });
  await bootstrapVpsAdminWindow(page, { webuiNext: { uiSettings: { persistence: 'local' } } });
  await setUiSettingsLocalStorage(page, { language, theme: language === 'cs' ? 'dark' : 'light' });
  return { writes, errors, user: { ...owner, level } };
}

for (const language of ['cs', 'en'] as const) {
  for (const role of ['member', 'support-my', 'admin-my', 'admin-all'] as const) {
    test(`@pr-smoke @pr-smoke-mobile DNS configuration and server evidence ${role} ${language}`, async ({
      page,
      hasTouch,
    }, info) => {
      await page.setViewportSize(hasTouch ? { width: 320, height: 844 } : { width: 1440, height: 1000 });
      const { writes, errors, user } = await prepare(
        page,
        language,
        role === 'member' ? 1 : role === 'support-my' ? 21 : 99
      );
      const base = role === 'admin-all' ? '/admin' : '/app';
      const scopes: string[] = [];
      await installHaveApiMock(page, {
        user,
        handlers: {
          'GET users': () => ({ users: [user] }),
          'GET dns_zones': () => ({ dns_zones: [primary, secondary], _meta: { total_count: 2 } }),
          'GET dns_zones/21': () => ({ dns_zone: primary }),
          'GET dns_zones/22': () => ({ dns_zone: secondary }),
          'GET dns_zone_transfers': () => ({ dns_zone_transfers: peers }),
          'GET dns_server_zones': ({ searchParams }) => {
            const zone = searchParams.get('dns_server_zone[dns_zone]');
            expect(['21', '22']).toContain(zone);
            scopes.push(zone!);
            return {
              dns_server_zones:
                zone === '22'
                  ? [report]
                  : [
                      { ...report, id: 302, dns_zone: { id: 21 }, type: 'primary_type', serial: 100 },
                      {
                        id: 303,
                        dns_zone: { id: 21 },
                        dns_server: { id: 202, name: 'ns-unknown.example.test' },
                        type: 'secondary_type',
                        serial: null,
                      },
                      {
                        id: 304,
                        dns_zone: { id: 21 },
                        dns_server: { id: 203, name: 'ns-zero.example.test' },
                        type: 'primary_type',
                        serial: 0,
                      },
                    ],
            };
          },
          'GET dns_server_zone_transfer_logs': () => ({
            dns_server_zone_transfer_logs: [
              {
                id: 601,
                dns_server_zone: { id: 301, dns_server: server },
                event_at: report.last_transfer_at,
                status: 'failed',
                reason_code: 'refused',
                serial: null,
              },
            ],
          }),
          'GET dns_servers': () => ({ dns_servers: [server] }),
          'GET transaction_chains': () => ({ transaction_chains: [] }),
          'GET help_boxes': () => ({ help_boxes: [] }),
        },
      });
      await page.goto(base + '/dns');
      const prefix = hasTouch ? 'dns.zones.card.' : 'dns.zones.row.';
      await expect(page.getByTestId(prefix + '21')).toContainText('101');
      await expect(page.getByTestId(prefix + '22')).toContainText(
        language === 'cs' ? 'na primárním serveru' : 'Managed on primary server'
      );
      await page.goto(base + '/dns/zones/22/transfers');
      await expect(page.getByTestId('dns.zone.configured_serial')).toHaveText(
        language === 'cs' ? 'na primárním serveru' : 'Managed on primary server'
      );
      const status = page.getByTestId('dns.transfers.status');
      const rowId = `dns.transfers.status.${hasTouch ? 'card' : 'row'}.301`;
      const row = page.getByTestId(rowId);
      await expect(row).toBeVisible();
      await expect(row).toContainText(serverName);
      await expect(row).toContainText('2026111401');
      await expect(row).toContainText(language === 'cs' ? 'Poslední hlášený přenos' : 'Last reported transfer');
      await expect(row).toContainText(
        language === 'cs' ? 'Primární DNS server odmítl přenos.' : 'The primary DNS server refused the transfer.'
      );
      await expect(row.getByTestId(rowId + '.transfer')).toContainText('2026');
      await expect(row.getByTestId(rowId + '.transfer')).toContainText(
        language === 'cs' ? 'dostupnosti' : 'current availability'
      );
      const peerList = page.getByTestId(hasTouch ? 'dns.transfers.cards' : 'dns.transfers.table');
      await expect(peerList).toBeVisible();
      const statusBox = await status.boundingBox();
      expect(statusBox).not.toBeNull();
      expect(statusBox!.y).toBeLessThan((await peerList.boundingBox())!.y);
      expect(statusBox!.y).toBeLessThan((await page.getByTestId('dns.transfers.log').boundingBox())!.y);
      await row.scrollIntoViewIfNeeded();
      await expect(row.getByTestId(rowId + '.transfer')).toBeInViewport();
      const details = row.locator('summary');
      if (hasTouch) await details.tap();
      else {
        await details.focus();
        await page.keyboard.press('Enter');
      }
      await expect(row.getByTestId(rowId + '.ipv6')).toContainText(ipv6);
      await expect(row.getByTestId(rowId + '.ipv6.copy')).toHaveAccessibleName(
        language === 'cs' ? 'Kopírovat adresu IPv6' : 'Copy IPv6 address'
      );
      await expectNoDocumentHorizontalOverflow(page);
      await page.screenshot({ path: info.outputPath('secondary-reports.png'), fullPage: false });
      await page.goto(base + '/dns/zones/21/servers');
      await expect(page.getByTestId('dns.zone.configured_serial')).toHaveText('101');
      const serverPrefix = `dns.servers.${hasTouch ? 'card' : 'row'}.`;
      await expect(page.getByTestId(serverPrefix + '302')).toContainText(serverName);
      const serialCell = (id: number) =>
        hasTouch
          ? page
              .getByTestId(serverPrefix + id)
              .locator('dl > div')
              .first()
              .locator('dd')
          : page
              .getByTestId(serverPrefix + id)
              .locator('td')
              .nth(2);
      await expect(serialCell(302)).toHaveText('100');
      await expect(serialCell(303)).toHaveText(language === 'cs' ? 'neznámé' : 'Unknown');
      await expect(serialCell(304)).toHaveText('0');
      await expect(page.getByTestId(serverPrefix + '302')).toContainText(language === 'cs' ? 'Primární' : 'Primary');

      await expect(page.getByTestId(serverPrefix + '302.ipv6')).toContainText(ipv6);
      if (hasTouch) {
        await expect(page.getByTestId(serverPrefix + '302')).toContainText(
          language === 'cs' ? 'Přiřazení #302' : 'Assignment #302'
        );
        await expect
          .poll(() =>
            page.getByTestId(serverPrefix + '302').evaluate((element) => element.scrollWidth <= element.clientWidth)
          )
          .toBe(true);
      }
      await expect(page.getByTestId('dns.servers.create.open')).toHaveCount(role === 'admin-all' ? 1 : 0);
      await expectNoDocumentHorizontalOverflow(page);
      await page.screenshot({ path: info.outputPath('primary-server-identity.png'), fullPage: false });
      expect(scopes).toContain('21');
      expect(scopes).toContain('22');
      expect(writes).toEqual([]);
      expect(errors).toEqual([]);
      await info.attach('scope', {
        contentType: 'application/json',
        body: JSON.stringify({ role, language, fixtureAPI: true, liveWrites: 0, scopes, writes, errors }),
      });
    });
  }

  for (const broken of ['peers', 'reports'] as const) {
    test(`@pr-smoke @pr-smoke-mobile DNS independent ${broken} loading error retry ${language}`, async ({
      page,
      hasTouch,
    }) => {
      await page.setViewportSize(hasTouch ? { width: 320, height: 844 } : { width: 1440, height: 1000 });
      const { writes, errors, user } = await prepare(page, language, 1);
      let release: (() => void) | undefined;
      const pending = new Promise<void>((resolve) => {
        release = resolve;
      });
      let phase: 'pending' | 'error' | 'empty' | 'unknown' | 'success' = 'pending';
      const response = async (kind: 'peers' | 'reports') => {
        if (kind === broken && phase === 'pending') await pending;
        if (kind === broken && phase === 'error')
          return {
            status: 503,
            contentType: 'application/json',
            body: JSON.stringify({ status: false, message: 'Synthetic section unavailable', response: null }),
          };
        if (kind === 'peers') return { dns_zone_transfers: peers };
        if (broken === 'reports' && phase === 'empty') return { dns_server_zones: [] };
        return {
          dns_server_zones: [
            {
              ...report,
              ...(phase === 'unknown'
                ? {
                    last_transfer_status: null,
                    last_transfer_at: null,
                    last_transfer_reason_code: null,
                    last_transfer_reason: null,
                  }
                : phase === 'success'
                  ? { last_transfer_status: 'success' }
                  : {}),
            },
          ],
        };
      };
      await installHaveApiMock(page, {
        user,
        handlers: {
          'GET dns_zones/22': () => ({ dns_zone: secondary }),
          'GET dns_zone_transfers': () => response('peers'),
          'GET dns_server_zones': () => response('reports'),
          'GET dns_server_zone_transfer_logs': () => ({ dns_server_zone_transfer_logs: [] }),
          'GET transaction_chains': () => ({ transaction_chains: [] }),
          'GET help_boxes': () => ({ help_boxes: [] }),
        },
      });
      const section = broken === 'peers' ? 'dns.transfers' : 'dns.transfers.status';
      try {
        await page.goto('/app/dns/zones/22/transfers');
        await expect(page.getByTestId(section + '.loading')).toBeVisible();
        if (broken === 'peers') {
          await expect(page.getByTestId(`dns.transfers.status.${hasTouch ? 'card' : 'row'}.301`)).toBeVisible();
          await expect(page.getByTestId('dns.transfers.create.open')).toBeDisabled();
        } else await expect(page.getByTestId(hasTouch ? 'dns.transfers.cards' : 'dns.transfers.table')).toBeVisible();
        phase = 'error';
        release?.();
        await expect(page.getByTestId(section + '.error')).toBeVisible();
        if (broken === 'peers')
          await expect(page.getByTestId(`dns.transfers.status.${hasTouch ? 'card' : 'row'}.301`)).toBeVisible();
        phase = 'empty';
        await page.getByTestId(section + '.error.retry').click();
        await expect(page.getByTestId(section + '.error')).toHaveCount(0);
        await expect(page.getByTestId('dns.transfers.create.open')).toBeEnabled();
        if (broken === 'reports') {
          await expect(page.getByTestId('dns.transfers.status')).toContainText(
            language === 'cs' ? 'nejsou dostupná žádná hlášení' : 'No server reports'
          );
          phase = 'unknown';
          await page.reload();
          const row = page.getByTestId(`dns.transfers.status.${hasTouch ? 'card' : 'row'}.301`);
          await expect(row).toContainText(
            language === 'cs' ? 'Výsledek posledního přenosu není známý.' : 'The last transfer result is unknown.'
          );
          await expect(row.locator('.bg-danger-bg')).toHaveCount(0);
          phase = 'success';
          await page.reload();
          await expect(row).toContainText(language === 'cs' ? 'Úspěch' : 'Succeeded');
          await expect(row).toContainText(language === 'cs' ? 'dostupnosti' : 'current availability');
        }
        await expectNoDocumentHorizontalOverflow(page);
        expect(writes).toEqual([]);
        expect(errors).toEqual([]);
      } finally {
        release?.();
      }
    });
  }
}
