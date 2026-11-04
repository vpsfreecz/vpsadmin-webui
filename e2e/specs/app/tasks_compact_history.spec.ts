import { expect, test } from '@playwright/test';
import type { Transaction__IndexOutput } from 'vpsadmin-typescript-client';
import { bootstrapVpsAdminWindow, installHaveApiMock, seedTrackedActionStates, setUiSettingsLocalStorage } from '../../fixtures';
import { expectNoDocumentHorizontalOverflow } from '../../helpers/horizontalOverflow';

for (const language of ['cs', 'en'] as const) {
  test(`@pr-smoke @pr-smoke-mobile ${language} compact tracked history retains inspection and controls`, async ({ page }, testInfo) => {
    await bootstrapVpsAdminWindow(page, { sessionToken: 'TEST' });
    await setUiSettingsLocalStorage(page, { language, theme: language === 'cs' ? 'dark' : 'light' });
    const labels = language === 'cs'
      ? ['Nasadit SSH veřejný klíč', 'Vytvořit VPS', 'Připsání', 'Migrovat VPS']
      : ['Deploy SSH public key', 'Create VPS', 'Credit payment', 'Migrate VPS'];
    const states = labels.map((label, index) => ({
      id: 910 - index, label, status: true, finished: true, current: index + 1, total: index + 1,
      created_at: '2026-10-27T18:01:46Z', updated_at: '2026-10-27T18:01:48Z',
      transaction_chain: { id: 910 - index },
    }));
    await page.addInitScript(({ labels }) => {
      localStorage.setItem('webui-next.pinned_action_states.user-1', '[9991]');
      localStorage.setItem('webui-next.pinned_transaction_chains.user-1', '[9992]');
      sessionStorage.setItem('webui-next.tracked_action_states.user-1', JSON.stringify(labels.map((label, index) => ({
        id: 910 - index, addedAt: Date.now() - index, actionLabel: label,
        objectLabel: 'demo-server.example.test', object: { kind: 'Vps', id: 14 }, adminMemberId: 42,
      }))));
    }, { labels });
    await installHaveApiMock(page, {
      user: { id: 1, login: 'demo-admin', level: 99 },
      handlers: {
        'GET vpses': () => ({ vpses: [], _meta: { total_count: 0 } }),
        'GET action_states': () => ({ action_states: states }),
        ...Object.fromEntries(states.map((state) => [`GET action_states/${state.id}`, () => ({ action_state: state })])),
        'GET transaction_chains': () => ({ transaction_chains: [{ id: 901, label: labels[1], state: 'done', progress: 1, size: 1, user: { id: 1 } }] }),
        'GET transaction_chains/910': () => ({ transaction_chain: { id: 910, label: labels[0], state: 'done', progress: 1, size: 1 } }),
        'GET transactions': () => ({ transactions: [] }),
      },
    });
    await page.goto('/admin/vps?user=84');
    await page.getByTestId('tasks.open-button').click();
    const row = page.getByTestId('tasks.row.910');
    await expect(row).toBeVisible();
    await expect(page.getByTestId('tasks.row.target.910')).toHaveAttribute('href', '/admin/vps/14?user=42');
    const box = await row.boundingBox();
    expect(box).not.toBeNull();
    await testInfo.attach('row-height', { body: JSON.stringify({ height: box!.height }), contentType: 'application/json' });
    await page.screenshot({ path: testInfo.outputPath(`tasks-${language}-${testInfo.project.name}.png`) });
    expect(box!.height).toBeLessThanOrEqual(150);
    await expect(row.getByRole('progressbar')).toHaveCount(0);
    await expect(row.getByText(language === 'cs' ? 'Hotovo' : 'Done', { exact: true })).toBeVisible();
    // The same ID is no longer repeated as both receipt and chain metadata.
    expect((await row.innerText()).match(/#910/g)).toHaveLength(1);
    await expectNoDocumentHorizontalOverflow(page);
    const drawer = page.getByTestId('tasks.drawer');
    await expect(page.getByTestId('tasks.chain.row.901')).toBeVisible();
    await expect(page.getByTestId('tasks.chain.row.901')).toContainText('1/1 · 100%');
    await expect(page.getByTestId('tasks.row.9991')).toHaveCount(0);
    await expect(page.getByTestId('tasks.chain.row.9992')).toHaveCount(0);
    await expect(drawer.getByText(language === 'cs' ? 'Připnuté' : 'Pinned', { exact: true })).toHaveCount(0);
    await expect(drawer.getByRole('button', { name: /^(Pin|Unpin|Připnout|Odepnout)( |$)/ })).toHaveCount(0);
    await expect(row).toContainText('1/1 · 100%');
    const dismiss = row.getByRole('button', { name: language === 'cs' ? 'Skrýt' : 'Dismiss', exact: true });
    if (testInfo.project.name !== 'chromium') {
      const box = await dismiss.boundingBox();
      expect(box!.height).toBeGreaterThanOrEqual(44);
      expect(box!.width).toBeGreaterThanOrEqual(44);
    }
    await page.getByTestId('tasks.filter-input').fill('does-not-match');
    await expect(row).toHaveCount(0);
    await page.getByTestId('tasks.filter-input').fill('demo-server');
    await expect(row).toBeVisible();
    await page.getByTestId('tasks.filter-input').fill('');
    await page.getByTestId('tasks.inspect.open.910').focus();
    await page.keyboard.press('Enter');
    await expect(page.getByTestId('tasks.inspect.action_state.910')).toBeVisible();
    await expect(page.getByTestId('tasks.inspect.action_state.910')).toContainText(language === 'cs' ? 'Aktualizováno' : 'Updated');
    await expect(page.getByTestId('tasks.inspect.open_chain')).toHaveAttribute('href', '/admin/transactions/910');
    await expect(drawer.getByRole('button', { name: /^(Pin|Unpin|Připnout|Odepnout)( |$)/ })).toHaveCount(0);
    await page.getByTestId('tasks.inspect.back').click();
    await row.getByRole('button', { name: language === 'cs' ? 'Skrýt' : 'Dismiss', exact: true }).click();
    await expect.poll(async () => page.evaluate(() => {
      const stored: Array<{ id: number }> = JSON.parse(sessionStorage.getItem('webui-next.tracked_action_states.user-1') ?? '[]');
      return stored.map((entry) => entry.id);
    })).not.toContain(910);
    await expect(row.getByRole('button', { name: language === 'cs' ? 'Skrýt' : 'Dismiss', exact: true })).toHaveCount(0);
    await page.getByTestId('tasks.row.target.909').click();
    await expect(page).toHaveURL(/\/admin\/vps\/14\?user=42$/);
    await expect(page.getByTestId('tasks.drawer')).toBeHidden();
  });
}


test('@pr-smoke @pr-smoke-mobile active progress, failures and unknown totals remain explicit', async ({ page }, testInfo) => {
  await bootstrapVpsAdminWindow(page, { sessionToken: 'TEST' });
  const states = [
    { id: 920, label: 'Migrate VPS', status: null, finished: false, current: 2, total: 5, can_cancel: true },
    { id: 921, label: 'Configure network', status: false, finished: true, current: 1, total: 3, error: 'Synthetic failure: ' + 'unbroken-diagnostic'.repeat(35) },
    { id: 922, label: 'Waiting for a receipt', status: null, finished: false, current: 0, total: 0 },
  ];
  let cancelRequests = 0;
  await installHaveApiMock(page, {
    user: { id: 1, login: 'demo', level: 1 },
    handlers: {
      'GET vpses': () => ({ vpses: [], _meta: { total_count: 0 } }),
      'GET action_states': () => ({ action_states: states }),
      'POST action_states/920/cancel': () => { cancelRequests++; return { action_state: states[0] }; },
    },
  });
  await page.goto('/app/vps');
  await page.getByTestId('tasks.open-button').click();
  const running = page.getByTestId('tasks.row.920');
  await expect(running.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '40');
  await expect(page.getByTestId('tasks.row.failure.921')).toContainText('Synthetic failure');
  await expect(page.getByTestId('tasks.row.922')).toContainText('Running');
  await expect(page.getByTestId('tasks.row.922').getByRole('progressbar')).toHaveCount(0);
  await expect(page.getByTestId('tasks.row.922')).not.toContainText('Done');
  const drawer = page.getByTestId('tasks.drawer');
  expect(await drawer.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
  await expectNoDocumentHorizontalOverflow(page);
  await page.screenshot({ path: testInfo.outputPath(`tasks-states-${testInfo.project.name}.png`) });
  await running.getByRole('button', { name: 'Cancel', exact: true }).click();
  const confirm = page.getByRole('dialog', { name: 'Cancel action?' });
  await expect(confirm).toBeVisible();
  expect(cancelRequests).toBe(0);
  await confirm.getByRole('button', { name: 'Cancel', exact: true }).click();
  expect(cancelRequests).toBe(0);
  await running.getByRole('button', { name: 'Cancel', exact: true }).click();
  await confirm.getByRole('button', { name: 'Cancel action', exact: true }).click();
  await expect.poll(() => cancelRequests).toBe(1);
});


test('@pr-smoke @pr-smoke-mobile inspection polls active receipts and stops after completion', async ({ page }) => {
  await bootstrapVpsAdminWindow(page, { sessionToken: 'TEST' });
  let reads = 0;
  const pending = { id: 930, label: 'Create VPS', status: true, finished: false, current: 0, total: 1 };
  await installHaveApiMock(page, {
    user: { id: 1, login: 'demo', level: 1 },
    handlers: {
      'GET vpses': () => ({ vpses: [], _meta: { total_count: 0 } }),
      'GET action_states': () => ({ action_states: [pending] }),
      'GET action_states/930': () => {
        reads++;
        return { action_state: reads > 1 ? { ...pending, finished: true, current: 1 } : pending };
      },
      'GET transaction_chains/930': () => ({
        transaction_chain: { id: 930, label: 'Create VPS', state: reads > 1 ? 'done' : 'running', progress: reads > 1 ? 1 : 0, size: 1 },
      }),
      'GET transactions': ({ searchParams }) => {
        expect(searchParams.get('transaction[transaction_chain]')).toBe('930');
        expect(searchParams.get('transaction[limit]')).toBe('100');
        return { transactions: [] };
      },
    },
  });
  await page.goto('/app/vps');
  await page.getByTestId('tasks.open-button').click();
  await page.getByTestId('tasks.inspect.open.930').click();
  const detail = page.getByTestId('tasks.inspect.action_state.930');
  await expect(detail).toContainText('Running action ID');
  await expect(detail).toContainText('Completed action ID');
  const finishedReads = reads;
  await page.waitForTimeout(3500);
  expect(reads).toBe(finishedReads);
});

test('@ops-inspector-populated completed inspector retains loaded steps and payloads', async ({ page }, testInfo) => {
  const language = testInfo.project.name === 'chromium' ? 'en' : 'cs';
  await bootstrapVpsAdminWindow(page, { sessionToken: 'TEST' });
  await setUiSettingsLocalStorage(page, { language, theme: language === 'cs' ? 'dark' : 'light' });
  const actionState = {
    id: 940,
    label: 'Create dataset',
    status: true,
    finished: true,
    current: 2,
    total: 2,
    created_at: '2026-10-27T18:01:46Z',
    updated_at: '2026-10-27T18:01:48Z',
    transaction_chain: { id: 940 },
  };
  const input = JSON.stringify({ dataset: 'tank/ct/fixture-vps14' });
  const output = JSON.stringify({ mounted: true, path: '/var/lib/lxc/fixture-vps14' });
  const firstStep = {
    id: 9401,
    name: 'Create dataset',
    done: 'done',
    success: 1,
    created_at: '2026-10-27T18:01:46Z',
    started_at: '2026-10-27T18:01:46Z',
    finished_at: '2026-10-27T18:01:47Z',
    node: { id: 2, name: 'fixture-node.test' },
    vps: { id: 14, hostname: 'fixture-vps14.test' },
    transaction_chain: { id: 940 },
    user: { id: 1, login: 'fixture-admin' },
    type: 3001,
    priority: 0,
    input,
    output,
  } satisfies Transaction__IndexOutput[number];
  const transactions: Transaction__IndexOutput = [
    firstStep,
    {
      ...firstStep,
      id: 9402,
      name: 'Mount dataset',
      started_at: '2026-10-27T18:01:47Z',
      finished_at: '2026-10-27T18:01:48Z',
    },
  ];
  await seedTrackedActionStates(page, [
    { id: 940, addedAt: Date.now(), actionLabel: actionState.label, objectLabel: 'fixture-vps14.test' },
  ]);
  let childReads = 0;
  await installHaveApiMock(page, {
    user: { id: 1, login: 'fixture-admin', level: 99 },
    handlers: {
      'GET vpses': () => ({ vpses: [], _meta: { total_count: 0 } }),
      'GET action_states': () => ({ action_states: [actionState] }),
      'GET action_states/940': () => ({ action_state: actionState }),
      'GET transaction_chains': () => ({ transaction_chains: [] }),
      'GET transaction_chains/940': () => ({
        transaction_chain: { id: 940, label: 'Create dataset', state: 'done', progress: 2, size: 2 },
      }),
      'GET transactions': ({ searchParams }) => {
        expect(searchParams.get('transaction[transaction_chain]')).toBe('940');
        expect(searchParams.get('transaction[limit]')).toBe('100');
        childReads++;
        return { transactions };
      },
    },
  });
  await page.goto('/admin/vps');
  await page.getByTestId('tasks.open-button').click();
  await page.getByTestId('tasks.inspect.open.940').click();
  const inspector = page.getByTestId('tasks.inspect.action_state.940');
  const firstCard = page.getByTestId('tasks.inspect.tx.card.9401');
  const secondCard = page.getByTestId('tasks.inspect.tx.card.9402');
  await expect(firstCard).toBeVisible();
  await expect(secondCard).toBeVisible();
  expect(childReads).toBeGreaterThan(0);
  await expect(inspector).toContainText('2/2 · 100%');
  await expect(inspector).toContainText(language === 'cs' ? 'Hotovo' : 'Done');
  await expect(page.getByTestId('tasks.inspect.open_chain')).toHaveAttribute('href', '/admin/transactions/940');
  const backend = page.getByTestId('tasks.inspect.backend_details');
  await expect(backend).toHaveText(JSON.stringify(actionState, null, 2));
  await inspector.locator('h3').scrollIntoViewIfNeeded();
  await page.screenshot({ path: testInfo.outputPath(`inspector-summary-${language}.png`), scale: 'css' });
  const disclosure = page.getByTestId('tasks.inspect.backend_disclosure');
  await expect(disclosure).not.toHaveAttribute('open', '');
  const summary = disclosure.locator('summary');
  if (testInfo.project.name === 'mobile-chrome') {
    await summary.scrollIntoViewIfNeeded();
    const box = await summary.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.height).toBeGreaterThanOrEqual(44);
    expect(box!.width).toBeGreaterThanOrEqual(44);
    await testInfo.attach('disclosure-hit-area', { body: JSON.stringify(box), contentType: 'application/json' });
  }
  await summary.focus();
  await page.keyboard.press('Enter');
  await expect(disclosure).toHaveAttribute('open', '');
  await expect(backend).toBeVisible();
  await backend.scrollIntoViewIfNeeded();
  await page.screenshot({ path: testInfo.outputPath(`inspector-backend-${language}.png`), scale: 'css' });
  await summary.focus();
  await page.keyboard.press('Enter');
  await expect(disclosure).not.toHaveAttribute('open', '');
  await expect(firstCard).toContainText('Create dataset');
  await expect(secondCard).toContainText('Mount dataset');
  // Baseline child status uses the browser-locale fallback; its selected-UI
  // locale mismatch is recorded separately from this completion invariant.
  await expect(firstCard.getByText(/^(Done|Hotovo)$/)).toBeVisible();
  await secondCard.scrollIntoViewIfNeeded();
  await page.screenshot({ path: testInfo.outputPath(`inspector-steps-${language}.png`), scale: 'css' });
  await page.getByTestId('tasks.inspect.tx.toggle.9401').click();
  const expanded = page.getByTestId('tasks.inspect.tx.expanded.9401');
  await expect(expanded.getByRole('link', { name: 'fixture-vps14.test', exact: true })).toHaveAttribute(
    'href',
    '/admin/vps/14'
  );
  const inputPanel = expanded
    .getByText(language === 'cs' ? 'Vstup' : 'Input', { exact: true })
    .locator('../..')
    .locator('pre');
  const outputPanel = expanded
    .getByText(language === 'cs' ? 'Výstup' : 'Output', { exact: true })
    .locator('../..')
    .locator('pre');
  await expect(inputPanel).toHaveText(input);
  await expect(outputPanel).toHaveText(output);
  await expect(
    expanded.getByRole('button', { name: language === 'cs' ? 'Kopírovat' : 'Copy', exact: true })
  ).toHaveCount(2);
  await outputPanel.scrollIntoViewIfNeeded();
  await page.screenshot({ path: testInfo.outputPath(`inspector-payload-${language}.png`), scale: 'css' });
  await expectNoDocumentHorizontalOverflow(page);
  const childStatus = firstCard
    .locator('span')
    .filter({ hasText: /^(Done|Hotovo)$/ })
    .first();
  const expandedStatus = expanded
    .getByText(language === 'cs' ? 'Stav' : 'State', { exact: true })
    .locator('..')
    .locator('span');
  await expect(childStatus).toHaveCount(1);
  await expect(expandedStatus).toHaveCount(1);
  await expect(childStatus).toBeVisible();
  await expect(expandedStatus).toBeVisible();
  await testInfo.attach('mounted-inspector-status', {
    body: JSON.stringify({
      url: page.url(),
      child: await childStatus.innerText(),
      expanded: await expandedStatus.innerText(),
    }),
    contentType: 'application/json',
  });
  await expect.soft(childStatus).toHaveText(language === 'cs' ? 'Hotovo' : 'Done');
  await expect.soft(expandedStatus).toHaveText(language === 'cs' ? 'Hotovo' : 'Done');
});
