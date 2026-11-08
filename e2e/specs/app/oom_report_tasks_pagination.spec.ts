import { expect, test, type Page } from '@playwright/test';
import { bootstrapVpsAdminWindow, installHaveApiMock, setUiSettingsLocalStorage } from '../../fixtures';
import { expectNoDocumentHorizontalOverflow } from '../../helpers/horizontalOverflow';

async function setup(page: Page, opts: {
  total: number;
  level?: number;
  language?: 'cs' | 'en';
  theme?: 'light' | 'dark';
}) {
  await bootstrapVpsAdminWindow(page, { sessionToken: 'SYNTHETIC_OOM_TASKS' });
  await setUiSettingsLocalStorage(page, { language: opts.language ?? 'cs', theme: opts.theme ?? 'light' });
  const state = { failFrom: -1, requests: [] as { from: number; limit: number }[], writes: [] as string[] };
  page.on('request', request => {
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method())) state.writes.push(request.url());
  });
  await installHaveApiMock(page, {
    user: { id: 53, login: 'synthetic-member', level: opts.level ?? 1 },
    handlers: {
      'GET webui_user_settings': () => ({ webui_user_settings: [{
        id: 1, namespace: 'ui', key: 'settings',
        value: JSON.stringify({ language: opts.language ?? 'cs', theme: opts.theme ?? 'light' }),
      }] }),
      'GET oom_reports/77': () => ({ oom_report: {
        id: 77, created_at: '2026-11-07T12:00:00Z',
        vps: { id: 123, hostname: 'synthetic-oom.example.test', user: { id: 53 } },
        killed_name: 'synthetic-worker', killed_pid: 1001, count: 1,
      } }),
      'GET oom_reports/77/tasks': ({ searchParams }) => {
        const limit = Number(searchParams.get('task[limit]'));
        const from = Number(searchParams.get('task[from_id]') ?? 0);
        state.requests.push({ from, limit });
        if (!Number.isInteger(limit) || limit < 1 || limit > 1000) return {
          status: 400, contentType: 'application/json',
          body: JSON.stringify({ status: false, message: 'Invalid input parameters', errors: { limit: ['must be within 0–1000'] } }),
        };
        if (from === state.failFrom) return {
          status: 503, contentType: 'application/json',
          body: JSON.stringify({ status: false, message: 'Synthetic unavailable page' }),
        };
        const length = Math.max(0, Math.min(limit, opts.total - from));
        return { tasks: Array.from({ length }, (_, offset) => ({
          id: from + offset + 1, name: `synthetic-process-${from + offset + 1}`,
          host_pid: 10000 + from + offset, vps_pid: from + offset + 1,
          vps_uid: 1000, tgid: 1, rss: null, total_vm: 10,
        })) };
      },
    },
  });
  return state;
}

for (const actor of [{ mode: 'app', level: 1 }, { mode: 'admin', level: 100 }] as const)
  for (const appearance of [{ language: 'cs', theme: 'light' }, { language: 'en', theme: 'dark' }] as const) {
    test(`@pr-smoke @pr-smoke-mobile OOM tasks beyond1000 ${actor.mode} ${appearance.language}`, async ({ page, isMobile }, info) => {
      await page.setViewportSize(isMobile ? { width: 320, height: 820 } : { width: 1440, height: 1000 });
      const state = await setup(page, { total: 1001, level: actor.level, ...appearance });
      await page.goto(`/${actor.mode}/oom-reports/77/tasks`);
      const rows = page.locator('[data-testid^="oom.detail.tasks.row."]');
      const pagination = page.getByTestId('oom.detail.tasks.pagination');
      await expect(rows).toHaveCount(100);
      await expect(rows.first()).toHaveAttribute('data-testid', 'oom.detail.tasks.row.1');
      await page.screenshot({ path: info.outputPath('processes-first-page.png'), scale: 'css' });
      const seen: number[] = [];
      for (let index = 0; index < 11; index++) {
        await expect(rows).toHaveCount(index === 10 ? 1 : 100);
        await expect(rows.first()).toHaveAttribute('data-testid', `oom.detail.tasks.row.${index * 100 + 1}`);
        seen.push(...await rows.evaluateAll(elements => elements.map(element => Number(element.getAttribute('data-testid')!.split('.').at(-1)))));
        if (index < 10) await pagination.getByTestId('oom.detail.tasks.pagination.next').click();
      }
      expect(seen).toEqual(Array.from({ length: 1001 }, (_, i) => i + 1));
      await expect(pagination.getByTestId('oom.detail.tasks.pagination.next')).toBeDisabled();
      await expect(page).toHaveURL(/from_id=1000/);
      await page.screenshot({ path: info.outputPath('processes-last-page.png'), scale: 'css' });
      await expectNoDocumentHorizontalOverflow(page);
      await page.reload();
      await expect(rows).toHaveCount(1);
      await expect(rows.first()).toHaveAttribute('data-testid', 'oom.detail.tasks.row.1001');
      await pagination.getByTestId('oom.detail.tasks.pagination.prev').click();
      await expect(rows.first()).toHaveAttribute('data-testid', 'oom.detail.tasks.row.901');
      await pagination.getByTestId('oom.detail.tasks.pagination.limit').selectOption('25');
      await expect(rows).toHaveCount(25);
      await expect(rows.first()).toHaveAttribute('data-testid', 'oom.detail.tasks.row.1');
      await expect(page).not.toHaveURL(/from_id=/);
      expect(state.requests.some(request => request.from === 1000)).toBe(true);
      expect(state.requests.every(request => request.limit > 0 && request.limit <= 1000)).toBe(true);
      expect(state.writes).toEqual([]);
    });
  }

test('@pr-smoke @pr-smoke-mobile OOM tasks normalize an out-of-range URL limit', async ({ page }) => {
  const state = await setup(page, { total: 3 });
  await page.goto('/app/oom-reports/77/tasks?limit=2000');
  await expect.poll(() => state.requests.at(-1)?.limit ?? Infinity).toBeLessThanOrEqual(1000);
  await expect(page.locator('[data-testid^="oom.detail.tasks.row."]')).toHaveCount(3);
  expect(state.requests.length).toBeGreaterThan(0);
  expect(state.requests.every(request => request.limit <= 1000)).toBe(true);
  expect(state.writes).toEqual([]);
});

for (const total of [0, 100]) {
  test(`@pr-smoke @pr-smoke-mobile OOM tasks terminal count ${total}`, async ({ page }) => {
    await setup(page, { total });
    await page.goto('/app/oom-reports/77/tasks');
    await expect(page.locator('[data-testid^="oom.detail.tasks.row."]')).toHaveCount(total);
    if (total === 0) {
      await expect(page.getByText('Žádné procesy', { exact: true })).toBeVisible();
      await expect(page.getByTestId('oom.detail.tasks.pagination')).toHaveCount(0);
    } else {
      await expect(page.getByTestId('oom.detail.tasks.pagination.next')).toBeDisabled();
    }
  });
}

test('@pr-smoke @pr-smoke-mobile OOM tasks failed later page retries the same cursor', async ({ page }) => {
  const state = await setup(page, { total: 101 });
  state.failFrom = 100;
  await page.goto('/app/oom-reports/77/tasks');
  await expect(page.getByTestId('oom.detail.tasks.row.1')).toBeVisible();
  await page.getByTestId('oom.detail.tasks.pagination.next').click();
  await expect(page.getByText('Nepodařilo se načíst procesy', { exact: true })).toBeVisible();
  await expect(page.getByTestId('oom.detail.tasks.table')).toHaveCount(0);
  state.failFrom = -1;
  await page.getByTestId('oom.detail.tasks').getByRole('button', { name: 'Zkusit znovu', exact: true }).click();
  await expect(page.getByTestId('oom.detail.tasks.row.101')).toBeVisible();
  await expect(page.getByTestId('oom.detail.tasks.pagination.next')).toBeDisabled();
  expect(state.requests.at(-1)?.from).toBe(100);
  expect(state.writes).toEqual([]);
});
