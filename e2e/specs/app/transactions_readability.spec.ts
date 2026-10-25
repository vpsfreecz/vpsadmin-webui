import { expect, test } from '@playwright/test';
import { bootstrapVpsAdminWindow, installHaveApiMock, setUiSettingsLocalStorage } from '../../fixtures';
import { expectNoDocumentHorizontalOverflow } from '../../helpers/horizontalOverflow';

const chainId = 12957356;
const mailBody =
  'Ahoj Alice,\n\ntoto je syntetický e-mail pro kontrolu transakcí.\n\n' +
  'Dlouhý text zůstává celý čitelný a neztrácí odstavce. '.repeat(35) +
  '\n\nKonec testovací zprávy.';
const input = JSON.stringify({ to: 'alice@example.test', subject: 'Test transakce', text_plain: mailBody });

for (const language of ['cs', 'en'] as const) {
  test(`@pr-smoke @pr-smoke-mobile ${language} compact transaction history and searchable chain steps`, async ({
    page,
  }, testInfo) => {
    await bootstrapVpsAdminWindow(page);
    await setUiSettingsLocalStorage(page, { language, theme: language === 'cs' ? 'dark' : 'light' });
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: {
          writeText: async (text: string) => {
            sessionStorage.setItem('fixture.transaction-copy', text);
          },
        },
      });
    });
    const action = language === 'cs' ? 'Přesun VPS' : 'Migrate VPS';
    const email = language === 'cs' ? 'Odeslání e-mailu' : 'Send mail';
    const chains = Array.from({ length: 25 }, (_, index) => ({
      id: chainId - index,
      state: index === 0 ? 'failed' : index === 1 ? 'queued' : 'done',
      label: index < 2 ? action : language === 'cs' ? 'Snapshot datasetu' : 'Snapshot dataset',
      size: index < 2 ? 3 : 1,
      progress: index < 2 ? 1 : 1,
      user: { id: 53, login: 'demo-admin' },
      user_session: { id: 112 },
      created_at: '2026-10-25T00:05:00Z',
      concerns: { type: 'affect', objects: [['Vps', 30398]], labels: { Vps: 'VPS' } },
    }));
    const transactions = [
      {
        id: 703,
        label: language === 'cs' ? 'Nastavení sítě' : 'Configure network',
        done: 'queued',
        success: null,
        type: 2,
        node: { id: 3, domain_name: 'node3.demo' },
        vps: { id: 30398 },
      },
      {
        id: 702,
        label: email,
        done: 'done',
        success: 0,
        type: 9001,
        priority: 0,
        input,
        output: { error: 'Synthetic delivery failure' },
        node: { id: 3, domain_name: 'node3.demo' },
        vps: { id: 30398 },
      },
      {
        id: 701,
        label: language === 'cs' ? 'Příprava VPS' : 'Prepare VPS',
        done: 'done',
        success: 1,
        type: 1,
        node: { id: 3, domain_name: 'node3.demo' },
        vps: { id: 30398 },
      },
    ];
    const mutations: string[] = [];
    page.on('request', (request) => {
      if (
        /\/(?:transaction_chains|transactions)(?:\/|$)/.test(new URL(request.url()).pathname) &&
        !['GET', 'HEAD', 'OPTIONS'].includes(request.method())
      )
        mutations.push(request.method());
    });
    await installHaveApiMock(page, {
      user: { id: 1, login: 'admin', level: 99 },
      handlers: {
        'GET transaction_chains': () => ({ transaction_chains: chains }),
        [`GET transaction_chains/${chainId}`]: () => ({ transaction_chain: chains[0] }),
        [`GET transaction_chains/${chainId - 1}`]: () => ({ transaction_chain: { ...chains[1], size: 600 } }),
        'GET transactions': () => ({ transactions }),
      },
    });
    await page.goto('/admin/transactions');
    const first = page.getByTestId(`transactions.row.${chainId}`);
    await expect(first).toBeVisible();
    await expect(first.getByRole('link', { name: action, exact: true })).toBeVisible();
    await expect(first).toHaveAttribute('data-row-variant', 'danger');
    await expect(page.getByTestId('transactions.table').locator('tbody > tr')).toHaveCount(25);
    const pin = first.getByRole('button', {
      name: language === 'cs' ? 'Připnout řetězec transakcí' : 'Pin transaction chain',
      exact: true,
    });
    expect((await pin.locator('svg').boundingBox())!.width).toBeGreaterThanOrEqual(16);
    await expectNoDocumentHorizontalOverflow(page);
    const viewport = page.viewportSize()!;
    if (viewport.width >= 1280) {
      await expect(
        page.getByRole('columnheader', { name: language === 'cs' ? 'Uživatel' : 'User', exact: true })
      ).toBeVisible();
      await expect(first.getByRole('link', { name: 'demo-admin', exact: true })).toHaveAttribute(
        'href',
        '/admin/transactions?user=53'
      );
      expect((await first.boundingBox())!.height).toBeLessThanOrEqual(72);
    }
    const screenshotDir = process.env['E2E_TRANSACTIONS_READABILITY_SCREENSHOT_DIR'];
    if (screenshotDir && language === 'cs')
      await page.screenshot({ path: `${screenshotDir}/${testInfo.project.name}-list.png`, fullPage: true });
    await first
      .getByRole('link', { name: `#${chainId}`, exact: true })
      .filter({ visible: true })
      .click();
    await expect(page).toHaveURL(`/admin/transactions/${chainId}`);
    await expect(page.getByRole('heading', { name: action, exact: true })).toBeVisible();
    const summary = page.getByTestId('transactions.chain.detail.info');
    await expect(summary).toContainText('demo-admin');
    await expect(summary.getByRole('link', { name: '#112' })).toHaveAttribute(
      'href',
      '/admin/transactions?user_session=112'
    );
    await expect(summary).toContainText('1/3 · 33%');
    const steps = page.getByTestId('transactions.chain.detail.transactions.table');
    expect(
      await steps.locator('tbody > tr').evaluateAll((rows) => rows.map((row) => row.getAttribute('data-testid')))
    ).toEqual([
      'transactions.chain.detail.tx.701',
      'transactions.chain.detail.tx.702',
      'transactions.chain.detail.tx.703',
    ]);
    await expect(page.getByTestId('transactions.chain.detail.tx.703')).not.toContainText(
      language === 'cs' ? 'Aktuální krok' : 'Current step'
    );
    await expectNoDocumentHorizontalOverflow(page);
    expect(await steps.evaluate((table) => table.scrollWidth <= table.clientWidth + 1)).toBe(true);
    if (screenshotDir && language === 'cs')
      await page.screenshot({ path: `${screenshotDir}/${testInfo.project.name}-chain.png`, fullPage: true });
    const stateFilter = page.getByTestId('transactions.chain.detail.filter.state');
    await stateFilter.selectOption('failed');
    await expect(steps.locator('tbody > tr')).toHaveCount(1);
    await expect(steps).toContainText(email);
    await stateFilter.selectOption('active');
    await expect(steps.locator('tbody > tr')).toHaveCount(1);
    await expect(page.getByTestId('transactions.chain.detail.tx.703')).toBeVisible();
    await stateFilter.selectOption('all');
    const search = page.getByTestId('transactions.chain.detail.filter.search');
    await search.fill('702');
    await expect(steps.locator('tbody > tr')).toHaveCount(1);
    const toggle = page.getByTestId('transactions.chain.detail.tx.toggle.702');
    await toggle.focus();
    await page.keyboard.press('Enter');
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    const stepName = page
      .getByTestId('transactions.chain.detail.tx.702')
      .getByRole('link', { name: email, exact: true });
    expect((await stepName.locator('..').boundingBox())!.width).toBeGreaterThanOrEqual(100);
    expect((await page.getByTestId('transactions.chain.detail.tx.702').boundingBox())!.height).toBeLessThan(180);
    await expect(page).toHaveURL(`/admin/transactions/${chainId}`);
    const expanded = page.getByTestId('transactions.chain.detail.tx.expanded.702');
    if (testInfo.project.name === 'chromium') {
      for (const [width, columns] of [
        [390, 3],
        [800, 4],
        [1050, 5],
        [1280, 7],
      ] as const) {
        await page.setViewportSize({ width, height: 800 });
        await expect(expanded.locator('td')).toHaveAttribute('colspan', String(columns));
        expect((await stepName.locator('..').boundingBox())!.width).toBeGreaterThanOrEqual(100);
        // The app shell has a pre-existing 800px toolbar overflow; this
        // breakpoint sweep targets the transaction table's column layout.
        expect(await steps.evaluate((table) => table.scrollWidth <= table.clientWidth + 1)).toBe(true);
      }
      await page.setViewportSize(viewport);
    }
    const reader = expanded.getByRole('region', { name: language === 'cs' ? 'Vstup' : 'Input', exact: true });
    await expect(reader).toBeVisible();
    expect(await reader.locator('pre').allTextContents()).toContain(mailBody);
    expect((await reader.boundingBox())!.height).toBeGreaterThanOrEqual(320);
    await expectNoDocumentHorizontalOverflow(page);
    await reader
      .locator('..')
      .getByRole('button', { name: language === 'cs' ? 'Kopírovat' : 'Copy', exact: true })
      .click();
    expect(await page.evaluate(() => sessionStorage.getItem('fixture.transaction-copy'))).toBe(input);
    if (screenshotDir && language === 'cs')
      await page.screenshot({ path: `${screenshotDir}/${testInfo.project.name}-expanded.png`, fullPage: true });
    await search.fill('no-such-step');
    await expect(page.getByTestId('transactions.chain.detail.filter.empty')).toBeVisible();
    await search.fill('');
    await expect(page.getByTestId('transactions.chain.detail.tx.703')).toBeVisible();
    await search.fill('702');
    await stateFilter.selectOption('failed');
    expect(mutations).toEqual([]);
    await page.getByTestId('transactions.chain.detail.open_tasks').click();
    await expect(page.getByTestId(`tasks.chain.open.${chainId}`)).toBeVisible();
    if (screenshotDir && language === 'cs')
      await page.screenshot({ path: `${screenshotDir}/${testInfo.project.name}-tasks.png` });
    await page.getByTestId(`tasks.chain.open.${chainId - 1}`).click();
    await expect(page).toHaveURL(`/admin/transactions/${chainId - 1}`);
    await expect(page.getByTestId('transactions.chain.detail.filter.search')).toHaveValue('');
    await expect(page.getByTestId('transactions.chain.detail.filter.state')).toHaveValue('all');
    await expect(page.getByTestId('transactions.chain.detail.partial')).toContainText('600');
    await expect(page.getByTestId('transactions.chain.detail.filter.count')).toContainText('3');
  });
}
