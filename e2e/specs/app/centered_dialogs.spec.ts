import { expect, test } from '@playwright/test';

import { bootstrapVpsAdminWindow, installHaveApiMock, type HaveApiHandler } from '../../fixtures';
import { expectCenteredDialog } from '../../helpers/horizontalOverflow';

const filterRoutes = [
  '/admin/vps',
  '/admin/users',
  '/admin/nodes',
  '/admin/migration-plans',
  '/admin/ip-addresses',
  '/admin/datasets',
  '/admin/dns',
  '/admin/incidents',
  '/admin/oom-reports',
  '/admin/transactions',
  '/admin/transactions/items',
  '/admin/action-states',
  '/admin/monitoring',
  '/admin/requests',
  '/admin/audit',
  '/admin/cluster/environments',
  '/admin/cluster/locations',
  '/admin/cluster/networks',
  '/admin/cluster/os-templates',
  '/admin/cluster/resource-packages',
  '/admin/cluster/system-config',
  '/admin/mailer/templates',
  '/admin/mailer/mailboxes',
  '/admin/mailer/recipients',
  '/admin/user-namespaces/namespaces',
  '/admin/user-namespaces/maps',
];

for (const route of filterRoutes) {
  test(`centered advanced filters: ${route}`, async ({ page, hasTouch }) => {
    await bootstrapVpsAdminWindow(page);
    const handlers: Record<string, HaveApiHandler> = {};
    if (route === '/admin/cluster/environments' || route === '/admin/cluster/locations') {
      handlers['GET environments'] = () => ({ environments: [] });
    }
    if (route === '/admin/cluster/locations' || route === '/admin/cluster/networks') {
      handlers['GET locations'] = () => ({ locations: [] });
    }
    if (route === '/admin/cluster/networks') handlers['GET networks'] = () => ({ networks: [] });
    if (route === '/admin/cluster/system-config') handlers['GET system_configs'] = () => ({ system_configs: [] });
    await installHaveApiMock(page, {
      user: { id: 1, login: 'layout-test', level: 100 },
      handlers,
      fallbackResponse: [],
    });
    await page.goto(route);
    const open = page.getByRole('button', { name: /^Advanced(?: filters)?$/i });
    if (hasTouch) await open.tap();
    else await open.click();
    const dialog = page.getByRole('dialog');
    await expectCenteredDialog(page, dialog);
    const close = dialog.getByRole('button', { name: 'Close', exact: true }).first();
    if (hasTouch) await close.tap();
    else await close.click();
    await expect(dialog).toBeHidden();
  });
}

test('centered supported template editor: /admin/profile/user-data', async ({ page, hasTouch }) => {
  await bootstrapVpsAdminWindow(page);
  await installHaveApiMock(page, {
    user: { id: 1, login: 'layout-test', level: 100 },
    handlers: { 'GET vps_user_data': () => ({ vps_user_data: [] }) },
    fallbackResponse: [],
  });
  await page.goto('/admin/profile/user-data');
  const format = page.getByTestId('profile.user_data.filters.format');
  await expect(format).toBeVisible();
  await expect(page.getByTestId('profile.user_data.filters.advanced')).toHaveCount(0);
  await expect(page.getByTestId('profile.user_data.filters.search')).toHaveCount(0);
  await format.selectOption('script');
  await expect.poll(() => new URL(page.url()).searchParams.get('format')).toBe('script');
  const clear = page.getByTestId('profile.user_data.filters.clear');
  if (hasTouch) await clear.tap();
  else await clear.click();
  await expect(format).toHaveValue('');
  const open = page.getByTestId('profile.user_data.create');
  if (hasTouch) await open.tap();
  else await open.click();
  const dialog = page.getByTestId('profile.user_data.editor.drawer');
  await expectCenteredDialog(page, dialog);
  const close = dialog.getByTestId('drawer.close');
  if (hasTouch) await close.tap();
  else await close.click();
  await expect(dialog).toBeHidden();
});
