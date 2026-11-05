import { expect, test } from '@playwright/test';

import {
  bootstrapVpsAdminWindow,
  failEnvelope,
  installHaveApiMock,
  jsonFulfill,
  setUiSettingsLocalStorage,
} from '../../fixtures';

interface MockSetting {
  id: number;
  namespace: string;
  key: string;
  value: string;
}

const SETTINGS_NAMESPACE = 'ui';
const SETTINGS_KEY = 'settings';

function serverUiSettingsConfig() {
  return {
    uiSettings: {
      persistence: 'server',
      server: {
        path: '/webui_user_settings',
        namespace: SETTINGS_NAMESPACE,
        field: SETTINGS_KEY,
      },
    },
  };
}

function encodeSettings(settings: Record<string, unknown>): string {
  return JSON.stringify(settings);
}

test('@pr-smoke @pr-smoke-mobile authenticated UI preferences load from and save to webui_user_settings', async ({
  page,
}) => {
  await bootstrapVpsAdminWindow(page, {
    sessionToken: 'TEST_USER_SESSION',
    webuiNext: serverUiSettingsConfig(),
  });

  let storedSetting: MockSetting = {
    id: 1,
    namespace: SETTINGS_NAMESPACE,
    key: SETTINGS_KEY,
    value: encodeSettings({
      sidebarCollapsed: true,
      theme: 'dark',
      language: 'system',
      tips: {
        sidebarTimeZone: 'visible',
      },
    }),
  };

  const writes: unknown[] = [];

  await installHaveApiMock(page, {
    user: { id: 10, login: 'alice', level: 1 },
    handlers: {
      'GET webui_user_settings': () => ({ webui_user_settings: [storedSetting] }),
      'PUT webui_user_settings/ui/settings': ({ reqJson }) => {
        writes.push(reqJson);
        const payload = (reqJson as any).webui_user_setting;
        storedSetting = {
          id: storedSetting.id,
          namespace: SETTINGS_NAMESPACE,
          key: SETTINGS_KEY,
          value: payload.value,
        };
        return { webui_user_setting: storedSetting };
      },
      'GET vpses': () => ({ vpses: [], _meta: { total_count: 0 } }),
    },
  });

  await page.goto('/app/vps');

  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  const desktopSidebar = (page.viewportSize()?.width ?? 1280) >= 768;
  if (desktopSidebar) await expect(page.getByTestId('nav.sidebar.vps')).toHaveText('VPS');
  await expect(
    page.getByRole('button', { name: /collapse sidebar|expand sidebar|sbalit panel|rozbalit panel/i })
  ).toHaveCount(0);

  await page.getByTestId('shell.user-menu-button').click();
  await page.getByTestId('shell.user-menu.theme.light').click();

  await expect.poll(() => writes.length).toBeGreaterThanOrEqual(1);

  const savedPayload = JSON.parse(storedSetting.value);
  expect(savedPayload.theme).toBe('light');
  expect(savedPayload.sidebarCollapsed).toBe(false);
  expect(storedSetting.namespace).toBe(SETTINGS_NAMESPACE);
  expect(storedSetting.key).toBe(SETTINGS_KEY);

  await page.reload();

  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  if (desktopSidebar) await expect(page.getByTestId('nav.sidebar.vps')).toHaveText('VPS');
});

test('public pages do not call webui_user_settings', async ({ page }) => {
  await bootstrapVpsAdminWindow(page, {
    sessionToken: 'TEST_USER_SESSION',
    webuiNext: serverUiSettingsConfig(),
  });

  let settingsCalls = 0;

  await installHaveApiMock(page, {
    user: { id: 10, login: 'alice', level: 1 },
    handlers: {
      'GET users/current': () => jsonFulfill(failEnvelope('Unauthorized'), 401),
      'GET webui_user_settings': () => {
        settingsCalls += 1;
        return { webui_user_settings: [] };
      },
      'GET cluster/public_stats': () => ({ cluster: { user_count: 0, vps_count: 0, ipv4_left: 999 } }),
      'GET nodes/public_status': () => ({ nodes: [] }),
      'GET outages': () => ({ outages: [] }),
      'GET news_logs': () => ({ news_logs: [] }),
      'GET help_boxes': () => ({ help_boxes: [] }),
    },
  });

  await page.goto('/');
  await expect(page.getByTestId('public.overview.page')).toBeVisible();

  expect(settingsCalls).toBe(0);
});

test('@pr-smoke @pr-smoke-mobile profile preferences: reset uses a retryable in-app confirmation', async ({ page }) => {
  await bootstrapVpsAdminWindow(page, {
    sessionToken: 'TEST_USER_SESSION',
    webuiNext: serverUiSettingsConfig(),
  });

  const user = { id: 10, login: 'alice', level: 1 };
  let resetAttempts = 0;
  const storedSetting: MockSetting = {
    id: 1,
    namespace: SETTINGS_NAMESPACE,
    key: SETTINGS_KEY,
    value: encodeSettings({
      sidebarCollapsed: true,
      theme: 'dark',
      language: 'en',
      tips: { sidebarTimeZone: 'dismissed' },
    }),
  };

  await installHaveApiMock(page, {
    user,
    handlers: {
      'GET users/current': () => ({ user }),
      'GET users/10': () => ({ user }),
      'GET webui_user_settings': () => ({ webui_user_settings: [storedSetting] }),
      'PUT webui_user_settings/ui/settings': ({ reqJson }) => {
        resetAttempts += 1;
        if (resetAttempts === 1) return jsonFulfill(failEnvelope('Reset temporarily unavailable'), 503);

        const payload = (reqJson as any).webui_user_setting;
        storedSetting.value = payload.value;
        return { webui_user_setting: storedSetting };
      },
    },
  });

  await page.goto('/app/profile');
  await expect(page.getByTestId('profile.prefs.card')).toBeVisible();
  await page.getByTestId('profile.prefs.diagnostics').locator('summary').click();
  await page.getByTestId('profile.prefs.reset.include_tips').check();

  await page.getByTestId('profile.prefs.reset').click();
  await expect(page.getByTestId('profile.prefs.reset.confirmation')).toBeVisible();
  await expect(page.getByTestId('profile.prefs.reset.confirmation')).toContainText('dismissed tips');
  expect(resetAttempts).toBe(0);

  await page.getByTestId('profile.prefs.reset.confirmation.confirm').click();
  await expect.poll(() => resetAttempts).toBe(1);
  await expect(page.getByTestId('profile.prefs.reset.confirmation')).toContainText('Reset temporarily unavailable');
  await expect(page.getByTestId('profile.prefs.reset.confirmation.confirm')).toBeEnabled();

  await page.getByTestId('profile.prefs.reset.confirmation.confirm').click();
  await expect.poll(() => resetAttempts).toBe(2);
  await expect(page.getByTestId('profile.prefs.reset.confirmation')).toHaveCount(0);

  const saved = JSON.parse(storedSetting.value);
  expect(saved.theme).toBe('system');
  expect(saved.sidebarCollapsed).toBe(false);
  expect(saved.tips.sidebarTimeZone).toBe('visible');
});

test('@pr-smoke @pr-smoke-mobile dark theme survives session expiry and a fresh login', async ({ page }) => {
  await bootstrapVpsAdminWindow(page, { sessionToken: 'TEST', webuiNext: serverUiSettingsConfig() });
  await page.emulateMedia({ colorScheme: 'light' });
  let authenticated = true;
  let savedTheme = 'light';
  const user = { id: 10, login: 'alice', level: 1 };
  await installHaveApiMock(page, {
    user,
    handlers: {
      'GET users/current': () => (authenticated ? { user } : jsonFulfill(failEnvelope('Session expired'), 401)),
      'GET webui_user_settings': () => ({
        webui_user_settings: [
          {
            id: 1,
            namespace: 'ui',
            key: 'settings',
            value: encodeSettings({ theme: savedTheme }),
          },
        ],
      }),
      'PUT webui_user_settings': () => jsonFulfill(failEnvelope('No such action'), 404),
      'POST webui_user_settings': () => jsonFulfill(failEnvelope('No such action'), 404),
      'PUT webui_user_settings/ui/settings': ({ reqJson }) => {
        const payload = reqJson as { webui_user_setting: { value: string } };
        expect(Object.keys(payload.webui_user_setting)).toEqual(['value']);
        savedTheme = JSON.parse(payload.webui_user_setting.value).theme;
        return { webui_user_setting: { namespace: 'ui', key: 'settings', value: payload.webui_user_setting.value } };
      },
      'GET vpses': () => ({ vpses: [] }),
      'GET cluster/public_stats': () => ({ cluster: {} }),
      'GET nodes/public_status': () => ({ nodes: [] }),
      'GET outages': () => ({ outages: [] }),
      'GET news_logs': () => ({ news_logs: [] }),
      'GET help_boxes': () => ({ help_boxes: [] }),
    },
  });
  await page.goto('/app/vps');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.getByTestId('shell.user-menu-button').click();
  await page.getByTestId('shell.user-menu.theme.dark').click();
  await expect.poll(() => savedTheme).toBe('dark');
  authenticated = false;
  // A full navigation with an expired session recreates the public providers.
  await page.goto('/');
  await expect(page.getByTestId('public.overview.page')).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  // A fresh browser cache must also recover the actual server preference.
  await page.evaluate(() => localStorage.removeItem('vpsadmin.uiSettings.v1'));
  authenticated = true;
  await page.goto('/app/vps');
  await expect(page.getByTestId('shell.user-menu-button')).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
});

for (const language of ['en', 'cs'] as const) {
  test(`@content-a1-baseline profile preferences retain loading, save errors and recovery (${language})`, async ({
    page,
  }, info) => {
    let releaseLoad = () => {};
    let releaseSave = () => {};
    const loadGate = new Promise<void>((resolve) => {
      releaseLoad = resolve;
    });
    const saveGate = new Promise<void>((resolve) => {
      releaseSave = resolve;
    });
    let loads = 0;
    const user = { id: 10, login: 'alice', level: 1 };
    const theme = language === 'cs' ? 'dark' : 'light';
    const storedSetting: MockSetting = {
      id: 1,
      namespace: SETTINGS_NAMESPACE,
      key: SETTINGS_KEY,
      value: encodeSettings({ theme, language }),
    };
    await setUiSettingsLocalStorage(page, { language, theme });
    await bootstrapVpsAdminWindow(page, {
      sessionToken: 'TEST_USER_SESSION',
      webuiNext: serverUiSettingsConfig(),
    });
    await installHaveApiMock(page, {
      user,
      handlers: {
        'GET users/current': () => ({ user }),
        'GET users/10': () => ({ user }),
        'GET webui_user_settings': async () => {
          loads += 1;
          if (loads === 1) {
            await loadGate;
            return jsonFulfill(failEnvelope('Synthetic preference load failed'), 503);
          }
          return { webui_user_settings: [storedSetting] };
        },
        'PUT webui_user_settings/ui/settings': async () => {
          await saveGate;
          return jsonFulfill(failEnvelope('Synthetic preference save failed'), 503);
        },
      },
    });
    try {
      await page.goto('/app/profile');
      const prefs = page.getByTestId('profile.prefs.card');
      const diagnostics = page.getByTestId('profile.prefs.diagnostics');
      await prefs.scrollIntoViewIfNeeded();
      await expect(page.getByTestId('profile.prefs.sync')).toContainText(language === 'cs' ? 'Načítání' : 'Loading');
      await page.screenshot({ path: info.outputPath(`preferences-loading-${language}.png`), fullPage: true });
      releaseLoad();
      await expect(page.getByTestId('profile.prefs.sync')).toContainText('Synthetic preference load failed');
      await page.screenshot({ path: info.outputPath(`preferences-load-error-${language}.png`), fullPage: true });
      await diagnostics.locator('summary').click();
      await expect(diagnostics).toContainText('Synthetic preference load failed');
      await page.getByTestId('profile.prefs.retry_load').click();
      await expect(diagnostics).toContainText(language === 'cs' ? 'V pořádku' : 'Idle');
      await diagnostics.locator('summary').click();
      await expect(page.getByTestId('profile.prefs.sync')).toHaveCount(0);
      await page.screenshot({ path: info.outputPath(`preferences-idle-${language}.png`), fullPage: true });
      await page.getByTestId('prefs.theme').selectOption(theme === 'dark' ? 'light' : 'dark');
      await expect(page.getByTestId('profile.prefs.sync')).toContainText(language === 'cs' ? 'Ukládání' : 'Saving');
      await page.screenshot({ path: info.outputPath(`preferences-saving-${language}.png`), fullPage: true });
      releaseSave();
      await expect(page.getByTestId('profile.prefs.sync')).toContainText('Synthetic preference save failed');
      await page.screenshot({ path: info.outputPath(`preferences-save-error-${language}.png`), fullPage: true });
    } finally {
      releaseLoad();
      releaseSave();
    }
  });
}
