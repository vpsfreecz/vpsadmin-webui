import { expect, test } from '@playwright/test';

import { bootstrapVpsAdminWindow, installHaveApiMock } from '../../fixtures';
import {
  expectNoDocumentHorizontalOverflow,
  expectTableHorizontalScrollUsable,
} from '../../helpers/horizontalOverflow';

test('@pr-smoke @pr-smoke-mobile admin ip address detail: shows header and links to user/vps', async ({ page }) => {
  await bootstrapVpsAdminWindow(page);

  await installHaveApiMock(page, {
    user: { id: 1, login: 'admin', level: 100 },
    handlers: {
      'GET ip_addresses/100': () => ({
        ip_address: {
          id: 100,
          addr: '203.0.113.10',
          prefix: 32,
          routed: true,
          created_at: '2026-02-01T00:00:00.000Z',
          network: { id: 3, address: '203.0.113.0', prefix: 24 },
          vps: { id: 5 },
          user: { id: 42 },
        },
      }),
      'GET host_ip_addresses': () => ({
        host_ip_addresses: [
          { id: 601, addr: '203.0.113.11', assigned: true, reverse_record_value: 'host.example.test.' },
          { id: 602, addr: '203.0.113.12', assigned: false, user_created: true },
        ],
      }),
    },
  });

  await page.goto('/admin/ip-addresses/100');

  await expect(page.getByTestId('admin.ip_address.page')).toBeVisible();
  await expect(page.getByTestId('admin.ip_address.header')).toBeVisible();

  await expect(page.getByTestId('admin.ip.action.vps')).toHaveAttribute('href', '/admin/vps/5');
  await expect(page.getByTestId('admin.ip.action.user')).toHaveAttribute('href', '/admin/users/42');

  await expect(page.getByTestId('admin.ip_address.refresh')).toBeVisible();
  await expect(page.getByTestId('admin.ip.hosts.row.601.ptr')).toHaveAttribute('aria-label', 'PTR');
  await expect(page.getByTestId('admin.ip.hosts.row.601.free')).toHaveAttribute('aria-label', 'Remove');
  await expect(page.getByTestId('admin.ip.hosts.row.602.assign')).toHaveAttribute('aria-label', 'Assign');
  await expect(page.getByTestId('admin.ip.hosts.row.602.delete')).toHaveAttribute('aria-label', 'Delete');
  await expect(page.getByTestId('admin.ip.hosts.row.602.ptr')).toHaveText('');

  await page.setViewportSize({ width: 390, height: 844 });
  await expectNoDocumentHorizontalOverflow(page);
  await expectTableHorizontalScrollUsable(page, 'admin.ip.hosts.table');

  const proofScreenshot = process.env['E2E_IP_DETAIL_ACTIONS_PROOF_SCREENSHOT']?.trim();
  if (proofScreenshot) await page.screenshot({ path: proofScreenshot, fullPage: true });
});

test('@pr-smoke @pr-smoke-mobile admin ip address destructive confirmations keep rejected actions retryable', async ({ page }) => {
  await bootstrapVpsAdminWindow(page);

  let freeRouteAttempts = 0;
  let deleteHostAttempts = 0;

  await installHaveApiMock(page, {
    user: { id: 1, login: 'admin', level: 100 },
    handlers: {
      'GET ip_addresses/100': () => ({
        ip_address: {
          id: 100,
          addr: '203.0.113.10',
          prefix: 32,
          routed: true,
          network_interface: { id: 501 },
          network: { id: 3, address: '203.0.113.0', prefix: 24 },
        },
      }),
      'GET host_ip_addresses': () => ({
        host_ip_addresses: [
          { id: 602, addr: '203.0.113.12', assigned: false, user_created: true },
        ],
      }),
      'POST ip_addresses/100/free': () => {
        freeRouteAttempts += 1;
        if (freeRouteAttempts === 1) {
          return {
            status: 409,
            contentType: 'application/json',
            body: JSON.stringify({ status: false, message: 'Route changed on the server', response: null }),
          };
        }
        return { ip_address: { id: 100 }, _meta: { action_state_id: 701 } };
      },
      'DELETE host_ip_addresses/602': () => {
        deleteHostAttempts += 1;
        if (deleteHostAttempts === 1) {
          return {
            status: 409,
            contentType: 'application/json',
            body: JSON.stringify({ status: false, message: 'Host address is still assigned', response: null }),
          };
        }
        return { _meta: { action_state_id: 702 } };
      },
    },
  });

  await page.goto('/admin/ip-addresses/100');

  await page.getByTestId('admin.ip.route.free').click();
  const freeRouteDialog = page.getByTestId('admin.ip.route.free_confirm');
  await freeRouteDialog.getByTestId('admin.ip.route.free_confirm.confirm').click();
  await expect(page.getByTestId('admin.ip.route.free_confirm.error')).toContainText('Route changed on the server');
  await expect(freeRouteDialog).toContainText('203.0.113.10/32');
  await freeRouteDialog.getByTestId('admin.ip.route.free_confirm.confirm').click();
  await expect(freeRouteDialog).toBeHidden();
  expect(freeRouteAttempts).toBe(2);

  await page.getByTestId('admin.ip.hosts.row.602.delete').click();
  const deleteHostDialog = page.getByTestId('admin.ip.hosts.delete_confirm');
  await deleteHostDialog.getByTestId('admin.ip.hosts.delete_confirm.confirm').click();
  await expect(page.getByTestId('admin.ip.hosts.delete_confirm.error')).toContainText('Host address is still assigned');
  await expect(deleteHostDialog).toContainText('203.0.113.12');
  await deleteHostDialog.getByTestId('admin.ip.hosts.delete_confirm.confirm').click();
  await expect(deleteHostDialog).toBeHidden();
  expect(deleteHostAttempts).toBe(2);
});

// Identifiers in a confirmation or editor must remain visible at 320px.

 test('@pr-smoke @pr-smoke-mobile IP-detail route keeps the complete IPv6 identifier inside its dialog', async ({ page }) => {
  const address = '2001:0db8:1234:5678:9abc:def0:1234:5678';
  const writes: string[] = [];
  await bootstrapVpsAdminWindow(page);
  await installHaveApiMock(page, { user: { id: 1, login: 'synthetic-admin', level: 99 }, handlers: {
   'GET ip_addresses/100': () => ({ ip_address: { id: 100, addr: address, prefix: 128, network: { id: 3, enabled: true }, network_interface: null } }),
   'GET host_ip_addresses': () => ({ host_ip_addresses: [{ id: 601, addr: address, assigned: false, user_created: true, reverse_record_value: 'synthetic.example.test.', ip_address: { id: 100, network_interface: { id: 6, name: 'eth0' } } }] }),
   'GET host_ip_addresses/601': () => ({ host_ip_address: { id: 601, addr: address, assigned: false, user_created: true, reverse_record_value: 'synthetic.example.test.', ip_address: { id: 100, network_interface: { id: 6, name: 'eth0' } } } }),
   'GET environments': () => ({ environments: [] }),
  } });
  await page.route('**/api/**', route => {
   if (!['GET', 'HEAD', 'OPTIONS'].includes(route.request().method())) { writes.push(route.request().method()); return route.abort(); }
   return route.fallback();
  });
  await page.goto('/admin/networking/ip-addresses/100');
  await page.setViewportSize({ width: 320, height: 750 });
  await page.getByTestId('admin.ip.route.assign.open').click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  const identity = dialog.getByText(address + '/128', { exact: true });
  await expect(identity).toBeVisible();
  const bounds = await identity.evaluate(element => {
   const range = document.createRange(); range.selectNodeContents(element);
   const box = element.getBoundingClientRect();
   return { width: element.clientWidth, scrollWidth: element.scrollWidth,
    fragments: [...range.getClientRects()].map(rect => ({ left: rect.left, right: rect.right })),
    left: box.left, right: box.right };
  });
  expect(bounds.scrollWidth).toBeLessThanOrEqual(bounds.width + 1);
  for (const fragment of bounds.fragments) {
   expect(fragment.left).toBeGreaterThanOrEqual(bounds.left - 1);
   expect(fragment.right).toBeLessThanOrEqual(bounds.right + 1);
  }
  await page.keyboard.press('Escape'); await expect(dialog).toBeHidden();
  expect(writes).toEqual([]);
 });

 test('@pr-smoke @pr-smoke-mobile IP-detail hostassign keeps the complete IPv6 identifier inside its dialog', async ({ page }) => {
  const address = '2001:0db8:1234:5678:9abc:def0:1234:5678';
  const writes: string[] = [];
  await bootstrapVpsAdminWindow(page);
  await installHaveApiMock(page, { user: { id: 1, login: 'synthetic-admin', level: 99 }, handlers: {
   'GET ip_addresses/100': () => ({ ip_address: { id: 100, addr: address, prefix: 128, network: { id: 3, enabled: true }, network_interface: { id: 6, name: 'eth0' } } }),
   'GET host_ip_addresses': () => ({ host_ip_addresses: [{ id: 601, addr: address, assigned: false, user_created: true, reverse_record_value: 'synthetic.example.test.', ip_address: { id: 100, network_interface: { id: 6, name: 'eth0' } } }] }),
   'GET host_ip_addresses/601': () => ({ host_ip_address: { id: 601, addr: address, assigned: false, user_created: true, reverse_record_value: 'synthetic.example.test.', ip_address: { id: 100, network_interface: { id: 6, name: 'eth0' } } } }),
   'GET environments': () => ({ environments: [] }),
  } });
  await page.route('**/api/**', route => {
   if (!['GET', 'HEAD', 'OPTIONS'].includes(route.request().method())) { writes.push(route.request().method()); return route.abort(); }
   return route.fallback();
  });
  await page.goto('/admin/networking/ip-addresses/100');
  await page.setViewportSize({ width: 320, height: 750 });
  await page.getByTestId('admin.ip.hosts.row.601.assign').click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  const identity = dialog.getByText(address, { exact: true });
  await expect(identity).toBeVisible();
  const bounds = await identity.evaluate(element => {
   const range = document.createRange(); range.selectNodeContents(element);
   const box = element.getBoundingClientRect();
   return { width: element.clientWidth, scrollWidth: element.scrollWidth,
    fragments: [...range.getClientRects()].map(rect => ({ left: rect.left, right: rect.right })),
    left: box.left, right: box.right };
  });
  expect(bounds.scrollWidth).toBeLessThanOrEqual(bounds.width + 1);
  for (const fragment of bounds.fragments) {
   expect(fragment.left).toBeGreaterThanOrEqual(bounds.left - 1);
   expect(fragment.right).toBeLessThanOrEqual(bounds.right + 1);
  }
  await page.keyboard.press('Escape'); await expect(dialog).toBeHidden();
  expect(writes).toEqual([]);
 });

 test('@pr-smoke @pr-smoke-mobile IP-detail ptr keeps the complete IPv6 identifier inside its dialog', async ({ page }) => {
  const address = '2001:0db8:1234:5678:9abc:def0:1234:5678';
  const writes: string[] = [];
  await bootstrapVpsAdminWindow(page);
  await installHaveApiMock(page, { user: { id: 1, login: 'synthetic-admin', level: 99 }, handlers: {
   'GET ip_addresses/100': () => ({ ip_address: { id: 100, addr: address, prefix: 128, network: { id: 3, enabled: true }, network_interface: { id: 6, name: 'eth0' } } }),
   'GET host_ip_addresses': () => ({ host_ip_addresses: [{ id: 601, addr: address, assigned: false, user_created: true, reverse_record_value: 'synthetic.example.test.', ip_address: { id: 100, network_interface: { id: 6, name: 'eth0' } } }] }),
   'GET host_ip_addresses/601': () => ({ host_ip_address: { id: 601, addr: address, assigned: false, user_created: true, reverse_record_value: 'synthetic.example.test.', ip_address: { id: 100, network_interface: { id: 6, name: 'eth0' } } } }),
   'GET environments': () => ({ environments: [] }),
  } });
  await page.route('**/api/**', route => {
   if (!['GET', 'HEAD', 'OPTIONS'].includes(route.request().method())) { writes.push(route.request().method()); return route.abort(); }
   return route.fallback();
  });
  await page.goto('/admin/networking/ip-addresses/100');
  await page.setViewportSize({ width: 320, height: 750 });
  await page.getByTestId('admin.ip.hosts.row.601.ptr').click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  const identity = dialog.getByText(address, { exact: true });
  await expect(identity).toBeVisible();
  const bounds = await identity.evaluate(element => {
   const range = document.createRange(); range.selectNodeContents(element);
   const box = element.getBoundingClientRect();
   return { width: element.clientWidth, scrollWidth: element.scrollWidth,
    fragments: [...range.getClientRects()].map(rect => ({ left: rect.left, right: rect.right })),
    left: box.left, right: box.right };
  });
  expect(bounds.scrollWidth).toBeLessThanOrEqual(bounds.width + 1);
  for (const fragment of bounds.fragments) {
   expect(fragment.left).toBeGreaterThanOrEqual(bounds.left - 1);
   expect(fragment.right).toBeLessThanOrEqual(bounds.right + 1);
  }
  await page.keyboard.press('Escape'); await expect(dialog).toBeHidden();
  expect(writes).toEqual([]);
 });
