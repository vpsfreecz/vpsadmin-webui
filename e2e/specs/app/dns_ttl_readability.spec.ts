import { expect, test } from '@playwright/test';

import { bootstrapVpsAdminWindow, installHaveApiMock, setUiSettingsLocalStorage } from '../../fixtures';
import { expectNoDocumentHorizontalOverflow } from '../../helpers/horizontalOverflow';

for (const language of ['cs', 'en'] as const) {
  for (const theme of ['light', 'dark'] as const) {
    for (const role of ['member', 'admin'] as const) {
      test(`DNS TTL feedback remains readable and keeps its gates ${language} ${theme} ${role}`, async ({ page }) => {
        const writes: string[] = [];
        const errors: string[] = [];
        page.on('pageerror', (error) => errors.push(String(error)));
        page.on('request', (request) => {
          if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method())) writes.push(request.method());
        });
        await setUiSettingsLocalStorage(page, { language, theme });
        await bootstrapVpsAdminWindow(page, {
          sessionToken: 'TEST_SESSION',
          webuiNext: { uiSettings: { persistence: 'local' } },
        });
        await installHaveApiMock(page, {
          user: { id: 7, login: 'dns-ttl-audit', level: role === 'admin' ? 100 : 1 },
          handlers: {
            'GET dns_zones/42': () => ({
              dns_zone: {
                id: 42,
                name: 'example.test',
                label: 'Dlouhý český název zóny',
                email: 'hostmaster@example.test',
                default_ttl: 3600,
                enabled: true,
                source: 'internal_source',
                user: { id: 7 },
              },
            }),
            'GET dns_record_logs': () => ({ dns_record_logs: [] }),
            'GET transaction_chains': () => ({ transaction_chains: [] }),
          },
        });
        await page.goto(`/${role === 'admin' ? 'admin' : 'app'}/dns/zones/42/settings`);
        const field = page.getByTestId('dns.settings.default_ttl');
        const feedback = page.getByTestId('dns.settings.default_ttl.validation');
        const save = page.getByTestId('dns.settings.save');
        await expect(field).toHaveValue('3600');
        const validHelp = await feedback.textContent();
        expect(validHelp?.trim()).not.toBe('');
        await expect(save).toBeEnabled();
        await expect(field).toHaveAttribute('aria-describedby', 'dns-settings-default-ttl-feedback');
        for (const width of [1440, 390, 320]) {
          await page.setViewportSize({ width, height: 900 });
          await field.fill('-1');
          await expect(field).toHaveAttribute('aria-invalid', 'true');
          await expect(save).toBeDisabled();
          await expect(feedback).toHaveText(
            language === 'cs' ? 'Výchozí TTL musí být celé číslo.' : 'Default TTL must be a whole number.'
          );
          const metrics = await feedback.evaluate((element) => {
            const style = getComputedStyle(element);
            let parent: Element | null = element;
            let background = 'rgba(0, 0, 0, 0)';
            while (parent && background === 'rgba(0, 0, 0, 0)') {
              background = getComputedStyle(parent).backgroundColor;
              parent = parent.parentElement;
            }
            const luminance = (color: string) =>
              color
                .match(/[\d.]+/g)!
                .slice(0, 3)
                .map(Number)
                .map((value) => {
                  const n = value / 255;
                  return n <= 0.04045 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4;
                })
                .reduce((sum, value, index) => sum + value * [0.2126, 0.7152, 0.0722][index]!, 0);
            const a = luminance(style.color),
              b = luminance(background);
            return {
              contrast: (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05),
              weight: Number(style.fontWeight),
              marker: parseFloat(style.borderLeftWidth),
            };
          });
          expect(metrics.contrast).toBeGreaterThanOrEqual(4.5);
          expect(metrics.weight).toBeGreaterThanOrEqual(500);
          expect(metrics.marker).toBe(2);
          expect(await field.evaluate((element) => element.getBoundingClientRect().height)).toBe(
            await save.evaluate((element) => element.getBoundingClientRect().height)
          );
          await field.focus();
          await page.keyboard.press('Shift+Tab');
          await page.keyboard.press('Tab');
          await expect(field).toBeFocused();
          expect(await field.evaluate((element) => element.matches(':focus-visible'))).toBe(true);
          await expectNoDocumentHorizontalOverflow(page);
          await field.fill('3600');
          await expect(field).toHaveAttribute('aria-invalid', 'false');
          await expect(feedback).toHaveText(validHelp!);
          await expect(save).toBeEnabled();
          await field.fill('-1');
          await page.getByTestId('dns.settings.reset').click();
          await expect(field).toHaveValue('3600');
          await expect(feedback).toHaveText(validHelp!);
          await expect(save).toBeEnabled();
        }
        expect(writes).toEqual([]);
        expect(errors).toEqual([]);
      });
    }
  }
}
