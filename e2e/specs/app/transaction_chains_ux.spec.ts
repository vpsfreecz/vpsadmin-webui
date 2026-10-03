import { expect, test } from '@playwright/test';

import { bootstrapVpsAdminWindow, installHaveApiMock, setUiSettingsLocalStorage } from '../../fixtures';

function chain(
  id: number,
  state: string,
  label: string,
  progress: number,
  size: number,
  vpsId: number,
) {
  return {
    id,
    state,
    label,
    progress,
    size,
    created_at: `2026-09-21T20:${String(id % 60).padStart(2, '0')}:00Z`,
    concerns: [{ class_name: 'Vps', row_id: vpsId, label: `vps-${vpsId}` }],
    action_state_id: null,
  };
}

test('@pr-smoke @pr-smoke-mobile transaction chains prioritize active and failed work without tinting completed rows', async ({ page }, testInfo) => {
  const chains = [
    chain(9_104, 'done', 'Update', 2, 2, 30_398),
    chain(9_103, 'queued', 'Snapshot', 1, 4, 30_399),
    chain(9_102, 'failed', 'Delete', 2, 3, 30_400),
    chain(9_101, 'resolved', 'Resolve', 1, 1, 30_401),
  ];

  await bootstrapVpsAdminWindow(page, { sessionToken: 'TEST_SESSION' });
  await installHaveApiMock(page, {
    user: { id: 1, login: 'admin', level: 100 },
    handlers: {
      'GET transaction_chains': () => ({ transaction_chains: chains }),
    },
  });

  await page.goto('/admin/transactions');

  await expect(page.getByTestId('transactions.page_summary')).toBeVisible();
  await expect(page.getByTestId('transactions.page_summary.failed')).toContainText('1');
  await expect(page.getByTestId('transactions.page_summary.active')).toContainText('1');
  await expect(page.getByTestId('transactions.page_summary.finished')).toContainText('2');

  const completedRow = page.getByTestId('transactions.row.9104');
  const activeRow = page.getByTestId('transactions.row.9103');
  const failedRow = page.getByTestId('transactions.row.9102');

  await expect(completedRow).not.toHaveAttribute('data-row-variant');
  await expect(activeRow).toHaveAttribute('data-row-variant', 'warn');
  await expect(failedRow).toHaveAttribute('data-row-variant', 'danger');

  await expect(page.getByTestId('transactions.row.9104.progress')).toHaveText('2/2');
  await expect(page.getByTestId('transactions.row.9104.progress')).not.toContainText('100%');
  await expect(page.getByTestId('transactions.row.9103.progress')).toContainText('1/4 · 25%');
  await expect(activeRow.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '25');
  await expect(failedRow.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '67');

  await expect(completedRow.getByRole('link', { name: /VPS.*30.?398/i }).first()).toBeVisible();
  await expect(completedRow.getByRole('button', { name: /pin transaction chain/i })).toBeVisible();

  const tableScroller = page.getByTestId('transactions.table').locator('div.overflow-x-auto');
  const dimensions = await tableScroller.evaluate((element) => ({
    clientWidth: element.clientWidth,
    scrollWidth: element.scrollWidth,
  }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth);

  const pageDimensions = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(pageDimensions.scrollWidth).toBeLessThanOrEqual(pageDimensions.clientWidth);

  const screenshot = process.env['E2E_TRANSACTION_CHAINS_UX_SCREENSHOT']?.trim();
  if (screenshot) {
    const suffix = testInfo.project.name === 'mobile-chrome' ? '-mobile' : '-desktop';
    await page.screenshot({ path: screenshot.replace(/\.png$/i, `${suffix}.png`), fullPage: true });
  }
});

for (const language of ['cs', 'en'] as const) {
  test(`@pr-smoke @pr-smoke-mobile ${language} uses API operation names in transaction rows, detail and Tasks`, async ({ page }) => {
    const names = language === 'cs'
      ? ['Heslo', 'Alert', 'OOM reporty', 'Připsání', 'Změna stavu', 'Zcela nová operace']
      : ['Password', 'Alert', 'OOM reports', 'Credit', 'State change', 'A new backend operation'];
    const classes = ['Vps', 'Dataset', 'System', 'UserPayment', 'User', 'Vps'];
    const chains = names.map((name, i) => ({
      ...chain(9206 - i, i === 0 ? 'queued' : 'done', name, i === 0 ? 1 : 2, 2, 30100 + i),
      concerns: [{ class_name: classes[i], row_id: 30100 + i }],
    }));
    await bootstrapVpsAdminWindow(page, { sessionToken: 'TEST_SESSION' });
    await setUiSettingsLocalStorage(page, { language, theme: 'dark' });
    await installHaveApiMock(page, {
      user: { id: 1, login: 'admin', level: 100 },
      handlers: {
        'GET transaction_chains': () => ({ transaction_chains: chains }),
        'GET transaction_chains/9206': () => ({ transaction_chain: chains[0] }),
        'GET transactions': () => ({ transactions: [] }),
      },
    });
    await page.goto('/admin/transactions');
    for (const [i, name] of names.entries()) {
      const row = page.getByTestId(`transactions.row.${9206 - i}`);
      await expect(row.getByRole('link', { name, exact: true })).toBeVisible();
      await expect(row).not.toContainText(language === 'cs' ? 'Backend název:' : 'Backend name:');
      await expect(row.getByRole('link', { name: language === 'cs' ? 'Operace' : 'Operation', exact: true })).toHaveCount(0);
    }
    const dimensions = await page.evaluate(() => ({
      width: document.documentElement.clientWidth,
      scroll: document.documentElement.scrollWidth,
    }));
    expect(dimensions.scroll).toBeLessThanOrEqual(dimensions.width);
    await page.screenshot({ path: test.info().outputPath(`operation-names-${language}.png`), fullPage: true });
    await page.getByTestId('transactions.row.9206').getByRole('link', { name: names[0], exact: true }).click();
    await expect(page.getByRole('heading', { name: names[0], exact: true })).toBeVisible();
    await page.getByTestId('tasks.open-button').click();
    await expect(page.getByTestId('tasks.chain.open.9206')).toHaveText(names[0] ?? '');
    await expect(page.getByTestId('tasks.chain.row.9206')).not.toContainText(language === 'cs' ? 'Backend název:' : 'Backend name:');
  });
}
