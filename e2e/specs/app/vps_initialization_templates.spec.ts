import { expect, test, type Page } from '@playwright/test';
import { bootstrapVpsAdminWindow, failEnvelope, installHaveApiMock, setUiSettingsLocalStorage } from '../../fixtures';

const template = (id: number, user = 7) => ({
  id,
  user: { id: user },
  label: `Member ${user} cloud-init ${id}`,
  format: 'cloudinit_config',
});
const osTemplates = [
  {
    id: 6,
    label: 'Debian 12',
    distribution: 'Debian',
    version: '12',
    arch: 'x86_64',
    enabled: true,
    hypervisor_type: 'vpsadminos',
  },
];
const vps = {
  id: 123,
  hostname: 'fixture.example',
  object_state: 'active',
  is_running: false,
  user: { id: 7, login: 'member' },
  node: { id: 101, location: { id: 2, label: 'Praha', environment: { id: 1 } } },
  os_template: osTemplates[0],
  dataset: { id: 901 },
  cpus: 2,
  memory: 2048,
  swap: 0,
  diskspace: 10240,
};
const handlers = {
  'GET users/7': () => ({ user: { id: 7, login: 'member', level: 1 } }),
  'GET users/8': () => ({ user: { id: 8, login: 'other-member', level: 1 } }),
  'GET locations': () => ({ locations: [{ id: 2, label: 'Praha', environment: { id: 1, label: 'Test' } }] }),
  'GET nodes': () => ({
    nodes: [
      { id: 101, name: 'node101', type: 'node', hypervisor_type: 'vpsadminos', location: { id: 2, label: 'Praha' } },
    ],
  }),
  'GET os_templates': () => ({ os_templates: osTemplates }),
  'GET default_object_cluster_resources': () => ({
    default_object_cluster_resources: ['cpu', 'memory', 'diskspace', 'swap', 'ipv4', 'ipv6', 'ipv4_private'].map(
      (name, index) => ({ id: index + 1, cluster_resource: { name }, value: [2, 2048, 10240, 512, 1, 1, 0][index] })
    ),
  }),
  'GET vpses/123': () => ({ vps }),
  'GET vpses/123/statuses': () => ({ statuses: [] }),
  'GET vpses/123/state_logs': () => ({ state_logs: [] }),
  'GET ip_addresses': () => ({ ip_addresses: [] }),
  'GET transaction_chains': () => ({ transaction_chains: [] }),
  'POST vpses': () => ({ vps: { id: 150, hostname: 'fixture.example' }, _meta: { action_state_id: 42 } }),
};

async function fillCreate(page: Page, admin = false) {
  await page.getByTestId('vps.create.location').selectOption('2');
  if (admin) await page.getByTestId('vps.create.node').selectOption('101');
  await page.getByTestId('vps.create.os_template').selectOption('6');
  await page.getByTestId('vps.create.hostname').fill('fixture.example');
}
async function savedSource(page: Page, prefix: string) {
  await page.getByTestId(`${prefix}.enable`).check();
  await page.getByTestId(`${prefix}.source`).selectOption('saved');
}

test.describe('@pr-smoke @pr-smoke-mobile VPS initialization templates', () => {
  test('member create loads paginated own templates and submits only the selected ID', async ({ page }, testInfo) => {
    const queries: URL[] = [];
    await setUiSettingsLocalStorage(page, { language: 'cs', theme: 'dark' });
    await bootstrapVpsAdminWindow(page, { sessionToken: 'TEST' });
    await installHaveApiMock(page, {
      user: { id: 7, login: 'member', level: 1 },
      handlers: {
        ...handlers,
        'GET vps_user_data': ({ url }) => {
          queries.push(url);
          return {
            vps_user_data: url.searchParams.has('vps_user_data[from_id]')
              ? [template(50)]
              : Array.from({ length: 50 }, (_, i) => template(100 - i)),
          };
        },
      },
    });
    await page.goto('/app/vps/new');
    await fillCreate(page);
    await savedSource(page, 'vps.create.user_data');
    await expect(page.getByTestId('vps.create.user_data.template').locator('option')).toHaveCount(51);
    await page.getByTestId('vps.create.user_data.more').click();
    await page.getByTestId('vps.create.user_data.template').selectOption('50');
    await expect(page.getByTestId('vps.create.user_data.more')).toBeHidden();
    expect(queries.every((url) => !url.searchParams.has('vps_user_data[user]'))).toBe(true);
    expect(queries[1]?.searchParams.get('vps_user_data[from_id]')).toBe('51');
    await page.getByTestId('vps.create.user_data').scrollIntoViewIfNeeded();
    const screenshot = await page.screenshot({ path: testInfo.outputPath('initialization.png'), scale: 'css' });
    await testInfo.attach('Initialization — Czech, synthetic fixture', { body: screenshot, contentType: 'image/png' });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const request = page.waitForRequest((r) => r.method() === 'POST' && new URL(r.url()).pathname.endsWith('/vpses'));
    await page.getByTestId('vps.create.submit').click();
    const body = (await request).postDataJSON() as { vps: Record<string, unknown> };
    expect(body.vps['vps_user_data']).toBe(50);
    expect(body.vps).not.toHaveProperty('user_data_content');
    expect(body.vps).not.toHaveProperty('user_data_format');
    expect(body.vps).not.toHaveProperty('user');
  });

  test('admin changes owner without reusing a previously selected template', async ({ page }) => {
    const owners: string[] = [];
    await bootstrapVpsAdminWindow(page, { sessionToken: 'TEST' });
    await installHaveApiMock(page, {
      user: { id: 1, login: 'admin', level: 99 },
      handlers: {
        ...handlers,
        'GET vps_user_data': ({ url }) => {
          const owner = url.searchParams.get('vps_user_data[user]') ?? '';
          owners.push(owner);
          return { vps_user_data: [template(Number(owner) * 10, Number(owner)), template(999, 99)] };
        },
      },
    });
    await page.goto('/admin/vps/new?user=7');
    await fillCreate(page, true);
    await savedSource(page, 'vps.create.user_data');
    await page.getByTestId('vps.create.user_data.template').selectOption('70');
    await expect(page.getByTestId('vps.create.user_data.template').locator('option[value="999"]')).toHaveCount(0);
    await page.getByTestId('vps.create.user').fill('8');
    await expect(page.getByTestId('vps.create.user_data.template').locator('option[value="80"]')).toHaveCount(1);
    await expect(page.getByTestId('vps.create.user_data.template')).toHaveValue('');
    await expect(page.getByTestId('vps.create.submit')).toHaveText('Review missing fields');
    await page.getByTestId('vps.create.user_data.template').selectOption('80');
    const request = page.waitForRequest((r) => r.method() === 'POST' && new URL(r.url()).pathname.endsWith('/vpses'));
    await page.getByTestId('vps.create.submit').click();
    expect((await request).postDataJSON()).toMatchObject({ vps: { user: 8, vps_user_data: 80 } });
    expect(owners).toEqual(['7', '8']);
  });

  test('inline create preserves script bytes and ignores a saved selection', async ({ page }) => {
    await bootstrapVpsAdminWindow(page, { sessionToken: 'TEST' });
    await installHaveApiMock(page, {
      user: { id: 7, login: 'member', level: 1 },
      handlers: {
        ...handlers,
        'GET vps_user_data': () => ({ vps_user_data: [template(70)] }),
      },
    });
    await page.goto('/app/vps/new');
    await fillCreate(page);
    await savedSource(page, 'vps.create.user_data');
    await page.getByTestId('vps.create.user_data.template').selectOption('70');
    await page.getByTestId('vps.create.user_data.source').selectOption('inline');
    await page.getByTestId('vps.create.user_data.format').selectOption('script');
    const content = '#!/bin/sh\nprintf "hello"\n';
    await page.getByTestId('vps.create.user_data.content').fill(content);
    const request = page.waitForRequest((r) => r.method() === 'POST' && new URL(r.url()).pathname.endsWith('/vpses'));
    await page.getByTestId('vps.create.submit').click();
    const body = (await request).postDataJSON() as { vps: Record<string, unknown> };
    expect(body.vps).toMatchObject({ user_data_format: 'script', user_data_content: content });
    expect(body.vps).not.toHaveProperty('vps_user_data');
  });

  test('failed loading can be retried, with a clear empty state and no valid selection', async ({ page }) => {
    let failed = true;
    await bootstrapVpsAdminWindow(page, { sessionToken: 'TEST' });
    await installHaveApiMock(page, {
      user: { id: 7, login: 'member', level: 1 },
      handlers: {
        ...handlers,
        'GET vps_user_data': () => (failed ? failEnvelope('Template list unavailable') : { vps_user_data: [] }),
      },
    });
    await page.goto('/app/vps/new');
    await fillCreate(page);
    await savedSource(page, 'vps.create.user_data');
    await expect(page.getByTestId('vps.create.user_data')).toContainText('Could not load');
    failed = false;
    await page.getByTestId('vps.create.user_data').getByRole('button', { name: 'Retry', exact: true }).click();
    await expect(page.getByTestId('vps.create.user_data')).toContainText('no saved templates');
    await expect(page.getByTestId('vps.create.submit')).toHaveText('Review missing fields');
    await page.getByTestId('vps.create.user_data.enable').uncheck();
    await expect(page.getByTestId('vps.create.submit')).toHaveText('Create VPS');
  });

  test('reinstall uses the VPS owner templates and preserves selection after rejection', async ({ page }) => {
    const bodies: unknown[] = [];
    await bootstrapVpsAdminWindow(page, { sessionToken: 'TEST' });
    await installHaveApiMock(page, {
      user: { id: 1, login: 'admin', level: 99 },
      handlers: {
        ...handlers,
        'GET vps_user_data': ({ url }) => {
          expect(url.searchParams.get('vps_user_data[user]')).toBe('7');
          return { vps_user_data: [template(70)] };
        },
        'POST vpses/123/reinstall': ({ reqJson }) => {
          bodies.push(reqJson);
          return bodies.length === 1 ? failEnvelope('Reinstall rejected by API') : { _meta: { action_state_id: 502 } };
        },
      },
    });
    await page.goto('/admin/vps/123/lifecycle/reinstall');
    await page.getByTestId('vps.lifecycle.reinstall.os_template').selectOption('6');
    await page.getByTestId('vps.lifecycle.reinstall.user_data.summary').click();
    await savedSource(page, 'vps.lifecycle.reinstall.user_data');
    await page.getByTestId('vps.lifecycle.reinstall.user_data.template').selectOption('70');
    await page.getByTestId('vps.lifecycle.reinstall.submit').click();
    await page.getByTestId('vps.lifecycle.reinstall.submit.confirm_dialog.confirm').click();
    await expect(page.getByTestId('vps.lifecycle.reinstall.submit.confirm_dialog.error')).toContainText(
      'Reinstall rejected'
    );
    await expect(page.getByTestId('vps.lifecycle.reinstall.user_data.template')).toHaveValue('70');
    await page.getByTestId('vps.lifecycle.reinstall.submit.confirm_dialog.confirm').click();
    await expect(page.getByTestId('vps.lifecycle.reinstall.submit.confirm_dialog')).toBeHidden();
    expect(bodies).toEqual([
      { vps: { os_template: 6, vps_user_data: 70 } },
      { vps: { os_template: 6, vps_user_data: 70 } },
    ]);
  });
});
