import { expect, test } from '@playwright/test';
import { bootstrapVpsAdminWindow, installHaveApiMock, setUiSettingsLocalStorage } from '../../fixtures';
import { clickShellControl, openShellNavigation } from '../../helpers/shellNavigation';
import { expectNoDocumentHorizontalOverflow } from '../../helpers/horizontalOverflow';

for (const actor of [
  { mode: 'app', level: 1, language: 'cs', theme: 'light', seconds: 0 },
  { mode: 'app', level: 21, language: 'cs', theme: 'light', seconds: 2400 },
  { mode: 'app', level: 99, language: 'en', theme: 'dark', seconds: 2400 },
  { mode: 'admin', level: 99, language: 'cs', theme: 'dark', seconds: 0 },
] as const) {
  test(`@pr-smoke @pr-smoke-mobile navigation controls and session setting (${actor.mode}/${actor.level}/${actor.language})`, async ({ page, isMobile }, testInfo) => {
    if (isMobile) await page.setViewportSize({ width: 320, height: 700 });
    else await page.setViewportSize({ width: 1440, height: 1000 });
    await bootstrapVpsAdminWindow(page, { sessionToken: 'TEST' });
    await setUiSettingsLocalStorage(page, { language: actor.language, theme: actor.theme });
    const writes: string[] = [];
    await installHaveApiMock(page, {
      user: { id: 53, login: 'sample-member', level: actor.level, preferred_session_length: actor.seconds },
      handlers: {
        'GET vpses': () => ({ vpses: [], _meta: { total_count: 0 } }),
        'GET help_boxes': () => ({ help_boxes: [] }),
        'PUT users/53': () => { writes.push('unexpected user update'); return {}; },
      },
    });
    await page.goto(`/${actor.mode}/vps`);
    await expect(page.getByTestId('vps.list')).toBeVisible();
    await openShellNavigation(page);
    const mobile = (page.viewportSize()?.width ?? 0) < 768;
    const navigation = page.getByTestId(mobile ? 'nav.drawer' : 'shell.sidebar');
    const controls = page.getByTestId('shell.controls');
    await expect(controls).toHaveCount(1);
    await expect(navigation.getByTestId('shell.controls')).toBeVisible();
    await expect(navigation.getByTestId('shell.inline-search.input')).toBeVisible();
    const tasksLabel = navigation.getByTestId('tasks.open-button').getByText(actor.language === 'cs' ? 'Úlohy' : 'Tasks', { exact: true });
    const account = navigation.getByTestId('shell.user-menu-button');
    const login = account.getByText('sample-member', { exact: true });
    await expect(tasksLabel).toBeVisible();
    await expect(login).toBeVisible();
    const loginBox = (await login.boundingBox())!;
    const tasksLabelBox = (await tasksLabel.boundingBox())!;
    expect(Math.abs(loginBox.x - tasksLabelBox.x)).toBeLessThanOrEqual(1);
    const role = account.getByTestId('shell.user-role');
    const roleLabel = actor.level === 1 ? 'Uživatel'
      : actor.level === 21 ? 'Podpora'
      : actor.language === 'cs' ? 'Administrátor' : 'Admin';
    await expect(account).toHaveAccessibleDescription(roleLabel);
    if (actor.level === 1) {
      await expect(role).toHaveCount(0);
    } else {
      await expect(role).toHaveAttribute('title', roleLabel);
      const roleBox = (await role.boundingBox())!;
      const gap = roleBox.x - (loginBox.x + loginBox.width);
      expect(gap).toBeGreaterThan(0);
      expect(gap).toBeLessThanOrEqual(8);
    }
    if (!mobile) await expect(page.getByTestId('shell.header')).toBeHidden();
    const brand = page.getByTestId(`shell.brand.${mobile ? 'drawer' : 'sidebar'}`);
    const about = navigation.getByRole('link', { name: actor.language === 'cs' ? 'O aplikaci' : 'About', exact: true });
    const brandBox = await brand.boundingBox();
    const aboutBox = await about.boundingBox();
    expect(brandBox).not.toBeNull();
    expect(aboutBox).not.toBeNull();
    expect(brandBox!.y).toBeLessThan(aboutBox!.y);
    await page.screenshot({ path: testInfo.outputPath(`navigation-${actor.mode}-${actor.level}.png`), fullPage: false, scale: 'css' });
    const session = page.getByTestId('shell.session-remaining');
    const tasksBox = (await controls.getByTestId('tasks.open-button').boundingBox())!;
    const sessionBox = (await session.boundingBox())!;
    expect(Math.abs(tasksBox.y - sessionBox.y)).toBeLessThanOrEqual(1);
    expect(tasksBox.x + tasksBox.width).toBeLessThan(sessionBox.x);
    if (isMobile) expect(Math.min(tasksBox.height, sessionBox.height)).toBeGreaterThanOrEqual(44);
    await expect(session).toHaveAttribute('href', `/${actor.mode}/profile/security#session-length`);
    await expect(session).toContainText(actor.seconds ? '40 min' : 'Bez vypršení');
    if (isMobile) await session.tap(); else await session.click();
    await expect(page).toHaveURL(new RegExp(`/${actor.mode}/profile/security#session-length$`));
    const input = page.getByTestId('profile.security.settings.session_length.input');
    await expect(input).toBeFocused();
    await expect(input).toBeInViewport();
    await expect(input).toHaveValue(String(actor.seconds / 60));
    await expect(page.getByTestId('nav.drawer')).toBeHidden();
    expect(writes).toEqual([]);
    await page.screenshot({ path: testInfo.outputPath(`session-setting-${actor.mode}-${actor.level}.png`), fullPage: false, scale: 'css' });

    // Revisit the same hash and ensure the setting is focused again.
    await clickShellControl(page, 'shell.session-remaining', isMobile);
    await expect(input).toBeFocused();
    expect(writes).toEqual([]);
    await clickShellControl(page, 'tasks.open-button', isMobile);
    await expect(page.getByTestId('tasks.drawer')).toBeVisible();
    await expect(page.getByTestId('nav.drawer')).toBeHidden();
    await page.getByTestId('tasks.close-button').click();
    await clickShellControl(page, 'shell.user-menu-button', isMobile);
    const accountMenu = page.getByTestId('shell.user-menu');
    await expect(accountMenu).toBeVisible();
    await expect(page.getByTestId('shell.user-menu.scope.all')).toHaveCount(actor.level >= 21 ? 1 : 0);
    await expect(accountMenu.getByTestId('shell.user-menu.logout')).toBeInViewport({ ratio: 1 });
    await expect.poll(() => accountMenu.evaluate(menu => menu.scrollHeight - menu.clientHeight)).toBeLessThanOrEqual(1);
    await page.screenshot({ path: testInfo.outputPath(`account-menu-${actor.mode}-${actor.level}.png`), scale: 'css' });
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('shell.user-menu')).toBeHidden();
    await expect(page.getByTestId('shell.user-menu-button')).toBeFocused();
    await expectNoDocumentHorizontalOverflow(page);
    const shot = await page.screenshot({ path: testInfo.outputPath(`sidebar-${actor.mode}-${actor.level}.png`), fullPage: false, scale: 'css' });
    await testInfo.attach('Synthetic navigation controls', { body: shot, contentType: 'image/png' });
  });
}

test('@pr-smoke @pr-smoke-mobile account choices stay reachable in a short viewport', async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 420 });
  await bootstrapVpsAdminWindow(page, { sessionToken: 'TEST' });
  await installHaveApiMock(page, { user: { id: 53, login: 'sample-admin', level: 99 } });
  await page.goto('/app/vps');
  await clickShellControl(page, 'shell.user-menu-button');
  await expect(page.getByTestId('nav.drawer')).toBeVisible();
  const menu = page.getByTestId('shell.user-menu');
  await expect(menu).toBeVisible();
  const box = await menu.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.y).toBeGreaterThanOrEqual(0);
  expect(box!.y + box!.height).toBeLessThanOrEqual(420);
  await page.getByTestId('shell.user-menu.logout').scrollIntoViewIfNeeded();
  await expect(page.getByTestId('shell.user-menu.logout')).toBeInViewport({ ratio: 1 });
  await expectNoDocumentHorizontalOverflow(page);
  await page.keyboard.press('Escape');
  const vpsLink = page.getByTestId('nav.drawer.vps');
  await vpsLink.scrollIntoViewIfNeeded();
  await expect(vpsLink).toBeInViewport({ ratio: 1 });
  await vpsLink.click();
  await expect(page.getByTestId('nav.drawer')).toBeHidden();
});

test('@pr-smoke-mobile a list query update does not dismiss an open navigation drawer', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 700 });
  await bootstrapVpsAdminWindow(page, { sessionToken: 'TEST' });
  await installHaveApiMock(page, { user: { id: 53, login: 'sample-admin', level: 99 } });
  await page.goto('/admin/vps?user=84');
  await openShellNavigation(page);
  // Model the router update caused by list-filter canonicalization while a
  // person is opening navigation; no API operation is submitted.
  await page.evaluate(() => {
    const url = new URL(window.location.href);
    url.searchParams.set('limit', '25');
    const state = { ...window.history.state, key: 'query-update' };
    window.history.replaceState(state, '', url);
    window.dispatchEvent(new PopStateEvent('popstate', { state }));
  });
  await expect(page.getByTestId('nav.drawer')).toBeVisible();
  await page.getByTestId('tasks.open-button').click();
  await expect(page.getByTestId('tasks.drawer')).toBeVisible();
  await expect(page.getByTestId('nav.drawer')).toBeHidden();
});
