import { test, expect } from '@playwright/test';

import {
  bootstrapVpsAdminWindow,
  failEnvelope,
  installHaveApiMock,
  jsonFulfill,
  setUiSettingsLocalStorage,
} from '../../fixtures';

test('@smoke profile: ready MFA keeps its controls without aggregate reassurance', async ({ page }) => {
  const user = {
    id: 1,
    login: 'e2e',
    level: 1,
    enable_multi_factor_auth: true,
  };

  const totpDevices = [
    {
      id: 10,
      label: 'Phone',
      confirmed: true,
      enabled: true,
      use_count: 3,
      created_at: '2026-02-01T12:00:00Z',
      last_use_at: '2026-02-03T12:00:00Z',
    },
    {
      id: 11,
      label: 'Old phone',
      confirmed: true,
      enabled: false,
      use_count: 0,
      created_at: '2026-01-01T12:00:00Z',
    },
  ];

  const webauthnCredentials = [
    {
      id: 20,
      label: 'Security key',
      enabled: true,
      use_count: 1,
      created_at: '2026-02-02T12:00:00Z',
      last_use_at: '2026-02-03T12:00:00Z',
    },
  ];

  const knownDevices = [
    {
      id: 30,
      api_ip_addr: '203.0.113.10',
      client_ip_addr: '203.0.113.10',
      user_agent: 'Mozilla/5.0 (X11; Linux x86_64) Chrome/120.0.0.0',
      skip_multi_factor_auth_until: '2099-01-01T00:00:00Z',
      last_seen_at: '2026-02-04T12:00:00Z',
    },
  ];

  await setUiSettingsLocalStorage(page, { language: 'en' });
  await bootstrapVpsAdminWindow(page, { sessionToken: 'TEST' });

  await installHaveApiMock(page, {
    handlers: {
      'GET users/current': () => ({ user }),
      'GET users/1/totp_devices': () => ({ totp_devices: totpDevices }),
      'GET users/1/webauthn_credentials': () => ({ webauthn_credentials: webauthnCredentials }),
      'GET users/1/known_devices': () => ({ known_devices: knownDevices }),
    },
  });

  await page.goto('/app/profile/mfa');

  await expect(page.getByTestId('profile.mfa.recovery.ready')).toHaveCount(0);
  await expect(page.getByTestId('profile.mfa.recovery.card')).toHaveCount(0);
  await expect(page.getByTestId('profile.mfa.totp.row.10').filter({ visible: true })).toBeVisible();
  await expect(page.getByTestId('profile.mfa.recovery.metrics')).toHaveCount(0);
  await expect(page.getByTestId('profile.mfa.recovery.checklist')).toHaveCount(0);
  await expect(page.getByTestId('profile.mfa.known_devices.summary')).toContainText(
    'Trusted for two-step verification'
  );
  await expect(page.getByTestId('profile.mfa.mfa_master.status')).toContainText('Active');
});

test('profile: disabling MFA requires explicit confirmation', async ({ page }) => {
  const user = {
    id: 1,
    login: 'e2e',
    level: 1,
    enable_multi_factor_auth: true,
  };
  const updates: unknown[] = [];

  await setUiSettingsLocalStorage(page, { language: 'en' });
  await bootstrapVpsAdminWindow(page, { sessionToken: 'TEST' });
  await installHaveApiMock(page, {
    handlers: {
      'GET users/current': () => ({ user }),
      'GET users/1/totp_devices': () => ({ totp_devices: [] }),
      'GET users/1/webauthn_credentials': () => ({ webauthn_credentials: [] }),
      'GET users/1/known_devices': () => ({ known_devices: [] }),
      'PUT users/1': ({ reqJson }) => {
        updates.push(reqJson);
        user.enable_multi_factor_auth = false;
        return { user };
      },
    },
  });

  await page.goto('/app/profile/mfa');
  await page.getByTestId('profile.mfa.mfa_master.switch').getByRole('checkbox').click();
  await expect(page.getByTestId('profile.mfa.mfa_master.disable_confirm')).toBeVisible();
  expect(updates).toEqual([]);

  await page.getByTestId('profile.mfa.mfa_master.disable_confirm.cancel').click();
  await expect(page.getByTestId('profile.mfa.mfa_master.disable_confirm')).toBeHidden();
  expect(updates).toEqual([]);

  await page.getByTestId('profile.mfa.mfa_master.switch').getByRole('checkbox').click();
  await page.getByTestId('profile.mfa.mfa_master.disable_confirm.confirm').click();

  await expect.poll(() => updates).toEqual([{ user: { enable_multi_factor_auth: false } }]);
  await expect(page.getByTestId('profile.mfa.mfa_master.disable_confirm')).toBeHidden();
  await expect(page.getByTestId('profile.mfa.mfa_master.status')).toContainText('Disabled');
});

test('@pr-smoke @pr-smoke-mobile profile: unexpected TOTP provisioning URI is never clickable', async ({ page }) => {
  const user = {
    id: 1,
    login: 'e2e',
    level: 1,
    enable_multi_factor_auth: false,
  };

  await setUiSettingsLocalStorage(page, { language: 'en' });
  await bootstrapVpsAdminWindow(page, { sessionToken: 'TEST' });
  await installHaveApiMock(page, {
    handlers: {
      'GET users/current': () => ({ user }),
      'GET users/1/totp_devices': () => ({ totp_devices: [] }),
      'GET users/1/webauthn_credentials': () => ({ webauthn_credentials: [] }),
      'GET users/1/known_devices': () => ({ known_devices: [] }),
      'POST users/1/totp_devices': () => ({
        totp_device: {
          id: 12,
          label: 'Phone',
          secret: 'SECRET123',
          provisioning_uri: 'javascript:alert(document.domain)',
        },
      }),
    },
  });

  await page.goto('/app/profile/mfa');
  await page.getByTestId('profile.mfa.totp.add').click();
  await page.getByTestId('profile.mfa.totp.wizard.label').fill('Phone');
  await page.getByTestId('profile.mfa.totp.wizard.create').click();

  await expect(page.getByTestId('profile.mfa.totp.wizard.uri_invalid')).toBeVisible();
  await expect(page.getByTestId('profile.mfa.totp.wizard.uri_link')).toHaveCount(0);
  await expect(page.getByTestId('profile.mfa.totp.wizard.uri')).toBeVisible();
});

const recoveryStates = [
  { status: 'disabled', required: false, active: 0, pending: false, en: 'Not enabled', cs: 'Vypnuto' },
  { status: 'staged', required: false, active: 1, pending: false, en: 'Staged', cs: 'Připraveno mimo vyžadování' },
  { status: 'needs_factor', required: true, active: 0, pending: false, en: 'No factor', cs: 'Bez faktoru' },
  { status: 'single_path', required: true, active: 1, pending: false, en: 'One path', cs: 'Jedna cesta' },
  { status: 'setup_pending', required: true, active: 0, pending: true, en: 'Setup pending', cs: 'Čeká na dokončení' },
  { status: 'ready', required: true, active: 2, pending: false, en: 'Ready', cs: 'Připraveno' },
] as const;

for (const language of ['en', 'cs'] as const) {
  for (const state of recoveryStates) {
    test(`@content-a1-baseline MFA recovery preserves ${state.status} context (${language})`, async ({
      page,
    }, info) => {
      const user = { id: 1, login: 'e2e', level: 1, enable_multi_factor_auth: state.required };
      const devices = Array.from({ length: state.active + Number(state.pending) }, (_, index) => ({
        id: index + 10,
        label: `Phone ${index + 1}`,
        confirmed: !state.pending,
        enabled: true,
      }));
      await setUiSettingsLocalStorage(page, { language, theme: language === 'cs' ? 'dark' : 'light' });
      await bootstrapVpsAdminWindow(page, { sessionToken: 'TEST' });
      await installHaveApiMock(page, {
        user,
        handlers: {
          'GET users/current': () => ({ user }),
          'GET users/1/totp_devices': () => ({ totp_devices: devices }),
          'GET users/1/webauthn_credentials': () => ({ webauthn_credentials: [] }),
          'GET users/1/known_devices': () => ({ known_devices: [] }),
        },
      });
      await page.goto('/app/profile/mfa');
      await expect(page.getByTestId('profile.mfa.mfa_master.status')).toBeVisible();
      if (state.status !== 'ready') {
        await expect(page.getByTestId('profile.mfa.recovery.status')).toHaveText(state[language]);
        await expect(page.getByTestId('profile.mfa.recovery.checklist')).toBeVisible();
      } else {
        await expect(page.getByTestId('profile.mfa.recovery.ready')).toHaveCount(0);
        await expect(page.getByTestId('profile.mfa.totp.row.10').filter({ visible: true })).toBeVisible();
        await expect(page.getByTestId('profile.mfa.totp.row.11').filter({ visible: true })).toBeVisible();
      }
      await page.getByTestId('profile.mfa.mfa_master.status').scrollIntoViewIfNeeded();
      await page.screenshot({ path: info.outputPath(`mfa-${state.status}-${language}.png`), fullPage: true });
    });
  }

  test(`@content-a1-baseline MFA recovery does not infer readiness from loading or failed data (${language})`, async ({
    page,
  }, info) => {
    let releaseRead = () => {};
    const readGate = new Promise<void>((resolve) => {
      releaseRead = resolve;
    });
    const user = { id: 1, login: 'e2e', level: 1, enable_multi_factor_auth: true };
    await setUiSettingsLocalStorage(page, { language, theme: language === 'cs' ? 'dark' : 'light' });
    await bootstrapVpsAdminWindow(page, { sessionToken: 'TEST' });
    await installHaveApiMock(page, {
      user,
      handlers: {
        'GET users/current': () => ({ user }),
        'GET users/1/totp_devices': () => ({
          totp_devices: [
            { id: 10, label: 'Phone', confirmed: true, enabled: true },
            { id: 11, label: 'Backup', confirmed: true, enabled: true },
          ],
        }),
        'GET users/1/webauthn_credentials': async () => {
          await readGate;
          return jsonFulfill(failEnvelope('Synthetic recovery read failed'), 503);
        },
        'GET users/1/known_devices': () => ({ known_devices: [] }),
      },
    });
    try {
      await page.goto('/app/profile/mfa');
      const recovery = page.getByTestId('profile.mfa.recovery.card');
      await recovery.scrollIntoViewIfNeeded();
      await expect(recovery.locator('.animate-spin')).toBeVisible();
      await expect(page.getByTestId('profile.mfa.recovery.ready')).toHaveCount(0);
      await expect(page.getByTestId('profile.mfa.recovery.status')).toHaveCount(0);
      await page.screenshot({ path: info.outputPath(`mfa-loading-${language}.png`), fullPage: true });
      releaseRead();
      await expect(recovery.getByText('Synthetic recovery read failed')).toBeVisible();
      await expect(page.getByTestId('profile.mfa.recovery.ready')).toHaveCount(0);
      await expect(page.getByTestId('profile.mfa.recovery.status')).toHaveCount(0);
      await page.screenshot({ path: info.outputPath(`mfa-error-${language}.png`), fullPage: true });
    } finally {
      releaseRead();
    }
  });
}
