import { expect, test, type Request } from '@playwright/test';
import { bootstrapVpsAdminWindow, installHaveApiMock, setUiSettingsLocalStorage } from '../../fixtures';

interface FixtureZone {
  id: number;
  name: string;
  role: string;
  source: string;
  dnssec_enabled?: boolean;
  enabled: boolean;
  serial: number;
  user: { id: number; login: string };
  default_ttl: number;
  label?: string;
}

const scenarios = [
  { key: 'secondary-disabled', secondary: true, flag: false, levels: [1, 99, 21] },
  { key: 'primary-enabled', secondary: false, flag: true, levels: [1, 99, 21] },
  { key: 'primary-disabled', secondary: false, flag: false, levels: [1, 99, 21] },
  { key: 'secondary-enabled-flag', secondary: true, flag: true, levels: [1] },
  { key: 'secondary-missing-flag', secondary: true, flag: undefined, levels: [1] },
  { key: 'primary-missing-flag', secondary: false, flag: undefined, levels: [1] },
] as const;

for (const language of ['cs', 'en'] as const) {
  for (const scenario of scenarios) {
    for (const level of scenario.levels) {
      test(`@pr-smoke @pr-smoke-mobile DNSSEC scope ${scenario.key} ${language} My level${level}`, async ({
        page,
      }, info) => {
        const mobile = info.project.name.includes('mobile');
        await page.setViewportSize(mobile ? { width: 320, height: 844 } : { width: 1440, height: 1000 });
        await page.clock.setFixedTime(new Date('2026-11-11T20:00:00Z'));
        const errors: string[] = [],
          writes: string[] = [],
          payloads: unknown[] = [],
          dnssecReads: Record<string, unknown>[] = [];
        const pending = new Set<Request>();
        page.on('pageerror', (error) => errors.push(String(error)));
        page.on('request', (request) => {
          if (!new URL(request.url()).pathname.includes('/api/')) return;
          pending.add(request);
          if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method()))
            writes.push(request.method() + ' ' + new URL(request.url()).pathname);
        });
        page.on('requestfinished', (request) => pending.delete(request));
        page.on('requestfailed', (request) => pending.delete(request));
        await bootstrapVpsAdminWindow(page, {
          sessionToken: 'TEST',
          webuiNext: { uiSettings: { persistence: 'local' } },
        });
        await setUiSettingsLocalStorage(page, { language, theme: language === 'cs' ? 'dark' : 'light' });
        const primary: FixtureZone = {
          id: 21,
          name: 'synthetic-primary.example.test.',
          role: 'forward_role',
          source: 'internal_source',
          dnssec_enabled: true,
          enabled: true,
          serial: 2026111101,
          user: { id: 7, login: 'synthetic-dns-viewer' },
          default_ttl: 3600,
        };
        const secondary: FixtureZone = {
          id: 22,
          name: 'synthetic-secondary.example.test.',
          role: 'forward_role',
          source: 'external_source',
          dnssec_enabled: false,
          enabled: true,
          serial: 2026111101,
          user: { id: 7, login: 'synthetic-dns-viewer' },
          default_ttl: 3600,
        };
        const reverse: FixtureZone = {
          id: 23,
          name: '113.0.203.in-addr.arpa.',
          role: 'reverse_role',
          source: 'internal_source',
          dnssec_enabled: true,
          enabled: true,
          serial: 2026111101,
          user: { id: 7, login: 'synthetic-dns-viewer' },
          default_ttl: 3600,
        };
        const zone = scenario.secondary ? secondary : primary;
        if (scenario.flag === undefined) delete zone.dnssec_enabled;
        else zone.dnssec_enabled = scenario.flag;
        const zones = [primary, secondary, reverse];
        const expectedNextFlag = scenario.flag !== true;
        await installHaveApiMock(page, {
          user: { id: 7, login: 'synthetic-dns-viewer', level },
          handlers: {
            'GET dns_zones': () => ({ dns_zones: zones, _meta: { total_count: 3 } }),
            'GET dns_zones/21': () => ({ dns_zone: primary }),
            'GET dns_zones/22': () => ({ dns_zone: secondary }),
            'GET dns_zones/23': () => ({ dns_zone: reverse }),
            'GET dns_records': () => ({ dns_records: [], _meta: { total_count: 0 } }),
            'GET dns_record_logs': () => ({ dns_record_logs: [], _meta: { total_count: 0 } }),
            'GET dns_zone_transfers': () => ({ dns_zone_transfers: [], _meta: { total_count: 0 } }),
            'GET dns_server_zones': () => ({ dns_server_zones: [], _meta: { total_count: 0 } }),
            'GET dns_server_zone_transfer_logs': () => ({
              dns_server_zone_transfer_logs: [],
              _meta: { total_count: 0 },
            }),
            'GET dns_tsig_keys': () => ({ dns_tsig_keys: [], _meta: { total_count: 0 } }),
            'GET transaction_chains': () => ({ transaction_chains: [], _meta: { total_count: 0 } }),
            'GET action_states': () => ({ action_states: [] }),
            'GET help_boxes': () => ({ help_boxes: [] }),
            'GET dnssec_records': ({ params }) => {
              dnssecReads.push(params);
              expect(String(params['dnssec_record[dns_zone]'])).toBe(String(zone.id));
              return {
                dnssec_records: [
                  {
                    id: 501,
                    dns_zone: { id: zone.id },
                    keyid: 12345,
                    dnskey_algorithm: 13,
                    dnskey_pubkey: 'SYNTHETIC_PUBLIC_KEY',
                    ds_algorithm: 13,
                    ds_digest_type: 2,
                    ds_digest: '12'.repeat(32),
                  },
                ],
                _meta: { total_count: 1 },
              };
            },
            [`PUT dns_zones/${zone.id}`]: ({ request }) => {
              const payload = request.postDataJSON();
              payloads.push(payload);
              if (!payload || typeof payload !== 'object' || !('dns_zone' in payload))
                throw new Error('Expected namespaced zone update');
              const input = payload.dns_zone;
              if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Expected zone fields');
              expect(input).toMatchObject({ label: 'synthetic-reviewed-label', default_ttl: 3600, enabled: true });
              if (scenario.secondary) expect(input).not.toHaveProperty('dnssec_enabled');
              else expect(input).toHaveProperty('dnssec_enabled', expectedNextFlag);
              zone.label = 'synthetic-reviewed-label';
              if ('dnssec_enabled' in input) {
                if (typeof input.dnssec_enabled !== 'boolean')
                  throw new Error('Expected boolean primary DNSSEC setting');
                zone.dnssec_enabled = input.dnssec_enabled;
              }
              return { dns_zone: zone };
            },
          },
        });
        const noDnssec = language === 'cs' ? 'Bez DNSSEC' : 'No DNSSEC';
        const external = language === 'cs' ? 'DNSSEC: primární server' : 'DNSSEC: primary server';
        const help =
          language === 'cs'
            ? 'DNSSEC spravuješ na primárním serveru. Stav podpisu této sekundární zóny tady neověřujeme.'
            : 'Manage DNSSEC on the primary server. The signing status of this secondary zone is not verified here.';
        const expectedBadge = scenario.secondary
          ? external
          : scenario.flag === true
            ? 'DNSSEC'
            : scenario.flag === false
              ? noDnssec
              : '—';
        const recentEmpty =
          language === 'cs'
            ? 'Pro tuto zónu nebyly nalezeny žádné nedávné transakční řetězce.'
            : 'No recent transaction chains found for this zone.';
        const capture = language === 'cs' && level === 1 && scenario.key === 'secondary-disabled';
        await page.goto('/app/dns');
        const list = page.locator(
          `[data-testid="dns.zones.card.${zone.id}"]:visible,[data-testid="dns.zones.row.${zone.id}"]:visible`
        );
        await expect(list).toBeVisible();
        await expect(list.getByTestId(`dns.zones.dnssec.${zone.id}`)).toHaveText(expectedBadge);
        await expect.poll(() => pending.size).toBe(0);
        await page.goto(`/app/dns/zones/${zone.id}`);
        const header = page.getByTestId('dns.zone.header');
        await expect(page.getByTestId('dns.zone.header.dnssec')).toHaveText(expectedBadge);
        await expect(page.getByText(recentEmpty, { exact: true })).toBeVisible();
        await expect.poll(() => pending.size).toBe(0);
        if (scenario.secondary) {
          await expect(header.getByRole('link', { name: 'DNSSEC', exact: true })).toHaveCount(0);
          await expect(page.getByTestId('dns.transfers.empty')).toBeVisible();
        } else await expect(header.getByRole('link', { name: 'DNSSEC', exact: true })).toBeVisible();
        if (capture)
          await page.screenshot({ path: info.outputPath('implemented-secondary-header.png'), fullPage: true });
        await header
          .getByRole('link', { name: language === 'cs' ? 'Nastavení' : 'Settings', exact: true })
          .press('Enter');
        await expect(page.getByTestId('dns.settings.form')).toBeVisible();
        await expect(page.getByText(recentEmpty, { exact: true })).toBeVisible();
        await expect.poll(() => pending.size).toBe(0);
        if (scenario.secondary) {
          await expect(page.getByTestId('dns.settings.dnssec')).toHaveCount(0);
          await expect(page.getByTestId('dns.settings.dnssec.external')).toHaveText(help);
        } else await expect(page.getByTestId('dns.settings.dnssec')).toBeChecked({ checked: scenario.flag === true });
        if (capture)
          await page.screenshot({ path: info.outputPath('implemented-secondary-settings.png'), fullPage: true });
        await page.getByTestId('dns.settings.label').fill('synthetic-reviewed-label');
        if (!scenario.secondary) await page.getByTestId('dns.settings.dnssec').setChecked(expectedNextFlag);
        await page.getByTestId('dns.settings.save').press('Enter');
        await expect.poll(() => payloads.length).toBe(1);
        await expect(page.getByTestId('dns.settings.label')).toHaveValue('synthetic-reviewed-label');
        await expect(page.getByTestId('dns.zone.header.dnssec')).toHaveText(
          scenario.secondary ? external : expectedNextFlag ? 'DNSSEC' : noDnssec
        );
        await expect.poll(() => pending.size).toBe(0);
        await page.goto(`/app/dns/zones/${zone.id}/dnssec`);
        if (scenario.secondary) {
          await expect(page.getByTestId('dns.dnssec.external')).toContainText(help);
          await expect(page.getByTestId('dns.dnssec.empty')).toHaveCount(0);
          expect(dnssecReads).toEqual([]);
        } else {
          const key = page.getByTestId('dns.dnssec.card.501');
          await expect(key).toContainText('DNSKEY');
          await expect(key.getByRole('button')).toHaveCount(2);
          await key.getByRole('button').first().focus();
          await expect(key.getByRole('button').first()).toBeFocused();
          expect(dnssecReads.length).toBeGreaterThan(0);
        }
        await expect(page.getByText(recentEmpty, { exact: true })).toBeVisible();
        await expect.poll(() => pending.size).toBe(0);
        expect(payloads).toHaveLength(1);
        expect(writes).toHaveLength(1);
        expect(writes[0]).toMatch(new RegExp(`^PUT .*/dns_zones/${zone.id}$`));
        expect(errors).toEqual([]);
        expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
          await page.evaluate(() => innerWidth)
        );
        await info.attach('dnssec-scope-journal', {
          body: JSON.stringify({
            scenario: scenario.key,
            language,
            level,
            owner: 7,
            myScopeOnly: true,
            fixtureOnly: true,
            writes,
            payloads,
            dnssecReads,
            errors,
            liveWrites: 0,
          }),
          contentType: 'application/json',
        });
      });
    }
  }
}
