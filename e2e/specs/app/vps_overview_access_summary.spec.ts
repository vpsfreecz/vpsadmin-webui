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
  for (const mode of ['app', 'admin'] as const) {
    for (const running of [true, false]) {
      test(`@pr-smoke @pr-smoke-mobile VPS overview avoids duplicated access in ${mode} ${language} ${theme} ${running ? 'running' : 'stopped'}`, async ({
        page,
      }, testInfo) => {
        await bootstrapVpsAdminWindow(page);
        await setUiSettingsLocalStorage(page, { language, theme });
        let metricsReads = 0;
        await installHaveApiMock(page, {
          user: { id: 10, login: 'synthetic-member', level: mode === 'admin' ? 99 : 1 },
          handlers: {
            'GET vpses/123': () => ({
              vps: { ...vps, is_running: running, loadavg5: 0.23, loadavg15: 0.34, cpu_idle: 77, process_count: 42 },
            }),
            'GET ip_addresses': () => ({
              ip_addresses: [
                {
                  id: 501,
                  addr: '203.0.113.7',
                  prefix: 32,
                  vps: { id: 123 },
                  network: { id: 55, ip_version: 4, role: 'public_access' },
                },
              ],
            }),
            'GET transaction_chains': () => ({ transaction_chains: [] }),
            'GET vpses/123/statuses': () => {
              metricsReads += 1;
              return { statuses: [] };
            },
            'GET oom_reports': () => ({ oom_reports: [] }),
          },
        });
        await page.goto(`/${mode}/vps/123`);
        const header = page.getByTestId('vps.header');
        await expect(header).toBeVisible();
        await expect(page.getByTestId('vps.header.ssh').locator('code')).toHaveText('ssh root@203.0.113.7');
        await expect(page.getByTestId('vps.overview.metrics.toggle')).toHaveAttribute('aria-expanded', 'false');
        await page.screenshot({ path: testInfo.outputPath('overview-access.png'), fullPage: true });
        await expect(page.getByTestId('vps.overview.status_access.card')).toHaveCount(0);
        await expect(page.locator('code').filter({ hasText: 'ssh root@203.0.113.7' })).toHaveCount(1);
        for (const key of ['uptime', 'load', 'cpu', 'processes']) {
          await expect(page.getByTestId(`vps.header.runtime.${key}`)).toHaveCount(1);
        }
        await expect(page.getByTestId('vps.header.runtime.load').locator('dd')).toHaveText(
          running ? '0.12 / 0.23 / 0.34' : '—'
        );
        await expect(page.getByTestId('vps.header.runtime.cpu').locator('dd')).toHaveText(running ? '23.00 %' : '—');
        await expect(page.getByText('0.12 / 0.23 / 0.34', { exact: true })).toHaveCount(running ? 1 : 0);
        if (running) {
          await expect(page.getByTestId('vps.action.primary_console')).toHaveAttribute(
            'href',
            `/${mode}/vps/123/console`
          );
        } else {
          await expect(page.getByTestId('vps.action.start')).toBeVisible();
        }
        await page.evaluate(() =>
          Object.defineProperty(navigator, 'clipboard', {
            configurable: true,
            value: {
              writeText: async (value: string) => {
                document.documentElement.dataset['copiedSsh'] = value;
              },
            },
          })
        );
        await page.getByTestId('vps.header.ssh').getByRole('button').click();
        await expect
          .poll(() => page.evaluate(() => document.documentElement.dataset['copiedSsh']))
          .toBe('ssh root@203.0.113.7');
        expect(metricsReads).toBe(0);
        await page.getByTestId('vps.overview.metrics.toggle').click();
        await expect.poll(() => metricsReads).toBeGreaterThan(0);
        await expectNoDocumentHorizontalOverflow(page);
      });
    }
  }
}
