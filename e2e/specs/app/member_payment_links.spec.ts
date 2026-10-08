import { expect, test } from '@playwright/test';
import { bootstrapVpsAdminWindow, installHaveApiMock, setUiSettingsLocalStorage } from '../../fixtures';

for (const language of ['cs', 'en'] as const) {
  test(`@pr-smoke @pr-smoke-mobile ${language} member overview links to the actual incoming payment`, async ({
    page,
    isMobile,
  }, testInfo) => {
    await bootstrapVpsAdminWindow(page, { webuiNext: { uiSettings: { persistence: 'local' } } });
    await setUiSettingsLocalStorage(page, { language, theme: 'dark' });
    const mutations: string[] = [];
    page.on('request', (request) => {
      if (new URL(request.url()).pathname.startsWith('/api/') && !['GET', 'HEAD', 'OPTIONS'].includes(request.method()))
        mutations.push(request.method());
    });
    await installHaveApiMock(page, {
      user: { id: 1, login: 'admin', level: 100 },
      handlers: {
        'GET users/42': () => ({
          user: {
            id: 42,
            login: 'test-member',
            level: 1,
            object_state: 'active',
            monthly_payment: 300,
            paid_until: '2099-01-01T00:00:00Z',
          },
        }),
        'GET user_payments': () => ({
          user_payments: [
            {
              id: 9001,
              amount: 900,
              created_at: '2026-10-01T10:00:00Z',
              from_date: '2026-10-01',
              to_date: '2027-01-01',
              incoming_payment: { id: 300 },
            },
            {
              id: 9002,
              amount: 300,
              created_at: '2026-09-01T10:00:00Z',
              from_date: '2026-09-01',
              to_date: '2026-10-01',
              incoming_payment: null,
            },
          ],
        }),
        'GET incoming_payments/300': () => ({
          incoming_payment: {
            id: 300,
            state: 'processed',
            amount: 900,
            currency: 'CZK',
            account_name: 'Synthetic payer',
            transaction_id: 'TEST-300',
            date: '2026-10-01T10:00:00Z',
            created_at: '2026-10-01T10:00:00Z',
            user: { id: 42, login: 'test-member' },
          },
        }),
      },
    });
    await page.goto('/admin/users/42');
    const card = page.getByTestId('admin.user.payments.overview.card');
    const link = card.getByRole('link', { name: '#300', exact: true });
    await expect(link).toHaveAttribute('href', '/admin/payments/incoming/300');
    await expect(page.getByTestId('admin.user.overview.payments.row.9002.accepted_at').getByRole('link')).toHaveCount(
      0
    );
    if (isMobile) {
      expect((await link.boundingBox())?.height).toBeGreaterThanOrEqual(44);
    }
    if (language === 'cs') {
      await card.evaluate((element) => element.scrollIntoView({ block: 'start' }));
      await page.evaluate(() => window.scrollBy(0, -100));
      await card.screenshot({ path: testInfo.outputPath('member-payments.png'), scale: 'css' });
    }
    if (isMobile) await link.tap();
    else {
      await link.focus();
      await page.keyboard.press('Enter');
    }
    await expect(page).toHaveURL(/\/admin\/payments\/incoming\/300$/);
    await expect(page.getByTestId('admin.payments.incoming.detail.event_date')).toBeVisible();
    await expect(page.getByText('TEST-300', { exact: true })).toBeVisible();
    await page.goBack();
    await expect(page).toHaveURL(/\/admin\/users\/42$/);
    await expect(link).toBeVisible();
    expect(mutations).toEqual([]);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)
    ).toBe(true);
  });
}
