import { expect, test } from '@playwright/test';

import { bootstrapVpsAdminWindow, installHaveApiMock, setUiSettingsLocalStorage } from '../../fixtures';
import {
  expectNoDocumentHorizontalOverflow,
  expectTableHorizontalScrollUsable,
} from '../../helpers/horizontalOverflow';

for (const language of ['en', 'cs'] as const) {
  test(`@pr-smoke @pr-smoke-mobile missing host assignment stays unknown (${language})`, async ({ page }, testInfo) => {
    await bootstrapVpsAdminWindow(page);
    await setUiSettingsLocalStorage(page, { language, theme: 'dark' });
    await installHaveApiMock(page, {
      user: { id: 1, login: 'admin', level: 100 },
      handlers: {
        'GET ip_addresses/100': () => ({
          ip_address: {
            id: 100,
            addr: '203.0.113.10',
            prefix: 32,
            routed: true,
            network: { id: 3, address: '203.0.113.0', prefix: 24 },
          },
        }),
        'GET host_ip_addresses': () => ({
          host_ip_addresses: [
            { id: 601, addr: '203.0.113.11', assigned: true },
            { id: 602, addr: '203.0.113.12', assigned: false, user_created: true },
            { id: 603, addr: '203.0.113.13' },
            { id: 604, addr: '203.0.113.14', assigned: null },
          ],
        }),
      },
    });
    await page.goto('/admin/ip-addresses/100');
    await expect(page.getByTestId('admin.ip.hosts.row.604')).toBeVisible();
    await page.screenshot({
      path: testInfo.outputPath(`host-assignment-states-${language}.png`),
      fullPage: true,
      scale: 'css',
    });
    if (testInfo.project.name.includes('mobile')) {
      await page.getByTestId('admin.ip.hosts.table').evaluate((table) => {
        const scroller = table.parentElement;
        if (scroller) scroller.scrollLeft = scroller.scrollWidth;
      });
      await page.screenshot({
        path: testInfo.outputPath(`host-assignment-actions-${language}.png`),
        fullPage: true,
        scale: 'css',
      });
    }
    for (const id of [603, 604]) {
      const row = page.getByTestId(`admin.ip.hosts.row.${id}`);
      await expect.soft(row.getByTestId(`admin.ip.hosts.row.${id}.free`)).toHaveCount(0, { timeout: 1_000 });
      await expect(row.getByTestId(`admin.ip.hosts.row.${id}.assign`)).toHaveCount(0);
      await expect(row.getByTestId(`admin.ip.hosts.row.${id}.delete`)).toHaveCount(0);
      await expect(row.getByTestId(`admin.ip.hosts.row.${id}.ptr`)).toBeVisible();
    }
    await expect(page.getByTestId('admin.ip.hosts.row.601.free')).toBeVisible();
    await expect(page.getByTestId('admin.ip.hosts.row.602.assign')).toBeVisible();
    await expect(page.getByTestId('admin.ip.hosts.row.602.delete')).toBeVisible();
  });
}

test('@content-network-host-create host IP creation keeps its address input instruction', async ({
  page,
}, testInfo) => {
  const language = testInfo.project.name === 'mobile-chrome' ? 'cs' : 'en';
  await bootstrapVpsAdminWindow(page);
  await setUiSettingsLocalStorage(page, { language, theme: 'dark' });
  await installHaveApiMock(page, {
    user: { id: 1, login: 'admin', level: 100 },
    handlers: {
      'GET ip_addresses/100': () => ({
        ip_address: {
          id: 100,
          addr: '203.0.113.10',
          prefix: 32,
          routed: true,
          network: { id: 3, address: '203.0.113.0', prefix: 24 },
        },
      }),
      'GET host_ip_addresses': () => ({ host_ip_addresses: [] }),
    },
  });
  const writes: string[] = [];
  page.on('request', (request) => {
    if (['POST', 'PUT', 'DELETE'].includes(request.method()) && request.url().includes('/host_ip_addresses'))
      writes.push(request.url());
  });
  await page.goto('/admin/ip-addresses/100');
  await page.getByTestId('admin.ip.hosts.create.open').click();
  const dialog = page.getByRole('dialog', {
    name: language === 'cs' ? 'Přidat host IP adresy' : 'Add host IP addresses',
    exact: true,
  });
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText(language === 'cs' ? 'Jedna adresa na řádek.' : 'One address per line.');
  await expect(dialog).not.toContainText(language === 'cs' ? 'testovací' : 'sample data');
  await expect(dialog.getByRole('textbox')).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath(`host-create-${language}.png`), fullPage: true, scale: 'css' });
  await dialog.getByRole('button', { name: language === 'cs' ? 'Zrušit' : 'Cancel', exact: true }).click();
  expect(writes).toEqual([]);
});

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

test('@content-detail-host-delete @pr-smoke @pr-smoke-mobile admin ip address destructive confirmations keep rejected actions retryable', async ({
  page,
}, testInfo) => {
  const language = testInfo.project.name === 'mobile-chrome' ? 'cs' : 'en';
  await bootstrapVpsAdminWindow(page);
  await setUiSettingsLocalStorage(page, { language, theme: 'dark' });

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
        host_ip_addresses: [{ id: 602, addr: '203.0.113.12', assigned: false, user_created: true }],
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
        return { host_ip_address: {}, _meta: { action_state_id: 702 } };
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
  await expect(deleteHostDialog).toBeVisible();
  await expect(
    deleteHostDialog.getByText(
      language === 'cs'
        ? 'Smazat host adresu 203.0.113.12 z vpsAdminu.'
        : 'Delete host address 203.0.113.12 from vpsAdmin.',
      { exact: true }
    )
  ).toBeVisible();
  await expect(deleteHostDialog.getByTestId('admin.ip.hosts.delete_confirm.confirm')).toBeEnabled();
  await page.screenshot({
    path: testInfo.outputPath(`detail-host-delete-${language}.png`),
    fullPage: true,
    scale: 'css',
  });
  await deleteHostDialog.getByRole('button', { name: language === 'cs' ? 'Zrušit' : 'Cancel', exact: true }).click();
  await expect(deleteHostDialog).toBeHidden();
  expect(deleteHostAttempts).toBe(0);
  await page.getByTestId('admin.ip.hosts.row.602.delete').click();
  await deleteHostDialog.getByTestId('admin.ip.hosts.delete_confirm.confirm').click();
  await expect(page.getByTestId('admin.ip.hosts.delete_confirm.error')).toContainText('Host address is still assigned');
  await expect(deleteHostDialog).toContainText('203.0.113.12');
  await deleteHostDialog.getByTestId('admin.ip.hosts.delete_confirm.confirm').click();
  await expect(deleteHostDialog).toBeHidden();
  expect(deleteHostAttempts).toBe(2);
});
