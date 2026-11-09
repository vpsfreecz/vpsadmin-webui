import { openShellNavigation } from '../../helpers/shellNavigation';
import { expect, test } from '@playwright/test';
import { bootstrapVpsAdminWindow, installHaveApiMock } from '../../fixtures';
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
    await openShellNavigation(page);
    await expect(button).toBeVisible();
    for (const width of [320, 390, 640, 768, 1024, 1280]) {
      await page.setViewportSize({ width, height: 900 });
      await openShellNavigation(page);
      await expectNoDocumentHorizontalOverflow(page);
      if (isMobile) await button.tap();
      else await button.click();
      const menu = page.getByTestId('shell.interface-preferences');
      await expect(menu).toBeVisible();
      await expect(button).toHaveAttribute('aria-expanded', 'true');
      await expect(page.getByTestId('shell.logout')).toBeInViewport({ ratio: 1 });
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
          .locator('[data-testid="shell.sidebar"]:visible, [data-testid="nav.drawer"]:visible')
          .screenshot({ path: testInfo.outputPath(`header-${actor.mode}-${width}.png`) });
        await testInfo.attach(`Header ${actor.name} ${width}px`, { body: shot, contentType: 'image/png' });
      }
    }
  });
}
