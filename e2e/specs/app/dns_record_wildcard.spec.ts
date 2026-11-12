import { expect, test } from '@playwright/test';
import { bootstrapVpsAdminWindow, installHaveApiMock, setUiSettingsLocalStorage } from '../../fixtures';

interface FixtureRecord {
  id: number;
  name: string;
  type: string;
  content: string;
  dns_zone: { id: number };
  enabled: boolean;
  priority: null;
  dynamic_update_url: null;
}

for (const language of ['cs', 'en'] as const) {
  for (const level of [1, 99, 21]) {
    test(`@pr-smoke @pr-smoke-mobile DNS wildcard ${language} My level${level}`, async ({ page }, info) => {
      const mobile = info.project.name.includes('mobile');
      await page.setViewportSize(mobile ? { width: 320, height: 844 } : { width: 1440, height: 1000 });
      const errors: string[] = [],
        writes: string[] = [],
        payloads: unknown[] = [];
      let records: FixtureRecord[] = [],
        rejectNext = false;
      page.on('pageerror', (error) => errors.push(String(error)));
      page.on('request', (request) => {
        if (
          new URL(request.url()).pathname.includes('/api/') &&
          !['GET', 'HEAD', 'OPTIONS'].includes(request.method())
        ) {
          writes.push(request.method() + ' ' + new URL(request.url()).pathname);
        }
      });
      await bootstrapVpsAdminWindow(page, {
        sessionToken: 'TEST',
        webuiNext: { uiSettings: { persistence: 'local' } },
      });
      await setUiSettingsLocalStorage(page, { language, theme: language === 'cs' ? 'dark' : 'light' });
      await installHaveApiMock(page, {
        user: { id: 7, login: 'synthetic-viewer', level },
        handlers: {
          'GET dns_zones/10': () => ({
            dns_zone: {
              id: 10,
              name: 'example.test.',
              user: { id: 7, login: 'synthetic-viewer' },
              role: 'forward_role',
              source: 'internal_source',
              enabled: true,
              dnssec_enabled: false,
              default_ttl: 600,
              object_state: 'active',
            },
          }),
          'GET dns_records': () => ({ dns_records: records, _meta: { total_count: records.length } }),
          'GET dns_record_logs': () => ({ dns_record_logs: [] }),
          'GET transaction_chains': () => ({ transaction_chains: [], _meta: { total_count: 0 } }),
          'GET action_states': () => ({ action_states: [] }),
          'GET help_boxes': () => ({ help_boxes: [] }),
          'POST dns_records': ({ request }) => {
            const payload = request.postDataJSON();
            payloads.push(payload);
            if (!payload || typeof payload !== 'object' || !('dns_record' in payload))
              throw new Error('Expected namespaced DNS payload');
            const input = payload.dns_record;
            if (!input || typeof input !== 'object' || Array.isArray(input))
              throw new Error('Expected DNS record fields');
            expect(input).toMatchObject({ dns_zone: 10, name: '*', enabled: true, dynamic_update_enabled: false });
            if (
              !('name' in input) ||
              typeof input.name !== 'string' ||
              !('type' in input) ||
              typeof input.type !== 'string' ||
              !('content' in input) ||
              typeof input.content !== 'string'
            )
              throw new Error('Expected string DNS record values');
            if (rejectNext)
              return {
                status: 422,
                contentType: 'application/json',
                body: JSON.stringify({
                  status: false,
                  message: 'Synthetic API validation rejection',
                  errors: { name: ['synthetic-api-name-rejection'] },
                }),
              };
            const created = {
              id: 101 + records.length,
              name: input.name,
              type: input.type,
              content: input.content,
              dns_zone: { id: 10 },
              enabled: true,
              priority: null,
              dynamic_update_url: null,
            };
            records = [...records, created];
            return { dns_record: created };
          },
        },
      });
      await page.goto('/app/dns/zones/10');
      await page.getByTestId('dns.records.create.open').click();
      const name = page.getByTestId('dns.records.create.name');
      const content = page.getByTestId('dns.records.create.content');
      const submit = page.getByTestId('dns.records.create.submit');
      await content.fill('192.0.2.10');
      for (const invalid of ['foo*', 'www.*.example.test.', '**', '*..example.test.', '*.']) {
        await name.fill(invalid);
        await expect(page.getByTestId('dns.records.create.name.validation')).toBeVisible();
        await expect(submit).toBeDisabled();
      }
      expect(payloads).toHaveLength(0);
      await name.fill('*');
      await content.fill('999.2.3.4');
      await expect(page.getByTestId('dns.records.create.content.validation')).toBeVisible();
      await expect(submit).toBeDisabled();
      await content.fill('192.0.2.10');
      await expect(page.getByTestId('dns.records.create.name.validation')).toHaveCount(0);
      await expect(submit).toBeEnabled();
      if (language === 'cs' && level === 1)
        await page.screenshot({ path: info.outputPath('implemented-bare-star.png'), fullPage: true });
      const types = [
        ['A', '192.0.2.10'],
        ['AAAA', '2001:db8::10'],
        ['TXT', 'synthetic-wildcard-value'],
      ] as const;
      for (const [index, [type, value]] of types.entries()) {
        if (index > 0) await page.getByTestId('dns.records.create.open').click();
        await name.fill('*');
        await page.getByTestId('dns.records.create.type').selectOption(type);
        await content.fill(value);
        await expect(submit).toBeEnabled();
        await submit.press('Enter');
        await expect(page.getByTestId('dns.records.create.modal')).toHaveCount(0);
        const item = page.getByTestId(`dns.record.${mobile ? 'card' : 'row'}.${101 + index}`);
        await expect(item).toContainText('*');
        await expect(item).toContainText(type);
        await expect(item).toContainText(value);
        expect(payloads[index]).toMatchObject({ dns_record: { dns_zone: 10, name: '*', type, content: value } });
      }
      rejectNext = true;
      await page.getByTestId('dns.records.create.open').click();
      await name.fill('*');
      await content.fill('192.0.2.11');
      await submit.press('Enter');
      await expect(page.getByTestId('dns.records.create.name.validation')).toContainText(
        'synthetic-api-name-rejection'
      );
      await expect(name).toHaveValue('*');
      await expect(content).toHaveValue('192.0.2.11');
      expect(payloads).toHaveLength(4);
      expect(records).toHaveLength(3);
      await page.keyboard.press('Escape');
      await expect(page.getByTestId('dns.records.create.modal')).toHaveCount(0);
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
        await page.evaluate(() => innerWidth)
      );
      expect(writes).toHaveLength(4);
      expect(writes.every((value) => value.startsWith('POST ') && value.endsWith('/dns_records'))).toBe(true);
      expect(errors).toEqual([]);
      await info.attach('wildcard-journal', {
        body: JSON.stringify({
          language,
          level,
          owner: 7,
          myScopeOnly: true,
          fixtureOnly: true,
          savedTypes: ['A', 'AAAA', 'TXT'],
          fixturePosts: 4,
          apiValidationRejections: 1,
          payloads,
          errors,
          writes,
          liveWrites: 0,
        }),
        contentType: 'application/json',
      });
    });
  }
}
