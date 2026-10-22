import { expect, test } from '@playwright/test';
import { bootstrapVpsAdminWindow, installHaveApiMock, setUiSettingsLocalStorage } from '../../fixtures';
import { expectNoDocumentHorizontalOverflow } from '../../helpers/horizontalOverflow';

const member = { id: 42, login: 'alice-demo', level: 2, full_name: 'Demo Organization', email: 'primary@example.test', address: 'Demo street 42' };
const longAddress = 'operations-team-' + 'long'.repeat(20) + '@example.test';

for (const language of ['cs', 'en'] as const) {
  test(`@pr-smoke @pr-smoke-mobile member contacts: customized recipients stand out beneath the address (${language})`, async ({ page }, testInfo) => {
    await bootstrapVpsAdminWindow(page);
    await setUiSettingsLocalStorage(page, { language, theme: 'dark' });
    await installHaveApiMock(page, { user: { id: 1, login: 'admin', level: 99 }, handlers: {
      'GET users/42': () => ({ user: member }),
      'GET users/42/mail_role_recipients': () => ({ mail_role_recipients: [
        { id: 'account', label: 'Arbitrary translated label', to: 'billing@example.test, finance@example.test' },
        { id: 'admin', label: 'Different translated label', to: longAddress },
      ] }),
    } });
    const writes: string[] = [];
    page.on('request', (req) => {
      const path = new URL(req.url()).pathname;
      if (path.startsWith('/api/') && !['GET', 'HEAD', 'OPTIONS'].includes(req.method()) && !path.includes('/webui_user_settings/')) writes.push(req.method() + ' ' + path);
    });
    await page.goto('/admin/users/42');
    const summary = page.getByTestId('admin.user.contacts');
    const account = page.getByTestId('admin.user.contacts.account');
    const admin = page.getByTestId('admin.user.contacts.admin');
    await expect(account).toHaveAttribute('data-customized', 'true');
    await expect(admin).toHaveAttribute('data-customized', 'true');
    await expect(account).toContainText('billing@example.test');
    await expect(account).toContainText('finance@example.test');
    await expect(admin).toContainText(longAddress);
    await expect(account).toContainText(language === 'cs' ? 'Vlastní kontakt' : 'Custom contact');
    await expect(summary).not.toContainText(member.email);
    const addressBox = await page.getByText(member.address, { exact: true }).boundingBox();
    const summaryBox = await summary.boundingBox();
    expect(summaryBox!.y).toBeGreaterThan(addressBox!.y);
    await expectNoDocumentHorizontalOverflow(page);
    await expect(page.getByTestId('admin.user.contacts.edit')).toHaveAttribute('href', '/admin/users/42/mail');
    expect(writes).toEqual([]);
    if (process.env['E2E_CAPTURE_CONTACT_SCREENSHOTS'] === '1') {
      if (testInfo.project.name === 'chromium') {
        await page.getByTestId('admin.user.details.card').screenshot({ path: `/tmp/webui-member-contacts-${language}-${testInfo.project.name}.png` });
      } else {
        await page.screenshot({ path: `/tmp/webui-member-contacts-${language}-${testInfo.project.name}.png`, fullPage: true });
      }
    }
  });
}

test('@pr-smoke @pr-smoke-mobile member contacts: distinguish primary fallback, overrides and disabled mail', async ({ page }) => {
  await bootstrapVpsAdminWindow(page);
  await installHaveApiMock(page, { user: { id: 1, login: 'admin', level: 99 }, handlers: {
    'GET users/42': () => ({ user: { ...member, address: null, mailer_enabled: false } }),
    'GET users/42/mail_role_recipients': () => ({ mail_role_recipients: [
      { id: 'account', to: '   ' }, { id: 'admin', to: 'admin@example.test' },
    ] }),
  } });
  await page.goto('/admin/users/42');
  const account = page.getByTestId('admin.user.contacts.account');
  await expect(account).toHaveAttribute('data-customized', 'false');
  await expect(account).toContainText(member.email);
  await expect(account).toContainText('Primary email');
  await expect(page.getByTestId('admin.user.contacts.admin')).toHaveAttribute('data-customized', 'true');
  await expect(page.getByTestId('admin.user.contacts.admin')).toContainText('admin@example.test');
  await expect(page.getByTestId('admin.user.contacts.mail_disabled')).toBeVisible();
});

test('member contacts: absent roles and primary email explicitly show missing contacts', async ({ page }) => {
  await bootstrapVpsAdminWindow(page);
  await installHaveApiMock(page, { user: { id: 1, login: 'admin', level: 99 }, handlers: {
    'GET users/42': () => ({ user: { ...member, email: null } }),
    'GET users/42/mail_role_recipients': () => ({ mail_role_recipients: [] }),
  } });
  await page.goto('/admin/users/42');
  await expect(page.getByTestId('admin.user.contacts.account')).toContainText('No contact');
  await expect(page.getByTestId('admin.user.contacts.admin')).toContainText('No contact');
});

test('@pr-smoke @pr-smoke-mobile member contacts: read failure is not presented as a primary-email fallback', async ({ page }) => {
  await bootstrapVpsAdminWindow(page);
  let attempts = 0;
  await installHaveApiMock(page, { user: { id: 1, login: 'admin', level: 99 }, handlers: {
    'GET users/42': () => ({ user: member }),
    'GET users/42/mail_role_recipients': () => {
      attempts++;
      if (attempts === 1) return { status: false, message: 'Fixture contact lookup failed' };
      return { mail_role_recipients: [{ id: 'account', to: 'billing@example.test' }] };
    },
  } });
  await page.goto('/admin/users/42');
  await expect(page.getByTestId('admin.user.contacts.error')).toBeVisible();
  await expect(page.getByTestId('admin.user.contacts.account')).toHaveCount(0);
  await page.getByTestId('admin.user.contacts.error').getByRole('button').click();
  await expect(page.getByTestId('admin.user.contacts.account')).toContainText('billing@example.test');
  await expect(page.getByTestId('admin.user.contacts.admin')).toContainText(member.email);
  expect(attempts).toBe(2);
});

for (const [level, path] of [[21, '/admin/users/42'], [2, '/app/profile'], [99, '/app/profile']] as const) {
  test(`member contacts: no privileged summary for level ${level} at ${path}`, async ({ page }) => {
    await bootstrapVpsAdminWindow(page);
    let reads = 0;
    await installHaveApiMock(page, { user: { id: 1, login: 'viewer', level }, handlers: {
      'GET users/42': () => ({ user: member }),
      'GET users/42/mail_role_recipients': () => { reads++; return { mail_role_recipients: [] }; },
    } });
    await page.goto(path);
    await expect(page.getByTestId('shell.user-menu-button')).toBeVisible();
    await expect(page.getByTestId('admin.user.contacts')).toHaveCount(0);
    if (level === 21) await expect(page.getByText(member.address, { exact: true })).toBeVisible();
    expect(reads).toBe(0);
  });
}

test('member contacts: changing the selected member never shows the previous contacts', async ({ page }) => {
  await bootstrapVpsAdminWindow(page);
  let release: (() => void) | undefined;
  await installHaveApiMock(page, { user: { id: 1, login: 'admin', level: 99 }, handlers: {
    'GET users/42': () => ({ user: member }),
    'GET users/43': () => ({ user: { ...member, id: 43, login: 'bob-demo', email: 'bob-primary@example.test' } }),
    'GET users/42/mail_role_recipients': () => ({ mail_role_recipients: [{ id: 'account', to: 'alice-billing@example.test' }] }),
    'GET users/43/mail_role_recipients': async () => {
      await new Promise<void>((resolve) => { release = resolve; });
      return { mail_role_recipients: [{ id: 'admin', to: 'bob-admin@example.test' }] };
    },
  } });
  await page.goto('/admin/users/42');
  await expect(page.getByTestId('admin.user.contacts.account')).toContainText('alice-billing@example.test');
  await page.evaluate(() => { history.pushState({}, '', '/admin/users/43'); window.dispatchEvent(new PopStateEvent('popstate')); });
  await expect(page.getByTestId('admin.user.header')).toContainText('bob-demo');
  await expect(page.getByTestId('admin.user.contacts').getByRole('status')).toBeVisible();
  await expect(page.getByTestId('admin.user.contacts')).not.toContainText('alice-billing@example.test');
  release?.();
  await expect(page.getByTestId('admin.user.contacts.admin')).toContainText('bob-admin@example.test');
  await expect(page.getByTestId('admin.user.contacts.account')).toContainText('bob-primary@example.test');
});
