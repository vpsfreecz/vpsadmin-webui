import { expect, test } from '@playwright/test';

import {
  bootstrapVpsAdminWindow,
  failEnvelope,
  installHaveApiMock,
  jsonFulfill,
  setUiSettingsLocalStorage,
} from '../../fixtures';

const message = 'Synthetic read failure: Ověřovací dlouhý český popis chyby načítání dotčených objektů.';

for (const language of ['cs', 'en'] as const) {
  for (const theme of ['light', 'dark'] as const) {
    for (const level of [100, 21]) {
      test(`affected outage errors remain readable ${language} ${theme} role${level}`, async ({ page }) => {
        const writes: string[] = [];
        page.on('request', (request) => {
          if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method())) {
            writes.push(request.method() + ' ' + new URL(request.url()).pathname);
          }
        });
        await setUiSettingsLocalStorage(page, { language, theme });
        await bootstrapVpsAdminWindow(page, {
          sessionToken: 'TEST',
          webuiNext: { uiSettings: { persistence: 'local' } },
        });
        await installHaveApiMock(page, {
          user: { id: 7, login: 'outage-readability', level },
          handlers: {
            'GET outages/42': () => ({
              outage: {
                id: 42,
                state: 'announced',
                type: 'planned_outage',
                impact: 'network',
                en_summary: 'Outage readability',
                cs_summary: 'Čitelnost hlášení',
              },
            }),
            'GET outages/42/entities': () => ({ entities: [], _meta: { total_count: 0 } }),
            'GET outages/42/handlers': () => ({ handlers: [], _meta: { total_count: 0 } }),
            'GET outage_updates': () => ({ outage_updates: [] }),
            'GET outage_security_advisories': () => ({ outage_security_advisories: [] }),
            'GET user_outages': () => jsonFulfill(failEnvelope(message), 503),
            'GET vps_outages': () => jsonFulfill(failEnvelope(message), 503),
            'GET export_outages': () => jsonFulfill(failEnvelope(message), 503),
          },
        });
        await page.goto('/admin/outages/42');
        for (const kind of ['users', 'vps', 'exports']) {
          const error = page.getByTestId(`admin.outages.affected.${kind}.error`);
          await expect(error).toContainText(language === 'cs' ? 'Chyba' : 'Error');
          await expect(error).toContainText(message);
          const contrast = await error.evaluate((element) => {
            const text = element.querySelector('.text-muted');
            if (!text) throw new Error('Missing readable error body');
            const channels = (value: string) =>
              value
                .match(/[\d.]+/g)
                ?.slice(0, 3)
                .map(Number) ?? [];
            const luminance = (color: number[]) =>
              color.reduce((sum, value, index) => {
                const channel = value / 255;
                const linear = channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
                return sum + linear * ([0.2126, 0.7152, 0.0722][index] ?? 0);
              }, 0);
            const foreground = channels(getComputedStyle(text).color);
            const background = channels(getComputedStyle(element).backgroundColor);
            if (foreground.length !== 3 || background.length !== 3) throw new Error('Missing opaque semantic colors');
            const a = luminance(foreground),
              b = luminance(background);
            return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
          });
          expect(contrast).toBeGreaterThanOrEqual(4.5);
        }
        await page.setViewportSize({ width: 320, height: 750 });
        expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(321);
        for (const kind of ['users', 'vps', 'exports']) {
          const error = page.getByTestId(`admin.outages.affected.${kind}.error`);
          const contained = await error.evaluate((element) => element.scrollWidth <= element.clientWidth + 1);
          expect(contained).toBe(true);
        }
        expect(writes).toEqual([]);
      });
    }
  }
}
