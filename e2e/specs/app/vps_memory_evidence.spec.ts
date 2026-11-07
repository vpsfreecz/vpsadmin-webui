import { expect, test } from '@playwright/test';
import { bootstrapVpsAdminWindow, installHaveApiMock } from '../../fixtures';
import { setUiSettingsLocalStorage } from '../../fixtures/uiSettings';
import { expectNoDocumentHorizontalOverflow } from '../../helpers/horizontalOverflow';
const vps = {
  id: 123,
  hostname: 'vps123.example',
  object_state: 'active',
  is_running: true,
  enable_network: true,
  cpus: 2,
  memory: 2048,
  swap: 0,
  diskspace: 20480,
  used_memory: 768,
  used_swap: 0,
  used_diskspace: 5120,
  uptime: 12345,
  loadavg1: 0.12,
  dataset: { id: 10, name: 'tank/data' },
  node: {
    id: 1,
    domain_name: 'node1.example',
    location: { id: 2, label: 'Praha', remote_console_server: '/_console', environment: { id: 1, label: 'prod' } },
  },
  user: { id: 10, login: 'alice' },
  os_template: { id: 6, label: 'Debian 12' },
  dns_resolver: 'inherit',
};

for (const [language, theme] of [
  ['cs', 'dark'],
  ['en', 'light'],
] as const) {
  for (const [mode, level] of [
    ['app', 1],
    ['app', 99],
    ['admin', 99],
  ] as const) {
    test(`@pr-smoke @pr-smoke-mobile neutral RAM and confirmed dated OOM ${language} ${mode} ${level}`, async ({
      page,
    }, testInfo) => {
      await page.setViewportSize(
        testInfo.project.name.startsWith('mobile') ? { width: 390, height: 844 } : { width: 1440, height: 1000 }
      );
      const now = Date.parse('2026-11-07T12:00:00Z');
      await page.clock.setFixedTime(new Date(now));
      await bootstrapVpsAdminWindow(page);
      await setUiSettingsLocalStorage(page, { language, theme });
      const rows = [
        { ...vps, used_memory: 2030 },
        { ...vps, id: 124, hostname: 'oom124.example', used_memory: 2020 },
        { ...vps, id: 125, hostname: 'unknown125.example', used_memory: undefined },
      ];
      const at = new Date(now - 10 * 60_000).toISOString();
      const reports = [
        { id: 52, vps: { id: 124 }, created_at: at },
        { id: 51, vps: { id: 124 }, created_at: new Date(now - 20 * 60_000).toISOString() },
        { id: 53, vps: { id: 123 }, created_at: new Date(now - 25 * 60 * 60_000).toISOString() },
        { id: 54, vps: { id: 125 }, created_at: 'invalid' },
        { id: 55, vps: { id: 123 }, created_at: new Date(now + 60 * 60_000).toISOString() },
      ];
      const writes: string[] = [];
      const queries: URL[] = [];
      page.on('request', (request) => {
        const url = new URL(request.url());
        if (url.pathname.startsWith('/api/') && !['GET', 'HEAD', 'OPTIONS'].includes(request.method()))
          writes.push(request.method() + ' ' + url.pathname);
        if (url.pathname.endsWith('/oom_reports')) queries.push(url);
      });
      await installHaveApiMock(page, {
        user: { id: 10, login: 'synthetic-member', level },
        handlers: {
          'GET webui_user_settings': () => ({
            webui_user_setting: { namespace: 'ui', key: 'settings', value: JSON.stringify({ language, theme }) },
          }),
          'GET vpses': () => ({ vpses: rows }),
          'GET vpses/123': () => ({ vps: rows[0] }),
          'GET vpses/124': () => ({ vps: rows[1] }),
          'GET vpses/125': () => ({ vps: rows[2] }),
          'GET ip_addresses': () => ({ ip_addresses: [] }),
          'GET oom_reports': () => ({ oom_reports: reports }),
          'GET transaction_chains': () => ({ transaction_chains: [] }),
          'GET vpses/123/statuses': () => ({ statuses: [] }),
          'GET vpses/124/statuses': () => ({ statuses: [] }),
          'GET vpses/125/statuses': () => ({ statuses: [] }),
        },
      });
      const query = mode === 'admin' ? '?user=10' : '';
      await page.goto(`/${mode}/vps${query}`);
      const prefix = testInfo.project.name.startsWith('mobile') ? 'vps.card' : 'vps.row';
      const healthy = page.getByTestId(`${prefix}.123`);
      await expect(healthy).toBeVisible();
      if (process.env['CAPTURE_SIDE'] === 'baseline') {
        await expect(page.getByTestId(`${prefix}.123.ram_high`)).toBeVisible();
        await page
          .getByTestId('vps.list')
          .screenshot({ path: testInfo.outputPath(`memory-${language}-${mode}-${level}-before.png`) });
        return;
      }
      const badge = page.getByTestId(`${prefix}.124.recent_oom`);
      await expect(badge).toBeVisible();
      await expect(badge).toContainText('OOM');
      await expect(badge).toHaveAttribute('href', `/${mode}/oom-reports/52`);
      await expect(badge).toHaveAttribute('title', /#52/);
      await expect(badge).toContainText(language === 'cs' ? '7. 11. 2026' : '11/7/2026');
      await expect(badge).not.toHaveText('OOM'); // The event time is visible, not only a tooltip.
      for (const id of [123, 124, 125]) await expect(page.getByTestId(`${prefix}.${id}.ram_high`)).toHaveCount(0);
      await expect(page.getByTestId(`${prefix}.123.recent_oom`)).toHaveCount(0);
      await expect(page.getByTestId(`${prefix}.125.recent_oom`)).toHaveCount(0);
      const memory = healthy.getByRole('img', { name: 'RAM', exact: true });
      await expect(memory.locator('.bg-accent')).toHaveCount(1);
      await expect(memory.locator('.bg-danger,.bg-warn')).toHaveCount(0);
      await expect(page.getByTestId(`${prefix}.125`).getByRole('img', { name: 'RAM', exact: true })).toHaveCount(0);
      const listQuery = queries[0];
      expect(listQuery).toBeDefined();
      expect(listQuery?.searchParams.get('oom_report[limit]')).toBe('100');
      expect(listQuery?.searchParams.get('oom_report[since]')).toBeTruthy();
      expect(listQuery?.searchParams.get('oom_report[user]')).toBe(level === 99 ? '10' : null);
      if (testInfo.project.name.startsWith('mobile')) {
        const name = page.getByTestId(`${prefix}.124`).getByRole('link', { name: 'oom124.example', exact: true });
        expect((await name.boundingBox())?.height).toBeLessThan(28);
      }
      await expectNoDocumentHorizontalOverflow(page);
      await page
        .getByTestId('vps.list')
        .screenshot({ path: testInfo.outputPath(`memory-${language}-${mode}-${level}-after.png`) });
      for (const id of [123, 124, 125]) {
        await page.goto(`/${mode}/vps/${id}${query}`);
        await expect(page.getByTestId('vps.header')).toBeVisible();
        await expect(page.getByTestId('vps.header.ram_high')).toHaveCount(0);
        if (id === 124)
          await expect(page.getByTestId('vps.header.recent_oom')).toHaveAttribute('href', `/${mode}/oom-reports/52`);
        else await expect(page.getByTestId('vps.header.recent_oom')).toHaveCount(0);
        await expectNoDocumentHorizontalOverflow(page);
      }
      expect(writes).toEqual([]);
    });
  }
}
