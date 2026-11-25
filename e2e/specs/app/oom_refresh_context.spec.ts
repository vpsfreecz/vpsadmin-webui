import { expect, test } from '@playwright/test';
import { bootstrapVpsAdminWindow, failEnvelope, installHaveApiMock, setUiSettingsLocalStorage } from '../../fixtures';

const actors = [
  { name: 'member', base: '/app', level: 1, ownerQuery: null },
  { name: 'admin', base: '/admin', level: 99, ownerQuery: '42' },
  { name: 'admin-My', base: '/app', level: 99, ownerQuery: '7' },
  { name: 'support', base: '/admin', level: 21, ownerQuery: null },
] as const;
for (const actor of actors)
  for (const filtered of [false, true]) {
    test(`@pr-smoke @pr-smoke-mobile OOM refresh retains context ${actor.name} filtered=${filtered}`, async ({
      page,
    }, info) => {
      const mobile = info.project.name.startsWith('mobile');
      await page.setViewportSize({ width: mobile ? 390 : 1280, height: 900 });
      const queries: string[] = [],
        errors: string[] = [],
        writes: string[] = [];
      page.on('pageerror', (e) => errors.push(String(e)));
      page.on('request', (r) => {
        if (r.url().includes('/api/') && !['GET', 'HEAD', 'OPTIONS'].includes(r.method()))
          writes.push(r.method() + ' ' + r.url());
      });
      await bootstrapVpsAdminWindow(page, {
        sessionToken: 'TEST',
        webuiNext: { uiSettings: { persistence: 'local' } },
      });
      await setUiSettingsLocalStorage(page, { language: mobile ? 'cs' : 'en', theme: mobile ? 'dark' : 'light' });
      let version = 1,
        rejectReads = false;
      await installHaveApiMock(page, {
        user: { id: 7, login: 'synthetic-viewer', level: actor.level },
        handlers: {
          'GET oom_reports': ({ url, searchParams }) => {
            queries.push(url.toString());
            expect(searchParams.get('oom_report[user]')).toBe(actor.ownerQuery);
            if (rejectReads) return failEnvelope('Synthetic read temporarily rejected');
            return {
              oom_reports: [
                {
                  id: version,
                  created_at: '2026-11-11T15:00:00Z',
                  vps: {
                    id: 20,
                    hostname: 'synthetic-vps',
                    user: { id: actor.ownerQuery === '42' ? 42 : 7, login: 'synthetic-owner' },
                    node: { id: 1, domain_name: 'synthetic-node' },
                  },
                  cgroup: '/synthetic.slice',
                  killed_name: 'synthetic-process',
                  killed_pid: 1234,
                  invoked_by_name: 'systemd',
                  invoked_by_pid: 1,
                  count: 1,
                },
              ],
              _meta: { total_count: 1 },
            };
          },
          'GET nodes': () => ({ nodes: [] }),
          'GET locations': () => ({ locations: [] }),
          'GET environments': () => ({ environments: [] }),
          'GET users/42': () => ({ user: { id: 42, login: 'synthetic-owner', level: 1 } }),
          'GET help_boxes': () => ({ help_boxes: [] }),
          'GET action_states': () => ({ action_states: [] }),
          'GET transaction_chains': () => ({ transaction_chains: [] }),
        },
      });
      const params = new URLSearchParams();
      if (filtered) {
        params.set('cgroup', '/synthetic.slice');
        params.set('limit', '25');
      }
      if (actor.name === 'admin') params.set('user', '42');
      await page.goto(`${actor.base}/oom-reports?${params.toString()}#refresh-context`);
      const row = (id: number) => page.getByTestId(`oom.list.${mobile ? 'card' : 'row'}.${id}`);
      await expect(row(1)).toBeVisible();
      await page.waitForLoadState('networkidle');
      const originalUrl = page.url(),
        originalQuery = new URL(queries.at(-1)!).search;
      const refresh = page.getByTestId('oom.list.refresh');
      await expect(refresh).toHaveJSProperty('tagName', 'BUTTON');
      version = 2;
      await refresh.focus();
      await page.keyboard.press('Enter');
      await expect(row(2)).toBeVisible();
      await expect(row(1)).toHaveCount(0);
      expect(page.url()).toBe(originalUrl);
      expect(new URL(queries.at(-1)!).search).toBe(originalQuery);
      rejectReads = true;
      await refresh.click();
      await expect(page.getByTestId('oom.list.error')).toBeVisible();
      expect(page.url()).toBe(originalUrl);
      rejectReads = false;
      version = 3;
      await page.getByTestId('oom.list.error.retry').focus();
      await page.keyboard.press('Enter');
      await expect(row(3)).toBeVisible();
      await expect(page.getByTestId('oom.list.error')).toHaveCount(0);
      expect(page.url()).toBe(originalUrl);
      expect(new URL(queries.at(-1)!).search).toBe(originalQuery);
      await page.waitForLoadState('networkidle');
      expect(writes).toEqual([]);
      expect(errors).toEqual([]);
      await info.attach('oom-refresh-contract', {
        body: JSON.stringify({
          actor,
          filtered,
          originalUrl,
          originalQuery,
          queries,
          writes,
          errors,
          fixtureOnly: true,
        }),
        contentType: 'application/json',
      });
    });
  }
