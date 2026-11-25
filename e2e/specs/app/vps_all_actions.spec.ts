import { expect, test, type Page } from '@playwright/test';
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
const operationJournals = new WeakMap<Page, { errors: string[]; writes: string[] }>();
test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-11-11T18:00:00Z'));
  const journal = { errors: [] as string[], writes: [] as string[] };
  operationJournals.set(page, journal);
  page.on('pageerror', (error) => journal.errors.push(String(error)));
  page.on('request', (request) => {
    if (new URL(request.url()).pathname.includes('/api/') && !['GET', 'HEAD', 'OPTIONS'].includes(request.method()))
      journal.writes.push(request.method() + ' ' + new URL(request.url()).pathname);
  });
});
test.afterEach(async ({ page }, info) => {
  const journal = operationJournals.get(page)!;
  await info.attach('operation-page-journal', {
    body: JSON.stringify({ ...journal, fixtureOnly: true }),
    contentType: 'application/json',
  });
  expect(journal.errors).toEqual([]);
  expect(journal.writes).toEqual([]);
});

async function findRenderedAction(page: Page, needle: string) {
  return page.evaluate((text) => {
    const find: unknown = Reflect.get(window, 'find');
    if (typeof find !== 'function') throw new Error('Browser Find API is unavailable');
    window.getSelection()?.removeAllRanges();
    for (let attempt = 0; attempt < 12; attempt += 1) {
      if (!find.call(window, text, false, false, true)) return false;
      const node = window.getSelection()?.anchorNode;
      const element = node instanceof Element ? node : node?.parentElement;
      if (element?.closest('[data-testid="vps.lifecycle.action_link.clone"]')) return true;
    }
    return false;
  }, needle);
}
for (const [language, theme] of [
  ['cs', 'dark'],
  ['en', 'light'],
] as const) {
  for (const mode of ['app', 'admin'] as const) {
    for (const running of [true, false]) {
      test(`@pr-smoke @pr-smoke-mobile visible all-actions entry preserves scope and opens no operation ${language} ${mode} ${running}`, async ({
        page,
      }, testInfo) => {
        await page.setViewportSize(
          testInfo.project.name.includes('mobile') ? { width: 320, height: 844 } : { width: 1440, height: 1000 }
        );
        await bootstrapVpsAdminWindow(page, { webuiNext: { uiSettings: { persistence: 'local' } } });
        await setUiSettingsLocalStorage(page, { language, theme });
        const writes: string[] = [];
        page.on('request', (request) => {
          if (
            new URL(request.url()).pathname.startsWith('/api/') &&
            !['GET', 'HEAD', 'OPTIONS'].includes(request.method())
          )
            writes.push(request.method() + ' ' + new URL(request.url()).pathname);
        });
        await installHaveApiMock(page, {
          user: { id: 10, login: 'synthetic-member', level: mode === 'admin' ? 99 : 1 },
          handlers: {
            'GET webui_user_settings': () => ({
              webui_user_setting: { namespace: 'ui', key: 'settings', value: JSON.stringify({ language, theme }) },
            }),
            'GET vpses/123': () => ({ vps: { ...vps, is_running: running } }),
            'GET ip_addresses': () => ({ ip_addresses: [] }),
            'GET oom_reports': () => ({ oom_reports: [] }),
            'GET transaction_chains': () => ({ transaction_chains: [] }),
          },
        });
        const query = mode === 'admin' ? '?user=10' : '';
        await page.goto(`/${mode}/vps/123${query}`);
        const header = page.getByTestId('vps.header');
        await expect(header).toBeVisible();
        if (process.env['CAPTURE_SIDE'] === 'baseline') {
          await expect(page.getByTestId('vps.actions.all')).toHaveCount(0);
          await header.screenshot({ path: testInfo.outputPath(`header-${language}-${mode}-${running}-before.png`) });
          return;
        }
        const allActions = page.getByRole('link', {
          name: language === 'cs' ? 'Zobrazit operace' : 'Show operations',
          exact: true,
        });
        await expect(allActions).toHaveAttribute('href', `/${mode}/vps/123/lifecycle${query}#vps-operations`);
        await header.screenshot({ path: testInfo.outputPath(`header-${language}-${mode}-${running}-after.png`) });
        const allBox = await allActions.boundingBox();
        const moreBox = await page.getByTestId('vps.actions.menu').boundingBox();
        expect(allBox).not.toBeNull();
        expect(moreBox).not.toBeNull();
        expect(Math.abs((allBox?.y ?? 0) - (moreBox?.y ?? 10))).toBeLessThanOrEqual(2);
        await allActions.focus();
        await page.keyboard.press('Enter');
        await expect(page.getByTestId('vps.lifecycle.action_index')).toBeVisible();
        const operationList = page.getByTestId('vps.lifecycle.page');
        await expect(operationList).toBeFocused();
        await expect(operationList).toHaveAttribute('aria-label', language === 'cs' ? 'Operace VPS' : 'VPS operations');
        const listBox = (await operationList.boundingBox())!;
        expect(listBox.y).toBeGreaterThanOrEqual(0);
        await expect(page.getByTestId('vps.lifecycle.action_link.start')).toBeInViewport({ ratio: 1 });
        await page.screenshot({ path: testInfo.outputPath(`list-entry-${language}-${mode}-${running}.png`) });

        await expect(page.getByTestId('vps.lifecycle.daily_actions')).toBeVisible();
        await expect(page.getByTestId('vps.lifecycle.admin_actions')).toHaveCount(mode === 'admin' ? 1 : 0);
        const clone = page.getByTestId('vps.lifecycle.action_link.clone');
        await expect(clone).toBeVisible();
        const cloneTitle = await clone.locator('span').first().innerText();
        expect(await findRenderedAction(page, cloneTitle)).toBe(true);
        await page
          .getByTestId('vps.lifecycle.action_index')
          .screenshot({ path: testInfo.outputPath(`index-${language}-${mode}-${running}.png`) });
        await page.getByTestId('vps.lifecycle.action_link.delete').click();
        await expect(page).toHaveURL(new RegExp(`/${mode}/vps/123/lifecycle/delete`));
        await expect(page.getByTestId('vps.lifecycle.delete')).toBeVisible();
        await page.getByTestId('vps.lifecycle.delete.submit').click();
        const confirmation = page.getByTestId('vps.lifecycle.delete.submit.confirm_dialog');
        await expect(confirmation).toBeVisible();
        await expect(page.getByTestId('vps.lifecycle.delete.submit.confirm_dialog.target')).toContainText(
          'vps123.example'
        );
        expect(writes).toEqual([]);
        await page.getByTestId('vps.lifecycle.delete.submit.confirm_dialog.cancel').click();
        await expect(confirmation).not.toBeVisible();
        await expectNoDocumentHorizontalOverflow(page);
        expect(writes).toEqual([]);
        await page.goBack();
        await expect(operationList).toBeFocused();
        await expect(page).toHaveURL(`/${mode}/vps/123/lifecycle${query}#vps-operations`);
      });
    }
  }
}
test('@pr-smoke @pr-smoke-mobile read-only support has no all-actions shortcut', async ({ page }) => {
  await bootstrapVpsAdminWindow(page, { webuiNext: { uiSettings: { persistence: 'local' } } });
  await installHaveApiMock(page, {
    user: { id: 10, login: 'synthetic-support', level: 50 },
    handlers: {
      'GET vpses/123': () => ({ vps }),
      'GET ip_addresses': () => ({ ip_addresses: [] }),
      'GET oom_reports': () => ({ oom_reports: [] }),
    },
  });
  await page.goto('/admin/vps/123');
  await expect(page.getByTestId('vps.header')).toBeVisible();
  await expect(page.getByTestId('vps.actions.all')).toHaveCount(0);
  await page.waitForLoadState('networkidle');
  await page.goto('/admin/vps/123/lifecycle');
  await expect(page.getByTestId('vps.lifecycle.page')).toBeVisible();
  await expect(page.getByTestId('vps.lifecycle.action_index')).toHaveCount(0);
});
