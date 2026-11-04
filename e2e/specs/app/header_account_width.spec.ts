import { expect, test } from '@playwright/test';
import {
  bootstrapVpsAdminWindow,
  failEnvelope,
  installHaveApiMock,
  jsonFulfill,
  setUiSettingsLocalStorage,
} from '../../fixtures';
import { expectNoDocumentHorizontalOverflow } from '../../helpers/horizontalOverflow';

for (const actor of [
  { name: 'member', mode: 'app', level: 1 },
  { name: 'administrator personal view', mode: 'app', level: 99 },
  { name: 'administrator view', mode: 'admin', level: 99 },
]) {
  test(`@pr-smoke @pr-smoke-mobile header: long account labels keep controls reachable (${actor.name})`, async ({
    page,
    isMobile,
  }, testInfo) => {
    await bootstrapVpsAdminWindow(page);
    await installHaveApiMock(page, {
      user: { id: 1, login: 'syntheticauditaccount'.padEnd(63, 'x'), level: actor.level },
    });
    await page.goto(`/${actor.mode}/vps`);
    const button = page.getByTestId('shell.user-menu-button');
    await expect(button).toBeVisible();
    for (const width of [320, 390, 640, 768, 1024, 1280]) {
      await page.setViewportSize({ width, height: 900 });
      await expectNoDocumentHorizontalOverflow(page);
      if (isMobile) await button.tap();
      else await button.click();
      const menu = page.getByTestId('shell.user-menu');
      await expect(menu).toBeVisible();
      await expect(button).toHaveAttribute('aria-expanded', 'true');
      await expectNoDocumentHorizontalOverflow(page);
      const box = await menu.boundingBox();
      expect(box).not.toBeNull();
      if (box) {
        expect(box.x).toBeGreaterThanOrEqual(0);
        expect(box.x + box.width).toBeLessThanOrEqual(width);
      }
      await page.keyboard.press('Escape');
      await expect(menu).toBeHidden();
      await expect(button).toHaveAttribute('aria-expanded', 'false');
      await expect(button).toBeFocused();
      if (width === 768 || width === 1280) {
        const shot = await page
          .getByTestId('shell.header')
          .screenshot({ path: testInfo.outputPath(`header-${actor.mode}-${width}.png`) });
        await testInfo.attach(`Header ${actor.name} ${width}px`, { body: shot, contentType: 'image/png' });
      }
    }
  });
}

test.describe('residual timezone', () => {
  test.use({ timezoneId: 'America/New_York' });

  test('residual timezone absent preference', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium', 'The timezone prompt belongs to the desktop sidebar.');
    await setUiSettingsLocalStorage(page, { language: 'en', theme: 'light' });
    await bootstrapVpsAdminWindow(page, {
      webuiNext: {
        serverTimeZone: 'Europe/Prague',
        uiSettings: { persistence: 'local', server: { path: '/webui_user_settings' } },
      },
    });
    const undefinedDataErrors: string[] = [];
    const writes: string[] = [];
    let reads = 0;
    page.on('console', (message) => {
      if (message.type() === 'error' && message.text().includes('Query data cannot be undefined'))
        undefinedDataErrors.push(message.text());
    });
    page.on('request', (request) => {
      if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method()))
        writes.push(`${request.method()} ${new URL(request.url()).pathname}`);
    });
    await installHaveApiMock(page, {
      user: { id: 1, login: 'timezone.absent.test', level: 1, time_zone: null },
      handlers: {
        'GET vpses': () => ({ vpses: [], _meta: { total_count: 0 } }),
        'GET help_boxes': () => ({ help_boxes: [] }),
        'GET webui_user_settings': ({ searchParams }) => {
          expect(searchParams.get('webui_user_setting[namespace]')).toBe('tips');
          expect(searchParams.get('webui_user_setting[key]')).toBe('time_zone');
          reads++;
          return { webui_user_settings: [] };
        },
      },
    });
    await page.goto('/app/vps');
    const tip = page.getByTestId('tips.time-zone');
    await expect(tip).toBeVisible();
    await expect(tip).toContainText('America/New_York');
    await expect(tip).toContainText('Europe/Prague');
    await expect(tip.getByTestId('tips.time-zone.use-browser')).toBeEnabled();
    await expect(tip.getByTestId('tips.time-zone.keep-default')).toBeEnabled();
    await expect(tip.getByTestId('tips.time-zone.dismiss')).toBeEnabled();
    await expectNoDocumentHorizontalOverflow(page);
    await page.screenshot({ path: testInfo.outputPath('timezone-absent-preference.png'), scale: 'css' });
    expect(reads).toBeGreaterThan(0);
    expect(undefinedDataErrors).toEqual([]);
    expect(writes).toEqual([]);
    await testInfo.attach('absent-preference-read', {
      body: JSON.stringify({ reads, undefinedDataErrors, writes }),
      contentType: 'application/json',
    });
  });

  test('residual timezone decision', async ({ page }, testInfo) => {
    const mobile = testInfo.project.name === 'mobile-chrome';
    const language = mobile ? 'cs' : 'en';
    testInfo.annotations.push({
      type: 'evidence',
      description: mobile
        ? 'Actual mobile sidebar absence; desktop-only hidden SidebarTips DOM may remain. No mobile decision UI is fabricated.'
        : 'Actual desktop SidebarTips with canonical synthetic tips/time_zone setting and real failure/dismissal.',
    });
    await setUiSettingsLocalStorage(page, { language, theme: mobile ? 'dark' : 'light' });
    await bootstrapVpsAdminWindow(page, {
      webuiNext: {
        serverTimeZone: 'Europe/Prague',
        uiSettings: { persistence: 'local', server: { path: '/webui_user_settings' } },
      },
    });
    let stored: Record<string, unknown> | undefined = {};
    let failWrite = true;
    let failRead = false;
    let reads = 0;
    let failedReads = 0;
    const writes: Record<string, unknown>[] = [];
    await installHaveApiMock(page, {
      user: { id: 1, login: 'timezone.shared7.test', level: 1, time_zone: null },
      handlers: {
        'GET vpses': () => ({ vpses: [], _meta: { total_count: 0 } }),
        'GET help_boxes': () => ({ help_boxes: [] }),
        'GET webui_user_settings': ({ searchParams }) => {
          expect(searchParams.get('webui_user_setting[namespace]')).toBe('tips');
          expect(searchParams.get('webui_user_setting[key]')).toBe('time_zone');
          reads++;
          if (failRead) {
            failedReads++;
            return jsonFulfill(failEnvelope('Synthetic setting read failed'), 503);
          }
          return {
            webui_user_settings: stored
              ? [{ id: 501, namespace: 'tips', key: 'time_zone', value: JSON.stringify(stored) }]
              : [],
          };
        },
        'PUT webui_user_settings/tips/time_zone': ({ reqJson }) => {
          const serialized = (reqJson as { webui_user_setting: { value: unknown } }).webui_user_setting.value;
          expect(typeof serialized).toBe('string');
          const value = JSON.parse(String(serialized)) as Record<string, unknown>;
          expect(value['browser_time_zone']).toBe('America/New_York');
          expect(value['server_time_zone']).toBe('Europe/Prague');
          expect(Number.isFinite(Date.parse(String(value['decided_at'])))).toBe(true);
          writes.push(value);
          if (failWrite) return jsonFulfill(failEnvelope('Synthetic setting write failed'), 503);
          stored = value;
          return { webui_user_setting: { id: 501, namespace: 'tips', key: 'time_zone', value: serialized } };
        },
      },
    });
    await page.goto('/app/vps');
    await expect.poll(() => reads).toBeGreaterThan(0);
    const tip = page.getByTestId('tips.time-zone');
    if (mobile) {
      await expect(tip).toBeHidden();
      await page.getByTestId('shell.mobile-nav-button').click();
      const drawer = page.getByTestId('nav.drawer');
      await expect(drawer).toBeVisible();
      await expect(page.getByRole('dialog', { name: 'Navigace', exact: true })).toBeVisible();
      await expect(drawer.getByTestId('tips.time-zone')).toBeHidden();
      await expect(tip).toBeHidden();
      await page.screenshot({ path: testInfo.outputPath('timezone-mobile-not-offered.png'), scale: 'css' });
      expect(writes).toEqual([]);
      return;
    }
    await expect(tip).toBeVisible();
    await expect(tip).toContainText('America/New_York');
    await expect(tip).toContainText('Europe/Prague');
    await page.screenshot({ path: testInfo.outputPath('timezone-mismatch.png'), scale: 'css' });
    await tip.getByTestId('tips.time-zone.keep-default').click();
    await expect(page.getByText('Failed to save preference', { exact: true }).filter({ visible: true })).toBeVisible();
    await expect(tip).toBeVisible();
    expect(writes).toHaveLength(1);
    expect(writes[0]?.['decision']).toBe('server_default');
    expect(stored).toEqual({});
    await page.screenshot({ path: testInfo.outputPath('timezone-decision-failed.png'), scale: 'css' });
    failWrite = false;
    await tip.getByTestId('tips.time-zone.dismiss').click();
    await expect(tip).toHaveCount(0);
    expect(writes).toHaveLength(2);
    expect(stored?.['decision']).toBe('dismissed');
    await page.reload();
    await expect(tip).toHaveCount(0);
    stored = undefined;
    failRead = true;
    await page.reload();
    await expect.poll(() => failedReads).toBeGreaterThan(0);
    await expect(tip).toHaveCount(0);
    expect(writes).toHaveLength(2);
  });
});

test('residual impersonation return', async ({ page }, testInfo) => {
  const language = testInfo.project.name === 'mobile-chrome' ? 'cs' : 'en';
  testInfo.annotations.push({
    type: 'evidence',
    description:
      'Actual legacy-preview impersonation banner/return with validated synthetic sessionStorage state. Not BFF session binding or real token issuance.',
  });
  await setUiSettingsLocalStorage(page, { language, theme: language === 'cs' ? 'dark' : 'light' });
  await bootstrapVpsAdminWindow(page, { webuiNext: { uiSettings: { persistence: 'local' } } });
  const state = {
    kind: 'impersonation',
    sessionId: 7001,
    sessionToken: 'SYNTHETIC_SHARED7_BORROWED_TOKEN',
    targetUserId: 42,
    targetLogin: 'member.shared7.test',
    reason: 'Synthetic support review',
    startedAt: Date.parse('2026-11-04T12:00:00Z'),
    returnPath: '/about?shared7=operator',
    returnMode: 'admin',
  };
  await page.addInitScript((state) => {
    if (location.pathname === '/app/vps' && !sessionStorage.getItem('vpsadmin.ui.impersonation'))
      sessionStorage.setItem('vpsadmin.ui.impersonation', JSON.stringify(state));
  }, state);
  let releaseClose = () => {};
  const heldClose = new Promise<void>((resolve) => {
    releaseClose = resolve;
  });
  let closes = 0;
  await installHaveApiMock(page, {
    user: { id: 42, login: 'member.shared7.test', level: 1, time_zone: 'Europe/Prague' },
    handlers: {
      'GET vpses': () => ({ vpses: [], _meta: { total_count: 0 } }),
      'GET help_boxes': () => ({ help_boxes: [] }),
      'POST user_sessions/7001': async () => {
        closes++;
        await heldClose;
        return jsonFulfill(failEnvelope('Synthetic borrowed session already closed'), 503);
      },
    },
  });
  await page.goto('/app/vps');
  const banner = page.getByTestId('impersonation.banner');
  await expect(banner).toBeVisible();
  await expect(banner.getByText(language === 'cs' ? 'Impersonace' : 'Impersonating', { exact: true })).toBeVisible();
  await expect(banner).toContainText('member.shared7.test (#42)');
  await expect(banner).toContainText('2026');
  await expect(banner.getByTestId('impersonation.banner.reason')).toContainText(state.reason);
  await page.screenshot({ path: testInfo.outputPath('impersonation-context.png'), scale: 'css' });
  await page.evaluate(() => {
    const state = JSON.parse(sessionStorage.getItem('vpsadmin.ui.impersonation') ?? 'null') as Record<string, unknown>;
    delete state['reason'];
    sessionStorage.setItem('vpsadmin.ui.impersonation', JSON.stringify(state));
  });
  await page.reload();
  await expect(banner.getByTestId('impersonation.banner.reason')).toHaveText(
    language === 'cs' ? 'Důvod nebyl uveden.' : 'No reason recorded.'
  );
  await page.screenshot({ path: testInfo.outputPath('impersonation-no-reason.png'), scale: 'css' });
  const request = page.waitForRequest(
    (request) => new URL(request.url()).pathname === '/api/v7.0/user_sessions/7001' && request.method() === 'POST'
  );
  const returnButton = banner.getByTestId('impersonation.banner.return');
  await returnButton.click();
  const closeRequest = await request;
  expect(closeRequest.headers()['x-haveapi-auth-token']).toBe(state.sessionToken);
  try {
    await expect(returnButton).toBeDisabled();
    expect(closes).toBe(1);
    await page.screenshot({ path: testInfo.outputPath('impersonation-return-busy.png'), scale: 'css' });
  } finally {
    releaseClose();
  }
  await expect(page).toHaveURL(/\/about\?shared7=operator$/);
  expect(await page.evaluate(() => sessionStorage.getItem('vpsadmin.ui.impersonation'))).toBeNull();
  await expect(page.getByTestId('about.page')).toBeVisible();
});
