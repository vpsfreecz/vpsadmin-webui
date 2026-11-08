import { clickShellControl } from '../../helpers/shellNavigation';
import { expect, test } from '@playwright/test';

import { bootstrapVpsAdminWindow, installHaveApiMock } from '../../fixtures';
import { expectNoDocumentHorizontalOverflow } from '../../helpers/horizontalOverflow';

test('@pr-smoke-mobile keeps direct account controls and preferences inside a 320px viewport', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await bootstrapVpsAdminWindow(page, { sessionToken: 'TEST' });
  await installHaveApiMock(page, {
    user: { id: 1, login: 'test', level: 1 },
    handlers: {
      'GET vpses': () => ({ vpses: [], _meta: { total_count: 0 } }),
    },
  });

  await page.goto('/app/vps');
  await expect(page.getByTestId('vps.list')).toBeVisible();
  await clickShellControl(page, 'shell.interface-preferences-button');

  const menu = page.getByTestId('shell.interface-preferences');
  await expect(menu).toBeVisible();
  const box = await menu.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(320);
  await expect(page.getByTestId('shell.user-menu')).toHaveCount(0);
  await expect(page.getByTestId('shell.user-menu-button')).toBeInViewport({ ratio: 1 });
  await expect(page.getByTestId('shell.logout')).toBeInViewport({ ratio: 1 });
  const logoutBox = await page.getByTestId('shell.logout').boundingBox();
  expect(logoutBox!.height).toBeGreaterThanOrEqual(44);
  expect(logoutBox!.width).toBeGreaterThanOrEqual(44);
  await expectNoDocumentHorizontalOverflow(page);
});
