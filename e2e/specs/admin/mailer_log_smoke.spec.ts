import { expect, test, type Page } from '@playwright/test';

import { bootstrapVpsAdminWindow, installHaveApiMock, setUiSettingsLocalStorage } from '../../fixtures';

function visibleMailLogEntry(page: Page, id: number) {
  const mobile = (page.viewportSize()?.width ?? 1280) < 768;
  return page.getByTestId(mobile ? `admin.mailer.log.card.${id}` : `admin.mailer.log.row.${id}`);
}

async function openMailLogEntry(page: Page, id: number) {
  const entry = visibleMailLogEntry(page, id);
  if ((page.viewportSize()?.width ?? 1280) < 768) {
    await entry.locator(`a[href$="/mailer/log/${id}"]`).click();
    return;
  }
  await entry.click();
}

test.describe('@smoke @pr-smoke @pr-smoke-mobile Admin mailer log contract', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    await setUiSettingsLocalStorage(page, {
      language: testInfo.project.name === 'mobile-chrome' ? 'cs' : 'en',
      theme: testInfo.project.name === 'mobile-chrome' ? 'dark' : 'light',
    });
    await bootstrapVpsAdminWindow(page, {
      sessionToken: 'TEST',
    });

    const makeMail = (id: number) => ({
      id,
      user: { id: 1, login: 'test' },
      to: 'user@example.test',
      from: 'noreply@example.test',
      cc: 'team@example.test',
      bcc: 'audit@example.test',
      reply_to: 'reply@example.test',
      return_path: 'bounce@example.test',
      in_reply_to: '<previous@example.test>',
      references: '<root@example.test> <previous@example.test>',
      subject: `Mail #${id}`,
      message_id: `<m${id}@example.test>`,
      mail_template: { id: 10, label: 'Welcome mail' },
      mail_transaction: { id: 123 },
      text_plain: `Hello from mail ${id}`,
      text_html: id === 101
        ? `<!doctype html><html><head><style>strong{font-weight:700}</style></head><body><p>Hello <strong>from</strong> mail ${id}</p><img src="https://preview-tracker.invalid/pixel" alt="remote image"></body></html>`
        : `<p>Hello <strong>from</strong> mail ${id}</p>`,
      created_at: '2025-01-01T12:00:00Z',
    });

    const all = Array.from({ length: 30 }, (_, index) => makeMail(100 + index));

    await installHaveApiMock(page, {
      user: { id: 1, login: 'admin', level: 90 },
      handlers: {
        'GET mail_logs': ({ searchParams }) => {
          const fromId = Number(searchParams.get('mail_log[from_id]') ?? 0);
          const limit = Number(searchParams.get('mail_log[limit]') ?? 25);
          const data = all.filter((mail) => mail.id > fromId).slice(0, limit);

          return { mail_logs: data, _meta: { total_count: data.length } };
        },
        'GET mail_logs/101': () => ({ mail_log: makeMail(101) }),
        'GET mail_logs/100': () => ({ mail_log: makeMail(100) }),
      },
    });
  });

  test('lists mails and opens detail', async ({ page }, testInfo) => {
    let remotePreviewLoads = 0;
    await page.route('https://preview-tracker.invalid/**', async (route) => {
      remotePreviewLoads += 1;
      await route.fulfill({ status: 204, body: '' });
    });

    const listRequestPromise = page.waitForRequest((request) => {
      if (request.method() !== 'GET') return false;
      return new URL(request.url()).pathname.endsWith('/mail_logs');
    });
    await page.goto('/admin/mailer/log?limit=100');
    const listUrl = new URL((await listRequestPromise).url());

    // HaveAPI permits up to 1,000 rows, so the largest visible page can safely
    // request one additional row to determine whether Next should be enabled.
    expect(Array.from(listUrl.searchParams.entries())).toEqual([['mail_log[limit]', '101']]);

    await expect(page.getByTestId('admin.mailer.log.page')).toBeVisible();
    await expect(visibleMailLogEntry(page, 101)).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath('mailer-log-list.png') });

    await openMailLogEntry(page, 101);

    await expect(page).toHaveURL(/\/admin\/mailer\/log\/101/);
    await expect(page.getByTestId('admin.mailer.log.detail')).toBeVisible();
    await expect(page.getByTestId('admin.mailer.log.detail.header')).toContainText('Mail #101');

    // Plain body is default.
    await expect(page.getByTestId('admin.mailer.log.detail.body')).toContainText('Hello from mail 101');
    await page.screenshot({ path: testInfo.outputPath('mailer-message-plain.png'), fullPage: true });

    // HTML preview + raw toggle.
    await page.getByTestId('admin.mailer.log.detail.tab.html').click();
    const htmlPreview = page.getByTestId('admin.mailer.log.detail.body.html');
    await expect(htmlPreview).toBeVisible();
    await expect(htmlPreview.contentFrame().getByText('Hello from mail 101')).toBeVisible();
    expect(remotePreviewLoads).toBe(0);
    await page.screenshot({ path: testInfo.outputPath('mailer-message-html.png'), fullPage: true });

    await page.getByTestId('admin.mailer.log.detail.body.raw_toggle').click();
    await expect(page.getByTestId('admin.mailer.log.detail.body')).toContainText('<p>Hello');
    await page.screenshot({ path: testInfo.outputPath('mailer-message-raw.png'), fullPage: true });

    const recipients = page.getByTestId('admin.mailer.log.detail.recipients');
    await expect(recipients).toContainText(
      testInfo.project.name === 'mobile-chrome' ? 'Odesílatel a příjemci' : 'Sender and recipients'
    );
    for (const address of ['noreply@example.test', 'user@example.test', 'team@example.test', 'audit@example.test']) {
      await expect(recipients).toContainText(address);
    }
    for (const field of ['to', 'cc', 'bcc']) {
      await expect(page.getByTestId(`admin.mailer.log.detail.copy.${field}`)).toBeVisible();
    }

    const headers = page.getByTestId('admin.mailer.log.detail.headers');
    await expect(headers.locator('details')).not.toHaveAttribute('open');
    await expect(page.getByTestId('admin.mailer.log.detail.copy.message_id')).toBeHidden();
    await headers.locator('summary').click();
    await expect(headers.locator('details')).toHaveAttribute('open', '');
    for (const value of [
      '<m101@example.test>',
      'reply@example.test',
      'bounce@example.test',
      '<previous@example.test>',
      '<root@example.test>',
    ]) {
      await expect(headers).toContainText(value);
    }
    await expect(page.getByTestId('admin.mailer.log.detail.copy.message_id')).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath('mailer-message-headers.png'), fullPage: true });
  });

  test('normalizes unsupported filters before the first request and keeps exact ID navigation', async ({ page }) => {
    const mailLogRequests: URL[] = [];
    const helperRequests: URL[] = [];
    page.on('request', (req) => {
      if (req.method() !== 'GET') return;
      const url = new URL(req.url());
      if (url.pathname.endsWith('/mail_logs')) mailLogRequests.push(url);
      if (url.pathname.endsWith('/mail_templates') || url.pathname.endsWith('/users')) helperRequests.push(url);
    });

    await page.goto(
      '/admin/mailer/log?q=invoice&user=1&template=20&after=2025-01-01&before=2025-01-31&limit=25&from_id=100&page=2'
    );

    await expect(page).toHaveURL((url) => (
      url.pathname === '/admin/mailer/log'
      && url.searchParams.get('limit') === '25'
      && url.searchParams.get('page') === '1'
      && !url.searchParams.has('q')
      && !url.searchParams.has('user')
      && !url.searchParams.has('template')
      && !url.searchParams.has('after')
      && !url.searchParams.has('before')
      && !url.searchParams.has('from_id')
    ));
    await expect(visibleMailLogEntry(page, 101)).toBeVisible();
    await expect.poll(() => mailLogRequests.length).toBe(1);
    expect(Array.from(mailLogRequests[0]?.searchParams.entries() ?? [])).toEqual([
      ['mail_log[limit]', '26'],
    ]);
    expect(helperRequests).toEqual([]);

    await expect(page.getByTestId('admin.mailer.log.advanced.open')).toHaveCount(0);
    await expect(page.getByTestId('admin.mailer.log.advanced.q')).toHaveCount(0);
    await expect(page.getByTestId('admin.mailer.log.advanced.user')).toHaveCount(0);
    await expect(page.getByTestId('admin.mailer.log.advanced.template')).toHaveCount(0);
    await expect(page.getByTestId('admin.mailer.log.advanced.after')).toHaveCount(0);
    await expect(page.getByTestId('admin.mailer.log.advanced.before')).toHaveCount(0);

    const smartInput = page.getByTestId('admin.mailer.log.smart_filter.input');
    await smartInput.fill('?');
    await expect(page.getByTestId('admin.mailer.log.smart_help')).toBeVisible();
    await expect(page.getByTestId('admin.mailer.log.smart_help.key.id')).toBeVisible();
    await expect(page.getByTestId('admin.mailer.log.smart_help.key.q')).toHaveCount(0);
    await expect(page.getByTestId('admin.mailer.log.smart_help.key.user')).toHaveCount(0);
    await expect(page.getByTestId('admin.mailer.log.smart_help.key.template')).toHaveCount(0);
    await page.keyboard.press('Escape');

    await smartInput.fill('id:101');
    await smartInput.press('Enter');
    await expect(page).toHaveURL(/\/admin\/mailer\/log\/101$/);
    await expect(page.getByTestId('admin.mailer.log.detail')).toBeVisible();

    await page.goBack();
    await expect(page.getByTestId('admin.mailer.log.page')).toBeVisible();
    await page.getByTestId('admin.mailer.log.smart_filter.input').fill('100');
    await page.getByTestId('admin.mailer.log.smart_filter.input').press('Enter');
    await expect(page).toHaveURL(/\/admin\/mailer\/log\/100$/);
    await expect(page.getByTestId('admin.mailer.log.detail')).toBeVisible();
  });

  test('uses ascending keyset cursor, one-row lookahead and disables Next on the final page', async ({ page }, testInfo) => {
    const mailLogRequests: URL[] = [];
    page.on('request', (req) => {
      if (req.method() !== 'GET') return;
      const url = new URL(req.url());
      if (url.pathname.endsWith('/mail_logs')) mailLogRequests.push(url);
    });

    await page.goto('/admin/mailer/log?limit=25');

    await expect(visibleMailLogEntry(page, 100)).toBeVisible();
    await expect(visibleMailLogEntry(page, 124)).toBeVisible();
    await expect(visibleMailLogEntry(page, 125)).toHaveCount(0);

    const pagination = testInfo.project.name === 'mobile-chrome'
      ? 'admin.mailer.log.pagination.mobile'
      : 'admin.mailer.log.pagination.desktop';
    const next = page.getByTestId(`${pagination}.next`);
    await expect(next).toBeEnabled();
    await next.click();

    await expect(page).toHaveURL((url) => (
      url.pathname === '/admin/mailer/log'
      && url.searchParams.get('limit') === '25'
      && url.searchParams.get('page') === '2'
      && url.searchParams.get('from_id') === '124'
    ));
    await expect(visibleMailLogEntry(page, 125)).toBeVisible();
    await expect(visibleMailLogEntry(page, 124)).toHaveCount(0);
    await expect(next).toBeDisabled();

    await expect.poll(() => mailLogRequests.length).toBe(2);
    expect(Array.from(mailLogRequests[1]?.searchParams.entries() ?? []).sort()).toEqual([
      ['mail_log[from_id]', '124'],
      ['mail_log[limit]', '26'],
    ]);
  });
});
