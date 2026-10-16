import { expect, test } from '@playwright/test';

import { bootstrapVpsAdminWindow, installHaveApiMock } from '../../fixtures';
import { expectCenteredDialog } from '../../helpers/horizontalOverflow';

const filterRoutes = [
  '/admin/vps', '/admin/users', '/admin/nodes', '/admin/migration-plans',
  '/admin/ip-addresses', '/admin/datasets', '/admin/dns', '/admin/incidents', '/admin/oom-reports',
  '/admin/transactions', '/admin/transactions/items', '/admin/action-states',
  '/admin/monitoring', '/admin/requests', '/admin/audit',
  '/admin/cluster/environments', '/admin/cluster/locations',
  '/admin/cluster/networks', '/admin/cluster/os-templates',
  '/admin/cluster/resource-packages', '/admin/cluster/system-config',
  '/admin/mailer/templates', '/admin/mailer/mailboxes', '/admin/mailer/recipients',
  '/admin/profile/user-data', '/admin/user-namespaces/namespaces',
  '/admin/user-namespaces/maps',
];

for (const route of filterRoutes) {
  test(`centered advanced filters: ${route}`, async ({ page, hasTouch }) => {
    await bootstrapVpsAdminWindow(page);
    await installHaveApiMock(page, { user: { id: 1, login: 'layout-test', level: 100 }, fallbackResponse: [] });
    await page.goto(route);
    const open = page.getByRole('button', { name: /^Advanced(?: filters)?$/i });
    if (hasTouch) await open.tap(); else await open.click();
    const dialog = page.getByRole('dialog');
    await expectCenteredDialog(page, dialog);
    const close = dialog.getByRole('button', { name: 'Close', exact: true }).first();
    if (hasTouch) await close.tap(); else await close.click();
    await expect(dialog).toBeHidden();
  });
}
