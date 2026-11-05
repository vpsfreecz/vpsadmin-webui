import { expect, test } from '@playwright/test';
import { bootstrapVpsAdminWindow, installHaveApiMock, setUiSettingsLocalStorage } from '../../fixtures';
import { expectNoDocumentHorizontalOverflow } from '../../helpers/horizontalOverflow';

for (const view of ['member', 'admin-my-view', 'admin'] as const) {
  for (const language of ['cs', 'en'] as const) {
    test(`@pr-smoke @pr-smoke-mobile ${view}/${language} transaction identity, pins, failures and compact items`, async ({
      page,
    }, testInfo) => {
      const adminView = view === 'admin';
      const basePath = adminView ? '/admin' : '/app';
      if (testInfo.project.name === 'chromium') await page.setViewportSize({ width: 1440, height: 1000 });
      await bootstrapVpsAdminWindow(page, { sessionToken: 'TEST' });
      await setUiSettingsLocalStorage(page, { language, theme: language === 'cs' ? 'dark' : 'light' });
      await page.addInitScript(() => {
        Object.defineProperty(navigator, 'clipboard', {
          configurable: true,
          value: {
            writeText: async (value: string) => {
              sessionStorage.setItem('fixture.transaction-copy', value);
            },
          },
        });
      });
      const label = language === 'cs' ? 'Vytvoření VPS' : 'Create VPS';
      const chains = [
        { id: 972, label, state: 'done', size: 10, progress: 10 },
        { id: 971, label: language === 'cs' ? 'Přesun VPS' : 'Migrate VPS', state: 'failed', size: 3, progress: 1 },
        {
          id: 970,
          label: language === 'cs' ? 'Změna zdrojů' : 'Update resources',
          state: 'queued',
          size: 3,
          progress: 1,
        },
      ].map((chain) => ({
        ...chain,
        user: { id: 1, login: 'demo-member' },
        created_at: '2026-10-27T18:01:46Z',
        concerns: { type: 'affect', objects: [['Vps', 14]] },
      }));
      const payload = JSON.stringify({
        subject: 'Synthetic message',
        text_plain: 'Ahoj,\n\ntoto je syntetická zpráva.\n' + 'Čitelný dlouhý obsah. '.repeat(50) + '\nKonec.',
      });
      const transactions = [
        {
          id: 7402,
          label: language === 'cs' ? 'Odeslání e-mailu' : 'Send mail',
          name: 'Send',
          done: 'done',
          success: 1,
        },
        {
          id: 7401,
          label: language === 'cs' ? 'Příprava sítě' : 'Prepare network',
          name: 'Configure',
          done: 'done',
          success: 0,
        },
      ].map((tx) => ({
        ...tx,
        type: 9001,
        priority: 0,
        user: { id: 1, login: 'demo-member' },
        node: { id: 3, label: 'node3.demo' },
        vps: { id: 14 },
        transaction_chain: { id: 972 },
        created_at: '2026-10-27T18:01:46Z',
        started_at: '2026-10-27T18:01:47Z',
        finished_at: '2026-10-27T18:01:49Z',
        input: payload,
        output: JSON.stringify(tx.success ? { execute: { status: 'ok' } } : { error: 'Synthetic network failure' }),
      }));
      const writes: string[] = [];
      page.on('request', (request) => {
        if (
          /\/(transaction_chains|transactions)(\/|$)/.test(new URL(request.url()).pathname) &&
          !['GET', 'HEAD', 'OPTIONS'].includes(request.method())
        )
          writes.push(request.method());
      });
      await installHaveApiMock(page, {
        user: { id: 1, login: 'demo-member', level: view === 'member' ? 1 : 99 },
        handlers: {
          'GET transaction_chains': () => ({ transaction_chains: chains }),
          ...Object.fromEntries(
            chains.map((chain) => [`GET transaction_chains/${chain.id}`, () => ({ transaction_chain: chain })])
          ),
          'GET transactions': () => ({ transactions }),
          ...Object.fromEntries(transactions.map((tx) => [`GET transactions/${tx.id}`, () => ({ transaction: tx })])),
        },
      });
      await page.goto(`${basePath}/transactions`);
      const userHeader = () =>
        page.getByRole('columnheader', { name: language === 'cs' ? 'Uživatel' : 'User', exact: true });
      if (adminView && testInfo.project.name === 'chromium') await expect(userHeader()).toBeVisible();
      else if (!adminView) await expect(userHeader()).toHaveCount(0);
      const row = page.getByTestId('transactions.row.972');
      const failed = page.getByTestId('transactions.row.971');
      await expect(row).toBeVisible();
      await expect(failed).toHaveAttribute('data-row-variant', 'danger');
      // Use the existing accessible labels from the rendered controls in either language.
      const pinControl = row.locator('button[aria-pressed]');
      const initialHeight = (await row.boundingBox())!.height;
      const failedHeight = (await failed.boundingBox())!.height;
      await expect(row).toContainText('10/10 · 100%');
      await expect(failed).toContainText('1/3 · 33%');
      await pinControl.click();
      await expect(row).toHaveAttribute('data-row-variant', 'warn');
      await expect(pinControl).toHaveAttribute('aria-pressed', 'true');
      expect(Math.abs((await row.boundingBox())!.height - initialHeight)).toBeLessThanOrEqual(1);
      await expect(row.getByText(language === 'cs' ? 'Připnuté' : 'Pinned', { exact: true })).toHaveCount(0);
      await expect(pinControl).toHaveAttribute('title', language === 'cs' ? 'Odepnout' : 'Unpin');
      await failed.locator('button[aria-pressed]').click();
      await expect(failed).toHaveAttribute('data-row-variant', 'danger');
      expect(Math.abs((await failed.boundingBox())!.height - failedHeight)).toBeLessThanOrEqual(1);
      await page.mouse.move(0, 0);
      for (const [target, token] of [
        [row, '--c-warn-bg'],
        [failed, '--c-danger-bg'],
      ] as const) {
        await expect
          .poll(() =>
            target.evaluate((el, variable) => {
              const style = getComputedStyle(el);
              return (
                style.backgroundColor === `rgb(${style.getPropertyValue(variable).trim().split(/\s+/).join(', ')})`
              );
            }, token)
          )
          .toBe(true);
      }
      await expectNoDocumentHorizontalOverflow(page);
      if ((view === 'admin' || view === 'member') && language === 'cs')
        await page.screenshot({ path: testInfo.outputPath(`${testInfo.project.name}-chains.png`) });
      await page.reload();
      await expect(row.locator('button[aria-pressed]')).toHaveAttribute('aria-pressed', 'true');
      await row.locator('button[aria-pressed]').click();
      await expect(row).not.toHaveAttribute('data-row-variant', 'warn');
      await failed.locator('button[aria-pressed]').click();
      await expect(failed).toHaveAttribute('data-row-variant', 'danger');
      if (testInfo.project.name === 'chromium') {
        await row.locator(`a[href="${basePath}/transactions/items?transaction_chain=972"]`).click();
      } else {
        await page.goto(`${basePath}/transactions/items?transaction_chain=972&limit=50&page=1`);
      }
      const item = page.getByTestId('transactions.items.row.7402');
      await expect(item).toBeVisible();
      if (!adminView) await expect(userHeader()).toHaveCount(0);
      await expect(item).not.toContainText('Backend');
      await expect(item).toContainText(language === 'cs' ? 'Hotovo' : 'Done');
      await expect(item).not.toHaveAttribute('data-row-variant', 'ok');
      await expect(page.getByTestId('transactions.items.row.7401')).toHaveAttribute('data-row-variant', 'danger');
      if (testInfo.project.name === 'chromium') expect((await item.boundingBox())!.height).toBeLessThanOrEqual(110);
      await expectNoDocumentHorizontalOverflow(page);
      expect(
        await page
          .getByTestId('transactions.items.table')
          .locator('table')
          .evaluate((el) => el.scrollWidth <= el.clientWidth + 1)
      ).toBe(true);
      if (view === 'admin' && language === 'cs')
        await page.screenshot({ path: testInfo.outputPath(`${testInfo.project.name}-items.png`) });
      const toggle = page.getByTestId('transactions.items.row.7402.toggle');
      await toggle.focus();
      await page.keyboard.press('Enter');
      await expect(toggle).toHaveAttribute('aria-expanded', 'true');
      const expanded = page.getByTestId('transactions.items.row.7402.expanded');
      await expect(expanded).toContainText('Konec.');
      await expanded
        .getByRole('region', { name: language === 'cs' ? 'Vstup' : 'Input', exact: true })
        .locator('..')
        .getByRole('button', { name: language === 'cs' ? 'Kopírovat' : 'Copy', exact: true })
        .click();
      await expect.poll(() => page.evaluate(() => sessionStorage.getItem('fixture.transaction-copy'))).toBe(payload);
      await expect(
        page.getByTestId('transactions.items.row.7402.filters').locator('a').filter({ hasText: '9001' })
      ).toHaveAttribute('href', /transaction_chain=972.*type=9001/);
      if (view === 'admin' && language === 'cs')
        await page.screenshot({ path: testInfo.outputPath(`${testInfo.project.name}-expanded.png`), fullPage: true });
      if (testInfo.project.name === 'chromium') {
        for (const [width, count] of [
          [390, 3],
          [800, 4],
          [1050, 5],
          [1440, adminView ? 8 : 7],
        ] as const) {
          await page.setViewportSize({ width, height: 1000 });
          await expect(expanded.locator('td')).toHaveAttribute('colspan', String(count));
          expect(
            await page
              .getByTestId('transactions.items.table')
              .locator('table')
              .evaluate((el) => el.scrollWidth <= el.clientWidth + 1)
          ).toBe(true);
        }
      }
      await item.getByRole('link', { name: language === 'cs' ? 'řetězec #972' : 'chain #972', exact: true }).click();
      await expect(page).toHaveURL(`${basePath}/transactions/972`);
      await expect(page.getByTestId('transactions.chain.detail.tx.7402')).toBeVisible();
      expect(writes).toEqual([]);
    });
  }
}

// Two representative projects exercise the same caller-local error/recovery path.
test('@o2-list-recovery chain and item filter errors initial failure cached refresh and retry', async ({
  page,
}, testInfo) => {
  const language = testInfo.project.name === 'chromium' ? 'en' : 'cs';
  await bootstrapVpsAdminWindow(page, { sessionToken: 'TEST' });
  await setUiSettingsLocalStorage(page, { language, theme: language === 'cs' ? 'dark' : 'light' });
  const chains = [
    { id: 981, label: 'Create VPS', state: 'done', progress: 2, size: 2 },
    { id: 980, label: 'Automatic backup retention cleanup', state: 'done', progress: 1, size: 1 },
  ].map((chain) => ({ ...chain, user: { id: 1, login: 'fixture-member' }, created_at: '2026-10-27T18:01:46Z' }));
  const item = {
    id: 9811,
    name: 'Create dataset',
    done: 'done',
    success: 1,
    transaction_chain: { id: 981 },
    vps: { id: 14 },
  };
  let chainFailure = true;
  let itemFailure = true;
  let chainReads = 0;
  let itemReads = 0;
  const writes: string[] = [];
  page.on('request', (request) => {
    if (
      /\/(transaction_chains|transactions)(\/|$)/.test(new URL(request.url()).pathname) &&
      !['GET', 'HEAD', 'OPTIONS'].includes(request.method())
    )
      writes.push(request.method());
  });
  await installHaveApiMock(page, {
    user: { id: 1, login: 'fixture-member', level: 1 },
    handlers: {
      'GET transaction_chains': ({ searchParams }) => {
        if (searchParams.get('transaction_chain[limit]') !== '51') return { transaction_chains: [] };
        // A regular member relies on API ownership scope; no admin owner override.
        expect(searchParams.get('transaction_chain[user]')).toBeNull();
        chainReads++;
        return chainFailure
          ? { status: false, message: 'Synthetic chain list unavailable' }
          : { transaction_chains: chains };
      },
      ...Object.fromEntries(
        chains.map((chain) => [`GET transaction_chains/${chain.id}`, () => ({ transaction_chain: chain })])
      ),
      'GET transactions': ({ searchParams }) => {
        expect(searchParams.get('transaction[transaction_chain]')).toBe('981');
        itemReads++;
        return itemFailure ? { status: false, message: 'Synthetic item list unavailable' } : { transactions: [item] };
      },
    },
  });
  await page.goto('/app/transactions');
  const initialError = page.getByTestId('transactions.list.error');
  await expect(initialError).toBeVisible();
  await expect(page.getByTestId('transactions.row.981')).toHaveCount(0);
  const refreshTitle = language === 'cs' ? 'Nepodařilo se obnovit seznam řetězců' : 'Failed to refresh the chain list';
  const initialRefreshWarnings = await page
    .getByTestId('transactions.list')
    .getByText(refreshTitle, { exact: true })
    .count();
  await page.screenshot({ path: testInfo.outputPath(`chain-initial-error-${language}.png`) });
  chainFailure = false;
  const beforeRetry = chainReads;
  await page.getByTestId('transactions.list.error.retry').click();
  const row = page.getByTestId('transactions.row.981');
  await expect(row).toBeVisible();
  expect(chainReads).toBeGreaterThan(beforeRetry);
  await expect(row.locator('a[href="/app/transactions/981"]:visible').first()).toBeVisible();
  await row.locator('button[aria-pressed]').click();
  await expect(row.locator('button[aria-pressed]')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('transactions.system_activity')).toBeVisible();
  await page.getByTestId('transactions.system_activity.toggle').click();
  await expect(page.getByTestId('transactions.row.980')).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath(`chain-recovered-pin-system-${language}.png`) });
  chainFailure = true;
  await expect(page.getByTestId('transactions.list').getByText(refreshTitle, { exact: true })).toBeVisible({
    timeout: 20000,
  });
  await expect(row).toBeVisible();
  await expect(row.locator('button[aria-pressed]')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('transactions.row.980')).toBeVisible();
  await expect(initialError).toHaveCount(0);
  await page.screenshot({ path: testInfo.outputPath(`chain-cached-refresh-failed-${language}.png`) });
  chainFailure = false;
  await expect(page.getByTestId('transactions.list').getByText(refreshTitle, { exact: true })).toHaveCount(0, {
    timeout: 20000,
  });
  const chainFilter = page.getByTestId('transactions.chains.smart_filter.input');
  await chainFilter.fill('state:invalid');
  await chainFilter.press('Enter');
  await expect(page.getByTestId('transactions.list.active_filters')).toContainText('invalid');
  await expect(page.getByTestId('toast.viewport').getByText(/invalid/)).toHaveCount(0);
  const chainAnnouncement = await page
    .getByTestId('transactions.list')
    .locator('[role="alert"], [aria-live="polite"], [aria-live="assertive"]')
    .allTextContents();
  await page.screenshot({ path: testInfo.outputPath(`chain-filter-invalid-${language}.png`) });
  await page.getByTestId('transactions.chains.clear_filters').click();
  await expect(row).toBeVisible();
  await expect(page.getByTestId('transactions.list.active_filters')).toHaveCount(0);
  await page.goto('/app/transactions/items?transaction_chain=981');
  await expect(page.getByTestId('transactions.items.error')).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath(`items-initial-error-${language}.png`) });
  itemFailure = false;
  const beforeItemRetry = itemReads;
  await page.getByTestId('transactions.items.error.retry').click();
  await expect(page.getByTestId('transactions.items.row.9811')).toBeVisible();
  expect(itemReads).toBeGreaterThan(beforeItemRetry);
  const itemFilter = page.getByTestId('transactions.items.smart_filter.input');
  await itemFilter.fill('type:invalid');
  await itemFilter.press('Enter');
  await expect(page.getByTestId('transactions.items.active_filters')).toContainText('invalid');
  await expect(page.getByTestId('toast.viewport').getByText(/invalid/)).toHaveCount(0);
  const itemAnnouncement = await page
    .getByTestId('transactions.items.list')
    .locator('[role="alert"], [aria-live="polite"], [aria-live="assertive"]')
    .allTextContents();
  await page.screenshot({ path: testInfo.outputPath(`items-filter-invalid-${language}.png`) });
  await itemFilter.fill('type:9001');
  await itemFilter.press('Enter');
  await expect(page).toHaveURL(/type=9001/);
  await expect(page).toHaveURL(/transaction_chain=981/);
  await expect(page.getByTestId('transactions.items.row.9811')).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath(`items-filter-recovered-${language}.png`) });
  expect(writes).toEqual([]);
  await testInfo.attach('list-recovery-observations', {
    body: JSON.stringify({
      initialRefreshWarnings,
      chainAnnouncement,
      itemAnnouncement,
      chainReads,
      itemReads,
      writes,
      url: page.url(),
    }),
    contentType: 'application/json',
  });
  // Candidate initial-error and caller-local announcements are hard guards.
  expect(initialRefreshWarnings).toBe(0);
  expect(chainAnnouncement.some((text) => text.includes('invalid'))).toBe(true);
  expect(itemAnnouncement.some((text) => text.includes('invalid'))).toBe(true);
});
