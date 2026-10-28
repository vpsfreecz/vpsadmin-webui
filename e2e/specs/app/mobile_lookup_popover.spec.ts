import { expect, test } from '@playwright/test';
import { bootstrapVpsAdminWindow, installHaveApiMock, setUiSettingsLocalStorage } from '../../fixtures';

// One real touch, no locator auto-scroll and no retries to conceal a missed tap.
test.describe('@pr-smoke @pr-smoke-mobile lookup options inside dialogs', () => {
  test.describe.configure({ retries: 0 });
  for (const language of ['cs', 'en'] as const) {
    for (const viewport of [{ width: 390, height: 664 }, { width: 844, height: 390 }, { width: 1440, height: 900 }, { width: 390, height: 844, resizeTo: 500 }]) {
      test(`${language} last owner option stays reachable at ${viewport.width}x${viewport.height}${'resizeTo' in viewport ? ' after resize' : ''}`, async ({ page, hasTouch }, testInfo) => {
        await page.setViewportSize(viewport);
        await bootstrapVpsAdminWindow(page);
        await setUiSettingsLocalStorage(page, { language, theme: language === 'cs' ? 'dark' : 'light' });
        await installHaveApiMock(page, {
          user: { id: 1, login: 'touch-admin', level: 99 },
          handlers: {
            'GET vpses': () => ({ vpses: [] }),
            'GET nodes': () => ({ nodes: [] }),
            'GET users': () => ({ users: Array.from({ length: 8 }, (_, index) => ({
              id: index + 1, login: `alice${index + 1}`, full_name: 'Synthetic member', email: `alice${index + 1}@example.test`,
            })) }),
            'GET help_boxes': () => ({ help_boxes: [] }),
          },
        });
        await page.goto('/admin/vps');
        const advanced = page.getByRole('button', { name: language === 'cs' ? 'Pokročilé filtry' : 'Advanced filters', exact: true });
        if (hasTouch) await advanced.tap();
        else await advanced.click();
        const input = page.getByTestId('vps.filter.user.lookup');
        await input.fill('ali');
        const option = page.getByTestId('vps.filter.user.lookup.opt.8');
        const popup = page.getByTestId('vps.filter.user.lookup.dropdown');
        await expect(option).toBeAttached();
        if (typeof viewport.resizeTo === 'number') await page.setViewportSize({ width: viewport.width, height: viewport.resizeTo });
        await popup.evaluate((element) => { element.scrollTop = element.scrollHeight; });
        await expect.poll(() => option.evaluate((element) => {
          const box = element.getBoundingClientRect();
          return element.contains(document.elementFromPoint(box.x + box.width / 2, box.y + box.height - 4));
        })).toBe(true);
        await page.screenshot({ path: testInfo.outputPath(`${language}-${viewport.width}-options.png`) });
        const box = (await option.boundingBox())!;
        if (hasTouch) await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height - 4);
        else await page.mouse.click(box.x + box.width / 2, box.y + box.height - 4);
        await expect(input).toHaveValue('8');
        await expect(page).toHaveURL(/user=8/);
        await expect(popup).toBeHidden();
      });
    }
  }
});
