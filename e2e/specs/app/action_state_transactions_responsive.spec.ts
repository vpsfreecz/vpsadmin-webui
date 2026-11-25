import { expect, test } from '@playwright/test';
import { bootstrapVpsAdminWindow, installHaveApiMock, setUiSettingsLocalStorage } from '../../fixtures';
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

for (const mode of ['app', 'admin'] as const) {
  for (const [language, theme] of [
    ['cs', 'dark'],
    ['en', 'light'],
  ] as const) {
    test(`@pr-smoke @pr-smoke-mobile action list keeps long titles and actions readable (${mode}/${language}/${theme})`, async ({
      page,
      isMobile,
    }) => {
      const writes: string[] = [];
      page.on('request', (request) => {
        if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method())) writes.push(request.url());
      });
      await setUiSettingsLocalStorage(page, { language, theme });
      await bootstrapVpsAdminWindow(page, { webuiNext: { uiSettings: { persistence: 'local' } } });
      const title = 'Ověřovací dlouhý český popis provozní operace správce v Českých Budějovicích';
      await installHaveApiMock(page, {
        user: { id: 1, login: 'synthetic-audit-user', level: mode === 'admin' ? 99 : 1 },
        handlers: {
          'GET action_states': () => ({
            action_states: [
              { id: 123, label: title, current: 3, total: 9, finished: false, status: true, can_cancel: true },
              { id: 122, label: 'SyntheticOperation'.repeat(12), finished: true, status: false, can_cancel: false },
            ],
          }),
        },
      });
      await page.goto(`/${mode}/action-states`);
      const row = page.getByTestId('action_states.row.123');
      await expect(row).toContainText(title);
      for (const width of [390, 320, 1440]) {
        await page.setViewportSize({ width, height: 900 });
        await expectNoDocumentHorizontalOverflow(page);
        const link = row.locator(`a[href="/${mode}/action-states/123"]`);
        const box = await row.boundingBox();
        const titleBox = await link.boundingBox();
        expect(box).not.toBeNull();
        expect(titleBox).not.toBeNull();
        if (width < 640) expect(titleBox!.width).toBeGreaterThanOrEqual(box!.width - 44);
        for (const button of await row.getByRole('button').all()) {
          const buttonBox = await button.boundingBox();
          expect(buttonBox).not.toBeNull();
          expect(buttonBox!.x).toBeGreaterThanOrEqual(box!.x);
          expect(buttonBox!.x + buttonBox!.width).toBeLessThanOrEqual(box!.x + box!.width);
          if (width < 640) expect(buttonBox!.y).toBeGreaterThanOrEqual(titleBox!.y + titleBox!.height);
          if (isMobile) expect(buttonBox!.height).toBeGreaterThanOrEqual(44);
        }
        await link.focus();
        await page.keyboard.press('Shift+Tab');
        await page.keyboard.press('Tab');
        await expect(link).toBeFocused();
        expect(await link.evaluate((el) => el.matches(':focus-visible'))).toBe(true);
      }
      expect(writes).toEqual([]);
    });
  }
}

for (const mode of ['app', 'admin'] as const) {
  for (const [language, theme] of [
    ['cs', 'dark'],
    ['en', 'light'],
  ] as const) {
    test(`@pr-smoke @pr-smoke-mobile failed-step links and payload error headings stay readable (${mode}/${language}/${theme})`, async ({
      page,
    }) => {
      await setUiSettingsLocalStorage(page, { language, theme });
      await bootstrapVpsAdminWindow(page, { webuiNext: { uiSettings: { persistence: 'local' } } });
      await installHaveApiMock(page, {
        user: { id: 1, login: 'synthetic-audit-user', level: mode === 'admin' ? 99 : 1 },
        handlers: {
          'GET action_states/123': () => ({
            action_state: {
              id: 123,
              label: 'Synthetic failed action',
              finished: true,
              status: false,
              transaction_chain: { id: 456 },
            },
          }),
          'GET transaction_chains/456': () => ({
            transaction_chain: { id: 456, label: 'Synthetic failed chain', state: 'failed', size: 1, progress: 0 },
          }),
          'GET transactions': () => ({
            transactions: [
              { id: 701, name: 'Synthetic failed step', done: 'done', success: 0, transaction_chain: { id: 456 } },
            ],
          }),
          'GET transactions/701': () => ({
            transaction: {
              id: 701,
              name: 'Synthetic failed step',
              done: 'done',
              success: 0,
              error: 'Synthetic execution failure',
              input: '{}',
              output: '{}',
            },
          }),
        },
      });
      for (const [route, rootId] of [
        ['action-states/123', 'action_state.detail'],
        ['transactions/456', 'transactions.chain.detail.info'],
        ['transactions/items/701', 'transactions.items.detail.debug_sections'],
      ]) {
        await page.goto(`/${mode}/${route}`);
        const root = page.getByTestId(rootId!);
        const payload = route!.includes('/items/');
        const text = payload
          ? language === 'cs'
            ? 'Chyba'
            : 'Error'
          : language === 'cs'
            ? 'Selhalo zde'
            : 'Failed here';
        const label = root.getByText(text, { exact: true }).first();
        await expect(label).toBeVisible();
        const link = payload ? label : label.locator('..').locator('a').first();
        if (!payload) await expect(link).toHaveAttribute('href', `/${mode}/transactions/items/701`);
        const contrast = await link.evaluate((el) => {
          const rgb = (text: string) => (text.match(/[\d.]+/g) ?? []).slice(0, 3).map(Number);
          const lum = (c: number[]) =>
            c
              .map((v) => v / 255)
              .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
              .reduce((sum, v, i) => sum + v * [0.2126, 0.7152, 0.0722][i]!, 0);
          let surface: Element | null = el;
          while (surface && getComputedStyle(surface).backgroundColor === 'rgba(0, 0, 0, 0)')
            surface = surface.parentElement;
          const a = lum(rgb(getComputedStyle(el).color)),
            b = lum(rgb(getComputedStyle(surface!).backgroundColor));
          return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
        });
        expect(contrast).toBeGreaterThanOrEqual(4.5);
        if (!payload) await expect(link).toHaveCSS('text-decoration-line', 'underline');
        await page.setViewportSize({ width: 320, height: 844 });
        await expectNoDocumentHorizontalOverflow(page);
      }
    });
  }
}
