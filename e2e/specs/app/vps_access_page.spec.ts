import { setUiSettingsLocalStorage } from '../../fixtures/uiSettings';
import { writeFile } from 'node:fs/promises';
import { clickShellControl } from '../../helpers/shellNavigation';
import { expect, test } from '@playwright/test';

import { bootstrapVpsAdminWindow, installHaveApiMock } from '../../fixtures';
import {
  expectNoDocumentHorizontalOverflow,
  expectTableHorizontalScrollUsable,
} from '../../helpers/horizontalOverflow';

const vps = {
  id: 123,
  hostname: 'vps123.example',
  object_state: 'active',
  is_running: true,
  enable_network: true,
  cpus: 2,
  memory: 2048,
  swap: 0,
  diskspace: 20480,
  used_memory: 768,
  used_swap: 0,
  used_diskspace: 5120,
  uptime: 12345,
  loadavg1: 0.12,
  node: { id: 1, domain_name: 'node1.example', location: { id: 2, label: 'Praha' } },
  user: { id: 42, login: 'owner' },
  os_template: { id: 6, label: 'Debian 12' },
  dns_resolver: 'inherit',
};

const longPublicKeyLabel = `workstation-${'primary'.repeat(18)}`;
const longPublicKeyFingerprint = `SHA256:${'abcdefghijklmnopqrstuvwxyz0123456789'.repeat(4)}`;
const longPublicKeyComment = `main-laptop-${'comment'.repeat(24)}`;

const publicKeys = [
  { id: 8, label: longPublicKeyLabel, fingerprint: longPublicKeyFingerprint, comment: longPublicKeyComment, auto_add: true },
  { id: 9, label: 'backup', fingerprint: 'SHA256:def', comment: 'backup key', auto_add: false },
];

const hostKeys = [
  {
    id: 1,
    key_type: 'ssh-ed25519',
    fingerprint: 'SHA256:host-ed25519',
    public_key: 'ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAITestHostKey',
    bits: 256,
    created_at: '2026-01-24T12:00:00Z',
  },
  { id: 2, key_type: 'ssh-rsa', fingerprint: 'SHA256:host-rsa', public_key: 'ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQ' },
];

test('@workflow-matrix @pr-smoke @pr-smoke-mobile VPS access page generates root password and deploys saved SSH key', async ({ page }) => {
  await bootstrapVpsAdminWindow(page, { sessionToken: 'TEST' });

  await installHaveApiMock(page, {
    user: { id: 42, login: 'owner', level: 1 },
    handlers: {
      'GET vpses/123': () => ({ vps }),
      'GET ip_addresses': () => ({
        ip_addresses: [{ id: 55, addr: '198.51.100.10', network: { id: 5, role: 'public' } }],
      }),
      'GET transaction_chains': () => ({ transaction_chains: [] }),
      'GET users/42/public_keys': () => ({ public_keys: publicKeys, _meta: { total_count: 2 } }),
      'GET vpses/123/ssh_host_keys': () => ({ ssh_host_keys: hostKeys, _meta: { total_count: 2 } }),
      'POST vpses/123/passwd': () => ({ vps: { password: 'Root-123!' }, _meta: { action_state_id: 700 } }),
      'POST vpses/123/deploy_public_key': () => ({ _meta: { action_state_id: 701 } }),
      'GET action_states/700': () => ({
        action_state: { id: 700, label: 'Passwd', finished: true, status: true, current: 1, total: 1 },
      }),
      'GET action_states/701': () => ({
        action_state: { id: 701, label: 'Deploy public key', finished: true, status: true, current: 1, total: 1 },
      }),
    },
  });

  await page.goto('/app/vps/123/access');

  await expect(page.getByTestId('vps.access.page')).toBeVisible();
  await expect(page.getByTestId('vps.access.checklist')).toBeVisible();
  await expect(page.getByTestId('vps.access.ssh_command')).toHaveCount(0);
  await expect(page.getByTestId('vps.access.host_keys.fingerprints')).toBeVisible();
  await expect(page.getByTestId('vps.access.host_keys.table')).toBeVisible();
  await expect(page.getByTestId('vps.access.host_keys.row.1')).toContainText('SHA256:host-ed25519');
  await expect(page.getByTestId('vps.access.host_keys.row.1')).toContainText('ssh-ed25519');
  await expect(page.getByTestId('vps.access.checklist.public-key.action')).toHaveText('Deploy saved key');
  await expect(page.getByTestId('vps.access.checklist.host-key.action')).toHaveText('View host fingerprints');
  await expect(page.getByTestId('vps.access.checklist.root-password.action')).toHaveText('Open password fallback');

  const savedKeySelect = page.getByRole('combobox', { name: 'Saved public key', exact: true });
  await expect(savedKeySelect).toBeVisible();
  await expect(savedKeySelect).toHaveAccessibleDescription('Keys are loaded from the saved public keys of owner.');

  const passwordTypeSelect = page.getByRole('combobox', { name: 'Generated password type', exact: true });
  await expect(passwordTypeSelect).toBeVisible();
  await expect(passwordTypeSelect).toHaveAccessibleDescription(
    'Secure is the default. Simple is available only for cases where the platform explicitly allows it.',
  );

  const sectionOrder = await page
    .locator('[data-testid="vps.access.ssh.card"], [data-testid="vps.access.host_keys"], [data-testid="vps.access.password.card"]')
    .evaluateAll((sections) => sections.map((section) => section.getAttribute('data-testid')));
  expect(sectionOrder).toEqual([
    'vps.access.ssh.card',
    'vps.access.host_keys',
    'vps.access.password.card',
  ]);

  await page.setViewportSize({ width: 390, height: 844 });
  await expectNoDocumentHorizontalOverflow(page);
  await expectTableHorizontalScrollUsable(page, 'vps.access.host_keys.table');
  await page.getByTestId('vps.access.checklist.public-key.action').click();
  await expect(page).toHaveURL(/#vps-access-ssh-key$/);
  await expect(page.getByTestId('vps.access.ssh.deploy')).toBeInViewport();
  await page.getByTestId('vps.access.checklist.host-key.action').click();
  await expect(page).toHaveURL(/#vps-access-host-keys$/);
  await expect(page.getByTestId('vps.access.host_keys')).toBeInViewport();
  await page.getByTestId('vps.access.checklist.root-password.action').click();
  await expect(page).toHaveURL(/#vps-access-root-password$/);
  await expect(page.getByTestId('vps.access.password.generate')).toBeInViewport();
  await page.setViewportSize({ width: 1280, height: 844 });
  await page.getByTestId('vps.access.password_type').selectOption('simple');
  await page.getByTestId('vps.access.password.generate').click();

  await expect(page.getByTestId('vps.access.password.confirm')).toBeVisible();
  await expect(page.getByTestId('vps.access.password.confirm.target')).toContainText('vps123.example');
  await expect(page.getByTestId('vps.access.password.confirm.target')).toContainText('#123');
  const passwdReqPromise = page.waitForRequest(
    (r) => r.method() === 'POST' && r.url().includes('/api/v7.0/vpses/123/passwd')
  );
  await page.getByTestId('vps.access.password.confirm.confirm').click();

  const passwdReq = await passwdReqPromise;
  expect(passwdReq.postDataJSON()).toEqual({ vps: { type: 'simple' } });

  await expect(page.getByTestId('vps.access.generated_password')).toBeVisible();
  const generatedPassword = page.getByLabel('Generated root password', { exact: true });
  await expect(generatedPassword).toHaveValue('Root-123!');
  await expect(generatedPassword).toHaveAttribute('type', 'password');
  await expect(generatedPassword).toHaveAccessibleDescription(
    'The generated password is shown only in this browser state. It is not persisted by this page.',
  );
  await page.getByTestId('vps.access.generated_password.toggle').click();
  await expect(page.getByRole('textbox', { name: 'Generated root password', exact: true })).toHaveAttribute('type', 'text');
  await page.getByTestId('vps.access.generated_password.clear').click();
  await expect(page.getByTestId('vps.access.generated_password')).toHaveCount(0);

  await clickShellControl(page, 'tasks.open-button');
  await expect(page.getByTestId('tasks.drawer')).toHaveAttribute('aria-modal', 'false');
  await expect(
    page.getByTestId('tasks.row.700').getByRole('button', { name: 'Generate root password', exact: true }),
  ).toBeVisible();
  await expect(page.getByTestId('vps.access.page')).toBeVisible();
  await page.getByTestId('tasks.close-button').click();

  await expect(page.getByTestId('vps.access.ssh.key')).toHaveValue('8');
  const selectedKeyCard = page.getByTestId('vps.access.ssh.selected.fingerprint').locator('..');
  await expect(selectedKeyCard).toContainText(longPublicKeyLabel);
  await expect(selectedKeyCard).toContainText(longPublicKeyFingerprint);
  await expect(selectedKeyCard).toContainText(longPublicKeyComment);
  await page.getByTestId('vps.access.ssh.deploy').click();

  await expect(page.getByTestId('vps.access.ssh.confirm')).toBeVisible();
  await expect(page.getByTestId('vps.access.ssh.confirm.target')).toContainText('vps123.example');
  await expect(page.getByTestId('vps.access.ssh.confirm.target')).toContainText('#123');
  const keyReqPromise = page.waitForRequest(
    (r) => r.method() === 'POST' && r.url().includes('/api/v7.0/vpses/123/deploy_public_key')
  );
  await page.getByTestId('vps.access.ssh.confirm.confirm').click();

  const keyReq = await keyReqPromise;
  expect(keyReq.postDataJSON()).toEqual({ vps: { public_key: 8 } });
  await expect(page.getByText(/Public key deployed: workstation/)).toBeVisible();

  await clickShellControl(page, 'tasks.open-button');
  await expect(
    page.getByTestId('tasks.row.701').getByRole('button', { name: 'Deploy SSH public key', exact: true }),
  ).toBeVisible();
  await expect(page.getByTestId('vps.access.page')).toBeVisible();
});

test('@workflow-matrix @pr-smoke @pr-smoke-mobile admin VPS access contains long key data on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await bootstrapVpsAdminWindow(page, { sessionToken: 'TEST_ADMIN' });

  await installHaveApiMock(page, {
    user: { id: 1, login: 'admin', level: 99 },
    handlers: {
      'GET vpses/123': () => ({ vps }),
      'GET ip_addresses': () => ({
        ip_addresses: [{ id: 55, addr: '198.51.100.10', network: { id: 5, role: 'public' } }],
      }),
      'GET transaction_chains': () => ({ transaction_chains: [] }),
      'GET users/42/public_keys': () => ({ public_keys: publicKeys, _meta: { total_count: 2 } }),
      'GET vpses/123/ssh_host_keys': () => ({ ssh_host_keys: hostKeys, _meta: { total_count: 2 } }),
    },
  });

  await page.goto('/admin/vps/123/access');

  await expect(page.getByTestId('vps.access.page')).toBeVisible();
  const selectedKeyCard = page.getByTestId('vps.access.ssh.selected.fingerprint').locator('..');
  await expect(selectedKeyCard).toContainText(longPublicKeyLabel);
  await expect(selectedKeyCard).toContainText(longPublicKeyFingerprint);
  await expect(selectedKeyCard).toContainText(longPublicKeyComment);
  await expectNoDocumentHorizontalOverflow(page);
  await expectTableHorizontalScrollUsable(page, 'vps.access.host_keys.table');
});

test('@workflow-matrix @pr-smoke VPS access reports failed SSH key deployment and opens tasks', async ({ page }) => {
  await bootstrapVpsAdminWindow(page, { sessionToken: 'TEST' });

  await installHaveApiMock(page, {
    user: { id: 42, login: 'owner', level: 1 },
    handlers: {
      'GET vpses/123': () => ({ vps }),
      'GET transaction_chains': () => ({ transaction_chains: [] }),
      'GET users/42/public_keys': () => ({ public_keys: publicKeys, _meta: { total_count: 2 } }),
      'GET vpses/123/ssh_host_keys': () => ({ ssh_host_keys: hostKeys, _meta: { total_count: 2 } }),
      'POST vpses/123/deploy_public_key': () => ({ _meta: { action_state_id: 702 } }),
      'GET action_states/702': () => ({
        action_state: { id: 702, label: 'Deploy public key', finished: true, status: false, current: 1, total: 1 },
      }),
    },
  });

  await page.goto('/app/vps/123/access');
  await page.getByTestId('vps.access.ssh.deploy').click();
  await page.getByTestId('vps.access.ssh.confirm.confirm').click();

  await expect(page.getByText('SSH key deployment failed')).toBeVisible();
  await page.getByTestId('vps.access.ssh.failure.open_tasks').click();
  await expect(page.getByTestId('tasks.drawer')).toHaveAttribute('aria-modal', 'false');
  await expect(
    page.getByTestId('tasks.row.702').getByRole('button', { name: 'Deploy SSH public key', exact: true }),
  ).toBeVisible();
  await expect(page.getByTestId('vps.access.page')).toBeVisible();
});


for (const [language, theme] of [['cs', 'dark'], ['en', 'light']] as const) {
  test(`@pr-smoke @pr-smoke-mobile Access selectors match adjacent actions (${language})`, async ({ page }, testInfo) => {
    await page.clock.install({ time: new Date('2026-11-10T05:00:00Z') });
    await bootstrapVpsAdminWindow(page);
    await setUiSettingsLocalStorage(page, { language, theme });
    const mutations: string[] = [];
    page.on('request', r => { if (!['GET', 'HEAD', 'OPTIONS'].includes(r.method()) && new URL(r.url()).pathname.includes('/vpses/')) mutations.push(r.method()); });
    await installHaveApiMock(page, { user: { id: 42, login: 'synthetic-owner', level: 1 }, handlers: {
      'GET vpses/123': () => ({ vps: { id: 123, hostname: 'synthetic-access.example.test', object_state: 'active', is_running: true, enable_network: true, cpu: 2, memory: 2048, diskspace: 20480, swap: 0, user: { id: 42, login: 'synthetic-owner' }, node: { id: 1, domain_name: 'node.example.test' } } }),
      'GET ip_addresses': () => ({ ip_addresses: [] }), 'GET transaction_chains': () => ({ transaction_chains: [] }),
      'GET users/42/public_keys': () => ({ public_keys: [{ id: 8, label: 'Dlouhý český název klíče pro kontrolu rozměrů a zarovnání', fingerprint: 'SHA256:synthetic', comment: 'Synthetic fixture', auto_add: false }, { id: 9, label: 'Náhradní syntetický klíč', fingerprint: 'SHA256:backup', auto_add: false }], _meta: { total_count: 2 } }),
      'GET vpses/123/ssh_host_keys': () => ({ ssh_host_keys: [], _meta: { total_count: 0 } }),
    } });
    await page.goto('/app/vps/123/access');
    const key = page.getByTestId('vps.access.ssh.key'); await expect(key).toBeEnabled();
    const phases = [];
    for (const width of [page.viewportSize()!.width, 320, 768]) {
      await page.setViewportSize({ width, height: 900 });
      const controls = [];
      for (const id of ['vps.access.ssh.key', 'vps.access.ssh.refresh', 'vps.access.ssh.deploy', 'vps.access.password_type', 'vps.access.password.generate']) {
        controls.push(await page.getByTestId(id).evaluate(e => { const r = e.getBoundingClientRect(); return { id: e.getAttribute('data-testid'), height: r.height, top: r.top, width: r.width, left: r.left, right: r.right, coarse: matchMedia('(any-pointer:coarse)').matches }; }));
      }
      const expected = controls[0]!.coarse ? 44 : 36;
      for (const control of controls) expect.soft(control.height, control.id ?? '').toBe(expected);
      if (width >= 1024) {
        expect.soft(controls[0]!.top).toBeCloseTo(controls[1]!.top, 1);
        expect.soft(controls[0]!.top).toBeCloseTo(controls[2]!.top, 1);
        expect.soft(controls[3]!.top).toBeCloseTo(controls[4]!.top, 1);
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width + 1);
      await key.selectOption('9'); await expect(key).toHaveValue('9');
      const password = page.getByTestId('vps.access.password_type'); await password.selectOption('simple'); await expect(password).toHaveValue('simple');
      await key.focus(); await page.keyboard.press('Tab'); await expect(page.getByTestId('vps.access.ssh.refresh')).toBeFocused();
      phases.push({ width, controls });
      if (process.env['E2E_ACCESS_FIELD_CAPTURE'] === '1' && width !== 768) await page.screenshot({ path: testInfo.outputPath('access-' + width + '.png'), fullPage: true, scale: 'css', animations: 'disabled' });
    }
    expect(mutations).toEqual([]);
    if (process.env['E2E_ACCESS_FIELD_CAPTURE'] === '1') {
      const build = await (await page.request.get('/build-info.json')).json();
      await writeFile(testInfo.outputPath('access-fields.json'), JSON.stringify({ source: build.commit, dirty: build.dirty, language, theme, engine: testInfo.project.name, phases, mutations, fixtureOnly: true, liveWrites: 0 }, null, 2));
    }
  });
}


for (const [language, theme] of [['cs', 'dark'], ['en', 'light']] as const) {
  for (const role of ['member', 'support'] as const) {
    for (const length of [43, 192]) {
      test(`@pr-smoke @pr-smoke-mobile Access host fingerprint copy stays reachable (${language}, ${role}, ${length})`, async ({ page }) => {
        await bootstrapVpsAdminWindow(page, { webuiNext: { uiSettings: { persistence: 'local' } } });
        await setUiSettingsLocalStorage(page, { language, theme });
        const writes: string[] = [];
        page.on('request', r => { if (!['GET', 'HEAD', 'OPTIONS'].includes(r.method())) writes.push(r.method()); });
        await installHaveApiMock(page, { user: { id: role === 'member' ? 42 : 1, login: 'synthetic-actor', level: role === 'member' ? 1 : 21 }, handlers: {
          'GET vpses/123': () => ({ vps }),
          'GET ip_addresses': () => ({ ip_addresses: [] }),
          'GET transaction_chains': () => ({ transaction_chains: [] }),
          'GET users/42/public_keys': () => ({ public_keys: [] }),
          'GET vpses/123/ssh_host_keys': () => ({ ssh_host_keys: [{ id: 3, algorithm: 'ssh-ed25519', fingerprint: 'SHA256:' + 'a'.repeat(length), bits: 256 }] }),
        } });
        await page.goto((role === 'member' ? '/app' : '/admin') + '/vps/123/access');
        await page.getByTestId('vps.access.page').waitFor({ state: 'visible', timeout: 30_000 });
        const copy = page.getByTestId('vps.access.host_keys.fingerprint.3.copy');
        await expect(copy).toBeVisible();
        for (const width of [page.viewportSize()!.width, 320, 768]) {
          await page.setViewportSize({ width, height: 900 });
          await expectNoDocumentHorizontalOverflow(page);
          const geometry = await copy.evaluate(e => { const r = e.getBoundingClientRect(); return { left: r.left, right: r.right, height: r.height, coarse: matchMedia('(any-pointer:coarse)').matches }; });
          expect(geometry.left).toBeGreaterThanOrEqual(0);
          expect(geometry.right).toBeLessThanOrEqual(width);
          expect(geometry.height).toBeGreaterThanOrEqual(geometry.coarse ? 44 : 32);
          const code = page.getByTestId('vps.access.host_keys.fingerprint.3').locator('code');
          await expect(code).toHaveText('SHA256:' + 'a'.repeat(length));
          const scroll = await code.evaluate(e => { const el = e as HTMLElement; el.scrollLeft = 10000; return { client: el.clientWidth, content: el.scrollWidth, left: el.scrollLeft }; });
          if (scroll.content > scroll.client) expect(scroll.left).toBeGreaterThan(0);
          await copy.focus(); await page.keyboard.press('Tab'); await page.keyboard.press('Shift+Tab');
          await expect(copy).toBeFocused();
          expect(await copy.evaluate(e => e.matches(':focus-visible'))).toBe(true);
        }
        expect(writes).toEqual([]);
      });
    }
  }
}

for (const [language, theme] of [['cs', 'dark'], ['en', 'light'], ['cs', 'light'], ['en', 'dark']] as const) {
  test(`@pr-smoke @pr-smoke-mobile generated Access password shares action dimensions (${language}, ${theme})`, async ({ page }, info) => {
    await bootstrapVpsAdminWindow(page); await setUiSettingsLocalStorage(page, { language, theme });
    const writes: unknown[] = [], phases: unknown[] = [];
    await installHaveApiMock(page, { user: { id: 42, login: 'synthetic-owner', level: 1 }, handlers: {
      'GET vpses/123': () => ({ vps }), 'GET ip_addresses': () => ({ ip_addresses: [] }), 'GET transaction_chains': () => ({ transaction_chains: [] }),
      'GET users/42/public_keys': () => ({ public_keys: [] }), 'GET vpses/123/ssh_host_keys': () => ({ ssh_host_keys: [] }),
      'POST vpses/123/passwd': ({ json }) => { writes.push(json); return { vps: { password: 'SYNTHETIC-ONLY-Root-123!' }, _meta: { action_state_id: 745 } }; },
      'GET action_states/745': () => ({ action_state: { id: 745, finished: true, status: true, current: 1, total: 1 } }),
    } });
    await page.goto('/app/vps/123/access'); await page.getByTestId('vps.access.password.generate').click(); await page.getByTestId('vps.access.password.confirm.confirm').click();
    const field = page.getByTestId('vps.access.generated_password.field'); await expect(field).toHaveAttribute('type', 'password'); await expect(field).toHaveValue('SYNTHETIC-ONLY-Root-123!');
    const toggle = page.getByTestId('vps.access.generated_password.toggle');
    await expect(page.getByTestId('vps.access.password.generate')).toBeEnabled();
    await expect(page.getByTestId('modal.action_progress')).toHaveCount(0);
    for (const width of [...new Set([page.viewportSize()!.width, 320, 768])]) {
      await page.setViewportSize({ width, height: 900 });
      const geometry = await page.getByTestId('vps.access.generated_password').evaluate(root => ({ coarse: matchMedia('(any-pointer:coarse)').matches, width: innerWidth, document: document.documentElement.scrollWidth, controls: [...root.querySelectorAll('input,button')].map(e => { const r = e.getBoundingClientRect(); return { id: e.getAttribute('data-testid'), height: r.height, top: r.top, left: r.left, right: r.right }; }) }));
      for (const c of geometry.controls) { expect.soft(c.height, c.id ?? '').toBe(geometry.coarse ? 44 : 36); expect.soft(c.left).toBeGreaterThanOrEqual(0); expect.soft(c.right).toBeLessThanOrEqual(width); }
      expect.soft(geometry.document).toBeLessThanOrEqual(width + 1);
      await toggle.focus(); await page.keyboard.press('Tab'); await page.keyboard.press('Shift+Tab'); await expect(toggle).toBeFocused(); expect(await toggle.evaluate(e => e.matches(':focus-visible'))).toBe(true);
      phases.push(geometry);
      if (language === 'cs' && width === 768) await page.screenshot({ path: info.outputPath('generated-password-768.png'), fullPage: true, scale: 'css', animations: 'disabled' });
    }
    await toggle.click(); await expect(field).toHaveAttribute('type', 'text'); await toggle.click(); await expect(field).toHaveAttribute('type', 'password'); await page.getByTestId('vps.access.generated_password.clear').click(); await expect(field).toHaveCount(0); expect(writes).toEqual([{ vps: { type: 'secure' } }]);
    if (process.env['E2E_ACCESS_RESULT_CAPTURE'] === '1' && process.env['E2E_START_SERVER'] !== '1') await writeFile(info.outputPath('result-regression.json'), JSON.stringify({ source: (await (await page.request.get('/build-info.json')).json()).commit, kind: 'password', language, theme, phases, writes, liveWrites: 0, fixtureOnly: true }, null, 2));
  });
}
for (const [language, theme] of [['cs', 'dark'], ['en', 'light']] as const) for (const state of ['pending', 'failed', 'success'] as const) {
  test(`@pr-smoke @pr-smoke-mobile Access key result wraps complete identifiers (${language}, ${state})`, async ({ page }, info) => {
    await bootstrapVpsAdminWindow(page); await setUiSettingsLocalStorage(page, { language, theme });
    const fingerprint = 'SHA256:' + 'abcdef0123456789'.repeat(12), keyLabel = 'Dlouhý-český-název-klíče-'.repeat(6), writes: unknown[] = [], phases: unknown[] = [];
    await installHaveApiMock(page, { user: { id: 42, login: 'synthetic-owner', level: 1 }, handlers: {
      'GET vpses/123': () => ({ vps }), 'GET ip_addresses': () => ({ ip_addresses: [] }), 'GET transaction_chains': () => ({ transaction_chains: [] }),
      'GET users/42/public_keys': () => ({ public_keys: [{ id: 8, label: keyLabel, fingerprint }] }), 'GET vpses/123/ssh_host_keys': () => ({ ssh_host_keys: [] }),
      'POST vpses/123/deploy_public_key': ({ json }) => { writes.push(json); return { vps: {}, _meta: { action_state_id: 746 } }; },
      'GET action_states/746': () => ({ action_state: { id: 746, finished: state !== 'pending', status: state !== 'failed', current: state === 'pending' ? 0 : 1, total: 1 } }),
    } });
    await page.goto('/app/vps/123/access'); await page.getByTestId('vps.access.ssh.deploy').click(); await page.getByTestId('vps.access.ssh.confirm.confirm').click();
    if (state === 'pending') { await expect(page.getByTestId('modal.action_progress')).toBeVisible(); await page.getByTestId('modal.action_progress.continue').click(); await expect(page.getByTestId('modal.action_progress')).toHaveCount(0); }
    const message = page.getByTestId('vps.access.page').locator(':scope > div').filter({ hasText: fingerprint }).first(); await expect(message).toContainText(keyLabel); await expect(message).toContainText(fingerprint);
    for (const width of [...new Set([page.viewportSize()!.width, 320, 768])]) {
      await page.setViewportSize({ width, height: 900 });
      await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
      const geometry = await message.evaluate(e => { const box = e.getBoundingClientRect(), range = document.createRange(); range.selectNodeContents(e); return { viewport: innerWidth, document: document.documentElement.scrollWidth, overflowElements: [...document.querySelectorAll<HTMLElement>('body *')].map(el => { const r = el.getBoundingClientRect(); return { id: el.dataset['testid'], tag: el.tagName, className: el.className, left: r.left, right: r.right, overflowWrap: getComputedStyle(el).overflowWrap, visibility: getComputedStyle(el).visibility }; }).filter(r => r.right > innerWidth + 1).slice(-20), box: { left: box.left, right: box.right }, text: [...range.getClientRects()].filter(r => r.width > 0).map(r => ({ left: r.left, right: r.right })) }; });
      expect.soft(geometry.document).toBeLessThanOrEqual(width + 1); for (const r of geometry.text) { expect.soft(r.left).toBeGreaterThanOrEqual(geometry.box.left - 1); expect.soft(r.right).toBeLessThanOrEqual(geometry.box.right + 1); }
      phases.push(geometry); if (language === 'cs' && width === 320) await page.screenshot({ path: info.outputPath('key-result-' + state + '-320.png'), fullPage: true, scale: 'css', animations: 'disabled' });
    }
    expect(writes).toEqual([{ vps: { public_key: 8 } }]);
    if (process.env['E2E_ACCESS_RESULT_CAPTURE'] === '1' && process.env['E2E_START_SERVER'] !== '1') await writeFile(info.outputPath('result-regression.json'), JSON.stringify({ source: (await (await page.request.get('/build-info.json')).json()).commit, kind: 'key', state, language, theme, phases, writes, liveWrites: 0, fixtureOnly: true }, null, 2));
  });
}
