import { expect, type Page } from '@playwright/test';

/** Open the real navigation before using controls that live inside it. */
export async function openShellNavigation(page: Page) {
  const toggle = page.getByTestId('shell.mobile-nav-button');
  await expect(toggle).toBeAttached();
  if (await toggle.isVisible() && !await page.getByTestId('nav.drawer').isVisible()) {
    const touch = await page.evaluate(() => navigator.maxTouchPoints > 0);
    if (touch) await toggle.tap();
    else await toggle.click();
    await expect(page.getByTestId('nav.drawer')).toBeVisible();
  }
}

/** Each action still uses exactly one real click/tap; no force or retry. */
export async function clickShellControl(page: Page, testId: string, touch = false) {
  await openShellNavigation(page);
  const control = page.getByTestId(testId);
  if (touch) await control.tap();
  else await control.click();
}
