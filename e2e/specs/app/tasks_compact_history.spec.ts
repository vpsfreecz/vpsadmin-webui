import { expect, test } from '@playwright/test';
import { bootstrapVpsAdminWindow, installHaveApiMock, setUiSettingsLocalStorage } from '../../fixtures';
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
