import { clickShellControl, openShellNavigation } from '../../helpers/shellNavigation';
import { expect, test } from '@playwright/test';

import { bootstrapVpsAdminWindow, installHaveApiMock } from '../../fixtures';
import { expectNoDocumentHorizontalOverflow } from '../../helpers/horizontalOverflow';

test.describe('@smoke @smoke-mobile @pr-smoke @pr-smoke-mobile Header controls', () => {
  test('exposes search, tasks and account controls (touch targets on mobile)', async ({ page, isMobile }) => {
    await bootstrapVpsAdminWindow(page, { sessionToken: 'TEST' });

    await installHaveApiMock(page, {
      user: { id: 1, login: 'test', level: 1 },
      handlers: {
        'GET vpses': () => ({ vpses: [], _meta: { total_count: 0 } }),
      },
    });

    await page.goto('/app/vps');
    await expect(page.getByTestId('vps.list')).toBeVisible();

    await openShellNavigation(page);
    await expect(page.getByTestId('shell.controls')).toBeVisible();

    const inlineSearch = page.getByTestId('shell.inline-search');
    const tasks = page.getByTestId('tasks.open-button');
    const account = page.getByTestId('shell.user-menu-button');
    const nav = page.getByTestId('shell.mobile-nav-button');

    await expect(tasks).toBeVisible();
    await expect(account).toBeVisible();
    await expect(page.getByTestId('palette.open')).toHaveCount(0);

    if (isMobile) {
      await expect(nav).toBeVisible();
      await expect(inlineSearch).toBeVisible();

      for (const loc of [inlineSearch, tasks, account]) {
        const box = await loc.boundingBox();
        expect(box).not.toBeNull();
        // Minimum 44x44 CSS px touch target.
        expect(box!.width).toBeGreaterThanOrEqual(44);
        expect(box!.height).toBeGreaterThanOrEqual(44);
      }

      await page.keyboard.press('Control+k');
      const palette = page.getByTestId('palette.modal');
      const paletteInput = page.getByTestId('palette.input');
      await expect(palette).toBeVisible();
      await expect(paletteInput).toBeVisible();
      await expect(paletteInput).toBeFocused();
      await paletteInput.fill('server');
      await expect(paletteInput).toHaveValue('server');

      const viewport = page.viewportSize();
      const paletteBox = await palette.boundingBox();
      const inputBox = await paletteInput.boundingBox();
      expect(viewport).not.toBeNull();
      expect(paletteBox).not.toBeNull();
      expect(inputBox).not.toBeNull();
      expect(paletteBox!.x).toBeGreaterThanOrEqual(-1);
      expect(paletteBox!.x).toBeLessThanOrEqual(1);
      expect(paletteBox!.y).toBeGreaterThanOrEqual(-1);
      expect(paletteBox!.y).toBeLessThanOrEqual(1);
      expect(paletteBox!.width).toBeGreaterThanOrEqual(viewport!.width - 1);
      expect(paletteBox!.height).toBeGreaterThanOrEqual(viewport!.height - 1);
      expect(paletteBox!.x + paletteBox!.width).toBeLessThanOrEqual(viewport!.width + 1);
      expect(paletteBox!.y + paletteBox!.height).toBeLessThanOrEqual(viewport!.height + 1);
      expect(inputBox!.width).toBeGreaterThan(200);
      await expectNoDocumentHorizontalOverflow(page);

      await page.keyboard.press('Escape');
      await expect(palette).toBeHidden();
    } else {
      await expect(nav).toBeHidden();
      await expect(inlineSearch).toBeVisible();
    }

    await clickShellControl(page, 'shell.interface-preferences-button');
    await expect(page.getByTestId('shell.interface-preferences')).toBeVisible();
    await expect(page.getByTestId('shell.user-menu')).toHaveCount(0);
    await expect(page.getByTestId('shell.user-menu.public-status')).toHaveCount(0);
    await expect(page.getByTestId('shell.logout')).toHaveAttribute('href', /\/oauth\/logout\?next=%2F$/);
    await page.keyboard.press('Escape');
    await clickShellControl(page, 'shell.user-menu-button');
    await expect(page).toHaveURL(/\/app\/profile$/);

  });
});
