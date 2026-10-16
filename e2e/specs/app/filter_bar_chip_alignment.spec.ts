import { expect, test, type Locator, type Page } from '@playwright/test';

import { bootstrapVpsAdminWindow, installHaveApiMock } from '../../fixtures';
import { expectNoDocumentHorizontalOverflow } from '../../helpers/horizontalOverflow';

async function box(locator: Locator) {
  const result = await locator.boundingBox();
  if (!result) throw new Error('Expected a visible element');
  return result;
}

async function expectFilterBarOrder(
  page: Page,
  isMobile: boolean,
  filtersTestId: string,
  chipsTestId: string
) {
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
  await expectFilterBarOrder(
    page,
    isMobile,
    'transactions.list.filters',
    'transactions.list.active_filters'
  );
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
