import { expect, test } from '@playwright/test';

import { bootstrapVpsAdminWindow, installHaveApiMock } from '../../fixtures';
import { expectNoDocumentHorizontalOverflow } from '../../helpers/horizontalOverflow';

const longPayloadToken = `payload-${'0123456789abcdef'.repeat(16)}`;

const handlers = {
  'GET transactions/702': () => ({
    id: 702,
    name: 'Step 2',
    done: 'done',
    success: 0,
    progress: 40,
    priority: 20,
    urgent: true,
    type: 2,
    created_at: '2026-02-02T08:01:00Z',
    started_at: '2026-02-02T08:01:10Z',
    finished_at: '2026-02-02T08:02:40Z',
    node: { id: 2, label: 'node2' },
    vps: { id: 100, label: 'vps100' },
    transaction_chain: { id: 123 },
    depends_on: [701],
    input: { a: 1 },
    user: { id: 9, login: 'worker' },
    output: { ok: false, error: `dataset mount failed:${longPayloadToken}` },
    details: { command: `zfs mount tank/ct/vps100:${longPayloadToken}` },
    stdout: `created mountpoint:${longPayloadToken}`,
    stderr: `cannot mount dataset:${longPayloadToken}`,
  }),
};

test.describe('@workflow-matrix @pr-smoke TransactionDetailPage', () => {
  test('@pr-smoke-mobile renders user transaction details without broken admin node link', async ({ page }) => {
    await bootstrapVpsAdminWindow(page, { sessionToken: 'TEST_TOKEN' });
    await installHaveApiMock(page, { handlers });

    await page.goto('/app/transactions/items/702');

    await expect(page.getByTestId('transactions.items.detail')).toBeVisible();
    await expect(page.getByTestId('transactions.items.detail.header')).toBeVisible();
    await expect(page.getByTestId('transactions.items.detail.info')).toBeVisible();
    await expect(page.getByTestId('transactions.items.detail.payload')).toBeVisible();
    await expect(page.getByTestId('transactions.items.detail.error')).toContainText('dataset mount failed');
    await expect(page.getByTestId('transactions.items.detail.info')).toContainText('worker');
    await expect(page.getByTestId('transactions.items.detail.info')).toContainText('40');
    await expect(page.getByTestId('transactions.items.detail.payload')).toContainText('zfs mount tank/ct/vps100');
    await expect(page.getByTestId('transactions.items.detail.payload')).toContainText('created mountpoint');
    await expect(page.getByTestId('transactions.items.detail.payload')).toContainText('cannot mount dataset');
    await expect(page.getByTestId('transactions.items.detail.raw')).toBeVisible();
    await page.setViewportSize({ width: 390, height: 844 });
    await expectNoDocumentHorizontalOverflow(page);
    await page.getByTestId('transactions.items.detail.raw').getByText(/raw|surov/i).click();
    await expect(page.getByTestId('transactions.items.detail.raw.json')).toBeVisible();
    await expect(page.getByTestId('transactions.items.detail.raw.json')).toContainText(longPayloadToken);
    await expectNoDocumentHorizontalOverflow(page);
    await page.setViewportSize({ width: 1280, height: 844 });

    await expect(page.getByTestId('transactions.items.detail.open_chain')).toHaveAttribute('href', '/app/transactions/123');
    await expect(page.getByTestId('transactions.items.detail.node_value')).toContainText('node2');
    await expect(page.locator('a[href="/app/admin/nodes/2"]')).toHaveCount(0);
  });

  test('@pr-smoke-mobile renders admin transaction details with admin node link', async ({ page }) => {
    await bootstrapVpsAdminWindow(page, { sessionToken: 'TEST_TOKEN' });
    await installHaveApiMock(page, {
      user: { id: 1, login: 'admin', level: 99 },
      handlers,
    });

    await page.goto('/admin/transactions/items/702');

    await expect(page.getByTestId('transactions.items.detail')).toBeVisible();
    await expect(page.getByTestId('transactions.items.detail.open_chain')).toHaveAttribute('href', '/admin/transactions/123');
    await expect(page.getByTestId('transactions.items.detail.node_link')).toHaveAttribute('href', '/admin/nodes/2');
    await page.setViewportSize({ width: 390, height: 844 });
    await expectNoDocumentHorizontalOverflow(page);
  });

  test('deep reload keeps transaction detail route usable', async ({ page }) => {
    await bootstrapVpsAdminWindow(page, { sessionToken: 'TEST_TOKEN' });
    await installHaveApiMock(page, { handlers });

    await page.goto('/app/transactions/items/702');
    await expect(page.getByTestId('transactions.items.detail')).toBeVisible();

    await page.reload();

    await expect(page).toHaveURL(/\/app\/transactions\/items\/702$/);
    await expect(page.getByTestId('transactions.items.detail')).toBeVisible();
    await expect(page.getByTestId('transactions.items.detail.error')).toContainText('dataset mount failed');
  });
});

for (const language of ['cs', 'en'] as const) {
  test(`@pr-smoke @pr-smoke-mobile uses API transaction labels in ${language} and refreshes them on language switch`, async ({ page }, testInfo) => {
    await bootstrapVpsAdminWindow(page, { sessionToken: 'TEST_TOKEN' });
    await page.addInitScript(lang => {
      localStorage.setItem('vpsadmin.uiSettings.v1', JSON.stringify({ language: lang }));
    }, language);
    await installHaveApiMock(page);
    const seen: string[] = [];
    await page.route(/\/api\/v?7\.0\/transactions(?:\/702)?(?:\?|$)/, async route => {
      const lang = route.request().headers()['accept-language'];
      seen.push(lang ?? 'missing');
      const tx = { id: 702, name: 'CreateVps', label: lang === 'cs' ? 'Vytvoření VPS' : 'Create VPS', done: 'done', success: 1, transaction_chain: { id: 123 } };
      await route.fulfill({ json: { status: true, response: { transaction: route.request().url().includes('/702') ? tx : [tx] } } });
    });
    await page.route(/\/api\/v?7\.0\/transaction_chains(?:\/123)?(?:\?|$)/, async route => {
      const lang = route.request().headers()['accept-language'];
      const chain = { id: 123, label: lang === 'cs' ? 'Vytvoření' : 'Create', state: 'done', progress: 1, size: 1 };
      await route.fulfill({ json: { status: true, response: { transaction_chain: route.request().url().includes('/123') ? chain : [chain] } } });
    });
    const label = language === 'cs' ? 'Vytvoření VPS' : 'Create VPS';
    await page.goto('/app/transactions/items');
    await expect(page.getByRole('link', { name: label, exact: true }).first()).toBeVisible();
    await page.goto('/app/transactions/123');
    await expect(page.getByTestId('transactions.chain.detail.tx.702')).toContainText(label);
    await page.getByTestId('tasks.open-button').click();
    await page.getByTestId('tasks.chain.toggle.123').click();
    await expect(page.getByTestId('tasks.chain.tx.card.702')).toContainText(label);
    await page.goto('/app/transactions/items/702');
    const header = page.getByTestId('transactions.items.detail.header');
    await expect(header.getByRole('heading', { name: label, exact: true })).toBeVisible();
    expect(seen).toContain(language);
    if (process.env['E2E_CAPTURE_SCREENSHOTS'] === '1') {
      await page.screenshot({ path: `docs/work-log/assets/transaction-api-labels-20261006/${testInfo.project.name}-${language}.png`, fullPage: true });
    }
    const other = language === 'cs' ? 'en' : 'cs';
    await page.getByTestId('shell.user-menu-button').click();
    await page.getByTestId(`shell.user-menu.language.${other}`).click();
    await expect(header.getByRole('heading', { name: other === 'cs' ? 'Vytvoření VPS' : 'Create VPS', exact: true })).toBeVisible();
    expect(seen).toContain(other);
  });
}
