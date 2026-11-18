import { expect, test } from '@playwright/test';
import { bootstrapVpsAdminWindow, installHaveApiMock, setUiSettingsLocalStorage } from '../../fixtures';

for (const language of ['cs', 'en'] as const) {
  for (const mode of ['member', 'admin'] as const) {
    test(`@pr-smoke @pr-smoke-mobile opens failed step after async load and respects manual expansion: ${mode}, ${language}`, async ({
      page,
    }, info) => {
      await bootstrapVpsAdminWindow(page, { sessionToken: 'FAILED_STEP_INITIAL' });
      await setUiSettingsLocalStorage(page, { language, theme: language === 'cs' ? 'dark' : 'light' });
      let release: () => void = () => {};
      const loaded = new Promise<void>((resolve) => {
        release = resolve;
      });
      await installHaveApiMock(page, {
        user: { id: 7, login: 'synthetic-failed-step', level: mode === 'admin' ? 99 : 1 },
        handlers: {
          'GET transaction_chains/321': () => ({
            transaction_chain: { id: 321, label: 'Synthetic failure', state: 'failed', size: 2, progress: 2 },
          }),
          'GET transaction_chains/322': () => ({
            transaction_chain: { id: 322, label: 'Another synthetic failure', state: 'failed', size: 1, progress: 1 },
          }),
          'GET transactions': async ({ searchParams }) => {
            await loaded;
            if (searchParams.get('transaction[transaction_chain]') === '322')
              return {
                transactions: [
                  {
                    id: 801,
                    name: 'Another failed operation',
                    done: 'done',
                    success: 0,
                    transaction_chain: { id: 322 },
                  },
                ],
              };
            return {
              transactions: [
                { id: 701, name: 'Successful operation', done: 'done', success: 1, transaction_chain: { id: 321 } },
                {
                  id: 702,
                  name: 'Failed operation',
                  done: 'done',
                  success: 0,
                  transaction_chain: { id: 321 },
                  error: 'SYNTHETIC_FAILURE_DETAIL',
                },
              ],
            };
          },
        },
      });
      const base = mode === 'admin' ? '/admin' : '/app';
      await page.goto(`${base}/transactions/321`);
      await expect(page.getByTestId('transactions.chain.detail.transactions.loading')).toBeVisible();
      release();
      const failed = page.getByTestId('transactions.chain.detail.tx.expanded.702');
      const toggle = page.getByTestId('transactions.chain.detail.tx.toggle.702');
      await expect(failed).toBeVisible();
      await expect(page.getByTestId('transactions.chain.detail.tx.expanded.701')).toHaveCount(0);
      await expect(toggle).toHaveAttribute('aria-expanded', 'true');
      await page.screenshot({
        path: info.outputPath(`failed-step-${mode}-${language}.png`),
        fullPage: true,
        scale: 'css',
      });
      await toggle.click();
      await expect(failed).toHaveCount(0);
      const filter = page.getByTestId('transactions.chain.detail.filter.search');
      await filter.fill('702');
      await expect(toggle).toBeVisible();
      await expect(toggle).toHaveAttribute('aria-expanded', 'false');
      await filter.clear();
      await page.getByRole('button', { name: /expand all|rozbalit vše/i }).click();
      await expect(failed).toBeVisible();
      await expect(page.getByTestId('transactions.chain.detail.tx.expanded.701')).toBeVisible();
      await page.getByRole('button', { name: /collapse all|sbalit vše/i }).click();
      await expect(failed).toHaveCount(0);
      await page.evaluate((url) => {
        history.pushState({}, '', url);
        dispatchEvent(new PopStateEvent('popstate'));
      }, `${base}/transactions/322`);
      await expect(page.getByTestId('transactions.chain.detail.tx.expanded.801')).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    });
  }
}
