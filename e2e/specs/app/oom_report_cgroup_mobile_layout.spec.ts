import type { Page } from '@playwright/test';
import { expect, test } from '../../fixtures/bootstrap';
import { setupHaveApiMock } from '../../fixtures/haveapi';
import { setUiSettingsLocalStorage } from '../../fixtures/uiSettings';
import { withAppUrl } from '../../fixtures/url';

const cgroup = '/system.slice/docker-0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef.scope';

async function setupCgroupReport(page: Page) {
  await setUiSettingsLocalStorage(page, { language: 'cs', sidebarCollapsed: false });
  await setupHaveApiMock(page, {
    user: { id: 1, login: 'admin', level: 100 },
    handlers: {
      'GET oom_reports/77': () => ({
        oom_report: {
          id: 77,
          created_at: '2026-09-16T08:30:00Z',
          reported_at: '2026-09-16T08:30:01Z',
          cgroup,
          killed_name: 'memory-worker',
          killed_pid: 12345,
          invoked_by_name: 'systemd',
          invoked_by_pid: 1,
          count: 2,
          vps: {
            id: 123,
            hostname: 'oom-vps.example.test',
            user: { id: 10, login: 'alice' },
            node: { id: 3, domain_name: 'node3.example.test' },
          },
          oom_report_rule: {
            id: 9,
            action: 'notify',
            cgroup_pattern: cgroup,
          },
        },
      }),
      'GET oom_reports/77/usages': () => ({ usages: [] }),
    },
  });
}

test('@pr-smoke @pr-smoke-mobile keeps long OOM cgroup paths inside the detail viewport', async ({
  page,
}, testInfo) => {
  await setupCgroupReport(page);
  const mutations: string[] = [];
  page.on('request', (request) => {
    const url = new URL(request.url());
    if (!url.pathname.startsWith('/api/v7.0/') || ['GET', 'HEAD', 'OPTIONS'].includes(request.method())) return;
    if (request.method() === 'PUT' && url.pathname === '/api/v7.0/webui_user_settings/ui/settings') return;
    mutations.push(`${request.method()} ${url.pathname}`);
  });

  await page.goto(withAppUrl('/admin/oom-reports/77'));

  const header = page.getByTestId('oom.detail.header');
  const summary = page.getByTestId('oom.detail.overview.summary');
  const headerCgroup = page.getByTestId('oom.detail.header.cgroup');
  const ruleCgroup = page.getByTestId('oom.detail.overview.rule_cgroup');
  const openVps = page.getByTestId('oom.detail.open_vps');
  const configureRules = page.getByTestId('oom.detail.rules');
  await expect(header).toBeVisible();
  await expect(summary).toBeVisible();
  await expect(headerCgroup).toHaveText(cgroup);
  await expect(ruleCgroup).toHaveText(cgroup);
  await expect(header).toContainText('memory-worker (12345)');
  await expect(header).toContainText('systemd (1)');
  await expect(header.getByText('2', { exact: true })).toBeVisible();

  const widths =
    testInfo.project.name === 'mobile-chrome'
      ? [320, 390]
      : testInfo.project.name === 'chromium'
        ? [1280]
        : (() => {
            throw new Error(`Missing OOM detail layout coverage for Playwright project ${testInfo.project.name}`);
          })();
  for (const width of widths) {
    await page.setViewportSize({ width, height: 900 });
    const metrics = await page.evaluate(() => {
      const header = document.querySelector<HTMLElement>('[data-testid="oom.detail.header"]');
      const summary = document.querySelector<HTMLElement>('[data-testid="oom.detail.overview.summary"]');
      const cgroupElements = [
        document.querySelector<HTMLElement>('[data-testid="oom.detail.header.cgroup"]'),
        document.querySelector<HTMLElement>('[data-testid="oom.detail.overview.rule_cgroup"]'),
      ];
      return {
        documentOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        headerOverflow: header ? header.scrollWidth - header.clientWidth : -1,
        summaryOverflow: summary ? summary.scrollWidth - summary.clientWidth : -1,
        cgroups: cgroupElements.map((element) => {
          const rect = element?.getBoundingClientRect();
          return {
            overflow: element ? element.scrollWidth - element.clientWidth : -1,
            left: rect?.left ?? -1,
            right: rect?.right ?? -1,
            height: rect?.height ?? 0,
            lineHeight: element ? Number.parseFloat(getComputedStyle(element).lineHeight) : 0,
          };
        }),
      };
    });

    expect(metrics.documentOverflow, `${width}px document overflow`).toBeLessThanOrEqual(1);
    expect(metrics.headerOverflow, `${width}px header overflow`).toBeLessThanOrEqual(1);
    expect(metrics.summaryOverflow, `${width}px summary overflow`).toBeLessThanOrEqual(1);
    for (const [index, path] of metrics.cgroups.entries()) {
      expect(path.overflow, `${width}px cgroup ${index} overflow`).toBeLessThanOrEqual(1);
      expect(path.left, `${width}px cgroup ${index} left edge`).toBeGreaterThanOrEqual(-1);
      expect(path.right, `${width}px cgroup ${index} right edge`).toBeLessThanOrEqual(width + 1);
      expect(path.height, `${width}px cgroup ${index} height`).toBeGreaterThan(0);
      if (width <= 390) {
        expect(path.height, `${width}px cgroup ${index} should wrap`).toBeGreaterThan(path.lineHeight);
      }
    }
    await expect(openVps).toBeInViewport();
    await expect(configureRules).toBeInViewport();
  }

  expect(mutations).toEqual([]);
});

test('OOM overview preserves PID-only processes and unknown fields', async ({ page }, testInfo) => {
  const language = testInfo.project.name === 'mobile-chrome' ? 'cs' : 'en';
  await setUiSettingsLocalStorage(page, { language, theme: language === 'cs' ? 'dark' : 'light' });
  // Omitted optional names/cgroup/count are intentional; both process IDs are known.
  const report = {
    id: 78,
    created_at: '2026-09-16T08:30:00Z',
    reported_at: '2026-09-17T09:31:00Z',
    killed_pid: 17001,
    invoked_by_pid: 17002,
    vps: {
      id: 123,
      hostname: 'oom-pid-only.example.test',
      user: { id: 10, login: 'alice' },
      node: { id: 3, domain_name: 'node3.example.test' },
    },
    oom_report_rule: { id: 9, action: 'ignore', cgroup_pattern: '^/historical/worker$' },
  };
  await setupHaveApiMock(page, {
    user: { id: 1, login: 'admin', level: 100 },
    handlers: {
      'GET oom_reports/78': () => ({ oom_report: report }),
      'GET oom_reports/78/usages': () => ({ usages: [] }),
    },
  });
  const mutations: string[] = [];
  page.on('request', (request) => {
    const url = new URL(request.url());
    if (!url.pathname.startsWith('/api/v7.0/') || ['GET', 'HEAD', 'OPTIONS'].includes(request.method())) return;
    if (request.method() === 'PUT' && url.pathname === '/api/v7.0/webui_user_settings/ui/settings') return;
    mutations.push(`${request.method()} ${url.pathname}`);
  });
  await page.goto(withAppUrl('/admin/oom-reports/78'));
  const header = page.getByTestId('oom.detail.header');
  const summary = page.getByTestId('oom.detail.overview.summary');
  await expect(summary).toBeVisible();
  await expect(header).toContainText('OOM');
  await expect(header).toContainText('#78');
  await expect(header).toContainText('oom-pid-only.example.test');
  await expect(header).not.toContainText('17001');
  await expect(header).not.toContainText('17002');
  await expect(summary).toContainText('(17001)');
  await expect(summary).toContainText('(17002)');
  await expect(page.getByTestId('oom.detail.overview.cgroup')).toHaveText('—');
  await expect(
    summary
      .getByText(language === 'cs' ? 'Počet' : 'Count', { exact: true })
      .locator('..')
      .getByText('—', { exact: true })
  ).toBeVisible();
  const rule = summary.getByText(language === 'cs' ? 'Pravidlo' : 'Rule', { exact: true }).locator('..');
  await expect(rule).toContainText('#9');
  await expect(rule).toContainText(language === 'cs' ? 'Ignorovat' : 'Ignore');
  await expect(page.getByTestId('oom.detail.overview.rule_cgroup')).toHaveText('^/historical/worker$');
  const [created, reported] = await page.evaluate(
    (times) => times.map((time) => new Date(time).toLocaleString()),
    [report.created_at, report.reported_at]
  );
  await expect(header).toContainText(created!);
  await expect(summary).toContainText(reported!);
  await expect(page.getByTestId('oom.detail.overview.usages')).toContainText(
    language === 'cs' ? 'Využití paměti cgroup v době OOM.' : 'Cgroup memory usage at the time of the OOM kill.'
  );
  await expect(page.getByTestId('oom.detail.open_vps')).toHaveAttribute('href', '/admin/vps/123');
  await expect(page.getByTestId('oom.detail.rules')).toHaveAttribute('href', '/admin/oom-reports/rules/123');
  await page.screenshot({ path: testInfo.outputPath('oom-overview-pid-unknown.png'), fullPage: true, scale: 'css' });
  await testInfo.attach('oom-pid-only-response.json', {
    body: JSON.stringify({ status: true, response: { oom_report: report } }, null, 2),
    contentType: 'application/json',
  });
  expect(mutations).toEqual([]);
});

for (const mode of ['member', 'admin'] as const) {
  for (const language of ['cs', 'en'] as const) {
    test(`OOM statistics retained content and read states ${mode} ${language}`, async ({ page }, testInfo) => {
      await setUiSettingsLocalStorage(page, { language, theme: language === 'cs' ? 'dark' : 'light' });
      let state: 'populated' | 'empty' | 'error' = 'populated';
      await setupHaveApiMock(page, {
        user: { id: 10, login: 'oom-review', level: mode === 'admin' ? 99 : 1 },
        handlers: {
          'GET oom_reports/77': () => ({
            oom_report: {
              id: 77,
              created_at: '2026-09-16T08:30:00Z',
              reported_at: '2026-09-16T08:30:01Z',
              cgroup,
              killed_name: 'memory-worker',
              killed_pid: 12345,
              invoked_by_name: 'systemd',
              invoked_by_pid: 1,
              count: 2,
              vps: { id: 123, hostname: 'oom-vps.example.test', user: { id: 10, login: 'oom-review' } },
            },
          }),
          'GET oom_reports/77/stats': () =>
            state === 'error'
              ? {
                  status: 503,
                  contentType: 'application/json',
                  body: JSON.stringify({ status: false, message: 'Stats unavailable', response: null }),
                }
              : {
                  stats:
                    state === 'empty'
                      ? []
                      : [
                          { id: 1, parameter: 'total_vm', value: 887766 },
                          { id: 2, parameter: 'oom_score_adj', value: 0 },
                        ],
                },
        },
      });
      const path = `${mode === 'admin' ? '/admin' : '/app'}/oom-reports/77/stats`;
      for (const nextState of ['populated', 'empty', 'error'] as const) {
        state = nextState;
        await page.goto(withAppUrl(path));
        const card = page.getByTestId('oom.detail.stats');
        await expect(card).toBeVisible();
        if (state === 'populated') {
          const table = page.getByTestId('oom.detail.stats.table');
          await expect(table).toContainText('total_vm');
          await expect(table).toContainText('887766');
          await expect(table.getByRole('row').filter({ hasText: 'oom_score_adj' }).getByRole('cell').last()).toHaveText(
            '0'
          );
        } else {
          await expect(
            card.getByText(
              state === 'empty'
                ? language === 'cs'
                  ? 'Žádné statistiky'
                  : 'No stats'
                : language === 'cs'
                  ? 'Nepodařilo se načíst statistiky'
                  : 'Failed to load stats',
              { exact: true }
            )
          ).toBeVisible();
          await expect(page.getByTestId('oom.detail.stats.table')).toHaveCount(0);
        }
        await page.screenshot({ path: testInfo.outputPath(`oom-stats-${state}.png`), fullPage: true, scale: 'css' });
      }
    });
  }
}
