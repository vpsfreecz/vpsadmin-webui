import { expect, test } from '@playwright/test';
import type { Transaction__IndexOutput } from 'vpsadmin-typescript-client';

import { bootstrapVpsAdminWindow, installHaveApiMock } from '../../fixtures';
import { expectNoDocumentHorizontalOverflow } from '../../helpers/horizontalOverflow';

// Member responses omit the admin-only transaction fields.
const memberTransactions = [
  {
    id: 701,
    name: 'Step 1',
    done: 'waiting',
    success: 0,
    created_at: '2026-02-02T08:00:10Z',
    started_at: null,
    finished_at: null,
    node: { id: 2, name: 'node2' },
    vps: { id: 100, hostname: 'vps100' },
    transaction_chain: { id: 123 },
    depends_on: null,
  },
  {
    id: 702,
    name: 'Step 2',
    done: 'done',
    success: 0,
    created_at: '2026-02-02T08:01:00Z',
    started_at: '2026-02-02T08:01:10Z',
    finished_at: '2026-02-02T08:02:40Z',
    node: { id: 2, name: 'node2' },
    vps: { id: 100, hostname: 'vps100' },
    transaction_chain: { id: 123 },
    depends_on: { id: 701 },
  },
] satisfies [Transaction__IndexOutput[number], Transaction__IndexOutput[number]];

const handlers = {
  'GET transaction_chains/123': () => ({
    transaction_chain: {
      id: 123,
      state: 'queued',
      label: 'Demo chain',
      progress: 1,
      size: 2,
      created_at: '2026-02-02T08:00:00Z',
      concerns: {
        type: 'affect',
        objects: [
          ['Vps', 100],
          ['Dataset', 200],
          ['DnsZone', 300],
          ['Node', 2],
          ['UnknownConcern', 404],
          ['Vps', '999'],
          ['Vps', -1],
          ['Vps', 998, 'unexpected-third-item'],
          { class_name: 'Vps', row_id: 997 },
        ],
        labels: {
          Vps: 'VPS',
          Dataset: 'Dataset',
          DnsZone: 'DNS zone',
          Node: 'Node',
          UnknownConcern: 'Unknown object',
        },
      },
    },
  }),
  'GET transaction_chains/124': () => ({
    transaction_chain: {
      id: 124,
      state: 'done',
      label: 'Done chain',
      progress: 2,
      size: 2,
      created_at: '2026-02-02T09:00:00Z',
      concerns: { type: 'affect', objects: [['Vps', 101]], labels: { Vps: 'VPS' } },
    },
  }),
  'GET transaction_chains/125': () => ({
    transaction_chain: {
      id: 125,
      state: 'queued',
      label: 'Running chain',
      progress: 1,
      size: 3,
      created_at: '2026-02-02T10:00:00Z',
      concerns: { type: 'affect', objects: [['Vps', 102]], labels: { Vps: 'VPS' } },
    },
  }),
  'GET transactions': ({ searchParams }: { searchParams: URLSearchParams }) => {
    const chainId = searchParams.get('transaction[transaction_chain]');
    if (chainId === '124') {
      return {
        transactions: [
          {
            id: 801,
            name: 'Prepare VPS',
            done: 'done',
            success: 1,
            priority: 10,
            type: 1,
            created_at: '2026-02-02T09:00:10Z',
            started_at: '2026-02-02T09:00:15Z',
            finished_at: '2026-02-02T09:01:00Z',
            node: { id: 2, name: 'node2' },
            vps: { id: 101, hostname: 'vps101' },
            transaction_chain: { id: 124 },
            input: JSON.stringify({ action: 'prepare' }),
            output: JSON.stringify({ ok: true }),
          },
          {
            id: 802,
            name: 'Start VPS',
            done: 'done',
            success: 1,
            priority: 20,
            type: 2,
            created_at: '2026-02-02T09:01:00Z',
            started_at: '2026-02-02T09:01:05Z',
            finished_at: '2026-02-02T09:02:00Z',
            node: { id: 2, name: 'node2' },
            vps: { id: 101, hostname: 'vps101' },
            transaction_chain: { id: 124 },
            input: JSON.stringify({ action: 'start' }),
            output: JSON.stringify({ ok: true, stdout: 'booted' }),
          },
        ],
      };
    }
    if (chainId === '125') {
      return {
        transactions: [
          {
            id: 901,
            name: 'Create dataset',
            done: 'done',
            success: 1,
            created_at: '2026-02-02T10:00:10Z',
            started_at: '2026-02-02T10:00:15Z',
            finished_at: '2026-02-02T10:01:00Z',
            node: { id: 3, name: 'node3' },
            vps: { id: 102, hostname: 'vps102' },
            transaction_chain: { id: 125 },
          },
          {
            id: 902,
            name: 'Configure network',
            done: 'waiting',
            success: 1,
            created_at: '2026-02-02T10:01:00Z',
            started_at: '2026-02-02T10:01:10Z',
            finished_at: null,
            node: { id: 3, name: 'node3' },
            vps: { id: 102, hostname: 'vps102' },
            transaction_chain: { id: 125 },
            output: JSON.stringify({ stdout: 'creating veth' }),
          },
          {
            id: 903,
            name: 'Start services',
            done: 'waiting',
            success: 1,
            created_at: '2026-02-02T10:02:00Z',
            started_at: null,
            finished_at: null,
            node: { id: 3, name: 'node3' },
            vps: { id: 102, hostname: 'vps102' },
            transaction_chain: { id: 125 },
            depends_on: { id: 902 },
          },
        ],
      };
    }
    if (chainId !== '123') return { transactions: [] };

    return { transactions: memberTransactions };
  },
};

test.describe('@pr-smoke TransactionChainDetailPage', () => {
  test('@pr-smoke-mobile renders chain and transaction list', async ({ page }) => {
    await bootstrapVpsAdminWindow(page, { sessionToken: 'TEST_TOKEN' });
    await installHaveApiMock(page, { handlers });

    await page.goto('/app/transactions/123');

    await expect(page.getByTestId('transactions.chain.detail')).toBeVisible();
    await expect(page.getByTestId('transactions.chain.detail.header')).toBeVisible();
    await expect(page.getByTestId('transactions.chain.detail.info')).toBeVisible();

    const concerns = page.getByTestId('transactions.chain.detail.concerns');
    await expect(concerns).toContainText('VPS #100');
    await expect(concerns).toContainText('Dataset #200');
    await expect(concerns).toContainText('DNS zone #300');
    await expect(concerns).toContainText('Node #2');
    await expect(concerns).toContainText('Unknown object #404');
    await expect(concerns).not.toContainText('#999');
    await expect(concerns).not.toContainText('#998');
    await expect(concerns).not.toContainText('#997');
    await expect(page.getByTestId('transactions.chain.detail.concern.0.open')).toHaveAttribute('href', '/app/vps/100');
    await expect(page.getByTestId('transactions.chain.detail.concern.1.open')).toHaveAttribute(
      'href',
      '/app/datasets/200'
    );
    await expect(page.getByTestId('transactions.chain.detail.concern.2.open')).toHaveAttribute(
      'href',
      '/app/dns/zones/300'
    );
    await expect(page.getByTestId('transactions.chain.detail.concern.3.open')).toHaveCount(0);
    await expect(page.getByTestId('transactions.chain.detail.concern.4.open')).toHaveCount(0);
    await expect(concerns.locator('a[href^="/admin"]')).toHaveCount(0);

    await expect(page.getByTestId('transactions.chain.detail.tx.701')).toBeVisible();
    await expect(page.getByTestId('transactions.chain.detail.tx.702')).toBeVisible();
    await expect(
      page.getByTestId('transactions.chain.detail.tx.702').getByRole('link', { name: 'Step 2', exact: true })
    ).toHaveAttribute('href', '/app/transactions/items/702');

    // RowTone Full: every transaction row has an explicit variant.
    await expect(page.getByTestId('transactions.chain.detail.tx.701')).toHaveAttribute('data-row-variant', 'warn');
    await expect(page.getByTestId('transactions.chain.detail.tx.702')).toHaveAttribute('data-row-variant', 'danger');

    await page.setViewportSize({ width: 390, height: 844 });
    await expectNoDocumentHorizontalOverflow(page);
    await expect(page.getByTestId('transactions.chain.detail.transactions.table')).toBeVisible();
    expect(
      await page
        .getByTestId('transactions.chain.detail.transactions.table')
        .evaluate((table) => table.scrollWidth <= table.clientWidth + 1)
    ).toBe(true);

    await page.getByTestId('transactions.chain.detail.tx.toggle.702').click();
    await expect(page.getByTestId('transactions.chain.detail.tx.expanded.702')).toBeVisible();
    const expanded = page.getByTestId('transactions.chain.detail.tx.expanded.702');
    await expect(expanded).toContainText('node2');
    await expect(
      expanded.getByText('No input/output payload recorded for this transaction.', { exact: true })
    ).toHaveCount(2);
    await expect(expanded).not.toContainText('step failed on node2');
    await expect(expanded).not.toContainText('mount: permission denied');
    await expect(expanded).not.toContainText('rollback_needed');
    await expectNoDocumentHorizontalOverflow(page);
    await page.setViewportSize({ width: 1280, height: 844 });

    await page.getByRole('button', { name: /collapse all|sbalit vše/i }).click();
    await expect(page.getByTestId('transactions.chain.detail.tx.expanded.702')).toBeHidden();
    await page.getByRole('button', { name: /expand all|rozbalit vše/i }).click();
    await expect(page.getByTestId('transactions.chain.detail.tx.expanded.702')).toBeVisible();

    // Header action should link to items list filtered by this chain.
    await expect(page.getByTestId('transactions.chain.detail.open_items')).toHaveAttribute(
      'href',
      '/app/transactions/items?transaction_chain=123'
    );

    // Pin toggle should update aria-label.
    const pin = page.getByTestId('transactions.chain.detail.pin');
    await expect(pin).toHaveAttribute('aria-label', /Pin transaction chain/i);
    await pin.click();
    await expect(pin).toHaveAttribute('aria-label', /Unpin transaction chain/i);
  });

  test('renders admin My-view done chain with multiple expandable transactions at narrow desktop width', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1100, height: 720 });
    await bootstrapVpsAdminWindow(page, { sessionToken: 'TEST_TOKEN' });
    // Admin identity is required for the payload while retaining the /app My-view layout.
    await installHaveApiMock(page, { user: { id: 1, login: 'admin', level: 99 }, handlers });

    await page.goto('/app/transactions/124');

    await expect(page.getByTestId('transactions.chain.detail')).toBeVisible();
    await expect(page.getByTestId('transactions.chain.detail.info')).toContainText('100%');
    await expect(page.getByTestId('transactions.chain.detail.tx.801')).toBeVisible();
    await expect(page.getByTestId('transactions.chain.detail.tx.802')).toBeVisible();

    await page.getByRole('button', { name: /expand all|rozbalit vše/i }).click();
    const input801 = page
      .getByTestId('transactions.chain.detail.tx.expanded.801')
      .getByRole('region', { name: 'Input', exact: true });
    await expect(input801.locator('dt')).toHaveText('action');
    await expect(input801.locator('dd')).toHaveText('prepare');
    await expect(page.getByTestId('transactions.chain.detail.tx.expanded.802')).toContainText('booted');
  });

  test('renders admin My-view running chain progress and current step', async ({ page }) => {
    await bootstrapVpsAdminWindow(page, { sessionToken: 'TEST_TOKEN' });
    // Admin identity is required for the payload while retaining the /app My-view layout.
    await installHaveApiMock(page, { user: { id: 1, login: 'admin', level: 99 }, handlers });

    await page.goto('/app/transactions/125');

    await expect(page.getByTestId('transactions.chain.detail.info')).toContainText('1/3 · 33%');
    await expect(page.getByTestId('transactions.chain.detail.tx.902')).toContainText(/current step|aktuální krok/i);

    await page.setViewportSize({ width: 390, height: 844 });
    await expectNoDocumentHorizontalOverflow(page);
    await expect(page.getByTestId('transactions.chain.detail.transactions.table')).toBeVisible();
    expect(
      await page
        .getByTestId('transactions.chain.detail.transactions.table')
        .evaluate((table) => table.scrollWidth <= table.clientWidth + 1)
    ).toBe(true);

    await page.getByTestId('transactions.chain.detail.tx.toggle.902').click();
    await expect(page.getByTestId('transactions.chain.detail.tx.expanded.902')).toContainText('creating veth');
    await expectNoDocumentHorizontalOverflow(page);
  });

  test('stops chain and transaction polling after a failed chain loads', async ({ page }) => {
    let chainRequests = 0;
    let transactionRequests = 0;

    await bootstrapVpsAdminWindow(page, { sessionToken: 'TEST_TOKEN' });
    await installHaveApiMock(page, {
      handlers: {
        ...handlers,
        'GET transaction_chains/126': () => {
          chainRequests += 1;
          return {
            transaction_chain: {
              id: 126,
              state: 'failed',
              label: 'Failed scheduled backup',
              created_at: '2026-02-02T11:00:00Z',
            },
          };
        },
        'GET transactions': (args: { searchParams: URLSearchParams }) => {
          if (args.searchParams.get('transaction[transaction_chain]') === '126') {
            transactionRequests += 1;
            return { transactions: [] };
          }
          return handlers['GET transactions'](args);
        },
      },
    });

    await page.goto('/app/transactions/126');
    await expect(page.getByTestId('transactions.chain.detail')).toBeVisible();
    await expect(page.getByTestId('transactions.chain.detail.transactions')).toBeVisible();
    await expect.poll(() => chainRequests).toBe(1);
    await expect.poll(() => transactionRequests).toBe(1);

    await page.waitForTimeout(5_500);

    expect(chainRequests).toBe(1);
    expect(transactionRequests).toBe(1);
  });

  test('@pr-smoke-mobile renders admin route with admin-scoped links', async ({ page }, testInfo) => {
    await bootstrapVpsAdminWindow(page, { sessionToken: 'TEST_TOKEN' });
    await installHaveApiMock(page, {
      user: { id: 1, login: 'admin', level: 99 },
      handlers: {
        ...handlers,
        'GET transactions': () => ({
          transactions: [
            memberTransactions[0],
            {
              ...memberTransactions[1],
              error: 'step failed on node2',
              message: 'step failed on node2',
              stderr: 'mount: permission denied',
              priority: 20,
              urgent: true,
              type: 2,
              input: JSON.stringify({ a: 1 }),
              output: JSON.stringify({
                ok: false,
                error: 'step failed on node2',
                result: { rollback_needed: true },
                stderr: 'mount: permission denied',
              }),
            },
          ],
        }),
      },
    });

    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: {
          writeText: async (value: string) => {
            sessionStorage.setItem('fixture.o2-copy', value);
          },
        },
      });
    });
    await page.goto('/admin/transactions/123');

    await expect(page.getByTestId('transactions.chain.detail')).toBeVisible();
    await expect(page.getByTestId('transactions.chain.detail.open_items')).toHaveAttribute(
      'href',
      '/admin/transactions/items?transaction_chain=123'
    );
    await expect(page.getByTestId('transactions.chain.detail.tx.open.702')).toHaveAttribute(
      'href',
      '/admin/transactions/items/702'
    );
    await expect(page.getByTestId('transactions.chain.detail.concern.0.open')).toHaveAttribute(
      'href',
      '/admin/vps/100'
    );
    await expect(page.getByTestId('transactions.chain.detail.concern.1.open')).toHaveAttribute(
      'href',
      '/admin/datasets/200'
    );
    await expect(page.getByTestId('transactions.chain.detail.concern.2.open')).toHaveAttribute(
      'href',
      '/admin/dns/zones/300'
    );
    await expect(page.getByTestId('transactions.chain.detail.concern.3.open')).toHaveAttribute(
      'href',
      '/admin/nodes/2'
    );
    await expect(page.getByTestId('transactions.chain.detail.concern.4.open')).toHaveCount(0);
    await expect(page.getByTestId('transactions.chain.detail.tx.702')).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath('loaded-chain-top-en.png') });
    await page.getByTestId('transactions.chain.detail.tx.702').scrollIntoViewIfNeeded();
    await page.screenshot({ path: testInfo.outputPath('loaded-chain-steps-en.png') });
    await page.setViewportSize({ width: 390, height: 844 });
    await expectNoDocumentHorizontalOverflow(page);
    await expect(page.getByTestId('transactions.chain.detail.transactions.table')).toBeVisible();
    expect(
      await page
        .getByTestId('transactions.chain.detail.transactions.table')
        .evaluate((table) => table.scrollWidth <= table.clientWidth + 1)
    ).toBe(true);
    await page.getByTestId('transactions.chain.detail.tx.toggle.702').click();
    const expanded = page.getByTestId('transactions.chain.detail.tx.expanded.702');
    await expect(expanded).toBeVisible();
    await expect(expanded).toContainText('step failed on node2');
    await expect(expanded).toContainText('mount: permission denied');
    const input = expanded.getByRole('region', { name: 'Input', exact: true });
    await expect(input.locator('dt')).toHaveText('a');
    await expect(input.locator('dd')).toHaveText('1');
    const output = expanded.getByRole('region', { name: 'Output', exact: true });
    const ok = output.locator('dl > div').filter({ has: page.locator('dt', { hasText: /^ok$/ }) });
    await expect(ok.locator('dt')).toHaveText('ok');
    await expect(ok.locator('dd')).toHaveText('false');
    await expect(expanded).toContainText('rollback_needed');
    const errorBlock = expanded
      .locator('pre')
      .filter({ hasText: /^step failed on node2$/ })
      .locator('..');
    await errorBlock.getByRole('button', { name: 'Copy', exact: true }).click();
    await expect
      .poll(() => page.evaluate(() => sessionStorage.getItem('fixture.o2-copy')))
      .toBe('step failed on node2');
    await expanded.scrollIntoViewIfNeeded();
    await page.screenshot({ path: testInfo.outputPath('loaded-chain-error-payload-narrow-en.png') });
    await expanded.locator('details summary').click();
    await expect(expanded.locator('details pre')).toContainText('rollback_needed');
    await expect(expanded.locator('details pre')).toContainText('"error": "step failed on node2"');
    await expanded.locator('details').scrollIntoViewIfNeeded();
    await page.screenshot({ path: testInfo.outputPath('loaded-chain-raw-narrow-en.png') });
    await expectNoDocumentHorizontalOverflow(page);
  });

  test('deep reload keeps chain detail route and transaction table visible', async ({ page }) => {
    await bootstrapVpsAdminWindow(page, { sessionToken: 'TEST_TOKEN' });
    await installHaveApiMock(page, { handlers });

    await page.goto('/app/transactions/123');
    await expect(page.getByTestId('transactions.chain.detail.tx.702')).toBeVisible();

    await page.reload();

    await expect(page).toHaveURL(/\/app\/transactions\/123$/);
    await expect(page.getByTestId('transactions.chain.detail')).toBeVisible();
    await expect(page.getByTestId('transactions.chain.detail.tx.702')).toBeVisible();
  });
});
