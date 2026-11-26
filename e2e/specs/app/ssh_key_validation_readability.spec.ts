import { expect, test } from '@playwright/test';
import { writeFile } from 'node:fs/promises';
import { bootstrapVpsAdminWindow, installHaveApiMock, setUiSettingsLocalStorage } from '../../fixtures';
import { expectNoDocumentHorizontalOverflow } from '../../helpers/horizontalOverflow';

const configurations: {
  language: 'cs' | 'en';
  theme: 'light' | 'dark';
  level: number;
  field: 'create-label' | 'create-key' | 'edit-label';
}[] = [];
for (const [language, theme] of [
  ['cs', 'dark'],
  ['en', 'light'],
] as const)
  for (const level of [1, 100])
    for (const field of ['create-label', 'create-key', 'edit-label'] as const)
      configurations.push({ language, theme, level, field });
configurations.push(
  { language: 'cs', theme: 'light', level: 1, field: 'create-label' },
  { language: 'en', theme: 'dark', level: 1, field: 'create-key' }
);

for (const { language, theme, level, field } of configurations) {
  test(`@pr-smoke @pr-smoke-mobile SSH key field errors remain readable ${language} ${theme} role${level} ${field}`, async ({
    page,
  }, info) => {
    const writes: string[] = [],
      errors: string[] = [];
    page.on('request', (r) => {
      if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(r.method()))
        writes.push(r.method() + ' ' + new URL(r.url()).pathname);
    });
    page.on('pageerror', (e) => errors.push(String(e)));
    await setUiSettingsLocalStorage(page, { language, theme });
    await bootstrapVpsAdminWindow(page, {
      sessionToken: 'TEST_SESSION',
      webuiNext: { uiSettings: { persistence: 'local' } },
    });
    await installHaveApiMock(page, {
      user: { id: 7, login: 'ssh-key-layout', level },
      handlers: {
        'GET users/7/public_keys': () => ({
          public_keys: [
            {
              id: 10,
              label: 'Ověřovací klíč s dlouhým českým názvem',
              fingerprint: 'SHA256:synthetic-layout-only',
              auto_add: true,
            },
          ],
        }),
      },
    });
    await page.goto((level === 1 ? '/app' : '/admin') + '/profile/keys');
    await expect(page.locator('[data-testid="profile.keys.row.10"]:visible')).toBeVisible();
    if (field === 'edit-label') await page.locator('[data-testid="profile.keys.row.10.edit"]:visible').click();
    else await page.getByTestId('profile.keys.add').click();
    const modal = page.getByTestId('profile.keys.modal'),
      label = page.getByTestId('profile.keys.modal.label'),
      key = page.getByTestId('profile.keys.modal.key');
    await expect(modal).toBeVisible();
    await label.fill(field === 'create-key' ? 'Ověřovací přístup s dlouhým českým názvem' : '');
    await page.getByTestId('profile.keys.modal.save').click();
    const input = field === 'create-key' ? key : label;
    await expect(input).toHaveAttribute('aria-invalid', 'true');
    await expect(input).toBeFocused();
    const error = modal.locator('[role=alert]').filter({ visible: true }).first();
    await expect(error).toBeVisible();
    const message = await error.textContent();
    for (const width of [1440, 390, 320]) {
      await page.setViewportSize({ width, height: 900 });
      const metrics = await error.evaluate((el) => {
        const s = getComputedStyle(el);
        let parent: Element | null = el,
          bg = 'rgba(0, 0, 0, 0)';
        while (parent && bg === 'rgba(0, 0, 0, 0)') {
          bg = getComputedStyle(parent).backgroundColor;
          parent = parent.parentElement;
        }
        const luminance = (color: string) =>
          color
            .match(/[\d.]+/g)!
            .slice(0, 3)
            .map(Number)
            .map((v) => {
              const n = v / 255;
              return n <= 0.04045 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4;
            })
            .reduce((sum, v, i) => sum + v * [0.2126, 0.7152, 0.0722][i]!, 0);
        const a = luminance(s.color),
          b = luminance(bg);
        return {
          contrast: (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05),
          color: s.color,
          background: bg,
          weight: Number(s.fontWeight),
          marker: parseFloat(s.borderLeftWidth),
        };
      });
      await writeFile(
        info.outputPath(`metrics-${width}.json`),
        JSON.stringify({ language, theme, level, field, width, metrics, message }, null, 2)
      );
      await modal.screenshot({
        path: info.outputPath(`validation-${width}.png`),
        animations: 'disabled',
        scale: 'css',
      });
      expect(metrics.contrast).toBeGreaterThanOrEqual(4.5);
      expect(metrics.weight).toBeGreaterThanOrEqual(500);
      expect(metrics.marker).toBe(2);
      await expect(error).toHaveText(message!);
      await expect(input).toHaveAttribute('aria-invalid', 'true');
      await input.focus();
      await page.keyboard.press('Shift+Tab');
      await page.keyboard.press('Tab');
      await expect(input).toBeFocused();
      expect(await input.evaluate((el) => el.matches(':focus-visible'))).toBe(true);
      await expectNoDocumentHorizontalOverflow(page);
    }
    await input.fill(
      field === 'create-key'
        ? 'ssh-ed25519 deliberately-invalid-fixture-never-submitted fixture@example.test'
        : 'Ověřovací přístup s dlouhým českým názvem'
    );
    await expect(input).not.toHaveAttribute('aria-invalid', 'true');
    if (field === 'create-label') {
      // Both required fields start empty. Fixing the label must leave the
      // independent key error present until that field is corrected as well.
      await expect(key).toHaveAttribute('aria-invalid', 'true');
      await key.fill('ssh-ed25519 deliberately-invalid-fixture-never-submitted fixture@example.test');
      await expect(key).not.toHaveAttribute('aria-invalid', 'true');
    }
    await expect(modal.locator('[role=alert]')).toHaveCount(0);
    await page.getByTestId('profile.keys.modal.cancel').click();
    await expect(modal).toHaveCount(0);
    expect(writes).toEqual([]);
    expect(errors).toEqual([]);
  });
}
