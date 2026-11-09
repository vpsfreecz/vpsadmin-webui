import { expect, test } from '@playwright/test';

import {
  bootstrapVpsAdminWindow,
  failEnvelope,
  installHaveApiMock,
  jsonFulfill,
  setUiSettingsLocalStorage,
} from '../../fixtures';
import { expectNoDocumentHorizontalOverflow } from '../../helpers/horizontalOverflow';

const modes = [
  'primary-search',
  'secondary-search',
  'numeric',
  'system',
  'unresolved',
  'empty',
  'error',
  'held',
  'member',
] as const;

for (const language of ['cs', 'en'] as const) {
  for (const mode of modes) {
    test(`@pr-smoke @pr-smoke-mobile DNS owner lookup keeps drafts and payloads ${language} ${mode}`, async ({
      page,
    }) => {
      const mutations: unknown[] = [];
      const searches: unknown[] = [];
      const errors: string[] = [];
      let release!: () => void;
      const held = new Promise<void>((resolve) => {
        release = resolve;
      });
      page.on('pageerror', (error) => errors.push(String(error)));
      await setUiSettingsLocalStorage(page, { language, theme: language === 'cs' ? 'dark' : 'light' });
      await bootstrapVpsAdminWindow(page, {
        sessionToken: 'TEST_SESSION',
        webuiNext: { uiSettings: { persistence: 'local' } },
      });
      await installHaveApiMock(page, {
        user: { id: 7, login: 'owner-lookup-test', level: mode === 'member' ? 1 : 100 },
        handlers: {
          'GET dns_zones': () => ({ dns_zones: [] }),
          'GET users': async () => {
            if (mode === 'held') await held;
            if (mode === 'error') return jsonFulfill(failEnvelope('Synthetic owner read failure'), 503);
            return {
              users:
                mode === 'empty'
                  ? []
                  : [
                      {
                        id: 19,
                        login: 'overovaci-vlastnik',
                        full_name: 'Dlouhé české jméno vlastníka z Českých Budějovic',
                        level: 1,
                      },
                    ],
            };
          },
          'POST cluster/search': (context) => {
            searches.push(context.json);
            return { clusters: [] };
          },
          'POST dns_zones': (context) => {
            mutations.push(context.json);
            return jsonFulfill(failEnvelope('Synthetic create rejection'), 422);
          },
        },
      });
      await page.goto(`/${mode === 'member' ? 'app' : 'admin'}/dns`);
      await page.getByTestId('dns.zones.create.open').click();
      await page.getByTestId('dns.zones.create.name').fill('new.example.test');
      const secondary = mode === 'secondary-search';
      if (secondary) await page.getByTestId('dns.zones.create.kind.secondary').click();
      else await page.getByTestId('dns.zones.create.email').fill('hostmaster@example.test');

      const owner = page.getByTestId('dns.zones.create.user');
      const submit = page.getByTestId('dns.zones.create.submit');
      if (mode === 'member') await expect(owner).toHaveCount(0);
      else if (mode === 'numeric') await owner.fill('#19');
      else if (mode !== 'system') {
        await owner.fill('overovaci');
        await expect(owner).toHaveValue('overovaci');
        await expect(submit).toBeDisabled();
        await expect(page.getByRole('dialog')).toContainText(
          language === 'cs'
            ? 'Vyber vlastníka z nabídky nebo zadej kladné ID uživatele.'
            : 'Choose an owner from the suggestions or enter a positive user ID.'
        );
        if (mode === 'primary-search' || secondary) {
          await page.getByRole('option').filter({ hasText: 'overovaci-vlastnik' }).click();
          await expect(owner).toHaveValue('19');
        } else if (mode === 'empty' || mode === 'error' || mode === 'unresolved') {
          await expect.poll(() => searches.length).toBe(1);
          expect(searches).toEqual([{ cluster: { value: 'overovaci' } }]);
        } else {
          await expect(page.getByTestId('dns.zones.create.user.dropdown').getByRole('status')).toBeVisible();
        }
      }

      await page.setViewportSize({ width: 320, height: 750 });
      await expectNoDocumentHorizontalOverflow(page);
      if (mode !== 'member') {
        await owner.focus();
        await page.keyboard.press('Shift+Tab');
        await page.keyboard.press('Tab');
        await expect(owner).toBeFocused();
      }
      if (['unresolved', 'empty', 'error', 'held'].includes(mode)) {
        await expect(submit).toBeDisabled();
        expect(mutations).toEqual([]);
      } else {
        await expect(submit).toBeEnabled();
        await submit.click();
        await expect(page.getByRole('dialog')).toContainText('Synthetic create rejection');
        const expected: Record<string, unknown> = {
          name: 'new.example.test.',
          source: secondary ? 'external_source' : 'internal_source',
          enabled: true,
        };
        if (mode !== 'system' && mode !== 'member') expected['user'] = 19;
        if (!secondary) {
          expected['email'] = 'hostmaster@example.test';
          expected['dnssec_enabled'] = false;
          if (mode !== 'member') expected['default_ttl'] = 3600;
        }
        expect(mutations).toEqual([{ dns_zone: expected }]);
      }
      expect(
        searches.every((body) => JSON.stringify(body) === JSON.stringify({ cluster: { value: 'overovaci' } }))
      ).toBe(true);
      expect(errors).toEqual([]);
      release();
    });
  }
}
