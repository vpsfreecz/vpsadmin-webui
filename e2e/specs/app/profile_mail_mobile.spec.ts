import { expect, test } from '@playwright/test';

import { setupHaveApiMock, setUiSettingsLocalStorage } from '../../fixtures';

test('@pr-smoke @pr-smoke-mobile profile mail recipient editors stay usable without horizontal scrolling', async ({
  page,
}, testInfo) => {
  if (testInfo.project.name === 'mobile-chrome') {
    await page.setViewportSize({ width: 320, height: 800 });
  }

  const longRecipient = `${'a'.repeat(72)}@example.test`;
  const roleRecipients = [
    {
      id: 'account',
      label: 'Account messages',
      description: 'Messages related to the account.',
      to: longRecipient,
    },
  ];
  const templateRecipients = [
    {
      id: 'vps_created',
      label: 'VPS created',
      description: 'Sent after a VPS has been created.',
      roles: 'account',
      to: '',
      enabled: true,
    },
  ];
  const roleUpdates: unknown[] = [];
  const templateUpdates: unknown[] = [];

  await setupHaveApiMock(page, {
    user: { id: 1, login: 'member', level: 1 },
    handlers: {
      'GET users/1': () => ({
        user: {
          id: 1,
          login: 'member',
          level: 1,
          email: 'member@example.test',
          mailer_enabled: true,
          preferred_language: { id: 1, label: 'English' },
        },
      }),
      'GET languages': () => ({ languages: [{ id: 1, label: 'English' }] }),
      'GET users/1/mail_role_recipients': () => ({ mail_role_recipients: roleRecipients }),
      'GET users/1/mail_template_recipients': () => ({ mail_template_recipients: templateRecipients }),
      'PUT users/1/mail_role_recipients/account': ({ reqJson }) => {
        roleUpdates.push(reqJson);
        return {
          mail_role_recipient: {
            ...roleRecipients[0],
            to: 'billing@example.test',
          },
        };
      },
      'PUT users/1/mail_template_recipients/vps_created': ({ reqJson }) => {
        templateUpdates.push(reqJson);
        return {
          mail_template_recipient: {
            ...templateRecipients[0],
            to: 'alerts@example.test',
          },
        };
      },
    },
  });

  await page.goto('/app/profile/mail');
  await expect(page.getByTestId('mail.templates.to.vps_created')).toBeVisible();

  const roleScroller = page.getByTestId('mail.roles').locator(':scope > .overflow-x-auto');
  const roleScrollMetrics = await roleScroller.evaluate((element) => ({
    clientWidth: element.clientWidth,
    scrollLeft: element.scrollLeft,
    scrollWidth: element.scrollWidth,
  }));
  expect(roleScrollMetrics.scrollLeft).toBe(0);
  expect(roleScrollMetrics.scrollWidth).toBeLessThanOrEqual(roleScrollMetrics.clientWidth + 1);

  const templateScroller = page.getByTestId('mail.templates').locator(':scope > .overflow-x-auto');
  const scrollMetrics = await templateScroller.evaluate((element) => ({
    clientWidth: element.clientWidth,
    scrollLeft: element.scrollLeft,
    scrollWidth: element.scrollWidth,
  }));
  expect(scrollMetrics.scrollLeft).toBe(0);
  expect(scrollMetrics.scrollWidth).toBeLessThanOrEqual(scrollMetrics.clientWidth + 1);

  const viewport = page.viewportSize();
  expect(viewport).not.toBeNull();
  for (const control of [
    page.getByTestId('mail.roles.to.account'),
    page.getByTestId('mail.roles.save.account'),
    page.getByTestId('mail.templates.to.vps_created'),
    page.getByTestId('mail.templates.save.vps_created'),
  ]) {
    const box = await control.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(viewport!.width);
  }

  await page.getByTestId('mail.roles.to.account').fill('billing@example.test');
  await page.getByTestId('mail.roles.save.account').click();
  await expect.poll(() => roleUpdates.length).toBe(1);
  expect(roleUpdates[0]).toEqual({ mail_role_recipient: { to: 'billing@example.test' } });

  await page.getByTestId('mail.templates.to.vps_created').fill('alerts@example.test');
  await page.getByTestId('mail.templates.save.vps_created').click();
  await expect.poll(() => templateUpdates.length).toBe(1);
  expect(templateUpdates[0]).toEqual({
    mail_template_recipient: {
      enabled: true,
      to: 'alerts@example.test',
    },
  });
});

for (const language of ['en', 'cs'] as const) {
  test(`@content-account-mail-wrapper selected-user Mail and personal Mail keep separate owners ${language}`, async ({
    page,
  }, info) => {
    const operator = { id: 1, login: 'operator', level: 100, email: 'operator@example.test', language: { id: 1 } };
    const target = { id: 42, login: 'alice', level: 1, email: 'alice@example.test', language: { id: 1 } };
    const recipientReads: string[] = [];
    const roles = [
      { id: 'primary', label: 'Primary contact', to: '' },
      { id: 'account', label: 'Account messages', to: 'billing@example.test' },
    ];
    const templates = [
      { id: 'unknown_template', label: 'No template override', to: '', enabled: true },
      { id: 'explicit_template', label: 'Explicit routing', to: 'alerts@example.test', enabled: true },
      { id: 'disabled_template', label: 'Disabled routing', to: 'disabled@example.test', enabled: false },
    ];

    await setUiSettingsLocalStorage(page, { language, theme: 'dark' });
    await setupHaveApiMock(page, {
      user: operator,
      handlers: {
        'GET users/42': () => ({ user: target }),
        'GET users/1': () => ({ user: operator }),
        'GET languages': () => ({ languages: [{ id: 1, code: 'en', label: 'English' }] }),
        'GET vpses': () => ({ vpses: [], _meta: { total_count: 0 } }),
        'GET users/42/mail_role_recipients': () => {
          recipientReads.push('roles:42');
          return { mail_role_recipients: roles };
        },
        'GET users/42/mail_template_recipients': () => {
          recipientReads.push('templates:42');
          return { mail_template_recipients: templates };
        },
        'GET users/1/mail_role_recipients': () => {
          recipientReads.push('roles:1');
          return { mail_role_recipients: [{ id: 'operator', label: 'Operator contact', to: '' }] };
        },
        'GET users/1/mail_template_recipients': () => {
          recipientReads.push('templates:1');
          return {
            mail_template_recipients: [{ id: 'operator_template', label: 'Operator template', to: '', enabled: true }],
          };
        },
      },
    });

    await page.goto('/admin/users/42/mail');
    await expect(page.getByTestId('admin.user.header')).toContainText('alice');
    await expect(page.getByTestId('mail.roles.to.account')).toHaveValue('billing@example.test');
    await expect(page.getByTestId('mail.settings.save')).toBeDisabled();
    const primaryRow = page.locator('tr').filter({ has: page.getByTestId('mail.roles.to.primary') });
    await expect(primaryRow).toContainText('alice@example.test');
    const unknownRow = page.locator('tr').filter({ has: page.getByTestId('mail.templates.to.unknown_template') });
    await expect(unknownRow).not.toContainText('alice@example.test');
    await expect(page.getByTestId('mail.templates.copy.unknown_template')).toHaveCount(0);
    await expect(page.getByTestId('mail.templates.copy.explicit_template')).toBeVisible();
    await expect(page.getByTestId('mail.templates.to.disabled_template')).toBeDisabled();
    expect([...recipientReads].sort()).toEqual(['roles:42', 'templates:42']);
    await page.screenshot({ path: info.outputPath(`selected-user-mail-${language}.png`), fullPage: true });

    await page.goto('/admin/profile/mail?user=42');
    await expect(page.getByTestId('mail.roles.to.operator')).toBeVisible();
    const personalRow = page.locator('tr').filter({ has: page.getByTestId('mail.roles.to.operator') });
    await expect(personalRow).toContainText('operator@example.test');
    await expect(page.getByTestId('mail.roles.to.account')).toHaveCount(0);
    await expect(page.getByTestId('mail.templates.to.operator_template')).toBeVisible();
    expect(recipientReads.slice(-2).sort()).toEqual(['roles:1', 'templates:1']);
    await page.screenshot({ path: info.outputPath(`personal-admin-mail-${language}.png`), fullPage: true });
  });
}
