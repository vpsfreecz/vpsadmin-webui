import { expect, test, type Page, type Locator } from '@playwright/test';
import { bootstrapVpsAdminWindow, installHaveApiMock, setUiSettingsLocalStorage } from '../../fixtures';

async function activate(button: Locator, touch: boolean) {
  if (touch) await button.tap();
  else await button.click();
}

async function setup(
  page: Page,
  language: 'cs' | 'en',
  options: { running?: boolean; state?: string; support?: boolean } = {}
) {
  await bootstrapVpsAdminWindow(page);
  await setUiSettingsLocalStorage(page, { language, theme: 'dark' });
  await page.route('**/_console/**', (route) =>
    route.fulfill({
      contentType: 'text/html',
      body: '<html><body style="background:black;color:white">Synthetic console: login:</body></html>',
    })
  );
  let tokens = 0;
  const calls: { action: string; params: Record<string, unknown> }[] = [];
  const mock = await installHaveApiMock(page, {
    user: { id: 1, login: 'console-test', level: options.support ? 21 : language === 'cs' ? 99 : 1 },
    handlers: {
      'GET vpses/123': () => ({
        vps: {
          id: 123,
          hostname: 'console.example.test',
          is_running: options.running ?? true,
          object_state: options.state ?? 'active',
          user: { id: options.support ? 77 : 1 },
          os_template: { id: 5 },
          node: {
            id: 1,
            hypervisor_type: 'vpsadminos',
            cgroup_version: 'cgroup_v2',
            location: { remote_console_server: '/_console' },
          },
        },
      }),
      'GET transaction_chains': () => ({ transaction_chains: [] }),
      'GET ip_addresses': () => ({ ip_addresses: [] }),
      'POST vpses/123/console_token': () => {
        tokens++;
        return { token: 'FIXTURE', expiration: '2099-01-01T00:00:00Z' };
      },
      'GET os_templates': () => ({
        os_templates: [
          { id: 5, label: 'Debian test', enabled: true, hypervisor_type: 'vpsadminos', cgroup_version: 'cgroup_any' },
          { id: 6, label: 'Incompatible test', enabled: true, cgroup_version: 'cgroup_v1' },
        ],
      }),
    },
  });
  for (const action of ['start', 'stop', 'restart', 'passwd', 'boot'])
    mock.addHandler(`POST vpses/123/${action}`, ({ params }) => {
      calls.push({ action, params });
      return { status: false, message: 'Synthetic rejection', response: null };
    });
  await page.goto(`/${language === 'cs' || options.support ? 'admin' : 'app'}/vps/123/console`);
  await expect(page.getByTestId('vps.console.page')).toBeVisible();
  return { calls, mock, tokens: () => tokens };
}

for (const language of ['cs', 'en'] as const) {
  test(`@pr-smoke @pr-smoke-mobile console power, password and rescue stay in context (${language})`, async ({
    page,
    hasTouch,
  }, testInfo) => {
    const state = await setup(page, language);
    const iframe = page.getByTestId('vps.console.iframe');
    await expect(iframe).toBeVisible();
    const frame = await iframe.elementHandle();
    await expect(page.getByTestId('vps.console.open_new_tab')).toHaveCount(0);
    await expect(page.getByTestId('vps.console.control.start')).toHaveAttribute('aria-disabled', 'true');
    const sessionButton = await page.getByTestId('vps.console.new_session').boundingBox();
    const powerButton = await page.getByTestId('vps.console.control.start').boundingBox();
    expect(sessionButton).not.toBeNull();
    expect(powerButton).not.toBeNull();
    expect(Math.abs(sessionButton!.x - powerButton!.x)).toBeLessThanOrEqual(1);
    if (!hasTouch) {
      expect(sessionButton!.height).toBe(32);
      expect(powerButton!.height).toBe(32);
      expect(powerButton!.width).toBeLessThan(sessionButton!.width);
    }
    expect(powerButton!.y).toBeGreaterThan(sessionButton!.y + sessionButton!.height);
    await page.screenshot({ path: testInfo.outputPath(`console-controls-${language}.png`), fullPage: true });
    for (const action of ['stop', 'restart'] as const) {
      await activate(page.getByTestId(`vps.console.control.${action}`), hasTouch);
      await expect(page.getByTestId(`vps.action.${action}_confirm.target`)).toContainText('console.example.test');
      expect(state.calls).toHaveLength(action === 'stop' ? 0 : 1);
      await page.getByTestId(`vps.action.${action}_confirm.force`).check();
      await activate(page.getByTestId(`vps.action.${action}_confirm.confirm`), hasTouch);
      await expect(page.getByTestId(`vps.action.${action}_confirm.error`)).toContainText('Synthetic rejection');
      expect(state.calls.at(-1)).toMatchObject({ action, params: { vps: { force: true } } });
      await activate(page.getByTestId(`vps.action.${action}_confirm.cancel`), hasTouch);
    }
    await activate(page.getByTestId('vps.console.control.password'), hasTouch);
    await expect(page.getByTestId('vps.action.root_password_confirm.target')).toContainText('#123');
    await activate(page.getByTestId('vps.action.root_password_confirm.confirm'), hasTouch);
    await expect(page.getByTestId('vps.action.root_password_confirm.error')).toContainText('Synthetic rejection');
    expect(state.calls.at(-1)).toMatchObject({ action: 'passwd', params: { vps: { type: 'secure' } } });
    await activate(page.getByTestId('vps.action.root_password_confirm.cancel'), hasTouch);
    await activate(page.getByTestId('vps.console.control.rescue'), hasTouch);
    await expect(page.getByTestId('vps.console.rescue.template')).toHaveValue('5');
    await expect(page.getByTestId('vps.console.rescue.template').locator('option[value="6"]')).toHaveCount(0);
    await expect(page.getByTestId('vps.console.rescue.mountpoint')).toHaveValue('/mnt/vps');
    await page.getByTestId('vps.console.rescue.mountpoint').fill('relative/path');
    await expect(page.getByTestId('vps.console.rescue.confirm')).toBeDisabled();
    await page.getByTestId('vps.console.rescue.mountpoint').fill('/mnt/recovery');
    await page
      .getByTestId('vps.console.rescue')
      .screenshot({ path: testInfo.outputPath(`console-rescue-${language}.png`) });
    await activate(page.getByTestId('vps.console.rescue.confirm'), hasTouch);
    await expect(page.getByTestId('vps.console.rescue.error')).toContainText('Synthetic rejection');
    expect(state.calls.at(-1)).toMatchObject({
      action: 'boot',
      params: { vps: { os_template: 5, mount_root_dataset: '/mnt/recovery' } },
    });
    await expect(page.getByTestId('vps.console.rescue.mountpoint')).toHaveValue('/mnt/recovery');
    await page.getByTestId('vps.console.rescue.mount').uncheck();
    state.mock.addHandler('POST vpses/123/boot', ({ params }) => {
      state.calls.push({ action: 'boot', params });
      return { vps: null, _meta: { action_state_id: 900 } };
    });
    state.mock.addHandler('GET action_states/900', () => ({
      action_state: { id: 900, finished: true, status: true, current: 1, total: 1 },
    }));
    await activate(page.getByTestId('vps.console.rescue.confirm'), hasTouch);
    await expect(page.getByTestId('vps.console.rescue')).toHaveCount(0);
    expect(state.calls.at(-1)).toEqual({ action: 'boot', params: { vps: { os_template: 5 } } });
    expect(await frame!.evaluate((element) => element.isConnected)).toBe(true);
    expect(state.tokens()).toBe(1);
    expect(page.url()).toContain('/vps/123/console');
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  });
}

test('@pr-smoke @pr-smoke-mobile console starts a stopped VPS and reports a rejection', async ({ page, hasTouch }) => {
  const state = await setup(page, 'en', { running: false });
  await expect(page.getByTestId('vps.console.control.stop')).toHaveAttribute('aria-disabled', 'true');
  await activate(page.getByTestId('vps.console.control.start'), hasTouch);
  await expect(page.getByText('Synthetic rejection', { exact: true })).toBeVisible();
  expect(state.calls).toHaveLength(1);
  expect(state.calls[0]?.action).toBe('start');
});

test('@pr-smoke @pr-smoke-mobile console blocks suspended VPS actions and hides support controls', async ({
  page,
  hasTouch,
}) => {
  const state = await setup(page, 'en', { state: 'suspended' });
  for (const action of ['start', 'stop', 'restart', 'password', 'rescue']) {
    const button = page.getByTestId(`vps.console.control.${action}`);
    await expect(button).toHaveAttribute('aria-disabled', 'true');
    // aria-disabled actions remain interactive only to explain the gate.
    if (hasTouch) await button.tap({ force: true });
    else await button.click({ force: true });
    await expect(page.getByTestId(`vps.console.control.${action}.reason`)).toBeVisible();
    await activate(page.getByTestId(`vps.console.control.${action}.reason.close`), hasTouch);
  }
  expect(state.calls).toEqual([]);
  await page.unrouteAll({ behavior: 'wait' });
  const support = await setup(page, 'en', { support: true });
  await expect(page.getByTestId('vps.console.read_only')).toBeVisible();
  await expect(page.getByTestId('vps.console.controls')).toHaveCount(0);
  expect(support.calls).toEqual([]);
  expect(support.tokens()).toBe(0);
});

test('@pr-smoke @pr-smoke-mobile console reveals a password only after the task succeeds', async ({
  page,
  hasTouch,
}) => {
  const state = await setup(page, 'en');
  const frame = await page.getByTestId('vps.console.iframe').elementHandle();
  let finished = false;
  let polls = 0;
  const secret = 'Synthetic-password-only';
  state.mock.addHandler('POST vpses/123/passwd', () => ({
    vps: { password: secret },
    _meta: { action_state_id: 901 },
  }));
  state.mock.addHandler('GET action_states/901', () => {
    polls++;
    return { action_state: { id: 901, finished, status: finished ? true : null, current: finished ? 1 : 0, total: 1 } };
  });
  await activate(page.getByTestId('vps.console.control.password'), hasTouch);
  await activate(page.getByTestId('vps.action.root_password_confirm.confirm'), hasTouch);
  await expect.poll(() => polls).toBeGreaterThan(0);
  await expect(page.getByText(secret, { exact: true })).toHaveCount(0);
  finished = true;
  await expect(page.getByText(secret, { exact: true })).toBeVisible({ timeout: 15_000 });
  expect(await frame!.evaluate((element) => element.isConnected)).toBe(true);
  expect(state.tokens()).toBe(1);
});

test('@pr-smoke @pr-smoke-mobile rescue keeps uncertain submissions blocked', async ({ page, hasTouch }) => {
  const state = await setup(page, 'en');
  state.mock.addHandler('POST vpses/123/boot', ({ params }) => {
    state.calls.push({ action: 'boot', params });
    return { vps: null, _meta: {} };
  });
  await activate(page.getByTestId('vps.console.control.rescue'), hasTouch);
  await activate(page.getByTestId('vps.console.rescue.confirm'), hasTouch);
  await expect(page.getByTestId('vps.console.rescue.error')).toContainText(/task identifier/i);
  await expect(page.getByTestId('vps.console.rescue.confirm')).toBeDisabled();
  await expect(page.getByTestId('vps.console.rescue.mountpoint')).toHaveValue('/mnt/vps');
  expect(state.calls).toHaveLength(1);
  expect(state.tokens()).toBe(1);
});
