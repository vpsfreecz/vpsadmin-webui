import { expect, test } from '@playwright/test';
import type { Transaction__IndexOutput } from 'vpsadmin-typescript-client';

import { bootstrapVpsAdminWindow, installHaveApiMock, setUiSettingsLocalStorage } from '../../fixtures';

test.describe('@workflow-matrix @smoke Action state detail page', () => {
  test('Renders header + cancel dialog and calls cancel endpoint', async ({ page }, testInfo) => {
    await bootstrapVpsAdminWindow(page, {
      sessionToken: 'TEST_TOKEN',
    });

    const makeAction = (id: number) => ({
      id,
      label: `Action ${id}`,
      state: 'running',
      created_at: new Date('2026-01-26T00:00:00.000Z').toISOString(),
      updated_at: new Date('2026-01-26T00:10:00.000Z').toISOString(),
      can_cancel: true,
      current: 5,
      total: 10,
      unit: 'tx',
      finished: false,
      status: true,
    });

    let cancelCalled = false;
    let cancelAttempts = 0;

    await installHaveApiMock(page, {
      user: { id: 1, login: 'test', level: 1 },
      handlers: {
        'GET action_states/123': () => ({ action_state: makeAction(123) }),
        'POST action_states/123/cancel': () => {
          cancelAttempts++;
          if (cancelAttempts === 1) return { status: false, message: 'Synthetic cancel rejected for Action 123' };
          cancelCalled = true;
          return { action_state: {} };
        },
      },
    });

    await page.goto('/app/action-states/123');

    await expect(page.getByTestId('action_state.detail')).toBeVisible();
    await expect(page.getByTestId('action_state.detail.header')).toBeVisible();

    // Primary controls
    await expect(page.getByTestId('action_state.detail.refresh')).toBeVisible();
    await expect(page.getByTestId('action_state.detail.open_tasks')).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath('action-running-top-en.png') });

    // Cancel flow
    await page.getByTestId('action_state.detail.cancel').click();
    await expect(page.getByTestId('tasks.cancel_dialog')).toBeVisible();

    await page.getByTestId('tasks.cancel_dialog.confirm').click();

    const dialog = page.getByTestId('tasks.cancel_dialog');
    await expect(dialog).toContainText('Action 123');
    await expect(dialog.getByText('Synthetic cancel rejected for Action 123', { exact: true })).toContainText(
      'Synthetic cancel rejected for Action 123'
    );
    expect(cancelAttempts).toBe(1);
    expect(cancelCalled).toBe(false);
    await page.screenshot({ path: testInfo.outputPath('action-cancel-rejected-en.png') });
    await page.getByTestId('tasks.cancel_dialog.confirm').click();

    await expect.poll(() => cancelCalled).toBe(true);
    await expect(dialog).toHaveCount(0);
    expect(cancelAttempts).toBe(2);
    await page.screenshot({ path: testInfo.outputPath('action-cancel-retried-en.png') });
    await testInfo.attach('cancel-attempts', {
      body: JSON.stringify({ target: 123, cancelAttempts, cancelCalled }),
      contentType: 'application/json',
    });
  });

  for (const roleCase of [
    { name: 'user', basePath: '/app', user: { id: 1, login: 'user', level: 1 } },
    { name: 'admin', basePath: '/admin', user: { id: 1, login: 'admin', level: 99 } },
  ]) {
    test(`shows related transactions and expandable payloads for ${roleCase.name}`, async ({ page }) => {
      await bootstrapVpsAdminWindow(page, {
        sessionToken: 'TEST_TOKEN',
      });

      const memberTransaction = {
        id: 7001,
        name: 'Create dataset',
        done: 'done',
        success: 1,
        created_at: '2026-01-26T00:01:00.000Z',
        started_at: '2026-01-26T00:01:01.000Z',
        finished_at: '2026-01-26T00:01:05.000Z',
        node: { id: 2, name: 'node2' },
        vps: { id: 12, hostname: 'vps12' },
        transaction_chain: { id: 456 },
      } satisfies Transaction__IndexOutput[number];
      const transactions: Transaction__IndexOutput =
        roleCase.user.level === 99
          ? [
              {
                ...memberTransaction,
                type: 3001,
                priority: 0,
                user: { id: 9, login: 'worker' },
                input: JSON.stringify({ dataset: 'tank/ct/vps12' }),
                output: JSON.stringify({ ok: true, mounted: true }),
              },
            ]
          : [memberTransaction];

      const handlers = {
        'GET action_states/123': () => ({
          action_state: {
            id: 123,
            label: 'Create VPS',
            state: 'done',
            created_at: '2026-01-26T00:00:00.000Z',
            updated_at: '2026-01-26T00:10:00.000Z',
            current: 2,
            total: 2,
            finished: true,
            status: true,
            transaction_chain: { id: 456, label: 'Create chain' },
          },
        }),
        'GET transaction_chains/456': () => ({
          transaction_chain: {
            id: 456,
            label: 'Create chain',
            state: 'done',
            progress: 2,
            size: 2,
          },
        }),
        'GET transactions': ({ searchParams }: { searchParams: URLSearchParams }) => {
          if (searchParams.get('transaction[transaction_chain]') !== '456') return { transactions: [] };
          return { transactions };
        },
      };

      await installHaveApiMock(page, {
        user: roleCase.user,
        handlers,
      });

      await page.goto(`${roleCase.basePath}/action-states/123`);

      await expect(page.getByTestId('action_state.detail.transactions')).toBeVisible();
      await expect(page.getByTestId('action_state.detail.transactions.view_all')).toHaveAttribute(
        'href',
        `${roleCase.basePath}/transactions/items?transaction_chain=456`
      );

      await page.getByTestId('action_state.detail.tx.toggle.7001').click();
      const expanded = page.getByTestId('action_state.detail.tx.expanded.7001');
      await expect(expanded).toBeVisible();
      await expect(expanded).toContainText('#7001');
      await expect(expanded).toContainText('node2');
      await expect(expanded.getByRole('link', { name: '#456', exact: true })).toHaveAttribute(
        'href',
        `${roleCase.basePath}/transactions/456`
      );
      await expect(expanded.getByRole('link', { name: 'vps12', exact: true })).toHaveAttribute(
        'href',
        `${roleCase.basePath}/vps/12`
      );

      await expanded.locator('details summary').click();
      const raw = expanded.locator('details pre');
      await expect(raw).not.toContainText(/"result"\s*:/);
      if (roleCase.user.level === 99) {
        const input = expanded.getByText('Input', { exact: true }).locator('../..').locator('pre');
        const output = expanded.getByText('Output', { exact: true }).locator('../..').locator('pre');
        await expect(input).toHaveText(JSON.stringify({ dataset: 'tank/ct/vps12' }));
        await expect(output).toHaveText(JSON.stringify({ ok: true, mounted: true }));
        await expect(expanded).toContainText('worker');
        await expect(raw).toContainText('"input":');
        await expect(raw).toContainText('"output":');
        await expect(raw).toContainText('mounted');
      } else {
        await expect(
          expanded.getByText('No input/output payload recorded for this transaction.', { exact: true })
        ).toHaveCount(2);
        for (const privilegedValue of ['tank/ct/vps12', 'worker', 'mounted']) {
          await expect(expanded).not.toContainText(privilegedValue);
        }
        await expect(raw).not.toContainText(/"(user|type|urgent|priority|input|output)"\s*:/);
      }
    });
  }

  test('deep reload keeps action-state detail and chained transactions visible', async ({ page }) => {
    await bootstrapVpsAdminWindow(page, {
      sessionToken: 'TEST_TOKEN',
    });

    await installHaveApiMock(page, {
      user: { id: 1, login: 'test', level: 1 },
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
            transaction_chain: { id: 456, label: 'Create chain' },
          },
        }),
        'GET transaction_chains/456': () => ({
          transaction_chain: { id: 456, label: 'Create chain', state: 'done', progress: 1, size: 1 },
        }),
        'GET transactions': ({ searchParams }: { searchParams: URLSearchParams }) => {
          if (searchParams.get('transaction[transaction_chain]') !== '456') return { transactions: [] };
          return {
            transactions: [
              {
                id: 7001,
                name: 'Create dataset',
                done: 'done',
                success: 1,
                transaction_chain: { id: 456 },
              },
            ],
          };
        },
      },
    });

    await page.goto('/app/action-states/123');
    await expect(page.getByTestId('action_state.detail.transactions')).toBeVisible();

    await page.reload();

    await expect(page).toHaveURL(/\/app\/action-states\/123$/);
    await expect(page.getByTestId('action_state.detail')).toBeVisible();
    await expect(page.getByTestId('action_state.detail.transactions.table')).toContainText('Create dataset');
  });
});

// One selected-UI locale checkpoint; API operation names remain authoritative.
test('@o2-detail-cs completed action retains related payload and backend facts', async ({ page }, testInfo) => {
  await bootstrapVpsAdminWindow(page, { sessionToken: 'TEST_TOKEN' });
  await setUiSettingsLocalStorage(page, { language: 'cs', theme: 'dark' });
  const action = {
    id: 123,
    label: 'Create VPS',
    status: true,
    finished: true,
    current: 2,
    total: 2,
    created_at: '2026-01-26T00:00:00.000Z',
    updated_at: '2026-01-26T00:10:00.000Z',
    transaction_chain: { id: 456, label: 'Create chain' },
  };
  const input = JSON.stringify({ dataset: 'tank/ct/vps12' });
  const output = JSON.stringify({ ok: true, mounted: true });
  const transaction = {
    id: 7001,
    name: 'Create dataset',
    done: 'done',
    success: 1,
    node: { id: 2, name: 'node2' },
    vps: { id: 12, hostname: 'vps12' },
    transaction_chain: { id: 456 },
    type: 3001,
    priority: 0,
    user: { id: 9, login: 'worker' },
    input,
    output,
  } satisfies Transaction__IndexOutput[number];
  await installHaveApiMock(page, {
    user: { id: 1, login: 'admin', level: 99 },
    handlers: {
      'GET action_states/123': () => ({ action_state: action }),
      'GET transaction_chains/456': () => ({
        transaction_chain: { id: 456, label: 'Create chain', state: 'done', progress: 2, size: 2 },
      }),
      'GET transactions': ({ searchParams }) => {
        expect(searchParams.get('transaction[transaction_chain]')).toBe('456');
        return { transactions: [transaction] };
      },
    },
  });
  await page.goto('/admin/action-states/123');
  const header = page.getByTestId('action_state.detail.header');
  await expect(header).toBeVisible();
  await expect(page.getByTestId('action_state.detail.transactions.table')).toContainText('Create dataset');
  await page.screenshot({ path: testInfo.outputPath('action-completed-top-cs.png') });
  await page.getByTestId('action_state.detail.tx.toggle.7001').click();
  const expanded = page.getByTestId('action_state.detail.tx.expanded.7001');
  await expect(expanded.getByRole('link', { name: 'vps12', exact: true })).toHaveAttribute('href', '/admin/vps/12');
  await expect(expanded).toContainText('worker');
  await expect(expanded.getByText('Vstup', { exact: true }).locator('../..').locator('pre')).toHaveText(input);
  await expect(expanded.getByText('Výstup', { exact: true }).locator('../..').locator('pre')).toHaveText(output);
  await expanded.scrollIntoViewIfNeeded();
  await page.screenshot({ path: testInfo.outputPath('action-completed-loaded-cs.png') });
  await expanded.locator('details summary').click();
  await expect(expanded.locator('details pre')).toContainText('"input":');
  await expect(expanded.locator('details pre')).toContainText('mounted');
  const debug = page.getByTestId('action_state.detail.debug');
  const debugSummary = debug.locator('summary');
  await expect(debug).not.toHaveAttribute('open', '');
  await expect(debugSummary).toHaveCount(1);
  expect(
    await debug.evaluate((el) =>
      Boolean(
        document.querySelector('[data-testid="action_state.detail.transactions"]')!.compareDocumentPosition(el) &
        Node.DOCUMENT_POSITION_FOLLOWING
      )
    )
  ).toBe(true);
  await debugSummary.focus();
  await page.keyboard.press('Enter');
  await expect(debug).toHaveAttribute('open', '');
  await expect(debug.locator('pre')).toHaveText(JSON.stringify(action, null, 2));
  await debug.scrollIntoViewIfNeeded();
  await page.screenshot({ path: testInfo.outputPath('action-backend-cs.png') });
  await testInfo.attach('action-state-visible-label', { body: await header.innerText(), contentType: 'text/plain' });
  // The candidate must use the selected UI language for the action badge.
  await expect(header.getByText('Hotovo', { exact: true })).toHaveCount(1);
});
