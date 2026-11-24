import { expect, test } from '@playwright/test';
import {
  bootstrapVpsAdminWindow,
  failEnvelope,
  installHaveApiMock,
  jsonFulfill,
  setUiSettingsLocalStorage,
} from '../../fixtures';

for (const language of ['cs', 'en'] as const) {
  for (const role of ['member', 'admin-my', 'admin-all'] as const) {
    test(`@pr-smoke @pr-smoke-mobile recent tasks below VPS list: ${role}, ${language}`, async ({ page }, info) => {
      await bootstrapVpsAdminWindow(page, {
        sessionToken: 'RECENT_TASKS_FIXTURE',
        webuiNext: { uiSettings: { persistence: 'local' } },
      });
      await page.addInitScript(
        (initial) => {
          if (localStorage.getItem('vpsadmin.uiSettings.v1') === null) {
            localStorage.setItem('vpsadmin.uiSettings.v1', JSON.stringify(initial));
          }
        },
        { language, theme: language === 'cs' ? 'dark' : 'light' }
      );
      const widgetReads: Array<{ owner: string | null; className: string | null }> = [];
      const chains = Array.from({ length: 6 }, (_, index) => ({
        id: index + 1,
        label: `${language === 'cs' ? 'Záloha' : 'Backup'} ${index + 1} · ${'long-hostname-'.repeat(8)}`,
        state: index === 4 ? 'failed' : index === 5 ? 'queued' : 'done',
        size: 2,
        progress: index === 5 ? 1 : 2,
        created_at: `2026-11-18T12:00:0${index}Z`,
        concerns: { type: 'affect', objects: [['Vps', 123]], labels: { Vps: 'VPS' } },
      }));
      await installHaveApiMock(page, {
        user: { id: 7, login: 'recent-tasks-fixture', level: role === 'member' ? 1 : 99 },
        handlers: {
          'GET vpses': () => ({ vpses: [] }),
          'GET transaction_chains': ({ searchParams }) => {
            if (searchParams.get('transaction_chain[limit]') === '5') {
              widgetReads.push({
                owner: searchParams.get('transaction_chain[user]'),
                className: searchParams.get('transaction_chain[class_name]'),
              });
            }
            const unrelatedPayment = {
              ...chains[5], id: 99, label: 'Incoming payment credited',
              concerns: { type: 'affect', objects: [['UserPayment', 123]], labels: {} },
            };
            return { transaction_chains: searchParams.get('transaction_chain[class_name]') === 'Vps'
              ? chains : [unrelatedPayment, ...chains] };
          },
          'GET transaction_chains/6': () => ({ transaction_chain: chains[5] }),
          'GET transactions': () => ({ transactions: [] }),
        },
      });
      const base = role === 'admin-all' ? '/admin' : '/app';
      await page.goto(`${base}/vps`);
      const widget = page.getByTestId('vps.recent_tasks');
      await expect(widget).toBeVisible();
      await expect(
        widget.getByRole('heading', { name: language === 'cs' ? 'Poslední úlohy VPS' : 'Recent VPS tasks' })
      ).toBeVisible();
      await expect(page.getByTestId('vps.recent_tasks.rows').getByRole('listitem')).toHaveCount(5);
      await expect(page.getByTestId('vps.recent_tasks.row.1')).toHaveCount(0);
      await expect(page.getByTestId('vps.recent_tasks.row.6')).toContainText('1/2');
      const timestamp = page.getByTestId('vps.recent_tasks.row.6').locator('time');
      if (language === 'cs') {
        await expect(timestamp).toContainText(/18\.\s*11\.\s*2026/);
        await expect(timestamp).not.toContainText(/AM|PM/);
      } else {
        await expect(timestamp).toContainText('11/18/2026');
      }
      expect(
        await page
          .getByTestId('vps.recent_tasks.rows')
          .getByRole('listitem')
          .evaluateAll((nodes) => nodes.map((n) => n.getAttribute('data-testid')))
      ).toEqual([6, 5, 4, 3, 2].map((id) => `vps.recent_tasks.row.${id}`));
      await expect.poll(() => widgetReads.length).toBeGreaterThan(0);
      expect(widgetReads.every(({ owner }) => owner === (role === 'admin-my' ? '7' : null))).toBe(true);
      expect(widgetReads.every(({ className }) => className === 'Vps')).toBe(true);
      await expect(widget).not.toContainText('Incoming payment credited');
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.screenshot({ path: info.outputPath(`recent-tasks-${language}-${role}.png`), fullPage: true });
      await page.getByTestId('vps.recent_tasks.hide').click();
      await expect(widget).toHaveCount(0);
      await page.reload();
      await expect(page.getByTestId('vps.recent_tasks.show')).toBeVisible();
      const readsWhileHidden = widgetReads.length;
      await page.waitForTimeout(300);
      expect(widgetReads.length).toBe(readsWhileHidden);
      await page.getByTestId('vps.recent_tasks.show').click();
      await expect(page.getByTestId('vps.recent_tasks.row.6')).toBeVisible();
      await expect(page.getByTestId('vps.recent_tasks.history')).toHaveAttribute('href', `${base}/transactions`);
      await page.getByTestId('vps.recent_tasks.row.6').getByRole('link').click();
      await expect(page).toHaveURL(new RegExp(`${base}/transactions/6$`));
      await expect(page.getByTestId('transactions.chain.detail')).toBeVisible();
    });
  }

  test(`@pr-smoke @pr-smoke-mobile recent tasks distinguishes failed read from an empty history: ${language}`, async ({
    page,
  }) => {
    await bootstrapVpsAdminWindow(page, {
      sessionToken: 'RECENT_TASKS_ERROR',
      webuiNext: { uiSettings: { persistence: 'local' } },
    });
    await setUiSettingsLocalStorage(page, { language, theme: 'light' });
    let unavailable = true;
    await installHaveApiMock(page, {
      handlers: {
        'GET vpses': () => ({ vpses: [] }),
        'GET transaction_chains': ({ searchParams }) =>
          searchParams.get('transaction_chain[limit]') === '5' && unavailable
            ? jsonFulfill(failEnvelope('Synthetic read unavailable'), 503)
            : { transaction_chains: [] },
      },
    });
    await page.goto('/app/vps');
    await expect(page.getByTestId('vps.recent_tasks.retry')).toBeVisible();
    unavailable = false;
    await page.getByTestId('vps.recent_tasks.retry').click();
    await expect(page.getByTestId('vps.recent_tasks.retry')).toHaveCount(0);
    await expect(page.getByTestId('vps.recent_tasks')).toContainText(language === 'cs' ? 'Žádné' : 'No');
  });
}
