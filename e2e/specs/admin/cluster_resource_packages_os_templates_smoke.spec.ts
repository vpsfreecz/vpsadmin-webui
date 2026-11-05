import { expect, test } from '@playwright/test';

import { bootstrapVpsAdminWindow, failEnvelope, installHaveApiMock, setUiSettingsLocalStorage } from '../../fixtures';

test.describe('@smoke Admin cluster OS templates and resource packages', () => {
  test.beforeEach(async ({ page }) => {
    await bootstrapVpsAdminWindow(page, { sessionToken: 'TEST' });
  });

  test('OS templates list, filter and editor use namespaced API payloads', async ({ page }) => {
    const families = [{ id: 1, label: 'Debian' }];
    const templates: any[] = [
      {
        id: 11,
        os_family: families[0],
        label: 'Debian 12',
        distribution: 'debian',
        version: '12',
        enabled: true,
        supported: true,
        order: 10,
        uses_count: 0,
        hypervisor_type: 'vpsadminos',
        cgroup_version: 'cgroup_v2',
        manage_hostname: true,
        manage_dns_resolver: true,
        enable_script: true,
        enable_cloud_init: true,
        vendor: 'debian',
        variant: 'default',
        arch: 'x86_64',
        config: 'image: debian-12',
      },
    ];
    const gets: URL[] = [];
    const puts: any[] = [];

    await installHaveApiMock(page, {
      user: { id: 1, login: 'admin', level: 90 },
      handlers: {
        'GET os_families': () => ({ os_families: families, _meta: { total_count: families.length } }),
        'GET os_templates': ({ url }) => {
          gets.push(url);
          return { os_templates: templates, _meta: { total_count: templates.length } };
        },
        'PUT os_templates/11': ({ json }) => {
          puts.push(json);
          templates[0] = { ...templates[0], ...((json as any)?.os_template ?? {}) };
          return { os_template: templates[0] };
        },
      },
    });

    await page.goto('/admin/cluster/os-templates');
    await expect(page.getByTestId('admin.cluster.os_templates.page')).toBeVisible();
    await expect(page.getByTestId('admin.cluster.os_templates.table')).toContainText('Debian 12');

    await page.getByTestId('admin.cluster.os_templates.advanced').click();
    await page.getByTestId('admin.cluster.os_templates.filter.os_family').selectOption('1');
    await expect.poll(() => gets.some((url) => url.searchParams.get('os_template[os_family]') === '1')).toBeTruthy();
    await page
      .getByTestId('admin.cluster.os_templates.advanced.drawer')
      .getByRole('button', { name: /hotovo|done/i })
      .click();

    await page.getByTestId('admin.cluster.os_templates.row.11.edit').click();
    await expect(page.getByTestId('admin.cluster.os_templates.editor')).toBeVisible();
    await page.getByTestId('admin.cluster.os_templates.editor.label').fill('Debian 12 LTS');
    await page.getByTestId('admin.cluster.os_templates.editor.save').click();

    expect(puts.length).toBeGreaterThan(0);
    expect(puts[puts.length - 1]).toEqual({
      os_template: expect.objectContaining({
        label: 'Debian 12 LTS',
        enabled: true,
        supported: true,
        hypervisor_type: 'vpsadminos',
        cgroup_version: 'cgroup_v2',
      }),
    });
  });

  test('resource packages list, detail items and assignments work', async ({ page }) => {
    const environments = [{ id: 1, label: 'Production' }];
    const users = [{ id: 7, login: 'alice' }];
    const clusterResources = [
      { id: 3, label: 'Memory', name: 'memory' },
      { id: 4, label: 'CPU', name: 'cpu' },
    ];
    const packages: any[] = [
      { id: 21, label: 'Standard Production', environment: environments[0], is_personal: false },
    ];
    const items: any[] = [{ id: 31, cluster_resource: clusterResources[0], value: 4096 }];
    const assignments: any[] = [
      {
        id: 41,
        environment: environments[0],
        user: users[0],
        cluster_resource_package: packages[0],
        comment: 'Initial import',
        added_by: { id: 1, login: 'admin' },
      },
    ];
    const posts: any[] = [];

    await installHaveApiMock(page, {
      user: { id: 1, login: 'admin', level: 90 },
      handlers: {
        'GET environments': () => ({ environments, _meta: { total_count: environments.length } }),
        'GET users': () => ({ users, _meta: { total_count: users.length } }),
        'GET cluster_resources': () => ({
          cluster_resources: clusterResources,
          _meta: { total_count: clusterResources.length },
        }),
        'GET cluster_resource_packages': () => ({
          cluster_resource_packages: packages,
          _meta: { total_count: packages.length },
        }),
        'GET cluster_resource_packages/21': () => ({ cluster_resource_package: packages[0] }),
        'GET cluster_resource_packages/21/items': () => ({
          items,
          _meta: { total_count: items.length },
        }),
        'POST cluster_resource_packages/21/items': ({ json }) => {
          posts.push(json);
          const created = { id: 32, cluster_resource: clusterResources[1], value: (json as any)?.item?.value };
          items.push(created);
          return { item: created };
        },
        'GET user_cluster_resource_packages': () => ({
          user_cluster_resource_packages: assignments,
          _meta: { total_count: assignments.length },
        }),
        'POST user_cluster_resource_packages': ({ json }) => {
          posts.push(json);
          const created = {
            id: 42,
            environment: environments[0],
            user: users[0],
            cluster_resource_package: packages[0],
            comment: (json as any)?.user_cluster_resource_package?.comment,
          };
          assignments.push(created);
          return { user_cluster_resource_package: created };
        },
      },
    });

    await page.goto('/admin/cluster/resource-packages');
    await expect(page.getByTestId('admin.cluster.resource_packages.table')).toContainText('Standard Production');
    await page.getByTestId('admin.cluster.resource_packages.row.21.open').click();
    await expect(page).toHaveURL(/\/admin\/cluster\/resource-packages\/21/);
    await expect(page.getByTestId('admin.cluster.resource_package_detail.header')).toContainText('Standard Production');

    await page.getByTestId('admin.cluster.resource_package_detail.items.add').click();
    await expect(page.getByTestId('admin.cluster.resource_package_detail.item_editor')).toBeVisible();
    await page.getByTestId('admin.cluster.resource_package_detail.item_editor.resource').selectOption('4');
    await page.getByTestId('admin.cluster.resource_package_detail.item_editor.value').fill('8');
    await page.getByTestId('admin.cluster.resource_package_detail.item_editor.save').click();

    await page.getByTestId('admin.cluster.resource_package_detail.assign.add').click();
    await expect(page.getByTestId('admin.cluster.resource_package_detail.assign_editor')).toBeVisible();
    await page.getByTestId('admin.cluster.resource_package_detail.assign_editor.environment').selectOption('1');
    await page.getByTestId('admin.cluster.resource_package_detail.assign_editor.user').fill('7');
    await page.getByTestId('admin.cluster.resource_package_detail.assign_editor.comment').fill('Smoke assignment');
    await page.getByTestId('admin.cluster.resource_package_detail.assign_editor.save').click();

    expect(posts).toContainEqual({
      item: {
        cluster_resource: 4,
        value: 8,
      },
    });
    expect(posts).toContainEqual({
      user_cluster_resource_package: {
        environment: 1,
        user: 7,
        cluster_resource_package: 21,
        comment: 'Smoke assignment',
        from_personal: false,
      },
    });
  });

  test('resource package editor keeps rejected changes in context for retry', async ({ page }) => {
    let packages: any[] = [{ id: 21, label: 'Standard Production', is_personal: false }];
    let createAttempts = 0;
    let updateAttempts = 0;

    await installHaveApiMock(page, {
      user: { id: 1, login: 'admin', level: 90 },
      handlers: {
        'GET environments': () => ({ environments: [], _meta: { total_count: 0 } }),
        'GET cluster_resource_packages': () => ({
          cluster_resource_packages: [...packages],
          _meta: { total_count: packages.length },
        }),
        'POST cluster_resource_packages': () => {
          createAttempts += 1;
          if (createAttempts === 1) return failEnvelope('Package label is already in use');
          const created = { id: 22, label: 'Retry package', is_personal: false };
          packages = [...packages, created];
          return { cluster_resource_package: created };
        },
        'PUT cluster_resource_packages/22': () => {
          updateAttempts += 1;
          if (updateAttempts === 1) return failEnvelope('Package changed on the server');
          packages = packages.map((pkg) => (pkg.id === 22 ? { ...pkg, label: 'Renamed after retry' } : pkg));
          return { cluster_resource_package: packages.find((pkg) => pkg.id === 22) };
        },
      },
    });

    await page.goto('/admin/cluster/resource-packages');
    await page.getByTestId('admin.cluster.resource_packages.create').click();
    const editor = page.getByTestId('admin.cluster.resource_packages.editor');
    const label = page.getByTestId('admin.cluster.resource_packages.editor.label');
    const save = page.getByTestId('admin.cluster.resource_packages.editor.save');

    await label.fill('Retry package');
    await save.click();
    await expect(page.getByTestId('admin.cluster.resource_packages.editor.error')).toContainText(
      'Package label is already in use'
    );
    await expect(label).toHaveValue('Retry package');
    await save.click();
    await expect(editor).toBeHidden();
    await expect(page.getByTestId('admin.cluster.resource_packages.row.22')).toBeVisible();

    await page.getByTestId('admin.cluster.resource_packages.row.22.edit').click();
    await label.fill('Renamed after retry');
    await save.click();
    await expect(page.getByTestId('admin.cluster.resource_packages.editor.error')).toContainText(
      'Package changed on the server'
    );
    await expect(label).toHaveValue('Renamed after retry');
    await save.click();
    await expect(editor).toBeHidden();
    await expect(page.getByTestId('admin.cluster.resource_packages.row.22')).toContainText('Renamed after retry');

    expect({ createAttempts, updateAttempts }).toEqual({ createAttempts: 2, updateAttempts: 2 });
  });

  test('resource package deletion keeps a rejected target in context and supports retry', async ({ page }) => {
    const packages: any[] = [{ id: 21, label: 'Standard Production', is_personal: false }];
    let deleteAttempts = 0;

    await installHaveApiMock(page, {
      user: { id: 1, login: 'admin', level: 90 },
      handlers: {
        'GET environments': () => ({ environments: [], _meta: { total_count: 0 } }),
        'GET users': () => ({ users: [], _meta: { total_count: 0 } }),
        'GET cluster_resource_packages': () => ({
          cluster_resource_packages: packages,
          _meta: { total_count: packages.length },
        }),
        'GET user_cluster_resource_packages': () => ({ user_cluster_resource_packages: [], _meta: { total_count: 0 } }),
        'DELETE cluster_resource_packages/21': () => {
          deleteAttempts += 1;
          if (deleteAttempts === 1) {
            return {
              status: 409,
              contentType: 'application/json',
              body: JSON.stringify({ status: false, message: 'Package is still assigned' }),
            };
          }
          packages.splice(0, 1);
          return { cluster_resource_package: { id: 21 } };
        },
      },
    });

    await page.goto('/admin/cluster/resource-packages');
    await page.getByTestId('admin.cluster.resource_packages.row.21.delete').click();
    const dialog = page.getByTestId('admin.cluster.resource_packages.delete_confirm');
    await expect(dialog).toContainText('Standard Production');

    await dialog.getByRole('button', { name: /delete|smazat/i }).click();
    await expect(page.getByTestId('admin.cluster.resource_packages.delete_confirm.error')).toContainText(
      'Package is still assigned'
    );
    await expect(dialog).toContainText('Standard Production');

    await dialog.getByRole('button', { name: /delete|smazat/i }).click();
    await expect(dialog).toBeHidden();
    await expect(page.getByTestId('admin.cluster.resource_packages.row.21')).toHaveCount(0);
    expect(deleteAttempts).toBe(2);
  });

  test('resource package detail keeps a rejected deletion in context and supports retry', async ({ page }) => {
    const resourcePackage = { id: 21, label: 'Standard Production', is_personal: false };
    const items: any[] = [{ id: 31, cluster_resource: { id: 3, label: 'Memory', name: 'memory' }, value: 4096 }];
    const assignments: any[] = [
      {
        id: 41,
        environment: { id: 1, label: 'Production' },
        user: { id: 7, login: 'alice' },
        cluster_resource_package: resourcePackage,
        comment: '',
      },
    ];
    let packageDeleteAttempts = 0;
    let itemDeleteAttempts = 0;
    let assignmentDeleteAttempts = 0;

    await installHaveApiMock(page, {
      user: { id: 1, login: 'admin', level: 90 },
      handlers: {
        'GET environments': () => ({ environments: [], _meta: { total_count: 0 } }),
        'GET cluster_resources': () => ({ cluster_resources: [], _meta: { total_count: 0 } }),
        'GET cluster_resource_packages/21': () => ({ cluster_resource_package: resourcePackage }),
        'GET cluster_resource_packages/21/items': () => ({ items, _meta: { total_count: items.length } }),
        'GET user_cluster_resource_packages': () => ({
          user_cluster_resource_packages: assignments,
          _meta: { total_count: assignments.length },
        }),
        'DELETE cluster_resource_packages/21/items/31': () => {
          itemDeleteAttempts += 1;
          if (itemDeleteAttempts === 1) {
            return {
              status: 409,
              contentType: 'application/json',
              body: JSON.stringify({ status: false, message: 'Resource item is still in use' }),
            };
          }
          items.splice(0, 1);
          return { item: { id: 31 } };
        },
        'DELETE user_cluster_resource_packages/41': () => {
          assignmentDeleteAttempts += 1;
          if (assignmentDeleteAttempts === 1) {
            return {
              status: 409,
              contentType: 'application/json',
              body: JSON.stringify({ status: false, message: 'Assignment changed on the server' }),
            };
          }
          assignments.splice(0, 1);
          return { user_cluster_resource_package: { id: 41 } };
        },
        'DELETE cluster_resource_packages/21': () => {
          packageDeleteAttempts += 1;
          if (packageDeleteAttempts === 1) {
            return {
              status: 409,
              contentType: 'application/json',
              body: JSON.stringify({ status: false, message: 'Package is still assigned' }),
            };
          }
          return { cluster_resource_package: { id: 21 } };
        },
      },
    });

    await page.goto('/admin/cluster/resource-packages/21');

    await page.getByTestId('admin.cluster.resource_package_detail.items.row.31.delete').click();
    const itemDialog = page.getByTestId('admin.cluster.resource_package_detail.item_delete_confirm');
    await expect(itemDialog).toContainText('Memory');
    await expect(itemDialog).toContainText('4096');
    await itemDialog.getByRole('button', { name: /delete|smazat/i }).click();
    await expect(page.getByTestId('admin.cluster.resource_package_detail.item_delete_confirm.error')).toContainText(
      'Resource item is still in use'
    );
    await itemDialog.getByRole('button', { name: /delete|smazat/i }).click();
    await expect(itemDialog).toBeHidden();
    await expect(page.getByTestId('admin.cluster.resource_package_detail.items.row.31')).toHaveCount(0);

    await page.getByTestId('admin.cluster.resource_package_detail.assign.row.41.delete').click();
    const assignmentDialog = page.getByTestId('admin.cluster.resource_package_detail.assign_delete_confirm');
    await expect(assignmentDialog).toContainText('alice');
    await expect(assignmentDialog).toContainText('Production');
    await assignmentDialog.getByRole('button', { name: /delete|smazat/i }).click();
    await expect(page.getByTestId('admin.cluster.resource_package_detail.assign_delete_confirm.error')).toContainText(
      'Assignment changed on the server'
    );
    await assignmentDialog.getByRole('button', { name: /delete|smazat/i }).click();
    await expect(assignmentDialog).toBeHidden();
    await expect(page.getByTestId('admin.cluster.resource_package_detail.assign.row.41')).toHaveCount(0);

    await page.getByTestId('admin.cluster.resource_package_detail.delete').click();
    const dialog = page.getByTestId('admin.cluster.resource_package_detail.delete_confirm');
    await expect(dialog).toContainText('Standard Production');
    await expect(dialog).toContainText('#21');

    await dialog.getByRole('button', { name: /delete|smazat/i }).click();
    await expect(page.getByTestId('admin.cluster.resource_package_detail.delete_confirm.error')).toContainText(
      'Package is still assigned'
    );
    await expect(dialog).toContainText('Standard Production');

    await dialog.getByRole('button', { name: /delete|smazat/i }).click();
    await expect(dialog).toBeHidden();
    expect(itemDeleteAttempts).toBe(2);
    expect(assignmentDeleteAttempts).toBe(2);
    expect(packageDeleteAttempts).toBe(2);
  });
});

test('captures package list states, personal-user prompt and authoritative delete impacts', async ({
  page,
}, testInfo) => {
  await bootstrapVpsAdminWindow(page, { sessionToken: 'PACKAGE_LIST_STATES' });
  await setUiSettingsLocalStorage(page, { language: 'en' });
  let phase = 'pending';
  let reads = 0;
  let writes = 0;
  let total: number | undefined = 0;
  let release!: () => void;
  const pending = new Promise<void>((resolve) => {
    release = resolve;
  });
  await installHaveApiMock(page, {
    user: { id: 1, login: 'admin', level: 90 },
    handlers: {
      'GET environments': () => ({ environments: [] }),
      'GET cluster_resource_packages': async () => {
        reads += 1;
        if (phase === 'pending') await pending;
        if (phase === 'error') return failEnvelope('Package list unavailable');
        return {
          cluster_resource_packages: phase === 'empty' ? [] : [{ id: 21, label: 'State package', is_personal: false }],
        };
      },
      'GET user_cluster_resource_packages': () => ({
        user_cluster_resource_packages: [],
        ...(total === undefined ? {} : { _meta: { total_count: total } }),
      }),
      'DELETE cluster_resource_packages/21': () => {
        writes += 1;
        return { cluster_resource_package: {} };
      },
    },
  });
  try {
    await page.goto('/admin/cluster/resource-packages?scope=personal');
    await expect(page.getByTestId('admin.cluster.resource_packages.personal_user_required')).toBeVisible();
    expect(reads).toBe(0);
    await page
      .getByTestId('admin.cluster.resource_packages.personal_user_required')
      .screenshot({ path: testInfo.outputPath('package-personal-user-required.png'), scale: 'css' });
    await page.goto('/admin/cluster/resource-packages');
    await expect.poll(() => reads).toBeGreaterThan(0);
    await expect(page.getByTestId('admin.cluster.resource_packages.loading')).toBeVisible();
    await expect(page.getByTestId('admin.cluster.resource_packages.empty')).toHaveCount(0);
    await page
      .getByTestId('admin.cluster.resource_packages.loading')
      .screenshot({ path: testInfo.outputPath('package-list-pending.png'), scale: 'css' });
    phase = 'error';
    release();
    await expect(page.getByTestId('admin.cluster.resource_packages.error')).toContainText('Package list unavailable');
    await page
      .getByTestId('admin.cluster.resource_packages.error')
      .screenshot({ path: testInfo.outputPath('package-list-error.png'), scale: 'css' });
    phase = 'empty';
    await page.reload();
    await expect(page.getByTestId('admin.cluster.resource_packages.empty')).toBeVisible();
    await page
      .getByTestId('admin.cluster.resource_packages.empty')
      .screenshot({ path: testInfo.outputPath('package-list-known-empty.png'), scale: 'css' });
    phase = 'ready';
    for (total of [0, 7, undefined]) {
      await page.reload();
      await expect(page.getByTestId('admin.cluster.resource_packages.row.21.open')).toBeVisible();
      const response = page.waitForResponse(
        (r) => r.request().method() === 'GET' && new URL(r.url()).pathname.endsWith('/user_cluster_resource_packages')
      );
      await page.getByTestId('admin.cluster.resource_packages.row.21.delete').click();
      await (await response).finished();
      const dialog = page.getByTestId('admin.cluster.resource_packages.delete_confirm');
      await expect(dialog).toContainText(
        `Impact: removes this package from all assigned users (${total ?? '—'} assignment(s)).`
      );
      await dialog.screenshot({
        path: testInfo.outputPath(`package-list-delete-impact-${total ?? 'missing'}.png`),
        scale: 'css',
      });
      await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
    }
    expect(writes).toBe(0);
  } finally {
    release();
  }
});

test('captures independent package child reads and missing null zero positive totals', async ({ page }, testInfo) => {
  await bootstrapVpsAdminWindow(page, { sessionToken: 'PACKAGE_CHILD_STATES' });
  await setUiSettingsLocalStorage(page, { language: 'en' });
  let phase = 'items-pending';
  let releaseItems!: () => void;
  let releaseAssignments!: () => void;
  const pendingItems = new Promise<void>((resolve) => {
    releaseItems = resolve;
  });
  const pendingAssignments = new Promise<void>((resolve) => {
    releaseAssignments = resolve;
  });
  const environment = { id: 1, label: 'Production' };
  const user = { id: 7, login: 'alice' };
  const pkg = { id: 21, label: 'Independent reads', is_personal: false };
  const resource = { id: 3, label: 'Memory', name: 'memory' };
  const items = [{ id: 31, cluster_resource: resource, value: 4096 }];
  const assignments = [
    {
      id: 41,
      environment,
      user,
      cluster_resource_package: pkg,
      added_by: { id: 1, login: 'admin' },
      comment: 'Retained assignment',
      created_at: '2026-11-04T12:00:00Z',
    },
  ];
  await installHaveApiMock(page, {
    user: { id: 1, login: 'admin', level: 90 },
    handlers: {
      'GET environments': () => ({ environments: [environment] }),
      'GET cluster_resources': () => ({ cluster_resources: [resource] }),
      'GET cluster_resource_packages/21': () => ({ cluster_resource_package: pkg }),
      'GET cluster_resource_packages/21/items': async () => {
        if (phase === 'items-pending') await pendingItems;
        if (phase === 'items-error') return failEnvelope('Items unavailable');
        return { items };
      },
      'GET user_cluster_resource_packages': async () => {
        if (phase === 'assignments-pending') await pendingAssignments;
        if (phase === 'assignments-error') return failEnvelope('Assignments unavailable');
        if (phase === 'missing-total') return { user_cluster_resource_packages: assignments };
        if (phase === 'null-total')
          return { user_cluster_resource_packages: assignments, _meta: { total_count: null } };
        return {
          user_cluster_resource_packages: phase === 'zero' ? [] : assignments,
          _meta: { total_count: phase === 'zero' ? 0 : 7 },
        };
      },
    },
  });
  const header = page.getByTestId('admin.cluster.resource_package_detail.header');
  const stats = header.locator('.tabular-nums');
  const warning = page.getByTestId('admin.cluster.resource_package_detail.alert');
  try {
    await page.goto('/admin/cluster/resource-packages/21');
    await expect(page.getByTestId('admin.cluster.resource_package_detail.assign.row.41')).toBeVisible();
    await expect(page.getByTestId('admin.cluster.resource_package_detail.items.loading')).toBeVisible();
    await expect(page.getByTestId('admin.cluster.resource_package_detail.items.empty')).toHaveCount(0);
    await expect(stats.nth(0)).toHaveText('—');
    await expect(stats.nth(1)).toHaveText('7');
    await expect(warning).toContainText('assigned to 7 user(s).');
    await header.screenshot({ path: testInfo.outputPath('package-items-pending-header.png'), scale: 'css' });
    await page
      .getByTestId('admin.cluster.resource_package_detail.items')
      .screenshot({ path: testInfo.outputPath('package-items-pending.png'), scale: 'css' });
    releaseItems();
    await expect(page.getByTestId('admin.cluster.resource_package_detail.items.row.31')).toBeVisible();
    phase = 'assignments-pending';
    await page.reload();
    await expect(page.getByTestId('admin.cluster.resource_package_detail.items.row.31')).toBeVisible();
    await expect(page.getByTestId('admin.cluster.resource_package_detail.assign.loading')).toBeVisible();
    await expect(page.getByTestId('admin.cluster.resource_package_detail.assign.empty')).toHaveCount(0);
    await expect(stats.nth(0)).toHaveText('1');
    await expect(stats.nth(1)).toHaveText('—');
    await expect(warning).toContainText('assigned to — user(s).');
    await header.screenshot({ path: testInfo.outputPath('package-assignments-pending-header.png'), scale: 'css' });
    await page
      .getByTestId('admin.cluster.resource_package_detail.assignments')
      .screenshot({ path: testInfo.outputPath('package-assignments-pending.png'), scale: 'css' });
    phase = 'zero';
    releaseAssignments();
    await expect(stats.nth(1)).toHaveText('0');
    await expect(page.getByTestId('admin.cluster.resource_package_detail.assign.empty')).toBeVisible();
    await expect(warning).toContainText('assigned to 0 user(s).');
    await header.screenshot({ path: testInfo.outputPath('package-known-zero-header.png'), scale: 'css' });
    for (phase of ['items-error', 'assignments-error', 'missing-total', 'null-total']) {
      await page.reload();
      if (phase === 'items-error') {
        await expect(page.getByTestId('admin.cluster.resource_package_detail.items.error')).toContainText(
          'Items unavailable'
        );
        await expect(page.getByTestId('admin.cluster.resource_package_detail.assign.row.41')).toBeVisible();
        await expect(stats.nth(0)).toHaveText('—');
        await expect(stats.nth(1)).toHaveText('7');
        await page
          .getByTestId('admin.cluster.resource_package_detail.items')
          .screenshot({ path: testInfo.outputPath('package-items-error.png'), scale: 'css' });
      } else if (phase === 'assignments-error') {
        await expect(page.getByTestId('admin.cluster.resource_package_detail.assign.error')).toContainText(
          'Assignments unavailable'
        );
        await expect(page.getByTestId('admin.cluster.resource_package_detail.items.row.31')).toBeVisible();
        await expect(stats.nth(0)).toHaveText('1');
        await expect(stats.nth(1)).toHaveText('—');
        await page
          .getByTestId('admin.cluster.resource_package_detail.assignments')
          .screenshot({ path: testInfo.outputPath('package-assignments-error.png'), scale: 'css' });
      } else {
        await expect(page.getByTestId('admin.cluster.resource_package_detail.assign.row.41')).toBeVisible();
        await expect(stats.nth(0)).toHaveText('1');
        await expect(stats.nth(1)).toHaveText('—');
        await expect(warning).toContainText('assigned to — user(s).');
        await header.screenshot({ path: testInfo.outputPath(`package-${phase}-header.png`), scale: 'css' });
      }
    }
    await page
      .getByTestId('admin.cluster.resource_package_detail.alert')
      .screenshot({ path: testInfo.outputPath('package-null-total-warning.png'), scale: 'css' });
    await page.getByTestId('admin.cluster.resource_package_detail.delete').click();
    const deletePackage = page.getByTestId('admin.cluster.resource_package_detail.delete_confirm');
    await expect(deletePackage).toContainText(
      'Impact: removes this package from all assigned users (— assignment(s)).'
    );
    await deletePackage.screenshot({ path: testInfo.outputPath('package-null-total-delete-impact.png'), scale: 'css' });
    await deletePackage.getByRole('button', { name: 'Cancel', exact: true }).click();
    await page.getByTestId('admin.cluster.resource_package_detail.items.row.31.delete').click();
    const deleteItem = page.getByTestId('admin.cluster.resource_package_detail.item_delete_confirm');
    await expect(deleteItem).toContainText('Impact: applies to — affected user(s).');
    await deleteItem.screenshot({ path: testInfo.outputPath('package-null-total-item-impact.png'), scale: 'css' });
    await deleteItem.getByRole('button', { name: 'Cancel', exact: true }).click();
  } finally {
    releaseItems();
    releaseAssignments();
  }
});

test('captures personal package and from-personal assignment consequences', async ({ page }, testInfo) => {
  await bootstrapVpsAdminWindow(page, { sessionToken: 'PERSONAL_PACKAGE_REVIEW' });
  await setUiSettingsLocalStorage(page, { language: 'cs', theme: 'dark' });
  const environment = { id: 1, label: 'Production' };
  const user = { id: 7, login: 'alice' };
  const resource = { id: 3, label: 'Memory', name: 'memory' };
  await installHaveApiMock(page, {
    user: { id: 1, login: 'admin', level: 90 },
    handlers: {
      'GET environments': () => ({ environments: [environment] }),
      'GET users': () => ({ users: [user] }),
      'GET cluster_resources': () => ({ cluster_resources: [resource] }),
      'GET cluster_resource_packages/21': () => ({
        cluster_resource_package: { id: 21, label: 'Personal alice', environment, user, is_personal: true },
      }),
      'GET cluster_resource_packages/22': () => ({
        cluster_resource_package: { id: 22, label: 'Global replacement target', is_personal: false },
      }),
      'GET cluster_resource_packages/21/items': () => ({
        items: [{ id: 31, cluster_resource: resource, value: 4096 }],
      }),
      'GET cluster_resource_packages/22/items': () => ({ items: [] }),
      'GET user_cluster_resource_packages': () => ({ user_cluster_resource_packages: [], _meta: { total_count: 0 } }),
    },
  });
  await page.goto('/admin/cluster/resource-packages/21');
  await expect(page.getByTestId('admin.cluster.resource_package_detail.header')).toContainText('alice');
  await expect(page.getByTestId('admin.cluster.resource_package_detail.delete')).toBeDisabled();
  await expect(page.getByTestId('admin.cluster.resource_package_detail.assignments')).toHaveCount(0);
  await page
    .getByTestId('admin.cluster.resource_package_detail.header')
    .screenshot({ path: testInfo.outputPath('package-personal-header.png'), scale: 'css' });
  await page
    .getByTestId('admin.cluster.resource_package_detail.alert.personal')
    .screenshot({ path: testInfo.outputPath('package-personal-scope.png'), scale: 'css' });
  await page.getByTestId('admin.cluster.resource_package_detail.items.row.31.delete').click();
  const itemDelete = page.getByTestId('admin.cluster.resource_package_detail.item_delete_confirm');
  await expect(itemDelete).toContainText('Dopad: projeví se u 1 ovlivněných uživatelů.');
  await itemDelete.screenshot({ path: testInfo.outputPath('package-personal-item-impact.png'), scale: 'css' });
  await itemDelete.getByRole('button', { name: 'Zrušit', exact: true }).click();
  await page.goto('/admin/cluster/resource-packages/22');
  await page.getByTestId('admin.cluster.resource_package_detail.assign.add').click();
  const assign = page.getByTestId('admin.cluster.resource_package_detail.assign_editor');
  await page.getByTestId('admin.cluster.resource_package_detail.assign_editor.environment').selectOption('1');
  await page.getByTestId('admin.cluster.resource_package_detail.assign_editor.user').fill('7');
  const fromPersonal = page.getByTestId('admin.cluster.resource_package_detail.assign_editor.from_personal');
  await fromPersonal.click();
  await expect(fromPersonal.getByRole('checkbox')).toBeChecked();
  await assign.screenshot({ path: testInfo.outputPath('package-from-personal-consequence.png'), scale: 'css' });
  await assign.getByRole('button', { name: 'Zrušit', exact: true }).click();
});
