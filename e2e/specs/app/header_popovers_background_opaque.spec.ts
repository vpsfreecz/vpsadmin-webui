import { clickShellControl, openShellNavigation } from '../../helpers/shellNavigation';
import { expect, test } from '@playwright/test';

import { bootstrapVpsAdminWindow, failEnvelope, installHaveApiMock } from '../../fixtures';

function alphaFromComputedBg(bg: string): number {
  // Common forms:
  // - rgb(r, g, b)
  // - rgba(r, g, b, a)
  const m = bg.match(/rgba?\(([^)]+)\)/i);
  if (!m) return 1;
  const parts = (m[1] ?? '').split(',').map((s) => s.trim());
  if (parts.length < 4) return 1;
  const a = Number(parts[3]);
  return Number.isFinite(a) ? a : 1;
}

test.describe('@smoke Header popovers', () => {
  test('header, interface preferences and sync panel backgrounds are opaque', async ({ page }) => {
    await bootstrapVpsAdminWindow(page, { sessionToken: 'TEST' });

    // Keep the background failure active while checking the error surface.

    await installHaveApiMock(page, {
      user: { id: 1, login: 'test', level: 90 },
      handlers: {
        'GET vpses': () => ({ vpses: [], _meta: { total_count: 0 } }),
        'GET action_states': () => failEnvelope('temporary failure'),
      },
    });

    await page.goto('/app/vps');
    await expect(page.getByTestId('vps.list')).toBeVisible();

    // Sticky header and chrome controls must be fully opaque, and controls must not visually collapse into the header surface.
    await openShellNavigation(page);
    const header = page.getByTestId((page.viewportSize()?.width ?? 0) < 768 ? 'nav.drawer' : 'shell.sidebar');
    await expect(header).toBeVisible();
    const headerBg = await header.evaluate((el) => window.getComputedStyle(el).backgroundColor);
    expect(alphaFromComputedBg(headerBg)).toBeGreaterThanOrEqual(0.999);

    const inlineSearch = page.getByTestId('shell.inline-search');
    await expect(inlineSearch).toBeVisible();
    const searchBg = await inlineSearch.evaluate((el) => window.getComputedStyle(el).backgroundColor);
    expect(alphaFromComputedBg(searchBg)).toBeGreaterThanOrEqual(0.999);

    const tasksButton = page.getByTestId('tasks.open-button');
    await expect(tasksButton).toBeVisible();
    const tasksBg = await tasksButton.evaluate((el) => window.getComputedStyle(el).backgroundColor);
    expect(alphaFromComputedBg(tasksBg)).toBeGreaterThanOrEqual(0.999);

    const userMenuButton = page.getByTestId('shell.user-menu-button');
    await expect(userMenuButton).toBeVisible();
    const userButtonBg = await userMenuButton.evaluate((el) => window.getComputedStyle(el).backgroundColor);
    expect(alphaFromComputedBg(userButtonBg)).toBeGreaterThanOrEqual(0.999);

    // Interface preference popover
    await clickShellControl(page, 'shell.interface-preferences-button');
    const userMenu = page.getByTestId('shell.interface-preferences');
    await expect(userMenu).toBeVisible();
    const userMenuBg = await userMenu.evaluate((el) => window.getComputedStyle(el).backgroundColor);
    expect(alphaFromComputedBg(userMenuBg)).toBeGreaterThanOrEqual(0.999);

    // Sync indicator popover
    const indicator = page.getByTestId('shell.sync-indicator');
    await expect(indicator).toBeVisible();
    await indicator.click();
    const syncPanel = page.getByTestId('shell.sync-panel');
    await expect(syncPanel).toBeVisible();
    const syncBg = await syncPanel.evaluate((el) => window.getComputedStyle(el).backgroundColor);
    expect(alphaFromComputedBg(syncBg)).toBeGreaterThanOrEqual(0.999);
  });
});
