import { expect, test } from '@playwright/test';
import { writeFile } from 'node:fs/promises';
import { bootstrapVpsAdminWindow, installHaveApiMock, setUiSettingsLocalStorage } from '../../fixtures';
import { expectNoDocumentHorizontalOverflow } from '../../helpers/horizontalOverflow';

const configs = [
  { language: 'cs', theme: 'dark', level: 1 },
  { language: 'en', theme: 'light', level: 100 },
  { language: 'cs', theme: 'light', level: 1 },
  { language: 'en', theme: 'dark', level: 100 },
] as const;

for (const { language, theme, level } of configs) {
  test(`@pr-smoke @pr-smoke-mobile mail language read errors stay readable ${language} ${theme} role${level}`, async ({
    page,
  }, info) => {
    const writes: string[] = [],
      errors: string[] = [];
    page.on('request', (r) => {
      if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(r.method())) writes.push(r.method());
    });
    page.on('pageerror', (e) => errors.push(String(e)));
    await setUiSettingsLocalStorage(page, { language, theme });
    await bootstrapVpsAdminWindow(page, { sessionToken: 'TEST', webuiNext: { uiSettings: { persistence: 'local' } } });
    const user = {
      id: 1,
      login: 'mail-layout',
      level,
      email: 'primary@example.test',
      language: { id: 1 },
      mailer_enabled: true,
    };
    await installHaveApiMock(page, {
      user,
      handlers: {
        'GET users/1': () => ({ user }),
        'GET languages': () => ({
          status: 503,
          contentType: 'application/json',
          body: JSON.stringify({ status: false, message: 'Isolated read error', response: null }),
        }),
        'GET users/1/mail_role_recipients': () => ({ mail_role_recipients: [] }),
        'GET users/1/mail_template_recipients': () => ({ mail_template_recipients: [] }),
      },
    });
    await page.goto((level === 1 ? '/app' : '/admin') + '/profile/mail');
    const error = page.getByText(language === 'cs' ? 'Nepodařilo se načíst jazyky.' : 'Unable to load languages.', {
      exact: true,
    });
    await expect(error).toBeVisible();
    await expect(page.getByTestId('mail.settings.save')).toBeDisabled();
    const measurements = [];
    for (const width of [1440, 390, 320]) {
      await page.setViewportSize({ width, height: 900 });
      await error.scrollIntoViewIfNeeded();
      const metrics = await error.evaluate((el) => {
        const s = getComputedStyle(el);
        let parent: Element | null = el,
          bg = 'rgba(0, 0, 0, 0)';
        while (parent && bg === 'rgba(0, 0, 0, 0)') {
          bg = getComputedStyle(parent).backgroundColor;
          parent = parent.parentElement;
        }
        const lum = (color: string) =>
          color
            .match(/[\d.]+/g)!
            .slice(0, 3)
            .map(Number)
            .map((v) => {
              const n = v / 255;
              return n <= 0.04045 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4;
            })
            .reduce((sum, v, i) => sum + v * [0.2126, 0.7152, 0.0722][i]!, 0);
        const a = lum(s.color),
          b = lum(bg),
          box = el.getBoundingClientRect();
        return {
          width: innerWidth,
          contrast: (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05),
          weight: Number(s.fontWeight),
          marker: parseFloat(s.borderLeftWidth),
          left: box.left,
          right: box.right,
          color: s.color,
          background: bg,
        };
      });
      measurements.push(metrics);
      expect(metrics.contrast).toBeGreaterThanOrEqual(4.5);
      expect(metrics.weight).toBeGreaterThanOrEqual(500);
      expect(metrics.marker).toBe(2);
      expect(metrics.left).toBeGreaterThanOrEqual(0);
      expect(metrics.right).toBeLessThanOrEqual(width);
      await expectNoDocumentHorizontalOverflow(page);
    }
    const checkbox = page.getByTestId('mail.settings.enabled');
    await checkbox.uncheck();
    await expect(checkbox).not.toBeChecked();
    await checkbox.check();
    await expect(checkbox).toBeChecked();
    await checkbox.focus();
    await page.keyboard.press('Shift+Tab');
    await page.keyboard.press('Tab');
    await expect(checkbox).toBeFocused();
    await expect(error).toBeVisible();
    expect(writes).toEqual([]);
    expect(errors).toEqual([]);
    await writeFile(info.outputPath('contrast.json'), JSON.stringify(measurements, null, 2));
    await page.screenshot({ path: info.outputPath('mail-language-error.png'), fullPage: false, scale: 'css' });
  });
}
