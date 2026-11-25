import { clickShellControl, openShellNavigation } from '../../helpers/shellNavigation';
import { expect, test } from '@playwright/test';

import { bootstrapVpsAdminWindow, installHaveApiMock, setUiSettingsLocalStorage } from '../../fixtures';

test('@workflow-matrix @pr-smoke @pr-smoke-mobile @smoke @smoke-mobile Tasks drawer opens as a non-modal side panel', async ({ page }) => {
  await bootstrapVpsAdminWindow(page, { sessionToken: 'TEST' });

  await installHaveApiMock(page, {
    user: { id: 1, login: 'test', level: 1 },
    handlers: {
      'GET vpses': () => ({ vpses: [], _meta: { total_count: 0 } }),
    },
  });

  await page.goto('/app/vps');

  await openShellNavigation(page);
  const openBtn = page.getByTestId('tasks.open-button');
  await expect(openBtn).toBeVisible();

  await openBtn.focus();
  await expect(openBtn).toBeFocused();

  await openBtn.click();

  const drawer = page.getByTestId('tasks.drawer');
  await expect(drawer).toBeVisible();
  await expect(drawer).toHaveAttribute('aria-modal', 'false');
  await expect(page.locator('[data-overlay-backdrop="true"]')).toHaveCount(0);

  const closeBtn = page.getByTestId('tasks.close-button');
  await expect(closeBtn).toBeVisible();

  // The Tasks drawer is intentionally non-modal: the current page remains visible and usable behind it.
  await expect(page.getByTestId('vps.list')).toBeVisible();
  if ((page.viewportSize()?.width ?? 0) >= 768) await expect(openBtn).toBeVisible();
  else await expect(page.getByTestId('nav.drawer')).toBeHidden();

  // Escape still closes the panel without navigating away from the underlying page.
  await page.keyboard.press('Escape');
  await expect(drawer).toBeHidden();
  await expect(page).toHaveURL(/\/app\/vps(?:\?.*)?$/);
});

test('@workflow-matrix @pr-smoke Tasks drawer cards stay readable in the narrow side panel', async ({ page }) => {
  await bootstrapVpsAdminWindow(page, { sessionToken: 'TEST' });

  await installHaveApiMock(page, {
    user: { id: 1, login: 'test', level: 1 },
    handlers: {
      'GET vpses': () => ({ vpses: [], _meta: { total_count: 0 } }),
      'GET action_states': () => ({
        action_states: [
          {
            id: 79,
            label: 'Stop virtual private server with a longer generated task label',
            status: true,
            finished: true,
            current: 1,
            total: 1,
            created_at: '2026-05-31T01:35:27Z',
            updated_at: '2026-05-31T01:35:27Z',
            transaction_chain: { id: 79 },
          },
        ],
      }),
    },
  });

  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/app/vps');
  await clickShellControl(page, 'tasks.open-button');

  const drawer = page.getByTestId('tasks.drawer');
  const row = page.getByTestId('tasks.row.79');
  const actions = page.getByTestId('tasks.inspect.open.79');

  await expect(drawer).toBeVisible();
  await expect(row).toBeVisible();
  await expect(actions).toBeVisible();
  await expect(row.getByText('Stop virtual private server')).toBeVisible();
  await expect(row).toContainText('2026');
  await expect(row.getByRole('progressbar')).toHaveCount(0);

  const drawerBox = await drawer.boundingBox();
  const rowBox = await row.boundingBox();
  const actionsBox = await actions.boundingBox();

  expect(drawerBox).not.toBeNull();
  expect(rowBox).not.toBeNull();
  expect(actionsBox).not.toBeNull();
  expect(rowBox!.x).toBeGreaterThanOrEqual(drawerBox!.x);
  expect(rowBox!.x + rowBox!.width).toBeLessThanOrEqual(drawerBox!.x + drawerBox!.width);
  expect(actionsBox!.x).toBeGreaterThanOrEqual(rowBox!.x);
  expect(actionsBox!.x + actionsBox!.width).toBeLessThanOrEqual(rowBox!.x + rowBox!.width);
});

test('@workflow-matrix @pr-smoke @pr-smoke-mobile Tasks keep the tracked action and object identity visible and searchable', async ({ page }) => {
  await bootstrapVpsAdminWindow(page, { sessionToken: 'TEST' });
  await page.addInitScript(() => {
    sessionStorage.setItem('webui-next.tracked_action_states.user-1', JSON.stringify([{
      id: 91,
      addedAt: Date.now(),
      actionLabelKey: 'action.vps.restart.label',
      objectLabel: 'codex-nightly-target #14',
      object: { kind: 'Vps', id: 14 },
      adminMemberId: 42,
    }]));
  });

  const actionState = {
    id: 91,
    label: 'State change',
    status: true,
    finished: true,
    current: 1,
    total: 1,
    created_at: '2026-09-18T06:00:00Z',
    updated_at: '2026-09-18T06:00:02Z',
  };
  await installHaveApiMock(page, {
    user: { id: 1, login: 'test', level: 99 },
    handlers: {
      'GET vpses': () => ({ vpses: [], _meta: { total_count: 0 } }),
      'GET action_states': () => ({ action_states: [actionState] }),
      'GET action_states/91': () => ({ action_state: actionState }),
      'GET transaction_chains/91': () => ({
        transaction_chain: { id: 91, label: 'Restart', state: 'done', progress: 1, size: 1 },
      }),
      'GET transactions': () => ({ transactions: [] }),
    },
  });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/admin/vps?user=84');
  await clickShellControl(page, 'tasks.open-button');

  const row = page.getByTestId('tasks.row.91');
  await expect(row.getByRole('button', { name: 'Restart', exact: true })).toBeVisible();
  await expect(row).not.toContainText('State change');
  await expect(row).toContainText('Object: codex-nightly-target #14');
  await expect(page.getByTestId('tasks.row.target.91')).toHaveAttribute('href', '/admin/vps/14?user=42');

  await page.getByTestId('tasks.filter-input').fill('codex-nightly-target');
  await expect(row).toBeVisible();
  await page.getByTestId('tasks.filter-input').fill('another-target');
  await expect(row).toHaveCount(0);
  await page.getByTestId('tasks.filter-input').fill('');

  await page.getByTestId('tasks.inspect.open.91').click();
  const detail = page.getByTestId('tasks.inspect.action_state.91');
  await expect(detail).toContainText('Restart');
  await expect(detail).toContainText('Object');
  await expect(detail).toContainText('codex-nightly-target #14');
  await expect(page.getByTestId('tasks.inspect.target')).toHaveAttribute('href', '/admin/vps/14?user=42');

  await page.getByTestId('tasks.inspect.back').click();
  await page.getByTestId('tasks.row.target.91').click();
  await expect(page).toHaveURL(/\/admin\/vps\/14\?user=42$/);
  await expect(page.getByTestId('tasks.drawer')).toBeHidden();
});

test('@workflow-matrix @pr-smoke-mobile Tasks inspection labels running, completed, and failed action IDs accurately', async ({ page }) => {
  await bootstrapVpsAdminWindow(page, { sessionToken: 'TEST' });

  const actionStates = [
    { id: 81, label: 'Start', status: null, finished: false, current: 0, total: 1 },
    { id: 82, label: 'Restart', status: true, finished: true, current: 1, total: 1 },
    { id: 83, label: 'Stop', status: false, finished: true, current: 1, total: 1 },
  ];

  await installHaveApiMock(page, {
    user: { id: 1, login: 'test', level: 1 },
    handlers: {
      'GET vpses': () => ({ vpses: [], _meta: { total_count: 0 } }),
      'GET action_states': () => ({ action_states: actionStates }),
      'GET action_states/81': () => ({ action_state: actionStates[0] }),
      'GET action_states/82': () => ({ action_state: actionStates[1] }),
      'GET action_states/83': () => ({ action_state: actionStates[2] }),
    },
  });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/app/vps');
  await clickShellControl(page, 'tasks.open-button');

  for (const [id, expectedLabel] of [
    [81, 'Running action ID'],
    [82, 'Completed action ID'],
    [83, 'Failed action ID'],
  ] as const) {
    await page.getByTestId(`tasks.inspect.open.${id}`).click();
    await expect(page.getByTestId(`tasks.inspect.action_state.${id}`)).toContainText(expectedLabel);
    await page.getByTestId('tasks.inspect.back').click();
  }
});

test('@workflow-matrix @pr-smoke Tasks drawer can inspect action state transactions without leaving the page', async ({ page }) => {
  await bootstrapVpsAdminWindow(page, { sessionToken: 'TEST' });

  await installHaveApiMock(page, {
    user: { id: 1, login: 'test', level: 1 },
    handlers: {
      'GET vpses': () => ({ vpses: [], _meta: { total_count: 0 } }),
      'GET action_states': () => ({
        action_states: [
          {
            id: 79,
            label: 'Create VPS',
            status: true,
            finished: true,
            current: 2,
            total: 2,
            created_at: '2026-05-31T01:35:27Z',
            updated_at: '2026-05-31T01:35:27Z',
            transaction_chain: { id: 79, label: 'Create chain' },
            result: { vps_id: 12 },
          },
        ],
      }),
      'GET action_states/79': () => ({
        action_state: {
          id: 79,
          label: 'Create VPS',
          status: true,
          finished: true,
          current: 2,
          total: 2,
          created_at: '2026-05-31T01:35:27Z',
          updated_at: '2026-05-31T01:35:27Z',
          transaction_chain: { id: 79, label: 'Create chain' },
          result: { vps_id: 12 },
        },
      }),
      'GET transaction_chains/79': () => ({
        transaction_chain: {
          id: 79,
          label: 'Create chain',
          state: 'done',
          progress: 2,
          size: 2,
        },
      }),
      'GET transactions': ({ searchParams }: { searchParams: URLSearchParams }) => {
        if (searchParams.get('transaction[transaction_chain]') !== '79') return { transactions: [] };
        return {
          transactions: [
            {
              id: 9001,
              name: 'Create dataset with a deliberately long transaction item name for drawer wrapping',
              done: 'done',
              success: 1,
              type: 3001,
              priority: 0,
              started_at: '2026-05-31T01:35:27Z',
              finished_at: '2026-05-31T01:35:29Z',
              node: { id: 2, label: 'node2' },
              vps: { id: 12, label: 'vps12' },
              transaction_chain: { id: 79 },
              input: { dataset: 'tank/ct/vps12' },
              output: { ok: true },
              result: { dataset_created: true },
            },
          ],
        };
      },
    },
  });

  await page.goto('/app/vps');
  await clickShellControl(page, 'tasks.open-button');
  await page.getByTestId('tasks.inspect.open.79').click();

  await expect(page.getByTestId('tasks.inspect.action_state.79')).toBeVisible();
  await expect(page.getByTestId('tasks.inspect.open_full')).toHaveAttribute('href', '/app/action-states/79');
  await expect(page.getByTestId('tasks.inspect.open_chain')).toHaveAttribute('href', '/app/transactions/79');
  await expect(page.getByTestId('tasks.inspect.view_all')).toHaveAttribute('href', '/app/transactions/items?transaction_chain=79');
  await expect(page.getByTestId('tasks.inspect.backend_details')).toContainText('vps_id');

  await page.getByTestId('tasks.inspect.tx.toggle.9001').click();
  const drawer = page.getByTestId('tasks.drawer');
  const card = page.getByTestId('tasks.inspect.tx.card.9001');
  const expanded = page.getByTestId('tasks.inspect.tx.expanded.9001');
  const toggle = page.getByTestId('tasks.inspect.tx.toggle.9001');

  await expect(card).toBeVisible();
  await expect(expanded).toBeVisible();
  await expect(expanded).toContainText('tank/ct/vps12');
  await expect(expanded).toContainText('dataset_created');

  const drawerBox = await drawer.boundingBox();
  const cardBox = await card.boundingBox();
  const toggleBox = await toggle.boundingBox();

  expect(drawerBox).not.toBeNull();
  expect(cardBox).not.toBeNull();
  expect(toggleBox).not.toBeNull();
  expect(cardBox!.x).toBeGreaterThanOrEqual(drawerBox!.x);
  expect(cardBox!.x + cardBox!.width).toBeLessThanOrEqual(drawerBox!.x + drawerBox!.width);
  expect(toggleBox!.x).toBeGreaterThanOrEqual(cardBox!.x);
  expect(toggleBox!.x + toggleBox!.width).toBeLessThanOrEqual(cardBox!.x + cardBox!.width);

  await page.getByRole('button', { name: /collapse all/i }).click();
  await expect(expanded).toBeHidden();
});

test('@pr-smoke Tasks drawer lets admins expand transaction chains and continue to full detail', async ({ page }) => {
  await bootstrapVpsAdminWindow(page, { sessionToken: 'TEST' });

  await installHaveApiMock(page, {
    user: { id: 1, login: 'admin', level: 99 },
    handlers: {
      'GET vpses': () => ({ vpses: [], _meta: { total_count: 0 } }),
      'GET action_states': () => ({ action_states: [] }),
      'GET transaction_chains': () => ({
        transaction_chains: [
          {
            id: 880,
            label: 'Migrate VPS chain',
            state: 'failed',
            progress: 1,
            size: 2,
            created_at: '2026-06-01T08:00:00Z',
            updated_at: '2026-06-01T08:02:00Z',
            concerns: [{ class_name: 'Vps', row_id: 44, label: 'vps44' }],
            error: 'migration failed on node3',
          },
        ],
      }),
      'GET transaction_chains/880': () => ({
        id: 880,
        label: 'Migrate VPS chain',
        state: 'failed',
        progress: 1,
        size: 2,
        created_at: '2026-06-01T08:00:00Z',
        updated_at: '2026-06-01T08:02:00Z',
        concerns: [{ class_name: 'Vps', row_id: 44, label: 'vps44' }],
        error: 'migration failed on node3',
      }),
      'GET transactions': ({ searchParams }: { searchParams: URLSearchParams }) => {
        if (searchParams.get('transaction[transaction_chain]') !== '880') return { transactions: [] };
        return {
          transactions: [
            {
              id: 881,
              name: 'Prepare migration',
              done: 'done',
              success: 1,
              type: 10,
              priority: 0,
              created_at: '2026-06-01T08:00:10Z',
              started_at: '2026-06-01T08:00:15Z',
              finished_at: '2026-06-01T08:01:00Z',
              node: { id: 2, label: 'node2' },
              vps: { id: 44, label: 'vps44' },
              transaction_chain: { id: 880 },
              input: { stage: 'prepare' },
              output: { ok: true },
            },
            {
              id: 882,
              name: 'Move dataset',
              done: 'done',
              success: 0,
              type: 11,
              priority: 10,
              created_at: '2026-06-01T08:01:00Z',
              started_at: '2026-06-01T08:01:05Z',
              finished_at: '2026-06-01T08:02:00Z',
              node: { id: 3, label: 'node3' },
              vps: { id: 44, label: 'vps44' },
              transaction_chain: { id: 880 },
              input: { dataset: 'tank/ct/vps44' },
              output: { ok: false, error: 'zfs send failed' },
              stderr: 'cannot receive incremental stream',
            },
          ],
        };
      },
    },
  });

  await page.goto('/admin/vps');
  await clickShellControl(page, 'tasks.open-button');

  await expect(page.getByTestId('tasks.drawer')).toHaveAttribute('aria-modal', 'false');
  await expect(page.locator('[data-overlay-backdrop="true"]')).toHaveCount(0);
  await expect(page.getByTestId('vps.list')).toBeVisible();
  await expect(page.getByTestId('tasks.chain.row.880')).toBeVisible();
  await expect(page.getByTestId('tasks.chain.row.880')).toContainText('Migrate VPS chain');
  await expect(page.getByTestId('tasks.chain.row.880')).toContainText('Vps#44');
  await expect(page.getByTestId('tasks.chain.failure.880')).toContainText('migration failed on node3');

  await page.getByTestId('tasks.chain.toggle.880').click();
  await expect(page.getByTestId('tasks.chain.expanded.880')).toBeVisible();
  await expect(page.getByTestId('tasks.chain.tx.card.882')).toContainText('Move dataset');

  await page.getByTestId('tasks.chain.tx.toggle.882').click();
  await expect(page.getByTestId('tasks.chain.tx.card.882')).toContainText('tank/ct/vps44');
  await expect(page.getByTestId('tasks.chain.tx.card.882')).toContainText('zfs send failed');

  await page.getByTestId('tasks.chain.open.880').click();
  await expect(page).toHaveURL(/\/admin\/transactions\/880$/);
  await expect(page.getByTestId('transactions.chain.detail')).toBeVisible();
  await expect(page.getByTestId('transactions.chain.detail.tx.882')).toBeVisible();

  await page.reload();

  await expect(page).toHaveURL(/\/admin\/transactions\/880$/);
  await expect(page.getByTestId('transactions.chain.detail.tx.882')).toBeVisible();
});

for (const language of ['cs', 'en'] as const) {
  test(`@pr-smoke @pr-smoke-mobile Tasks background control contains its ${language} label`, async ({ page }) => {
    await bootstrapVpsAdminWindow(page, { sessionToken: 'TEST' });
    await setUiSettingsLocalStorage(page, { language, theme: language === 'cs' ? 'dark' : 'light' });
    await installHaveApiMock(page, {
      user: { id: 1, login: 'test', level: 1 },
      handlers: {
        'GET vpses': () => ({ vpses: [] }),
        'GET action_states': () => ({ action_states: [] }),
        'GET transaction_chains': () => ({
          transaction_chains: [{
            id: 901, label: 'Automatic backup snapshot retention cleanup',
            state: 'done', size: 3, progress: 3,
            created_at: '2026-11-09T11:00:00Z', user: { id: 1, login: 'test' },
          }],
        }),
      },
    });
    await page.goto('/app/vps');
    await expect(page.getByTestId('vps.list')).toBeVisible();
    for (const width of [page.viewportSize()!.width, 320]) {
      await page.setViewportSize({ width, height: 900 });
      await clickShellControl(page, 'tasks.open-button');
      const drawer = page.getByTestId('tasks.drawer');
      const toggle = drawer.getByTestId('tasks.system_activity.toggle');
      for (const expanded of [false, true]) {
        await expect(toggle).toBeVisible();
        await expect(toggle).toHaveText(language === 'cs'
          ? (expanded ? 'Skrýt systémovou aktivitu' : 'Zobrazit systémovou aktivitu')
          : (expanded ? 'Hide system activity' : 'Show system activity'));
        await toggle.focus();
        await expect(toggle).toBeFocused();
        const bounds = await toggle.evaluate((element) => {
          const range = document.createRange();
          range.selectNodeContents(element);
          const text = range.getBoundingClientRect();
          const button = element.getBoundingClientRect();
          return {
            top: text.top - button.top, bottom: button.bottom - text.bottom,
            left: text.left - button.left, right: button.right - text.right,
          };
        });
        for (const distance of Object.values(bounds)) expect(distance).toBeGreaterThanOrEqual(-1);
        expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width + 1);
        await toggle.click();
        if (expanded) await expect(drawer.getByTestId('tasks.chain.row.901')).toHaveCount(0);
        else await expect(drawer.getByTestId('tasks.chain.row.901')).toBeVisible();
      }
      await page.keyboard.press('Escape');
      await expect(drawer).toBeHidden();
    }
  });
}
