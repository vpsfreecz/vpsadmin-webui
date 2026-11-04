import { test, expect } from '@playwright/test';

import { failEnvelope, installHaveApiMock, jsonFulfill } from '../../fixtures/haveapi';
import { setUiSettingsLocalStorage } from '../../fixtures/uiSettings';
import { bootstrapVpsAdminWindow } from '../../fixtures/bootstrap';

test('admin: user namespaces tool loads namespaces and maps', async ({ page }) => {
  await installHaveApiMock({
    page,
    authorizeUser: {
      user: {
        id: 1,
        login: 'admin',
        level: 100,
      },
    },
    handlers: {
      'GET user_namespaces': async () => ({
        user_namespaces: [
          { id: 101, size: 65536, user: { id: 11, login: 'alice' }, block_count: 3 },
          { id: 102, size: 131072, user: { id: 12, login: 'bob' }, block_count: 0 },
        ],
      }),
      'GET user_namespace_maps': async () => ({
        user_namespace_maps: [
          {
            id: 501,
            label: 'default',
            user_namespace: { id: 101, size: 65536, user: { id: 11, login: 'alice' } },
          },
        ],
      }),
    },
  });

  await page.goto('/admin/user-namespaces/namespaces');
  await expect(page.getByTestId('admin.userns.shell')).toBeVisible();
  await expect(page.getByTestId('admin.userns.namespaces.table')).toBeVisible();
  await expect(page.getByText('#101')).toBeVisible();

  await page.getByTestId('admin.userns.tabs.maps').click();
  await expect(page).toHaveURL(/\/admin\/user-namespaces\/maps/);
  await expect(page.getByTestId('admin.userns.maps.table')).toBeVisible();
  await expect(page.getByText('#501')).toBeVisible();
});


test('@content-account-ns-global global index, namespace and map retain independent metadata on entry failure en', async ({
  page,
}, info) => {
  const owner = { id: 42, login: 'alice' };
  const namespace = { id: 101, size: 65536, offset: 100000, block_count: 3, user: owner };
  const map = { id: 501, label: 'Global mapping', user_namespace: namespace };
  let failedReads = 0;
  let entriesUnavailable = true;
  let holdInitialEntriesRead = true;
  let heldInitialReads = 0;
  const initialEntriesRead: { release?: () => void } = {};
  await setUiSettingsLocalStorage(page, { language: 'en', theme: 'dark' });
  await bootstrapVpsAdminWindow(page, { sessionToken: 'SYNTHETIC_NAMESPACE' });
  await installHaveApiMock(page, {
    user: { id: 1, login: 'operator', level: 100 },
    handlers: {
      'GET user_namespaces': () => ({ user_namespaces: [namespace] }),
      'GET user_namespaces/101': () => ({ user_namespace: namespace }),
      'GET user_namespace_maps': () => ({ user_namespace_maps: [map] }),
      'GET user_namespace_maps/501': () => ({ user_namespace_map: map }),
      'GET user_namespace_maps/502': () => ({
        user_namespace_map: { ...map, id: 502, label: 'Entry feed unavailable' },
      }),
      'GET user_namespace_maps/501/entries': () => ({
        entries: [
          { id: 1001, kind: 'uid', vps_id: 201, ns_id: 1000, count: 100 },
          { id: 1002, kind: 'gid', vps_id: 201, ns_id: 1000, count: 100 },
        ],
      }),
      'GET user_namespace_maps/502/entries': async () => {
        if (holdInitialEntriesRead) {
          heldInitialReads += 1;
          await new Promise<void>((resolve) => {
            initialEntriesRead.release = resolve;
          });
        }
        if (entriesUnavailable) {
          failedReads += 1;
          return jsonFulfill(failEnvelope('Synthetic entries feed unavailable'), 503);
        }
        return { entries: [] };
      },
      'GET vpses': () => ({ vpses: [], _meta: { total_count: 2 } }),
    },
  });
  await page.goto('/admin/user-namespaces');
  await expect(page).toHaveURL(/\/admin\/user-namespaces\/namespaces(?:\?|$)/);
  await expect(page.getByTestId('admin.userns.namespaces.table')).toContainText('alice');
  await page.goto('/admin/user-namespaces/namespaces/101');
  await expect(page.getByTestId('admin.userns.namespace.card')).toContainText('100000');
  await expect(page.getByTestId('admin.userns.namespace.card')).toContainText('alice');
  await page.screenshot({ path: info.outputPath('global-namespace-en.png'), fullPage: true });
  await page.goto('/admin/user-namespaces/maps/501');
  await expect(page.getByTestId('admin.userns.map.entry.row.1002')).toContainText('GID');
  await page.screenshot({ path: info.outputPath('global-map-en.png'), fullPage: true });
  await page.goto('/admin/user-namespaces/maps/502');
  await expect.poll(() => heldInitialReads).toBe(1);
  await expect(page.getByTestId('admin.userns.map.rename.input')).toHaveValue('Entry feed unavailable');
  await expect(page.getByTestId('admin.userns.map.delete')).toBeEnabled();
  await expect(page.getByText('Entries: —', { exact: true })).toBeVisible();
  await expect(page.getByText('No entries.', { exact: true })).toHaveCount(0);
  for (const field of ['kind', 'vps_id', 'ns_id', 'count', 'submit']) {
    await expect(page.getByTestId(`admin.userns.map.add.${field}`)).toBeDisabled();
  }
  await page.screenshot({ path: info.outputPath('global-entry-loading-en.png'), fullPage: true });
  holdInitialEntriesRead = false;
  if (!initialEntriesRead.release) throw new Error('Missing held initial entry read');
  initialEntriesRead.release();
  await expect.poll(() => failedReads).toBe(2);
  await expect(page.getByTestId('admin.userns.map.rename.input')).toHaveValue('Entry feed unavailable');
  await expect(page.getByTestId('admin.userns.map.delete')).toBeEnabled();
  await expect(page.getByTestId('admin.userns.map.entries.load_error')).toContainText('Unable to load entries');
  await expect(page.getByTestId('admin.userns.map.entries.load_error')).toContainText(
    'Synthetic entries feed unavailable'
  );
  await expect(page.getByText('Entries: —', { exact: true })).toBeVisible();
  await expect(page.getByText('No entries.', { exact: true })).toHaveCount(0);
  for (const field of ['kind', 'vps_id', 'ns_id', 'count', 'submit']) {
    await expect(page.getByTestId(`admin.userns.map.add.${field}`)).toBeDisabled();
  }
  await page.screenshot({ path: info.outputPath('global-entry-failure-en.png'), fullPage: true });
  await page.getByTestId('admin.userns.map.rename.input').fill('Metadata remains editable');
  await expect(page.getByTestId('admin.userns.map.rename.save')).toBeEnabled();
  await expect(page.getByTestId('admin.userns.map.delete')).toBeEnabled();
  entriesUnavailable = false;
  await page.getByTestId('admin.userns.map.entries.retry').click();
  await expect(page.getByTestId('admin.userns.map.entries.load_error')).toHaveCount(0);
  await expect(page.getByText('Entries: 0', { exact: true })).toBeVisible();
  await expect(page.getByText('No entries.', { exact: true })).toBeVisible();
  await expect(page.getByTestId('admin.userns.map.add.submit')).toBeEnabled();
  await expect(page.getByTestId('admin.userns.map.rename.input')).toHaveValue('Metadata remains editable');
  await page.screenshot({ path: info.outputPath('global-entry-recovered-en.png'), fullPage: true });
});
