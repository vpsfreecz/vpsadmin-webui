import { expect, test } from '@playwright/test';
import { bootstrapVpsAdminWindow, installHaveApiMock } from '../../fixtures';
import { expectNoDocumentHorizontalOverflow } from '../../helpers/horizontalOverflow';

for (const mode of ['app', 'admin'] as const) {
  test(`@pr-smoke @pr-smoke-mobile action state: transaction details stay reachable at every breakpoint (${mode})`, async ({
    page,
    isMobile,
  }, testInfo) => {
    await bootstrapVpsAdminWindow(page);
    await installHaveApiMock(page, {
      user: { id: 1, login: 'synthetic-audit-user', level: mode === 'admin' ? 99 : 1 },
      handlers: {
        'GET action_states/123': () => ({
          action_state: {
            id: 123,
            label: 'Create VPS',
            state: 'done',
            current: 1,
            total: 1,
            finished: true,
            status: true,
            transaction_chain: { id: 456 },
          },
        }),
        'GET transaction_chains/456': () => ({ transaction_chain: { id: 456, state: 'done', progress: 1, size: 1 } }),
        'GET transactions': () => ({
          transactions: [
            {
              id: 7001,
              name: 'Create dataset',
              done: 'done',
              success: 1,
              type: 3001,
              priority: 0,
              created_at: '2026-01-26T00:01:00Z',
              started_at: '2026-01-26T00:01:01Z',
              finished_at: '2026-01-26T00:01:05Z',
              node: { id: 2, label: 'synthetic-storage-node-with-a-long-readable-name' },
              vps: { id: 12, label: 'synthetic-vps' },
              user: { id: 9, login: 'synthetic-worker' },
              transaction_chain: { id: 456 },
              input: { message: 'Synthetic first line\nSynthetic second line' },
              output: { ok: true },
            },
          ],
        }),
      },
    });
    await page.goto(`/${mode}/action-states/123`);
    await expect(page.getByTestId('action_state.detail.transactions.table')).toBeVisible();
    await expectNoDocumentHorizontalOverflow(page);
    const compact = await page
      .getByTestId('action_state.detail.transactions.table')
      .screenshot({ path: testInfo.outputPath(`action-state-steps-${mode}.png`) });
    await testInfo.attach(`Compact ${mode} transaction steps`, { body: compact, contentType: 'image/png' });
    const toggle = page.getByTestId('action_state.detail.tx.toggle.7001');
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    if (isMobile) await toggle.tap();
    else await toggle.click();
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    const expanded = page.getByTestId('action_state.detail.tx.expanded.7001');
    await expect(expanded).toContainText('Synthetic first line');
    await expect(expanded).toContainText('Synthetic second line');
    await expect(expanded).toContainText('synthetic-worker');
    await expectNoDocumentHorizontalOverflow(page);
    if (!isMobile) {
      for (const [width, columns] of [
        [768, 4],
        [1024, 5],
        [1280, 10],
      ] as const) {
        await page.setViewportSize({ width, height: 900 });
        await expect(expanded.locator('td')).toHaveAttribute('colspan', String(columns));
        await expectNoDocumentHorizontalOverflow(page);
      }
    } else {
      await expect(expanded.locator('td')).toHaveAttribute('colspan', '3');
    }
    const screenshot = await page
      .getByTestId('action_state.detail.transactions')
      .screenshot({ path: testInfo.outputPath(`action-state-${mode}.png`) });
    await testInfo.attach(`Implemented ${mode} transaction detail`, { body: screenshot, contentType: 'image/png' });
    if (isMobile) await toggle.tap();
    else await toggle.click();
    await expect(expanded).toHaveCount(0);
    await expectNoDocumentHorizontalOverflow(page);
  });
}
