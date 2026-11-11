import { expect, test } from '@playwright/test';

import { bootstrapVpsAdminWindow, failEnvelope, installHaveApiMock } from '../../fixtures';
import { setUiSettingsLocalStorage } from '../../fixtures/uiSettings';
import type { HaveApiRequestCtx } from '../../fixtures/haveapi';

test('admin user resource usage and package assignment are separate', async ({ page }) => {
  let packageUserFilter: string | null = null;
  await bootstrapVpsAdminWindow(page, { sessionToken: 'TEST' });
  await installHaveApiMock(page, {
    user: { id: 1, login: 'admin', level: 100 },
    handlers: {
      'GET users/53': () => ({ user: { id: 53, login: 'kavman', level: 1 } }),
      'GET environments': () => ({ environments: [{ id: 7, label: 'Production' }, { id: 8, label: 'Playground' }] }),
      'GET cluster_resource_packages': ({ searchParams }) => {
        packageUserFilter = searchParams.get('cluster_resource_package[user]');

        if (packageUserFilter !== '') {
          return { cluster_resource_packages: [{ id: 99, label: 'Personal package', is_personal: true }] };
        }

        return { cluster_resource_packages: [
          { id: 11, label: 'Standard Production' },
          { id: 12, label: 'Standard Playground' },
          { id: 13, label: 'Standard Staging' },
        ] };
      },
      'GET user_cluster_resource_packages': () => ({ user_cluster_resource_packages: [
        { id: 20, is_personal: true, environment: { id: 7, label: 'Production' }, cluster_resource_package: { id: 99, label: 'Personal package', is_personal: true } },
        { id: 21, is_personal: false, environment: { id: 7, label: 'Production' }, cluster_resource_package: { id: 11, label: 'Standard Production', is_personal: false } },
        { id: 22, is_personal: false, environment: { id: 8, label: 'Playground' }, cluster_resource_package: { id: 12, label: 'Standard Playground', is_personal: false } },
        { id: 23, is_personal: true, environment: { id: 8, label: 'Playground' }, cluster_resource_package: { id: 98, label: 'Personal package', is_personal: true } },
      ] }),
      'GET users/53/cluster_resources': () => ({ cluster_resources: [
        { id: 31, environment: { id: 7, label: 'Production' }, cluster_resource: { id: 2, name: 'cpu', label: 'CPU', stepsize: 1 }, value: 4, used: 2, free: 2 },
        { id: 33, environment: { id: 7, label: 'Production' }, cluster_resource: { id: 3, name: 'memory', label: 'Memory', stepsize: 1 }, value: 4096, used: 4096, free: 0 },
        { id: 34, environment: { id: 7, label: 'Production' }, cluster_resource: { id: 4, name: 'private_ipv4', label: 'Private IPv4 address', stepsize: 1 }, value: 0, used: 0, free: 0 },
      ] }),
      'GET users/1/cluster_resources': () => ({ cluster_resources: [
        { id: 32, environment: { id: 7, label: 'Production' }, cluster_resource: { id: 2, name: 'cpu', label: 'CPU' }, value: 4, used: 1, free: 3 },
        { id: 35, environment: { id: 7, label: 'Production' }, cluster_resource: { id: 4, name: 'private_ipv4', label: 'Private IPv4 address' }, value: 0, used: 0, free: 0 },
      ] }),
      'GET cluster_resource_packages/98/items': () => ({ items: [{ id: 3, value: 0, cluster_resource: { id: 2, label: 'CPU' } }] }),
      'GET cluster_resource_packages/99/items': () => ({ items: [{ id: 4, value: 0, cluster_resource: { id: 2, label: 'CPU' } }] }),
      'GET cluster_resource_packages/11/items': () => ({ items: [{ id: 5, value: 4, cluster_resource: { id: 2, label: 'CPU' } }] }),
      'GET cluster_resource_packages/12/items': () => ({ items: [{ id: 6, value: 2048, cluster_resource: { id: 3, label: 'Memory', name: 'memory' } }] }),
      'POST user_cluster_resource_packages': () => ({ user_cluster_resource_package: { id: 21 } }),
    },
  });

  await page.goto('/admin/users/53/resources/usage');
  await expect(page.getByTestId('admin.user.resource_usage.page')).toBeVisible();
  await expect(page.getByTestId('admin.user.resource_usage.resources.environment.7')).toContainText('CPU');
  await expect(page.getByTestId('admin.user.resource_usage.resources.environment.7')).toContainText('2');
  await expect(page.getByTestId('admin.user.resource_usage.resources.environment.7.resource.31.bar').locator('div').nth(1)).toHaveAttribute('style', 'width: 50%;');
  await expect(page.getByTestId('admin.user.resource_usage.resources.environment.7.resource.33.bar').locator('div').nth(1)).toHaveAttribute('style', 'width: 100%;');
  await expect(page.getByTestId('admin.user.resource_usage.resources.environment.7.resource.34')).toHaveCount(0);

  await page.goto('/admin/users/53/resources');
  await expect(page.getByTestId('admin.user.resources.page')).toBeVisible();
  await expect(page.getByRole('heading', { name: /přiřazené balíčky|assigned packages/i })).toBeVisible();
  await expect(page.getByTestId('admin.user.resources.summary')).toContainText('Standard Production');
  await expect(page.getByTestId('admin.user.resources.summary')).toContainText('Standard Playground');
  const personalSummary = page.getByTestId('admin.user.resources.summary').locator('tbody tr').filter({ hasText: 'Personal package' });
  await expect(personalSummary).toContainText('2×');
  await expect(personalSummary.locator('td').nth(1)).toHaveText('2');
  await expect(page.getByTestId('admin.user.resources.summary').locator('tbody tr')).toHaveCount(3);
  await expect(page.getByTestId('admin.user.resources.environment.7')).toContainText('Standard Production');
  const personalAssignment = page.getByTestId('admin.user.resources.assignment.20');
  await expect(personalAssignment.getByRole('link', { name: /upravit balíček|edit package/i })).toBeVisible();
  await expect(personalAssignment.getByRole('button', { name: /odebrat|remove/i })).toHaveCount(0);
  const standardAssignment = page.getByTestId('admin.user.resources.assignment.21');
  await expect(standardAssignment.getByRole('link', { name: /upravit balíček|edit package/i })).toHaveCount(0);
  await expect(standardAssignment.getByRole('button', { name: /odebrat|remove/i })).toBeVisible();
  await expect.poll(() => packageUserFilter).toBe('');

  const layoutProofScreenshot = process.env['E2E_USER_RESOURCES_LAYOUT_PROOF_SCREENSHOT'];
  if (layoutProofScreenshot) await page.screenshot({ path: layoutProofScreenshot, fullPage: true });

  await page.getByTestId('admin.user.resources.add').click();
  const modal = page.getByTestId('admin.user.resources.add.modal');
  await modal.getByRole('combobox').nth(0).selectOption('7');
  const packageSelect = modal.getByRole('combobox').nth(1);
  await expect(packageSelect.locator('option')).toContainText(['Standard Production', 'Standard Playground', 'Standard Staging']);
  await packageSelect.selectOption('12');
  const proofScreenshot = process.env['E2E_USER_RESOURCES_PROOF_SCREENSHOT'];
  if (proofScreenshot) await page.screenshot({ path: proofScreenshot, fullPage: true });
  await page.getByRole('button', { name: /přidat balíček|add package/i }).last().click();

  await page.goto('/app/profile/resources');
  await expect(page.getByTestId('profile.resources.page')).toBeVisible();
  await expect(page.getByTestId('profile.resources.usage.environment.7')).toContainText('CPU');
  await expect(page.getByTestId('profile.resources.usage.environment.7.resource.32.bar').locator('div').nth(1)).toHaveAttribute('style', 'width: 25%;');
  await expect(page.getByTestId('profile.resources.usage.environment.7.resource.35')).toHaveCount(0);
  await expect(page.getByTestId('profile.resources.page')).not.toContainText(/přidat balíček|add package/i);
});

test('admin can retry a failed package removal with the error kept in context', async ({ page }) => {
  await bootstrapVpsAdminWindow(page, { sessionToken: 'TEST' });

  let deleteCalls = 0;
  let assignments = [
    {
      id: 21,
      is_personal: false,
      environment: { id: 7, label: 'Production' },
      cluster_resource_package: { id: 11, label: 'Standard Production', is_personal: false },
    },
  ];

  await installHaveApiMock(page, {
    user: { id: 1, login: 'admin', level: 100 },
    handlers: {
      'GET users/53': () => ({ user: { id: 53, login: 'kavman', level: 1 } }),
      'GET environments': () => ({ environments: [{ id: 7, label: 'Production' }] }),
      'GET cluster_resource_packages': () => ({
        cluster_resource_packages: [{ id: 11, label: 'Standard Production' }],
      }),
      'GET user_cluster_resource_packages': () => ({
        user_cluster_resource_packages: [...assignments],
      }),
      'GET cluster_resource_packages/11/items': () => ({ items: [] }),
      'DELETE user_cluster_resource_packages/21': () => {
        deleteCalls += 1;
        if (deleteCalls === 1) return failEnvelope('Package is still referenced');

        assignments = [];
        return {};
      },
    },
  });

  await page.goto('/admin/users/53/resources');
  const assignment = page.getByTestId('admin.user.resources.assignment.21');
  await assignment.getByRole('button', { name: /odebrat|remove/i }).click();

  const dialog = page.getByTestId('admin.user.resources.remove.confirm');
  await dialog.getByTestId('admin.user.resources.remove.confirm.confirm').click();

  await expect(dialog).toBeVisible();
  await expect(dialog.getByTestId('admin.user.resources.remove.error')).toContainText('Package is still referenced');
  await expect(assignment).toBeVisible();
  expect(deleteCalls).toBe(1);

  await dialog.getByTestId('admin.user.resources.remove.confirm.confirm').click();

  await expect(dialog).toBeHidden();
  await expect(page.getByTestId('admin.user.resources.assignment.21')).toHaveCount(0);
  expect(deleteCalls).toBe(2);
});

test('admin can retry a failed package assignment without losing the form', async ({ page }) => {
  await bootstrapVpsAdminWindow(page, { sessionToken: 'TEST' });

  let createCalls = 0;
  await installHaveApiMock(page, {
    user: { id: 1, login: 'admin', level: 100 },
    handlers: {
      'GET users/53': () => ({ user: { id: 53, login: 'kavman', level: 1 } }),
      'GET environments': () => ({ environments: [{ id: 7, label: 'Production' }] }),
      'GET cluster_resource_packages': () => ({
        cluster_resource_packages: [{ id: 11, label: 'Standard Production' }],
      }),
      'GET user_cluster_resource_packages': () => ({ user_cluster_resource_packages: [] }),
      'POST user_cluster_resource_packages': () => {
        createCalls += 1;
        if (createCalls === 1) return failEnvelope('Package assignment changed on the server');
        return { user_cluster_resource_package: { id: 31 } };
      },
    },
  });

  await page.goto('/admin/users/53/resources');
  await page.getByTestId('admin.user.resources.add').click();

  const modal = page.getByTestId('admin.user.resources.add.modal');
  const environment = modal.getByRole('combobox').nth(0);
  const resourcePackage = modal.getByRole('combobox').nth(1);
  const comment = modal.getByRole('textbox');
  const submit = modal.getByRole('button', { name: /přidat balíček|add package/i });

  await environment.selectOption('7');
  await resourcePackage.selectOption('11');
  await comment.fill('Keep this note for retry');
  await submit.click();

  await expect(modal).toBeVisible();
  await expect(modal.getByTestId('admin.user.resources.add.error')).toContainText('Package assignment changed on the server');
  await expect(environment).toHaveValue('7');
  await expect(resourcePackage).toHaveValue('11');
  await expect(comment).toHaveValue('Keep this note for retry');
  expect(createCalls).toBe(1);

  await submit.click();

  await expect(modal).toBeHidden();
  expect(createCalls).toBe(2);
});

for (const kind of ['selectors', 'items']) {
  test(`@pr-smoke @pr-smoke-mobile user package read ${kind}: loading, error, recovery and empty are distinct`, async ({ page }) => {
    const level = 99;
    const language = 'en';
    const theme = 'light';
    const reads: { target: string; phase: string; query: Record<string, string> }[] = [], writes: string[] = [], errors: string[] = [];
    page.on('pageerror', error => errors.push(String(error)));
    await page.clock.setFixedTime(new Date('2026-11-10T22:50:00Z'));
    await bootstrapVpsAdminWindow(page, {webuiNext: {uiSettings: {persistence: 'local'}}});
    await setUiSettingsLocalStorage(page, {language, theme});
    let phase = 'held', release!: () => void;
    const held = new Promise<void>(resolve => release = resolve);
    const environment = {id: 7, label: 'Ověřovací prostředí s dlouhým českým názvem'};
    const pkg = {id: 11, label: 'Sdílený ověřovací balíček prostředků pro vybraného uživatele', user: null};
    const failure = () => ({status: 503, contentType: 'application/json', body: JSON.stringify(failEnvelope('Ověřovací čtecí chyba. Syntetická data, žádná skutečná operace.'))});
    const query = async (target: string, ctx: HaveApiRequestCtx, data: Record<string, unknown>) => {
      reads.push({target, phase, query: Object.fromEntries(ctx.searchParams)});
      if (kind === 'selectors' && ['environments', 'packages'].includes(target) || kind === 'items' && target === 'items') {
        if (phase === 'held') await held;
        if (phase === 'held' || phase === 'error') return failure();
      }
      return data;
    };
    await installHaveApiMock(page, {user: {id: 7, level, login: 'synthetic-operator'}, handlers: {
      'GET users/42': () => ({user: {id: 42, level: 2, login: 'synthetic-selected-owner'}}),
      'GET vpses': () => ({vpses: []}),
      'GET user_cluster_resource_packages': ctx => {
        expect(ctx.searchParams.get('user_cluster_resource_package[user]')).toBe('42');
        return {user_cluster_resource_packages: [{id: 61, environment, cluster_resource_package: pkg, user: {id: 42}, is_personal: false}]};
      },
      'GET environments': ctx => query('environments', ctx, {environments: phase === 'empty' ? [] : [environment]}),
      'GET cluster_resource_packages': ctx => {
        expect(ctx.searchParams.get('cluster_resource_package[user]')).toBe('');
        expect(ctx.searchParams.get('cluster_resource_package[limit]')).toBe('500');
        return query('packages', ctx, {cluster_resource_packages: phase === 'empty' ? [] : [pkg]});
      },
      'GET cluster_resource_packages/11/items': ctx => query('items', ctx, {items: phase === 'empty' ? [] : [{id: 81, cluster_resource: {id: 1, name: 'memory', label: 'RAM – ověřovací paměťový prostředek'}, value: 8192}]}),
    }});
    await page.route('**/api/**', route => {
      if (['GET', 'HEAD', 'OPTIONS'].includes(route.request().method())) return route.fallback();
      writes.push(route.request().method()+' '+new URL(route.request().url()).pathname);
      return route.abort();
    });
    try {
      await page.goto('/admin/users/42/resources');
      const row = page.getByTestId('admin.user.resources.assignment.61');
      await expect(row).toBeVisible();
      if (kind === 'selectors') {
        await page.getByTestId('admin.user.resources.add').click();
        const modal = page.getByTestId('admin.user.resources.add.modal');
        const comment = modal.locator('input');
        await comment.fill('Rozpracovaná ověřovací poznámka zůstává při obnově voleb.');
        await page.setViewportSize({width: 320, height: 1000});

        await expect(page.getByTestId('admin.user.resources.environments.loading')).toBeVisible();
        await expect(page.getByTestId('admin.user.resources.packages.loading')).toBeVisible();

        phase = 'error'; release();
        const envError = page.getByTestId('admin.user.resources.environments.error');
        const packageError = page.getByTestId('admin.user.resources.packages.error');
        await expect(envError).toBeVisible(); await expect(packageError).toBeVisible();

        phase = 'ready';
        await page.getByTestId('admin.user.resources.environments.error.retry').click();
        await expect(modal.locator('select').nth(0).locator('option[value="7"]')).toHaveCount(1);
        await expect(packageError).toBeVisible();
        await page.getByTestId('admin.user.resources.packages.error.retry').click();
        await expect(modal.locator('select').nth(1).locator('option[value="11"]')).toHaveCount(1);
        await expect(packageError).toHaveCount(0);
        await expect(comment).toHaveValue('Rozpracovaná ověřovací poznámka zůstává při obnově voleb.');

        await modal.getByRole('button', {name: 'Cancel', exact: true}).click();
        phase = 'empty'; await page.reload();
        await page.getByTestId('admin.user.resources.add').click();
        await expect(modal.locator('select').nth(0).locator('option')).toHaveCount(1);
        await expect(modal.locator('select').nth(1).locator('option')).toHaveCount(1);
        await expect(envError).toHaveCount(0); await expect(packageError).toHaveCount(0);

      } else {
        await page.setViewportSize({width: 320, height: 1000});

        await expect(page.getByTestId('admin.user.resources.assignment.61.items.loading')).toBeVisible();
        await expect(page.getByTestId('admin.user.resources.assignment.61.items.empty')).toHaveCount(0);

        phase = 'error'; release();
        const error = page.getByTestId('admin.user.resources.assignment.61.items.error');
        await expect(error).toBeVisible();
        await expect(page.getByTestId('admin.user.resources.assignment.61.items.empty')).toHaveCount(0);

        phase = 'ready';
        await page.getByTestId('admin.user.resources.assignment.61.items.error.retry').click();
        await expect(row).toContainText('RAM – ověřovací paměťový prostředek');
        await expect(error).toHaveCount(0);

        phase = 'empty'; await page.reload();
        await expect(page.getByTestId('admin.user.resources.assignment.61.items.empty')).toBeVisible();
        await expect(error).toHaveCount(0);

      }
      expect(writes).toEqual([]); expect(errors).toEqual([]);
    } finally {
      release();

    }
  });

}

test('@pr-smoke @pr-smoke-mobile user package cached items survive a failed background read', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-11-10T22:50:00Z'));
  await bootstrapVpsAdminWindow(page, { sessionToken: 'TEST', webuiNext: { uiSettings: { persistence: 'local' } } });
  await setUiSettingsLocalStorage(page, { language: 'en', theme: 'light' });
  let phase: 'ready' | 'error' | 'recovered' = 'ready';
  const writes: string[] = [];
  const errors: string[] = [];
  const itemReads: string[] = [];
  page.on('pageerror', error => errors.push(String(error)));
  await installHaveApiMock(page, {
    user: { id: 7, level: 99, login: 'synthetic-operator' },
    handlers: {
      'GET users/42': () => ({ user: { id: 42, level: 2, login: 'synthetic-selected-owner' } }),
      'GET vpses': () => ({ vpses: [] }),
      'GET user_payments': () => ({ user_payments: [] }),
      'GET users/42/mail_role_recipients': () => ({ mail_role_recipients: [] }),
      'GET environments': () => ({ environments: [{ id: 7, label: 'Synthetic environment' }] }),
      'GET cluster_resource_packages': () => ({ cluster_resource_packages: [] }),
      'GET user_cluster_resource_packages': () => ({ user_cluster_resource_packages: [{
        id: 61, environment: { id: 7, label: 'Synthetic environment' },
        cluster_resource_package: { id: 11, label: 'Synthetic shared package' },
        is_personal: false,
      }] }),
      'GET cluster_resource_packages/11/items': () => {
        itemReads.push(phase);
        if (phase === 'error') return {
          status: 503, contentType: 'application/json',
          body: JSON.stringify(failEnvelope('Synthetic background read failed')),
        };
        return { items: [{ id: 81, value: phase === 'ready' ? 8192 : 16384,
          cluster_resource: { id: 1, name: 'memory', label: 'RAM' } }] };
      },
    },
  });
  await page.route('**/api/**', route => {
    if (['GET', 'HEAD', 'OPTIONS'].includes(route.request().method())) return route.fallback();
    writes.push(route.request().method() + ' ' + new URL(route.request().url()).pathname);
    return route.abort();
  });
  await page.goto('/admin/users/42/resources');
  const row = page.getByTestId('admin.user.resources.assignment.61');
  await expect(row).toContainText('RAM: 8 GiB');
  // Navigate within the app so React Query retains the last successful data.
  await page.locator('[data-document-title-tabs] a[href="/admin/users/42"]').click();
  await expect(page).toHaveURL(/\/admin\/users\/42$/);
  await page.clock.setSystemTime(new Date('2026-11-10T22:50:31Z'));
  phase = 'error';
  await page.locator('[data-document-title-tabs] a[href="/admin/users/42/resources"]').click();
  const error = page.getByTestId('admin.user.resources.assignment.61.items.error');
  await expect(error).toContainText('Synthetic background read failed');
  await expect(row).toContainText('RAM: 8 GiB');
  await expect(page.getByTestId('admin.user.resources.assignment.61.items.empty')).toHaveCount(0);
  phase = 'recovered';
  await page.getByTestId('admin.user.resources.assignment.61.items.error.retry').click();
  await expect(error).toHaveCount(0);
  await expect(row).toContainText('RAM: 16 GiB');
  expect(itemReads).toContain('error');
  expect(itemReads.at(-1)).toBe('recovered');
  expect(writes).toEqual([]);
  expect(errors).toEqual([]);
  await test.info().attach('cached-read-evidence', {
    body: JSON.stringify({ itemReads, writes, errors, fixtureOnly: true, liveWrites: 0 }),
    contentType: 'application/json',
  });
});
