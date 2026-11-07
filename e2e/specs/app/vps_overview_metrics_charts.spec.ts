import { expect, test } from '@playwright/test';

import { bootstrapVpsAdminWindow, installHaveApiMock, setUiSettingsLocalStorage } from '../../fixtures';

const vps = {
  id: 123,
  hostname: 'vps123.example',
  object_state: 'active',
  is_running: true,
  cpu: 2,
  memory: 2048,
  swap: 0,
  diskspace: 20480,
  used_memory: 768,
  used_swap: 0,
  used_diskspace: 5120,
  uptime: 12345,
  loadavg1: 0.12,
  loadavg5: 0.18,
  node: { id: 1, domain_name: 'node1.example' },
  os_template: { label: 'debian' },
  dns_resolver: null,
};

const statuses = [
  {
    id: 1,
    created_at: '2026-01-31T00:00:00Z',
    loadavg1: 0.05,
    loadavg5: 0.08,
    used_memory: 512,
  },
  {
    id: 2,
    created_at: '2026-01-31T01:00:00Z',
    loadavg1: 0.22,
    loadavg5: 0.19,
    used_memory: 768,
  },
  {
    id: 3,
    created_at: '2026-01-31T02:00:00Z',
    loadavg1: 0.12,
    loadavg5: 0.18,
    used_memory: 700,
  },
];

test.describe('VPS overview metrics charts', () => {
  test('renders charts and switches window', async ({ page }) => {
    await bootstrapVpsAdminWindow(page, { sessionToken: 'TEST' });

    await installHaveApiMock(page, {
      user: { id: 1, login: 'test', level: 1 },
      handlers: {
        'GET vpses/123': () => ({ vps }),
        'GET vpses/123/statuses': () => ({ statuses }),
        'GET ip_addresses': () => ({ ip_addresses: [] }),
        'GET transaction_chains': () => ({ transaction_chains: [] }),
      },
    });

    await page.goto('/app/vps/123');

    await expect(page.getByTestId('vps.overview.metrics.card')).toBeVisible();
    await page.getByTestId('vps.overview.metrics.toggle').click();
    await expect(page.getByTestId('vps.overview.metrics.chart.load1')).toBeVisible();
    await expect(page.getByTestId('vps.overview.metrics.chart.load5')).toBeVisible();
    await expect(page.getByTestId('vps.overview.metrics.chart.mem_used')).toBeVisible();
    await expect(page.getByTestId('vps.overview.metrics.chart.disk_used')).toBeVisible();

    await page.getByTestId('vps.overview.metrics.window.7d').click();
    await expect(page).toHaveURL(/metrics_window=7d/);
  });
  test('fetches user metrics on demand and renders charts', async ({ page }) => {
    await bootstrapVpsAdminWindow(page, { sessionToken: 'TEST' });

    let statusesCalls = 0;

    await installHaveApiMock(page, {
      user: { id: 1, login: 'test', level: 1 },
      handlers: {
        'GET vpses/123': () => ({ vps }),
        'GET vpses/123/statuses': () => {
          statusesCalls += 1;
          return { statuses };
        },
        'GET ip_addresses': () => ({ ip_addresses: [] }),
        'GET transaction_chains': () => ({ transaction_chains: [] }),
      },
    });

    await page.goto('/app/vps/123');

    await expect(page.getByTestId('vps.overview.metrics.card')).toBeVisible();
    await expect(page.getByTestId('vps.overview.metrics.toggle')).toHaveAttribute('aria-expanded', 'false');
    expect(statusesCalls).toBe(0);

    await page.getByTestId('vps.overview.metrics.toggle').click();
    await expect(page.getByTestId('vps.overview.metrics.chart.load1')).toBeVisible();

    // The heavier history request is deferred until the user asks for charts.
    expect(statusesCalls).toBeGreaterThan(0);

  });
});

test('shows history on demand with axes, keyboard inspection and sample gaps', async ({ page, isMobile }, testInfo) => {
  await page.setViewportSize({ width: isMobile ? 320 : 1440, height: 900 });
  await bootstrapVpsAdminWindow(page, { sessionToken: 'TEST' });
  await setUiSettingsLocalStorage(page, { language: 'cs', theme: 'dark' });
  const rows = [statuses[0]!, { ...statuses[1]!, loadavg1: null }, statuses[2]!];
  let requests = 0;
  let error = false;
  await installHaveApiMock(page, {
    user: { id: 1, login: 'test', level: 1 },
    handlers: {
      'GET vpses/123': () => ({ vps }),
      'GET vpses/123/statuses': () => {
        requests += 1;
        return error
          ? { status: 503, contentType: 'application/json', body: '{"status":false}' }
          : { statuses: rows };
      },
      'GET ip_addresses': () => ({ ip_addresses: [] }),
      'GET transaction_chains': () => ({ transaction_chains: [] }),
    },
  });

  await page.goto('/app/vps/123');
  const card = page.getByTestId('vps.overview.metrics.card');
  const toggle = card.getByTestId('vps.overview.metrics.toggle');
  const plot = card.getByTestId('vps.overview.metrics.chart.load1');
  await expect(toggle).toHaveText('Zobrazit historii');
  expect(requests).toBe(0);
  await card.screenshot({ path: testInfo.outputPath('history-action.png'), scale: 'css' });
  await toggle.click();
  await expect(plot).toBeVisible();
  const xAxis = card.getByTestId('vps.overview.metrics.chart.load1.x-axis');
  const yAxis = card.getByTestId('vps.overview.metrics.chart.load1.y-axis');
  await expect(xAxis.locator('span')).toHaveCount(2);
  await expect(yAxis).toContainText('0.12');
  await expect(yAxis).toContainText('0.05');
  await expect(card.getByTestId('vps.overview.metrics.chart.mem_used.y-axis')).toContainText('100.0%');
  await expect(plot.locator('svg path[d*=" M"]')).toHaveCount(1);
  expect((await plot.boundingBox())!.height).toBeGreaterThanOrEqual(140);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
    await page.evaluate(() => document.documentElement.clientWidth + 1),
  );

  await plot.locator('..').screenshot({ path: testInfo.outputPath('history-chart.png'), scale: 'css' });
  await plot.focus();
  await expect(plot.getByRole('status')).toContainText('0.12');
  await plot.press('ArrowLeft');
  await expect(plot.getByRole('status')).toContainText('0.05');
  if (isMobile) {
    await plot.tap({ position: { x: (await plot.boundingBox())!.width - 14, y: 24 } });
    await expect(plot.getByRole('status')).toContainText('0.12');
  }

  expect(requests).toBe(1);
  await toggle.click();
  await expect(plot).toHaveCount(0);
  await toggle.click();
  await expect(plot).toBeVisible();
  expect(requests).toBe(1);

  error = true;
  await card.getByTestId('vps.overview.metrics.refresh').click();
  await expect(card.getByText('Nepodařilo se načíst metriky.')).toBeVisible();
  expect(requests).toBe(2);
});
