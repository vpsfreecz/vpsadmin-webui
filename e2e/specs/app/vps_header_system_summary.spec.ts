import { expect, test, type Page } from '@playwright/test';
import { bootstrapVpsAdminWindow, installHaveApiMock, setUiSettingsLocalStorage } from '../../fixtures';
import { expectNoDocumentHorizontalOverflow } from '../../helpers/horizontalOverflow';

for (const language of ['cs', 'en'] as const) {
  for (const mode of ['admin', 'app'] as const) {
    test(`@pr-smoke @pr-smoke-mobile VPS system summary in ${language} for ${mode}`, async ({ page }, testInfo) => {
      await setUiSettingsLocalStorage(page, { language, theme: 'dark' });
      await bootstrapVpsAdminWindow(page);
      const vps = {
        id: 123, hostname: 'vps123.example.test', object_state: 'active', is_running: true,
        cpu: 2, memory: 2048, swap: 0, diskspace: 20480, used_memory: 768, used_diskspace: 5120,
        uptime: 3026523, loadavg1: 0.06, loadavg5: 0.04, loadavg15: 0, process_count: 64, cpu_idle: 99.87,
        dataset: { id: 10, name: 'tank/data' },
        os_template: { id: 6, label: 'Debian 12' }, user: { id: 10, login: 'alice' },
        node: { id: 1, domain_name: 'node1.example.test', location: { id: 2, label: 'Praha', remote_console_server: '/_console' } },
      };
      await installHaveApiMock(page, {
        user: { id: 10, login: 'alice', level: mode === 'admin' ? 100 : 1 },
        handlers: {
          'GET vpses/123': () => ({ vps }),
          'GET ip_addresses': () => ({ ip_addresses: [{ id: 1, addr: '203.0.113.42', prefix: 32, network: { id: 1, role: 'public' } }] }),
          'GET datasets/10': () => ({ dataset: { id: 10, name: 'tank/data', refquota: 20480 } }),
          'GET vpses/123/statuses': () => ({ statuses: [] }),
        },
      });
      await page.goto(`/${mode}/vps/123`);
      const header = page.getByTestId('vps.header');
      await expect(header.getByTestId('vps.header.distribution')).toContainText('Debian 12');
      const distributionField = header.getByTestId('vps.header.distribution_field');
      await expect(distributionField).toHaveText(`${language === 'cs' ? 'Distribuce' : 'Distribution'} Debian 12`);
      if (mode === 'admin') {
        expect(await distributionField.evaluate((field) => field.previousElementSibling?.getAttribute('data-testid')))
          .toBe('vps.header.owner');
      }
      await expect(header.getByTestId('vps.header.runtime.uptime').locator('dd')).toHaveText('35d 0h');
      await expect(header.getByTestId('vps.header.runtime.load').locator('dd')).toHaveText('0.06 / 0.04 / 0.00');
      await expect(header.getByTestId('vps.header.runtime.processes').locator('dd')).toHaveText('64');
      await expect(header.getByTestId('vps.header.runtime.cpu').locator('dd')).toHaveText('0.13 %');
      const headerBox = await header.boundingBox();
      const runtimeBox = await header.getByTestId('vps.header.runtime').boundingBox();
      expect(runtimeBox!.width).toBeGreaterThan(headerBox!.width * 0.85);
      const uptimeBox = await header.getByTestId('vps.header.runtime.uptime').boundingBox();
      const loadBox = await header.getByTestId('vps.header.runtime.load').boundingBox();
      const cpuBox = await header.getByTestId('vps.header.runtime.cpu').boundingBox();
      expect(Math.abs(uptimeBox!.y - loadBox!.y)).toBeLessThan(1);
      if (page.viewportSize()!.width >= 640) {
        expect(Math.abs(uptimeBox!.y - cpuBox!.y)).toBeLessThan(1);
      } else {
        expect(cpuBox!.y).toBeGreaterThan(uptimeBox!.y + uptimeBox!.height);
      }
      await expectNoDocumentHorizontalOverflow(page);
      await header.screenshot({ path: testInfo.outputPath(`vps-header-${language}-${mode}.png`) });

      // Metadata stays available after stopping; old live values must not.
      vps.is_running = false;
      await page.reload();
      await expect(header.getByTestId('vps.header.distribution')).toContainText('Debian 12');
      for (const key of ['uptime', 'load', 'processes', 'cpu']) {
        await expect(header.getByTestId(`vps.header.runtime.${key}`).locator('dd')).toHaveText('—');
      }

      vps.os_template.label = 'CustomDistributionWithAnUnusuallyLongUnbrokenVersionLabel'.repeat(4);
      await page.reload();
      await expect(header.getByTestId('vps.header.distribution')).toContainText(vps.os_template.label);
      await expectNoDocumentHorizontalOverflow(page);
      vps.os_template.label = '   ';
      await page.reload();
      await expect(header.getByTestId('vps.header.distribution')).toHaveText('—');
    });
  }
}

test('@smoke @smoke-mobile VPS detail header shows the same usage badges as the list', async ({ page }, testInfo) => {
  await bootstrapVpsAdminWindow(page);
  const vps = {
    id: 124, hostname: 'vps124.example.test', object_state: 'active', is_running: true,
    cpu: 2, memory: 2048, used_memory: 1900, diskspace: 20480, used_diskspace: 20200,
    user: { id: 10, login: 'alice' },
    node: { id: 1, domain_name: 'node1.example.test', location: { id: 2, label: 'Praha' } },
  };
  const calm = { ...vps, id: 125, hostname: 'vps125.example.test', used_memory: 1740, used_diskspace: 5120 };
  await installHaveApiMock(page, {
    user: { id: 10, login: 'alice', level: 99 },
    handlers: {
      'GET vpses': () => ({ vpses: [vps, calm] }),
      'GET vpses/124': () => ({ vps }),
      'GET vpses/125': () => ({ vps: calm }),
      'GET ip_addresses': () => ({ ip_addresses: [] }),
      'GET vpses/124/statuses': () => ({ statuses: [] }),
      'GET vpses/125/statuses': () => ({ statuses: [] }),
      'GET transaction_chains': () => ({ transaction_chains: [] }),
    },
  });

  const listPrefix = testInfo.project.name.startsWith('mobile') ? 'vps.card' : 'vps.row';
  const expectUsageBadges = async (prefix: string) => {
    await expect(page.getByTestId(`${prefix}.ram_high`)).toBeVisible();
    await expect(page.getByTestId(`${prefix}.ram_high`)).toHaveText('RAM high');
    await expect(page.getByTestId(`${prefix}.ram_high`)).toHaveClass(/text-warn/);
    await expect(page.getByTestId(`${prefix}.disk_high`)).toBeVisible();
    await expect(page.getByTestId(`${prefix}.disk_high`)).toHaveText('Disk high');
    await expect(page.getByTestId(`${prefix}.disk_high`)).toHaveClass(/text-danger/);
  };
  const expectNoUsageBadges = async (prefix: string) => {
    await expect(page.getByTestId(`${prefix}.ram_high`)).toHaveCount(0);
    await expect(page.getByTestId(`${prefix}.disk_high`)).toHaveCount(0);
  };

  for (const mode of ['app', 'admin'] as const) {
    await page.goto(`/${mode}/vps`);
    await expect(page.getByTestId(`${listPrefix}.125`)).toBeVisible();
    await expectUsageBadges(`${listPrefix}.124`);
    await expectNoUsageBadges(`${listPrefix}.125`);

    await page.goto(`/${mode}/vps/124`);
    await expect(page.getByTestId('vps.header.runtime')).toBeVisible();
    await expectUsageBadges('vps.header');
    await expectNoDocumentHorizontalOverflow(page);

    await page.goto(`/${mode}/vps/125`);
    await expect(page.getByTestId('vps.header.runtime')).toBeVisible();
    await expectNoUsageBadges('vps.header');
  }
});

const DAY_MS = 24 * 60 * 60 * 1000;

async function installRecentFailureMock(page: Page, level: number, recentCreatedAt: string) {
  const vps = {
    id: 126, hostname: 'vps126.example.test', object_state: 'active', is_running: true, memory: 2048, used_memory: 512,
    user: { id: 10, login: 'alice' },
    node: { id: 1, domain_name: 'node1.example.test', location: { id: 2, label: 'Praha', remote_console_server: '/_console' } },
  };
  const recent = { id: 9101, label: 'Restart', state: 'fatal', created_at: recentCreatedAt, concerns: [['Vps', 126]] };
  const old = { id: 9999, label: 'Clone', state: 'failed', created_at: '2022-08-18T14:18:25Z', concerns: [['Vps', 126]] };
  const requests = { failureQueries: [] as string[], latestChainLists: 0 };
  await installHaveApiMock(page, {
    user: { id: 10, login: 'alice', level },
    handlers: {
      'GET vpses/126': () => ({ vps }),
      'GET ip_addresses': () => ({ ip_addresses: [] }),
      'GET vpses/126/statuses': () => ({ statuses: [] }),
      'GET transaction_chains': ({ searchParams }) => {
        const param = (name: string) => searchParams.get(`transaction_chain[${name}]`);
        const state = param('state');
        if (!state) {
          requests.latestChainLists += 1;
          return { transaction_chains: [] };
        }
        if (param('class_name') === 'Vps' && (state === 'failed' || state === 'fatal')) {
          requests.failureQueries.push(`${state}:${param('row_id')}:${param('limit')}`);
        }
        return { transaction_chains: [recent, old].filter((chain) => chain.state === state) };
      },
      'GET transaction_chains/9101': () => ({ transaction_chain: recent }),
      'GET transactions': () => ({ transactions: [] }),
      'POST vpses/126/console_token': () => ({ token: 'T1', expiration: '2099-01-31T00:00:00Z' }),
      'DELETE vpses/126/console_token': () => ({}),
    },
  });
  return requests;
}

test('@smoke @smoke-mobile VPS detail header links a recent failure for a member and lets it age out', async ({ page }) => {
  await page.clock.install();
  await bootstrapVpsAdminWindow(page);
  const requests = await installRecentFailureMock(page, 1, new Date(Date.now() - 7 * DAY_MS + 30_000).toISOString());

  await page.goto('/app/vps/126');
  const badge = page.getByTestId('vps.header.recent_failure');
  await expect(badge).toBeVisible();
  await expect(badge).toHaveText('Recent failed task #9101');
  await expect(badge).toHaveAttribute('href', '/app/transactions/9101');
  await expect(badge).toHaveAttribute('title', /^Failed task: Restart, created /);
  expect([...requests.failureQueries].sort()).toEqual(['failed:126:1', 'fatal:126:1']);
  await expectNoDocumentHorizontalOverflow(page);

  const latestChainLists = requests.latestChainLists;
  await page.clock.fastForward(10_000);
  await expect.poll(() => requests.latestChainLists).toBeGreaterThan(latestChainLists);
  expect(requests.failureQueries).toHaveLength(2);

  await page.clock.fastForward(120_000);
  await expect.poll(() => requests.failureQueries.length).toBe(4);
  await expect(badge).toHaveCount(0);
  await expect(page.getByTestId('vps.header.runtime')).toBeVisible();
});

test('@smoke @smoke-mobile VPS detail header failure badge keeps the admin path and opens with Enter', async ({ page }) => {
  await bootstrapVpsAdminWindow(page);
  await installRecentFailureMock(page, 99, new Date(Date.now() - 60 * 1000).toISOString());

  await page.goto('/admin/vps/126');
  const badge = page.getByTestId('vps.header.recent_failure');
  await expect(badge).toHaveAttribute('href', '/admin/transactions/9101');
  await badge.focus();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/admin\/transactions\/9101$/);
});

test('@smoke VPS console does not poll for recent failures', async ({ page }) => {
  await page.clock.install();
  await bootstrapVpsAdminWindow(page, { sessionToken: 'TEST' });
  await page.route('**/_console/**', (route) => route.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><html><body>console stub</body></html>' }));
  const requests = await installRecentFailureMock(page, 1, new Date(Date.now() - 60 * 1000).toISOString());

  await page.goto('/app/vps/126/console');
  await expect(page.getByTestId('vps.console.page')).toBeVisible();
  await expect.poll(() => requests.latestChainLists).toBeGreaterThan(0);
  const latestChainLists = requests.latestChainLists;
  await page.clock.fastForward(20_000);
  await expect.poll(() => requests.latestChainLists).toBeGreaterThan(latestChainLists);
  expect(requests.failureQueries).toEqual([]);
  await expect(page.getByTestId('vps.header.recent_failure')).toHaveCount(0);
});
