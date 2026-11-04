import assert from 'node:assert/strict';

import { test, expect } from '@playwright/test';

import { failEnvelope, installHaveApiMock, jsonFulfill } from '../../fixtures/haveapi';
import { setUiSettingsLocalStorage } from '../../fixtures/uiSettings';
import { bootstrapVpsAdminWindow } from '../../fixtures/bootstrap';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

test('profile: user namespaces - create map and edit entries', async ({ page }) => {
  const namespaces = [{ id: 101, size: 65536 }];
  let maps: any[] = [];
  let entries: any[] = [];
  let nextMapId = 501;
  let nextEntryId = 1001;
  let namespacesListCalls = 0;
  let mapListCalls = 0;

  await installHaveApiMock({
    page,
    authorizeUser: {
      user: {
        id: 1,
        login: 'testuser',
        level: 1,
      },
    },
    handlers: {
      'GET user_namespaces': async (ctx) => {
        namespacesListCalls += 1;
        expect(ctx.searchParams.get('user_namespace[user]')).toBeNull();
        expect(ctx.searchParams.get('user_namespace[q]')).toBeNull();
        return { user_namespaces: namespaces };
      },

      'GET user_namespace_maps': async (ctx) => {
        mapListCalls += 1;
        expect(ctx.searchParams.get('user_namespace_map[user]')).toBeNull();
        expect(ctx.searchParams.get('user_namespace_map[q]')).toBeNull();
        return { user_namespace_maps: maps };
      },

      'POST user_namespace_maps': async (ctx) => {
        const b = await ctx.request.postDataJSON();
        assert(isRecord(b) && isRecord(b['user_namespace_map']));
        const input = b['user_namespace_map'];
        assert(typeof input['label'] === 'string');
        expect(input['label']).toBeTruthy();
        // For profile create, user_namespace is selected by dropdown/autoselect
        expect(input['user_namespace']).toBe(101);

        const m = {
          id: nextMapId++,
          label: input['label'],
          user_namespace: namespaces[0],
        };
        maps = [m, ...maps];
        return { user_namespace_map: m };
      },

      'GET user_namespace_maps/501': async () => ({ user_namespace_map: maps.find((m) => m.id === 501) }),

      'PUT user_namespace_maps/501': async (ctx) => {
        const b = await ctx.request.postDataJSON();
        assert(isRecord(b) && isRecord(b['user_namespace_map']));
        const input = b['user_namespace_map'];
        assert(typeof input['label'] === 'string');
        expect(input['user_namespace']).toBe(101);
        const m = maps.find((x) => x.id === 501);
        m.label = input['label'];
        return { user_namespace_map: m };
      },

      'GET user_namespace_maps/501/entries': async () => ({ entries }),

      'POST user_namespace_maps/501/entries': async (ctx) => {
        const b = await ctx.request.postDataJSON();
        assert(isRecord(b) && isRecord(b['entry']));
        const input = b['entry'];
        const kind = input['kind'];
        assert(kind === 'uid' || kind === 'gid');
        assert(typeof input['vps_id'] === 'number');
        assert(typeof input['ns_id'] === 'number');
        assert(typeof input['count'] === 'number');
        const e = {
          id: nextEntryId++,
          kind,
          vps_id: input['vps_id'],
          ns_id: input['ns_id'],
          count: input['count'],
        };
        entries = [...entries, e];
        return { entry: e };
      },

      'PUT user_namespace_maps/501/entries/1001': async (ctx) => {
        const b = await ctx.request.postDataJSON();
        assert(isRecord(b) && isRecord(b['entry']));
        const input = b['entry'];
        assert(typeof input['vps_id'] === 'number');
        assert(typeof input['ns_id'] === 'number');
        assert(typeof input['count'] === 'number');
        const e = entries.find((x) => x.id === 1001);
        e.vps_id = input['vps_id'];
        e.ns_id = input['ns_id'];
        e.count = input['count'];
        return { entry: e };
      },

      'DELETE user_namespace_maps/501/entries/1002': async () => {
        entries = entries.filter((e) => e.id !== 1002);
        return { entry: {} };
      },

      // Used-by-VPS chip
      'GET vpses': async () => ({ vpses: [], _meta: { total_count: 0 } }),
    },
  });

  // Landing should redirect to maps when the user has exactly one namespace
  await page.goto('/app/profile/user-namespaces');
  await expect(page.getByTestId('profile.userns.maps.create')).toBeVisible({ timeout: 30_000 });
  expect(namespacesListCalls).toBeGreaterThan(0);
  expect(mapListCalls).toBeGreaterThan(0);

  // Create a new map
  await page.getByTestId('profile.userns.maps.create').click();
  await page.getByTestId('profile.userns.maps.create.label').fill('My map');
  await page.getByTestId('profile.userns.maps.create.submit').click();

  // Should navigate to map detail
  await expect(page).toHaveURL(/\/app\/profile\/user-namespaces\/maps\/501/);

  // Add a "both" entry (creates UID + GID)
  await page.getByTestId('profile.userns.map.add.kind').selectOption('both');
  await page.getByTestId('profile.userns.map.add.vps_id').fill('201');
  await page.getByTestId('profile.userns.map.add.ns_id').fill('1000');
  await page.getByTestId('profile.userns.map.add.count').fill('100');
  await page.getByTestId('profile.userns.map.add.submit').click();

  // Entries should show two rows
  await expect(page.getByTestId('profile.userns.map.entry.row.1001')).toContainText(/uid/i);
  await expect(page.getByTestId('profile.userns.map.entry.row.1002')).toContainText(/gid/i);

  // Edit count for first row and save
  await page.getByTestId('profile.userns.map.entry.1001.count').fill('200');
  await page.getByTestId('profile.userns.map.entries.save').click();

  // Delete second row
  await page.getByTestId('profile.userns.map.entry.1002.delete').click();
  await page.getByTestId('profile.userns.map.delete_entry.confirm.confirm').click();
  await expect(page.getByTestId('profile.userns.map.entry.row.1002')).toHaveCount(0);

  // Rename the map
  await page.getByTestId('profile.userns.map.rename.input').fill('Renamed map');
  await page.getByTestId('profile.userns.map.rename.save').click();
  await expect(page.getByTestId('profile.userns.map.subtitle')).toContainText('Renamed map');
});

test('profile: changing the map route drops stale edits and delete confirmation', async ({ page }) => {
  const map = (id: number) => ({
    id,
    label: `Map ${id}`,
    user_namespace: { id: 101, size: 65536 },
  });
  await installHaveApiMock({
    page,
    authorizeUser: { user: { id: 1, login: 'testuser', level: 1 } },
    handlers: {
      'GET user_namespace_maps/501': () => ({ user_namespace_map: map(501) }),
      'GET user_namespace_maps/502': () => ({ user_namespace_map: map(502) }),
      'GET user_namespace_maps/501/entries': () => ({ entries: [] }),
      'GET user_namespace_maps/502/entries': () => ({ entries: [] }),
      'GET vpses': () => ({ vpses: [], _meta: { total_count: 0 } }),
      'PUT user_namespace_maps/501': () => ({ user_namespace_map: map(501) }),
      'PUT user_namespace_maps/502': () => ({ user_namespace_map: map(502) }),
      'DELETE user_namespace_maps/501': () => ({}),
      'DELETE user_namespace_maps/502': () => ({}),
    },
  });
  const mutations: string[] = [];
  page.on('request', (request) => {
    if (
      ['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method())
      && request.url().includes('/api/v7.0/user_namespace_maps')
    ) {
      mutations.push(request.url());
    }
  });

  await page.goto('/app/profile/user-namespaces/maps/501');
  await expect(page.getByTestId('profile.userns.map.rename.input')).toHaveValue('Map 501');
  await page.getByTestId('profile.userns.map.rename.input').fill('Stale map 501 rename');
  await page.getByTestId('profile.userns.map.add.vps_id').fill('201');
  await page.getByTestId('profile.userns.map.delete').click();
  await expect(page.getByTestId('profile.userns.map.delete_map.confirm')).toBeVisible();

  await page.evaluate(() => {
    window.history.pushState({}, '', '/app/profile/user-namespaces/maps/502');
    window.dispatchEvent(new PopStateEvent('popstate'));
  });

  await expect(page.getByTestId('profile.userns.map.rename.input')).toHaveValue('Map 502');
  await expect(page.getByTestId('profile.userns.map.add.vps_id')).toHaveValue('');
  await expect(page.getByTestId('profile.userns.map.delete_map.confirm')).toHaveCount(0);
  expect(mutations).toEqual([]);
});

test('@pr-smoke @pr-smoke-mobile profile: rejected namespace deletions stay in context for retry', async ({ page }) => {
  const map = {
    id: 501,
    label: 'Retry map',
    user_namespace: { id: 101, size: 65536 },
  };
  let maps = [map];
  let entries = [{ id: 1001, kind: 'uid', vps_id: 201, ns_id: 1000, count: 100 }];
  let entryDeleteAttempts = 0;
  let mapDeleteAttempts = 0;

  await installHaveApiMock({
    page,
    authorizeUser: { user: { id: 1, login: 'testuser', level: 1 } },
    handlers: {
      'GET user_namespaces': () => ({ user_namespaces: [{ id: 101, size: 65536 }] }),
      'GET user_namespace_maps': () => ({ user_namespace_maps: maps }),
      'GET user_namespace_maps/501': () => ({ user_namespace_map: map }),
      'GET user_namespace_maps/501/entries': () => ({ entries }),
      'GET vpses': () => ({ vpses: [], _meta: { total_count: 0 } }),
      'DELETE user_namespace_maps/501/entries/1001': () => {
        entryDeleteAttempts += 1;
        if (entryDeleteAttempts === 1) return failEnvelope('Entry deletion was rejected');
        entries = [];
        return { entry: {} };
      },
      'DELETE user_namespace_maps/501': () => {
        mapDeleteAttempts += 1;
        if (mapDeleteAttempts === 1) return failEnvelope('Map deletion was rejected');
        maps = [];
        return { user_namespace_map: {} };
      },
    },
  });

  await page.goto('/app/profile/user-namespaces/maps/501');
  await expect(page.getByTestId('profile.userns.map.entry.row.1001')).toBeVisible();

  await page.getByTestId('profile.userns.map.entry.1001.delete').click();
  await page.getByTestId('profile.userns.map.delete_entry.confirm.confirm').click();
  await expect(page.getByTestId('profile.userns.map.delete_entry.error')).toContainText(
    'Entry deletion was rejected',
  );
  await expect(page.getByTestId('profile.userns.map.delete_entry.confirm')).toBeVisible();
  await expect(page.getByTestId('profile.userns.map.entry.row.1001')).toBeVisible();

  await page.getByTestId('profile.userns.map.delete_entry.confirm.confirm').click();
  await expect(page.getByTestId('profile.userns.map.delete_entry.confirm')).toHaveCount(0);
  await expect(page.getByTestId('profile.userns.map.entry.row.1001')).toHaveCount(0);

  await page.getByTestId('profile.userns.map.delete').click();
  await page.getByTestId('profile.userns.map.delete_map.confirm.confirm').click();
  await expect(page.getByTestId('profile.userns.map.delete_map.error')).toContainText(
    'Map deletion was rejected',
  );
  await expect(page.getByTestId('profile.userns.map.delete_map.confirm')).toBeVisible();
  await expect(page).toHaveURL(/\/app\/profile\/user-namespaces\/maps\/501$/);

  await page.getByTestId('profile.userns.map.delete_map.confirm.confirm').click();
  await expect(page).toHaveURL(/\/app\/profile\/user-namespaces\/maps$/);
  expect(entryDeleteAttempts).toBe(2);
  expect(mapDeleteAttempts).toBe(2);
});

test('@pr-smoke @pr-smoke-mobile profile: rejected map-list deletion stays in its confirmation', async ({ page }) => {
  const map = {
    id: 501,
    label: 'List retry map',
    user_namespace: { id: 101, size: 65536 },
  };
  let maps = [map];
  let deleteAttempts = 0;

  await installHaveApiMock({
    page,
    authorizeUser: { user: { id: 1, login: 'testuser', level: 1 } },
    handlers: {
      'GET user_namespaces': () => ({ user_namespaces: [{ id: 101, size: 65536 }] }),
      'GET user_namespace_maps': () => ({ user_namespace_maps: maps }),
      'DELETE user_namespace_maps/501': () => {
        deleteAttempts += 1;
        if (deleteAttempts === 1) return failEnvelope('List deletion was rejected');
        maps = [];
        return { user_namespace_map: {} };
      },
    },
  });

  await page.goto('/app/profile/user-namespaces/maps');
  await page.getByTestId('profile.userns.maps.row.501.delete').click();
  await page.getByTestId('profile.userns.maps.delete.confirm.confirm').click();

  await expect(page.getByTestId('profile.userns.maps.delete.error')).toContainText(
    'List deletion was rejected',
  );
  await expect(page.getByTestId('profile.userns.maps.delete.confirm')).toBeVisible();
  await expect(page.getByTestId('profile.userns.maps.row.501')).toBeVisible();

  await page.getByTestId('profile.userns.maps.delete.confirm.confirm').click();
  await expect(page.getByTestId('profile.userns.maps.delete.confirm')).toHaveCount(0);
  await expect(page.getByTestId('profile.userns.maps.row.501')).toHaveCount(0);
  expect(deleteAttempts).toBe(2);
});


test('@content-account-ns-personal member namespace and map preserve owner and UID/GID context cs', async ({
  page,
}, info) => {
  const user = { id: 1, login: 'member', level: 1 };
  const namespace = { id: 101, size: 65536, offset: 100000, block_count: 3, user };
  const map = { id: 501, label: 'Personal mapping', user_namespace: namespace };
  await setUiSettingsLocalStorage(page, { language: 'cs', theme: 'dark' });
  await bootstrapVpsAdminWindow(page, { sessionToken: 'SYNTHETIC_NAMESPACE' });
  await installHaveApiMock(page, {
    user,
    handlers: {
      'GET user_namespaces/101': () => ({ user_namespace: namespace }),
      'GET user_namespace_maps/501': () => ({ user_namespace_map: map }),
      'GET user_namespace_maps/501/entries': () => ({
        entries: [
          { id: 1001, kind: 'uid', vps_id: 201, ns_id: 1000, count: 100 },
          { id: 1002, kind: 'gid', vps_id: 201, ns_id: 1000, count: 100 },
        ],
      }),
      'GET vpses': () => ({ vpses: [], _meta: { total_count: 1 } }),
    },
  });
  await page.goto('/app/profile/user-namespaces/namespaces/101');
  await expect(page.getByTestId('profile.userns.namespace.card')).toContainText('member');
  await expect(page.getByTestId('profile.userns.namespace.card')).toContainText('100000');
  await page.screenshot({ path: info.outputPath('member-namespace-cs.png'), fullPage: true });
  await page.goto('/app/profile/user-namespaces/maps/501');
  await expect(page.getByTestId('profile.userns.map.entry.row.1002')).toContainText('GID');
  await page.screenshot({ path: info.outputPath('member-map-cs.png'), fullPage: true });
});

test('@content-account-ns-personal admin-self map retains dirty rows and open confirmation through failed entry refetch cs', async ({
  page,
}, info) => {
  await page.clock.install({ time: new Date('2026-02-18T10:00:00Z') });
  const user = { id: 1, login: 'operator', level: 100 };
  const namespace = { id: 101, size: 65536, offset: 100000, block_count: 3, user };
  const map = { id: 501, label: 'Own administrator mapping', user_namespace: namespace };
  let entriesFail = false;
  let failedReads = 0;
  let holdSuccessfulRefetch = false;
  let heldReads = 0;
  const pendingRead: { release?: () => void } = {};
  const writes: string[] = [];
  await setUiSettingsLocalStorage(page, { language: 'cs', theme: 'dark' });
  await bootstrapVpsAdminWindow(page, { sessionToken: 'SYNTHETIC_NAMESPACE' });
  await installHaveApiMock(page, {
    user,
    handlers: {
      'GET user_namespaces/101': () => ({ user_namespace: namespace }),
      'GET user_namespace_maps/501': () => ({ user_namespace_map: map }),
      'GET user_namespace_maps/501/entries': async () => {
        if (holdSuccessfulRefetch) {
          heldReads += 1;
          await new Promise<void>((resolve) => {
            pendingRead.release = resolve;
          });
        }
        if (entriesFail) {
          failedReads += 1;
          return jsonFulfill(failEnvelope('Synthetic entries refetch unavailable'), 503);
        }
        return {
          entries: [
            { id: 1001, kind: 'uid', vps_id: 201, ns_id: 1000, count: 100 },
            { id: 1002, kind: 'gid', vps_id: 201, ns_id: 1000, count: 100 },
          ],
        };
      },
      'GET vpses': () => ({ vpses: [], _meta: { total_count: 1 } }),
    },
  });
  page.on('request', (request) => {
    if (
      ['POST', 'PUT', 'DELETE'].includes(request.method()) &&
      new URL(request.url()).pathname.includes('user_namespace_maps')
    )
      writes.push(request.url());
  });
  await page.goto('/admin/profile/user-namespaces/maps/501');
  await expect(page.getByTestId('profile.userns.map.entry.row.1002')).toBeVisible();
  await page.screenshot({ path: info.outputPath('admin-self-map-cs.png'), fullPage: true });
  await page.getByTestId('profile.userns.map.entry.1001.count').fill('256');
  holdSuccessfulRefetch = true;
  await page.clock.fastForward(16000);
  await page.evaluate(() => {
    window.dispatchEvent(new Event('offline'));
    window.dispatchEvent(new Event('online'));
  });
  await expect.poll(() => heldReads).toBe(1);
  await expect(page.getByTestId('profile.userns.map.entry.1001.count')).toBeEnabled();
  await expect(page.getByTestId('profile.userns.map.entries.save')).toBeEnabled();
  await expect(page.getByTestId('profile.userns.map.add.submit')).toBeEnabled();
  await expect(page.getByTestId('profile.userns.map.entry.1002.delete')).toBeEnabled();
  await page.screenshot({ path: info.outputPath('admin-self-successful-refetch-cs.png'), fullPage: true });
  const successfulRefetch = page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname.endsWith('/user_namespace_maps/501/entries') && response.status() === 200
  );
  holdSuccessfulRefetch = false;
  if (!pendingRead.release) throw new Error('Missing held entry read');
  pendingRead.release();
  await (await successfulRefetch).finished();
  await expect(page.getByTestId('profile.userns.map.entry.1001.count')).toHaveValue('256');
  await page.getByTestId('profile.userns.map.entry.1002.delete').click();
  await expect(page.getByTestId('profile.userns.map.delete_entry.confirm')).toBeVisible();
  entriesFail = true;
  await page.clock.fastForward(16000);
  await page.evaluate(() => {
    window.dispatchEvent(new Event('offline'));
    window.dispatchEvent(new Event('online'));
  });
  await expect.poll(() => failedReads).toBe(2);
  await expect(page.getByTestId('profile.userns.map.entry.1001.count')).toHaveValue('256');
  await expect(page.getByTestId('profile.userns.map.delete_entry.confirm')).toBeVisible();
  expect(writes).toEqual([]);
  await expect(page.getByTestId('profile.userns.map.entries.load_error')).toContainText('Nepodařilo se načíst položky');
  await expect(page.getByText('Položky: —', { exact: true })).toBeVisible();
  await expect(page.getByTestId('profile.userns.map.delete_entry.confirm.confirm')).toBeDisabled();
  await page
    .getByTestId('profile.userns.map.delete_entry.confirm.confirm')
    .evaluate((button) => (button as HTMLButtonElement).click());
  expect(writes).toEqual([]);
  await page.screenshot({ path: info.outputPath('admin-self-entry-refetch-failure-cs.png'), fullPage: true });
  await page.getByTestId('profile.userns.map.delete_entry.confirm.cancel').click();
  await expect(page.getByTestId('profile.userns.map.entry.1001.count')).toHaveValue('256');
  expect(writes).toEqual([]);
  for (const field of ['kind', 'vps_id', 'ns_id', 'count', 'submit']) {
    await expect(page.getByTestId(`profile.userns.map.add.${field}`)).toBeDisabled();
  }
  await expect(page.getByTestId('profile.userns.map.entry.1001.count')).toBeDisabled();
  await expect(page.getByTestId('profile.userns.map.entry.1002.delete')).toBeDisabled();
  await expect(page.getByTestId('profile.userns.map.entries.save')).toBeDisabled();
  await expect(page.getByTestId('profile.userns.map.delete')).toBeEnabled();
  await page.getByTestId('profile.userns.map.rename.input').fill('Independent label draft');
  await expect(page.getByTestId('profile.userns.map.rename.save')).toBeEnabled();
  await page.screenshot({ path: info.outputPath('admin-self-entry-failure-draft-cs.png'), fullPage: true });
  entriesFail = false;
  await page.getByTestId('profile.userns.map.entries.retry').click();
  await expect(page.getByTestId('profile.userns.map.entries.load_error')).toHaveCount(0);
  await expect(page.getByTestId('profile.userns.map.entry.1001.count')).toHaveValue('256');
  await expect(page.getByTestId('profile.userns.map.entry.1001.count')).toBeEnabled();
  await expect(page.getByTestId('profile.userns.map.entries.save')).toBeEnabled();
  await expect(page.getByTestId('profile.userns.map.entry.1002.delete')).toBeEnabled();
  await expect(page.getByText('Položky: 2', { exact: true })).toBeVisible();
  await expect(page.getByTestId('profile.userns.map.rename.input')).toHaveValue('Independent label draft');
  expect(writes).toEqual([]);
  await page.screenshot({ path: info.outputPath('admin-self-entry-recovered-cs.png'), fullPage: true });
});
