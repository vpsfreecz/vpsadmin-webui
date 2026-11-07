import { expect, test, type Locator, type Page } from '@playwright/test';

import { bootstrapVpsAdminWindow, installHaveApiMock } from '../../fixtures';
import { setUiSettingsLocalStorage } from '../../fixtures/uiSettings';
import { expectNoDocumentHorizontalOverflow } from '../../helpers/horizontalOverflow';

async function box(locator: Locator) {
  const result = await locator.boundingBox();
  if (!result) throw new Error('Expected a visible element');
  return result;
}

async function expectFilterBarOrder(page: Page, isMobile: boolean, filtersTestId: string, chipsTestId: string) {
  const filters = page.getByTestId(filtersTestId);
  const chips = page.getByTestId(chipsTestId);
  await expect(chips).toBeVisible();

  const search = await box(filters.getByRole('combobox'));
  const searchBottom = search.y + search.height;
  const controls = await Promise.all((await filters.locator(':scope > button').all()).map(box));
  expect(controls.length).toBeGreaterThan(0);

  for (const control of controls) {
    if (isMobile) {
      expect(control.y).toBeGreaterThanOrEqual(searchBottom);
    } else {
      expect(Math.abs(control.y + control.height - searchBottom)).toBeLessThanOrEqual(1);
    }
  }

  const controlsBottom = Math.max(...controls.map((control) => control.y + control.height));
  expect((await box(chips)).y).toBeGreaterThanOrEqual(controlsBottom);
}

test.beforeEach(async ({ page }) => {
  await bootstrapVpsAdminWindow(page, { sessionToken: 'TEST_USER_SESSION' });
  await installHaveApiMock(page, {
    user: { id: 10, login: 'alice', level: 1 },
    handlers: {
      'GET vpses': () => ({
        vpses: [{ id: 101, hostname: 'alpha', is_running: true, object_state: 'active' }],
        _meta: { total_count: 1 },
      }),
      'GET transaction_chains': () => ({ transaction_chains: [], _meta: { total_count: 0 } }),
    },
  });
});

test('@smoke @smoke-mobile transaction chain filter chips render below controls aligned with the search field', async ({
  page,
  isMobile,
}) => {
  await page.goto('/app/transactions?row_id=456789456');
  await expectFilterBarOrder(page, isMobile, 'transactions.list.filters', 'transactions.list.active_filters');
});

test('@smoke @smoke-mobile VPS list filter chips render below controls aligned with the search field', async ({
  page,
  isMobile,
}) => {
  await page.goto('/app/vps?q=alpha');
  await expectFilterBarOrder(page, isMobile, 'vps.list.filters', 'vps.list.active_filters');
});

test('@smoke @smoke-mobile a long VPS list filter chip stays within the filter bar', async ({ page }) => {
  await page.goto(`/app/vps?q=${'a'.repeat(200)}`);

  const chips = page.getByTestId('vps.list.active_filters');
  await expect(chips).toBeVisible();

  const filters = await box(page.getByTestId('vps.list.filters'));
  const remove = await box(chips.getByRole('button').first());
  expect(remove.x + remove.width).toBeLessThanOrEqual(filters.x + filters.width + 1);
  await expectNoDocumentHorizontalOverflow(page);
});

for (const language of ['cs', 'en'] as const) {
  for (const theme of ['light', 'dark'] as const) {
    test(`@pr-smoke @pr-smoke-mobile transaction filter controls share the input height in ${language} ${theme}`, async ({
      page,
    }, testInfo) => {
      await setUiSettingsLocalStorage(page, { language, theme });
      await page.goto('/app/transactions?row_id=456789456');
      const filters = page.getByTestId('transactions.list.filters');
      const chips = page.getByTestId('transactions.list.active_filters');
      await expect(chips).toBeVisible();
      const input = await box(filters.getByRole('combobox'));
      const buttons = await filters.locator(':scope > button').all();
      expect(buttons).toHaveLength(3);
      await page.screenshot({ path: testInfo.outputPath('transaction-filter-controls.png'), fullPage: true });
      for (const button of buttons) {
        expect((await box(button)).height).toBe(input.height);
      }
      const help = page.getByTestId('transactions.chains.smart_filter.help');
      expect((await box(help)).height).toBe(input.height);
      expect((await box(help)).width).toBeGreaterThanOrEqual(44);
      await help.click();
      await expect(page.getByTestId('transactions.chains.smart_help')).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(page.getByTestId('transactions.chains.smart_help')).not.toBeVisible();
      await page.getByTestId('transactions.chains.advanced.open').click();
      await expect(page.getByTestId('transactions.chains.advanced.drawer')).toBeVisible();
      await page.keyboard.press('Escape');
      await page.evaluate(() => {
        Object.defineProperty(navigator, 'clipboard', {
          configurable: true,
          value: {
            writeText: async (value: string) => {
              document.documentElement.dataset['copiedLink'] = value;
            },
          },
        });
      });
      await page.getByTestId('transactions.chains.copy_link').click();
      await expect
        .poll(() => page.evaluate(() => document.documentElement.dataset['copiedLink']))
        .toContain('row_id=456789456');
      await page.getByTestId('transactions.chains.clear_filters').click();
      await expect(chips).not.toBeVisible();
      await expectNoDocumentHorizontalOverflow(page);
    });
  }
}
