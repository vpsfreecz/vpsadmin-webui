import { expect, test } from '@playwright/test';
import { bootstrapVpsAdminWindow, installHaveApiMock, setUiSettingsLocalStorage } from '../../fixtures';
import { clickShellControl, openShellNavigation } from '../../helpers/shellNavigation';
import { expectNoDocumentHorizontalOverflow } from '../../helpers/horizontalOverflow';

for (const actor of [
  { mode: 'app', level: 1 },
  { mode: 'app', level: 21 },
  { mode: 'admin', level: 100 },
] as const) {
  for (const language of ['cs', 'en'] as const) {
    for (const theme of ['light', 'dark'] as const) {
      test(`@pr-smoke @pr-smoke-mobile nickname menu and logout ${actor.mode}/${actor.level} ${language} ${theme}`, async ({ page, isMobile }, info) => {
        await page.setViewportSize(isMobile ? { width: 320, height: 740 } : { width: 1440, height: 1000 });
        await page.clock.setFixedTime(new Date('2026-11-08T00:00:00Z'));
        await bootstrapVpsAdminWindow(page, { sessionToken: 'SYNTHETIC_ACCOUNT_CONTROLS' });
        await setUiSettingsLocalStorage(page, { language, theme });
        const user = {
          id: 53,
          login: 'synthetic-account-with-a-long-login-for-control-layout',
          full_name: 'Example Member',
          email: 'member@example.test',
          level: actor.level,
          preferred_session_length: 2400,
          time_zone: 'Europe/Prague',
        };
        const writes: string[] = [];
        page.on('request', request => {
          if (new URL(request.url()).pathname.startsWith('/api/') && !['GET', 'HEAD', 'OPTIONS'].includes(request.method()) && !request.url().includes('/webui_user_settings/')) writes.push(request.method());
        });
        await installHaveApiMock(page, {
          user,
          handlers: {
            'GET users/current': () => ({ user }),
            'GET users/53': () => ({ user }),
            'GET vpses': () => ({ vpses: [], _meta: { total_count: 0 } }),
            'GET help_boxes': () => ({ help_boxes: [] }),
            'GET webui_user_settings': () => ({ webui_user_settings: [] }),
            'PUT webui_user_settings/ui/settings': () => ({ webui_user_setting: {} }),
          },
        });
        await page.goto(`/${actor.mode}/vps`);
        await openShellNavigation(page);
        const controls = page.getByTestId('shell.controls');
        const account = controls.getByTestId('shell.user-menu-button');
        const badge = account.getByTestId('scope.indicator');
        await expect(account).toHaveAccessibleName(`${language === 'cs' ? 'Účet' : 'Account'}: ${user.login}`);
        await expect(account).toHaveAttribute('aria-expanded', 'false');
        await expect(controls.getByTestId('shell.logout')).toHaveCount(0);
        await expect(page.locator('[data-testid="nav.drawer.account"], [data-testid="nav.sidebar.account"]')).toHaveCount(0);
        await expect(badge).toHaveCount(actor.level === 100 ? 1 : 0);
        if (actor.level === 100) {
          await expect(badge).toHaveText(language === 'cs' ? 'Všechny' : 'All');
          await expect(badge).toBeInViewport({ ratio: 1 });
        }
        const label = account.getByText(user.login, { exact: true });
        expect(await label.evaluate(el => el.scrollWidth > el.clientWidth && getComputedStyle(el).textOverflow === 'ellipsis')).toBe(true);
        await controls.screenshot({ path: info.outputPath('account-controls.png') });
        await clickShellControl(page, 'shell.user-menu-button', isMobile);
        const preferences = page.getByTestId('shell.interface-preferences');
        const logout = preferences.getByTestId('shell.logout');
        await expect(preferences).toBeVisible();
        await expect(logout).toHaveAccessibleName(language === 'cs' ? 'Odhlásit se' : 'Logout');
        await expect(preferences.getByTestId('shell.interface-preferences.scope.all')).toHaveCount(actor.level === 100 ? 1 : 0);
        await expect(preferences.getByText(/Umístění nápovědy|Help placement/)).toHaveCount(0);
        await expect(preferences.getByTestId(`shell.interface-preferences.theme.${theme}`)).toHaveAttribute('aria-pressed', 'true');
        await expect(preferences.getByTestId(`shell.interface-preferences.language.${language}`)).toHaveAttribute('aria-pressed', 'true');
        await preferences.screenshot({ path: info.outputPath('preferences.png') });
        await page.keyboard.press('Escape');
        await expect(preferences).toBeHidden();
        await expect(account).toBeFocused();
        await clickShellControl(page, 'shell.user-menu-button', isMobile);
        await preferences.getByTestId('shell.user-menu.account').click();
        await expect(page).toHaveURL(new RegExp(`/${actor.mode}/profile$`));
        await expect(page.getByTestId('shell.user-menu')).toHaveCount(0);
        await expect(page.getByTestId('shell.user-menu.public-status')).toHaveCount(0);
        await openShellNavigation(page);
        await expectNoDocumentHorizontalOverflow(page);
        await clickShellControl(page, 'shell.user-menu-button', isMobile);
        const href = await logout.getAttribute('href');
        expect(href).not.toBeNull();
        const destination = new URL(href!, page.url());
        expect(destination.origin).toBe(new URL(page.url()).origin);
        expect(destination.pathname).toBe('/oauth/logout');
        const logoutMethods: string[] = [];
        await page.route(url => url.href === destination.href, async route => {
          logoutMethods.push(route.request().method());
          await route.fulfill({ contentType: 'text/html', body: '<!doctype html><title>Fixture</title><main>Logout destination fixture</main>' });
        });
        if (isMobile) await logout.tap();
        else if (theme === 'dark') {
          await logout.focus();
          await page.keyboard.press('Enter');
        } else await logout.click();
        await expect(page.getByText('Logout destination fixture', { exact: true })).toBeVisible();
        expect(page.url()).toBe(destination.href);
        expect(logoutMethods).toEqual(['GET']);
        expect(writes).toEqual([]);
      });
    }
  }
}
