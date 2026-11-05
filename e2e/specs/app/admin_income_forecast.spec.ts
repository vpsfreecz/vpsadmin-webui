import { expect, test } from '@playwright/test';

import { bootstrapVpsAdminWindow, installHaveApiMock, setUiSettingsLocalStorage } from '../../fixtures';

test('@pr-smoke @pr-smoke-mobile admin income forecast uses six bounded real calculations', async ({
  page,
}, testInfo) => {
  const estimateRequests: URL[] = [];

  await bootstrapVpsAdminWindow(page, { sessionToken: 'TEST' });
  await installHaveApiMock(page, {
    user: { id: 1, login: 'admin', level: 100 },
    handlers: {
      'GET incoming_payments': () => ({ incoming_payments: [], _meta: { total_count: 0 } }),
      'GET payment_stat/estimate_income': (ctx) => {
        estimateRequests.push(new URL(ctx.url.href));
        const month = Number(ctx.searchParams.get('payment_stat[month]'));
        const duration = Number(ctx.searchParams.get('payment_stat[duration]'));
        return {
          payment_stat: {
            user_count: month,
            estimated_income: month * 1_000 + duration * 100,
          },
        };
      },
    },
  });

  await page.goto('/admin/payments/incoming');
  await expect(page.getByTestId('admin.finance.tabs.forecast')).toBeVisible();
  await page.getByTestId('admin.finance.tabs.forecast').click();

  await expect(page).toHaveURL(/\/admin\/payments\/forecast/);
  await expect(page.getByTestId('admin.finance.forecast.summary.estimate')).toBeVisible();
  await expect(page.getByTestId('admin.finance.forecast.chart')).toBeVisible();
  await expect(page.getByTestId('admin.finance.forecast.unit_note')).toContainText(/currency|měn/i);
  await expect(page.getByTestId('admin.finance.forecast.cohort_note')).toContainText(/not a historical|historickou/i);
  await expect.poll(() => estimateRequests.length).toBe(6);

  for (const request of estimateRequests) {
    expect(request.pathname).toBe('/api/v7.0/payment_stat/estimate_income');
    expect(request.searchParams.get('payment_stat[year]')).toMatch(/^\d{4}$/);
    expect(request.searchParams.get('payment_stat[month]')).toMatch(/^\d{1,2}$/);
    expect(request.searchParams.get('payment_stat[select]')).toBe('exactly_until');
    expect(request.searchParams.get('payment_stat[duration]')).toBe('1');
  }

  await page.getByTestId('admin.finance.forecast.filter.month').selectOption('7');
  await page.getByTestId('admin.finance.forecast.filter.mode').selectOption('all_until');
  await page.getByTestId('admin.finance.forecast.filter.duration').fill('3');
  await page.getByTestId('admin.finance.forecast.filter.apply').click();

  await expect(page).toHaveURL(/month=7/);
  await expect(page).toHaveURL(/select=all_until/);
  await expect(page).toHaveURL(/duration=3/);
  await expect(page.getByTestId('admin.finance.forecast.mode_description')).toContainText(/year.*month|rok.*měsíc/i);
  await expect.poll(() => estimateRequests.length).toBe(12);
  await expect(page.getByTestId('admin.finance.forecast.summary.estimate')).toContainText('7,300');

  for (const request of estimateRequests.slice(6)) {
    expect(request.searchParams.get('payment_stat[select]')).toBe('all_until');
    expect(request.searchParams.get('payment_stat[duration]')).toBe('3');
  }

  await page.getByTestId('admin.finance.forecast.pagination.limit').selectOption('3');
  await expect(page.getByTestId('admin.finance.forecast.pagination.page.2')).toBeEnabled();
  await page.getByTestId('admin.finance.forecast.pagination.page.2').click();
  await expect(page).toHaveURL(/(?:\?|&)page=2(?:&|$)/);

  if (testInfo.project.name === 'mobile-chrome') {
    await expect(page.locator('[data-testid^="admin.finance.forecast.mobile."]:visible')).toHaveCount(3);
  } else {
    await expect(page.getByTestId('admin.finance.forecast.table').locator('tbody tr')).toHaveCount(3);
  }

  const screenshot = process.env['E2E_ADMIN_FINANCE_FORECAST_SCREENSHOT']?.trim();
  if (screenshot) {
    const suffix = testInfo.project.name === 'mobile-chrome' ? '-mobile' : '-desktop';
    await page.screenshot({ path: screenshot.replace(/\.png$/i, `${suffix}.png`), fullPage: true });
  }
});

test('admin income forecast keeps the last successful calculation after a refresh error', async ({ page }) => {
  let failRefresh = false;
  let failedRefreshCalls = 0;

  await bootstrapVpsAdminWindow(page, { sessionToken: 'TEST' });
  await installHaveApiMock(page, {
    user: { id: 1, login: 'admin', level: 100 },
    handlers: {
      'GET payment_stat/estimate_income': () => {
        if (failRefresh) {
          failedRefreshCalls += 1;
          return {
            status: 503,
            contentType: 'application/json',
            body: JSON.stringify({ status: false, message: 'forecast unavailable', response: null }),
          };
        }
        return { payment_stat: { user_count: 4, estimated_income: 1_200 } };
      },
    },
  });

  await page.goto('/admin/payments/forecast');
  await expect(page.getByTestId('admin.finance.forecast.summary.estimate')).toContainText('1,200');
  failRefresh = true;
  await page.getByTestId('admin.finance.forecast.refresh').click();

  await expect(page.getByTestId('admin.finance.forecast.stale')).toBeVisible();
  await expect(page.getByTestId('admin.finance.forecast.summary.estimate')).toContainText('1,200');
  expect(failedRefreshCalls).toBe(6);
});

test('admin income forecast surfaces an API 403 through the shared error state', async ({ page }) => {
  let deniedRequests = 0;
  await bootstrapVpsAdminWindow(page, { sessionToken: 'TEST' });
  await installHaveApiMock(page, {
    user: { id: 1, login: 'admin', level: 100 },
    handlers: {
      'GET payment_stat/estimate_income': () => {
        deniedRequests += 1;
        return {
          status: 403,
          contentType: 'application/json',
          body: JSON.stringify({ status: false, message: 'Access denied', response: null }),
        };
      },
    },
  });

  await page.goto('/admin/payments/forecast');

  await expect(page.getByTestId('admin.finance.forecast.error')).toBeVisible();
  expect(deniedRequests).toBeGreaterThan(0);
  await expect(page.getByTestId('admin.finance.forecast.error')).toContainText(/access|permission|oprávnění|přístup/i);
  await expect(page.getByTestId('admin.finance.forecast.summary.estimate')).toHaveCount(0);
});

test('@content-finance-cs normal income forecast keeps Czech selector and uncertainty readable', async ({
  page,
}, info) => {
  const estimateRequests: URL[] = [];
  await setUiSettingsLocalStorage(page, { language: 'cs', theme: 'dark' });
  await bootstrapVpsAdminWindow(page, { sessionToken: 'TEST' });
  await installHaveApiMock(page, {
    user: { id: 1, login: 'admin', level: 100 },
    handlers: {
      'GET payment_stat/estimate_income': ({ url, searchParams }) => {
        estimateRequests.push(new URL(url.href));
        const month = Number(searchParams.get('payment_stat[month]'));
        const duration = Number(searchParams.get('payment_stat[duration]'));
        return { payment_stat: { user_count: month, estimated_income: month * 1_000 + duration * 100 } };
      },
    },
  });
  await page.goto('/admin/payments/forecast?year=2026&month=7&select=all_until&duration=3');
  await expect(page.getByTestId('admin.finance.tabs.overview')).toHaveText('Přehled');
  await expect(page.getByTestId('admin.finance.forecast.summary.estimate')).toContainText(/7[\s,.]?300/);
  await expect(page.getByTestId('admin.finance.forecast.filter.mode')).toHaveValue('all_until');
  await expect(page.getByTestId('admin.finance.forecast.filter.duration')).toHaveValue('3');
  await expect(page.getByTestId('admin.finance.forecast.mode_description')).toContainText('2025');
  await expect(page.getByTestId('admin.finance.forecast.mode_description')).toContainText('2026');
  await expect(page.getByTestId('admin.finance.forecast.unit_note')).toContainText(/měn/i);
  await expect(page.getByTestId('admin.finance.forecast.cohort_note')).toContainText(/historick/i);
  await expect.poll(() => estimateRequests.length).toBe(6);
  for (const request of estimateRequests) {
    expect(request.searchParams.get('payment_stat[select]')).toBe('all_until');
    expect(request.searchParams.get('payment_stat[duration]')).toBe('3');
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: info.outputPath('income-forecast-cs.png'), fullPage: true });
});
