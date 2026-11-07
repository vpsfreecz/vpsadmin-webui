import { expect, test, type Page } from '@playwright/test';
import { bootstrapVpsAdminWindow, installHaveApiMock, setUiSettingsLocalStorage } from '../../fixtures';
const longName = 'Ověřovací člen s dlouhým českým jménem a příjmením';
const longLabel = 'Ověřovací přístup a konfigurace s dlouhým českým názvem';
const date = '2026-11-07T12:00:00Z';

async function secret(page: Page, id: string, value: string, touch: boolean) {
  const root = page.getByTestId(id);
  const field = page.getByTestId(id + '.field');
  const toggle = page.getByTestId(id + '.toggle');
  const copy = page.getByTestId(id + '.copy');
  const expectedHeight = touch ? 44 : 36;
  for (const control of [field, toggle, copy]) {
    await expect(control).toBeVisible();
    const box = await control.boundingBox();
    expect(box?.height).toBe(expectedHeight);
  }
  await expect(field).not.toHaveValue(value);
  await toggle.click();
  await expect(field).toHaveValue(value);
  await toggle.click();
  await expect(field).not.toHaveValue(value);
  await copy.click();
  await expect
    .poll(() => page.evaluate(() => (window as unknown as { copiedSecret: string }).copiedSecret))
    .toBe(value);
  await toggle.focus();
  await page.keyboard.press('Shift+Tab');
  await page.keyboard.press('Tab');
  await expect(toggle).toBeFocused();
  expect(await toggle.evaluate((el) => el.matches(':focus-visible'))).toBe(true);
  await expect(root).toBeVisible();
}

for (const kind of ['totp', 'metrics'] as const)
  for (const language of ['cs', 'en'] as const)
    for (const theme of ['light', 'dark'] as const) {
      test(`@pr-smoke @pr-smoke-mobile secret controls ${kind} ${language} ${theme}`, async ({ page }, info) => {
        const errors: string[] = [];
        page.on('pageerror', (e) => errors.push(String(e)));
        const touch = info.project.name.startsWith('mobile');
        await page.setViewportSize(touch ? { width: 390, height: 844 } : { width: 1440, height: 1000 });
        await page.clock.setFixedTime(new Date(date));
        await page.addInitScript(() => {
          Object.defineProperty(navigator, 'clipboard', {
            configurable: true,
            value: {
              writeText: async (value: string) => {
                (window as unknown as { copiedSecret: string }).copiedSecret = value;
              },
            },
          });
        });
        await bootstrapVpsAdminWindow(page, {
          sessionToken: 'SYNTHETIC_SECRET_LAYOUT',
          webuiNext: { serverTimeZone: 'Europe/Prague' },
        });
        await setUiSettingsLocalStorage(page, { language, theme });
        const user = {
          id: 1,
          login: 'audit-member',
          level: 1,
          full_name: longName,
          email: 'fixture@example.test',
          address: 'Dlouhá ověřovací ulice 123, České Budějovice',
          time_zone: 'Europe/Prague',
          enable_multi_factor_auth: true,
        };
        await installHaveApiMock(page, {
          user,
          handlers: {
            'GET users/1': () => ({ user }),
            'GET users/1/totp_devices': () => ({ totp_devices: [] }),
            'GET users/1/webauthn_credentials': () => ({ webauthn_credentials: [] }),
            'GET users/1/known_devices': () => ({ known_devices: [] }),
            'GET metrics_access_tokens': () => ({ metrics_access_tokens: [] }),
            'POST metrics_access_tokens': () => ({
              metrics_access_token: {
                id: 99,
                metric_prefix: 'synthetic_',
                access_token: 'synthetic-invalid-token-for-layout-only',
              },
            }),
            'POST users/1/totp_devices': () => ({
              id: 99,
              label: longLabel,
              secret: 'JBSWY3DPEHPK3PXP',
              provisioning_uri: 'otpauth://totp/synthetic-fixture-only?secret=JBSWY3DPEHPK3PXP&issuer=fixture',
            }),
            'POST users/1/totp_devices/99/confirm': () => ({ recovery_code: 'SYNTHETIC-INVALID-RECOVERY-ONLY' }),
          },
        });

        await page.goto('/app/profile/' + (kind === 'totp' ? 'mfa' : 'metrics'));
        if (kind === 'totp') {
          await page.getByTestId('profile.mfa.totp.add').click();
          await page.getByTestId('profile.mfa.totp.wizard.label').fill(longLabel);
          await page.getByTestId('profile.mfa.totp.wizard.create').click();
          await secret(
            page,
            'profile.mfa.totp.wizard.uri',
            'otpauth://totp/synthetic-fixture-only?secret=JBSWY3DPEHPK3PXP&issuer=fixture',
            touch
          );
          await secret(page, 'profile.mfa.totp.wizard.secret', 'JBSWY3DPEHPK3PXP', touch);
          await page.getByTestId('profile.mfa.totp.wizard.code').fill('123456');
          await page.getByTestId('profile.mfa.totp.wizard.confirm').click();
          await secret(page, 'profile.mfa.totp.wizard.recovery', 'SYNTHETIC-INVALID-RECOVERY-ONLY', touch);
        } else {
          await page.getByTestId('profile.metrics.create').click();
          await page.getByTestId('profile.metrics.create_modal.prefix').fill('synthetic_');
          await page.getByTestId('profile.metrics.create_modal.create').click();
          await expect(page.getByTestId('profile.metrics.created_modal')).toBeVisible();
          await secret(page, 'profile.metrics.created_modal.token', 'synthetic-invalid-token-for-layout-only', touch);
          const multiline = page.getByTestId('profile.metrics.created_modal.url');
          await expect(multiline.locator('textarea')).toBeVisible();
          for (const id of ['toggle', 'copy']) {
            expect((await page.getByTestId('profile.metrics.created_modal.url.' + id).boundingBox())?.height).toBe(
              touch ? 44 : 32
            );
          }
        }
        await page.screenshot({ path: info.outputPath('normal.png'), fullPage: false });
        await page.setViewportSize({ width: 320, height: 750 });
        expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(321);
        const dialog = page.locator('[role=dialog]:visible').last();
        for (const action of await dialog.locator('button').all()) {
          if (!(await action.isVisible())) continue;
          const box = await action.boundingBox();
          expect(box!.x).toBeGreaterThanOrEqual(0);
          expect(box!.x + box!.width).toBeLessThanOrEqual(321);
        }
        await page.screenshot({ path: info.outputPath('narrow.png'), fullPage: false });
        expect(errors).toEqual([]);
      });
    }
