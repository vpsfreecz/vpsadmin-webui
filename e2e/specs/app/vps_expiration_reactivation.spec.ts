import { expect, test } from '@playwright/test';
import { enProfile_help } from '../../../src/i18n/locales/en/profile/help';
import { csProfile_help } from '../../../src/i18n/locales/cs/profile/help';
import { bootstrapVpsAdminWindow, failEnvelope, installHaveApiMock, setUiSettingsLocalStorage } from '../../fixtures';

for (const language of ['cs', 'en'] as const) {
  test(`@pr-smoke @pr-smoke-mobile expired VPS can be renewed, reactivated and started (${language})`, async ({
    page,
    hasTouch,
  }, testInfo) => {
    await bootstrapVpsAdminWindow(page);
    await setUiSettingsLocalStorage(page, { language });
    const vps = {
      id: 123,
      hostname: 'expired-playground-test',
      object_state: 'suspended',
      is_running: false,
      expiration_date: '2026-10-01T00:00:00.000Z',
      remind_after_date: null as string | null,
      user: { id: 1, login: 'test' },
      node: { id: 1, location: { id: 1, label: 'Playground' } },
    };
    const writes: Record<string, unknown>[] = [];
    let starts = 0;
    await installHaveApiMock(page, {
      user: { id: 1, login: 'test', level: 99 },
      handlers: {
        'GET vpses/123': () => ({ vps }),
        'GET transaction_chains': () => ({ transaction_chains: [] }),
        'GET ip_addresses': () => ({ ip_addresses: [] }),
        'PUT vpses/123': ({ params }) => {
          const data = params['vps'] as Record<string, unknown>;
          writes.push(data);
          // Mirror the real HaveAPI schema: only expiration_date is nullable.
          if (data['remind_after_date'] === null)
            return {
              status: false,
              message: 'Input parameters are invalid',
              errors: { remind_after_date: ['cannot be null'] },
              response: null,
            };
          const stateChanging = data['object_state'] && data['object_state'] !== vps.object_state;
          Object.assign(vps, data);
          if ('expiration_date' in data && !('remind_after_date' in data)) vps.remind_after_date = null;
          return { vps, _meta: stateChanging ? { action_state_id: 701 } : {} };
        },
        'GET action_states/701': () => ({
          action_state: { id: 701, status: true, finished: true, current: 1, total: 1 },
        }),
        'POST vpses/123/start': () => {
          expect(vps.object_state).toBe('active');
          starts++;
          vps.is_running = true;
          return { vps: {}, _meta: { action_state_id: 702 } };
        },
        'GET action_states/702': () => ({
          action_state: { id: 702, status: true, finished: true, current: 1, total: 1 },
        }),
      },
    });
    const open = async () => {
      await page.goto('/admin/vps/123/lifecycle/lifetime');
      await page.getByTestId('lifetimes.admin.edit').click();
    };
    const save = async () => {
      const button = page
        .getByTestId('lifetimes.admin.modal')
        .getByRole('button', { name: language === 'cs' ? 'Uložit' : 'Save', exact: true });
      if (hasTouch) await button.tap();
      else await button.click();
      await expect(page.getByTestId('lifetimes.admin.modal')).toBeHidden();
    };
    await open();
    await page.getByTestId('lifetimes.admin.state').selectOption('active');
    await page.getByTestId('lifetimes.admin.expiration').fill('2026-11-21 09:25:00');
    await save();
    expect(writes[0]).toEqual({
      object_state: 'active',
      expiration_date: new Date('2026-11-21T09:25:00').toISOString(),
    });
    await page.reload();
    await expect(page.getByTestId('vps.lifecycle.lifetime')).toContainText(language === 'cs' ? 'Aktivní' : 'Active');
    await page.screenshot({ path: testInfo.outputPath(`reactivated-${language}.png`), scale: 'css' });
    await page.goto('/admin/vps/123/lifecycle/start');
    await page.getByTestId('vps.lifecycle.start.confirm').check();
    await page.getByTestId('vps.lifecycle.start.submit').click();
    await expect.poll(() => starts).toBe(1);
    await open();
    await page.getByTestId('lifetimes.admin.remind_after').fill('2026-11-01 09:25:00');
    await save();
    await open();
    await page.getByTestId('lifetimes.admin.remind_after.clear').click();
    await save();
    expect(writes.at(-1)).toEqual({ expiration_date: vps.expiration_date });
    expect(vps.remind_after_date).toBeNull();
    await open();
    await page.getByTestId('lifetimes.admin.expiration.clear').click();
    await save();
    expect(writes.at(-1)).toEqual({ expiration_date: null });
  });
}

function lifecyclePanelVps() {
  return {
    id: 123,
    hostname: 'lifecycle-target.example',
    object_state: 'active',
    expiration_date: '2027-01-08T00:00:00.000Z',
    remind_after_date: '2027-01-01T00:00:00.000Z',
    is_running: false,
    enable_network: true,
    cpus: 2,
    memory: 2048,
    swap: 0,
    diskspace: 20480,
    user: { id: 1, login: 'test' },
    node: { id: 1, domain_name: 'node1.example', location: { id: 1, label: 'Playground' } },
    os_template: { id: 6, label: 'Debian' },
    dns_resolver: null,
  };
}

test('@content-account-a5 admin lifecycle states preserve confirmation and rejected draft for retry en', async ({
  page,
}, testInfo) => {
  await bootstrapVpsAdminWindow(page);
  await setUiSettingsLocalStorage(page, { language: 'en', theme: 'light' });
  const vps = lifecyclePanelVps();
  const expiration = '2027-02-01T09:25';
  const expirationIso = new Date(expiration).toISOString();
  const writes: unknown[] = [];
  await installHaveApiMock(page, {
    user: { id: 1, login: 'test', level: 99 },
    handlers: {
      'GET vpses/123': () => ({ vps }),
      'GET vpses/123/statuses': () => ({ statuses: [] }),
      'GET vpses/123/state_logs': () => ({ state_logs: [] }),
      'GET ip_addresses': () => ({ ip_addresses: [] }),
      'GET transaction_chains': () => ({ transaction_chains: [] }),
      'PUT vpses/123': ({ params }) => {
        writes.push(params['vps']);
        if (writes.length === 1) return failEnvelope('Lifecycle edit rejected for this target');
        vps.expiration_date = expirationIso;
        return { vps, _meta: {} };
      },
    },
  });
  const panel = page.getByTestId('vps.lifecycle.lifetime');
  for (const state of ['active', 'suspended', 'soft_delete', 'hard_delete', 'deleted', 'future_state'] as const) {
    vps.object_state = state;
    await page.goto('/admin/vps/123/lifecycle/lifetime');
    await expect(panel).toBeVisible();
    await expect(page.getByTestId('lifetimes.admin.edit')).toBeVisible();
    await expect(page.getByTestId('lifetimes.admin.log')).toBeVisible();
    if (state !== 'active') {
      const help =
        state === 'future_state'
          ? enProfile_help['lifetimes.help.unknown'].replace('{state}', state)
          : enProfile_help[`lifetimes.help.${state}`];
      await expect(panel).toContainText(help);
    }
    await panel.screenshot({ path: testInfo.outputPath(`admin-state-${state}-en.png`), scale: 'css' });
  }
  vps.object_state = 'active';
  await page.goto('/admin/vps/123/lifecycle/lifetime');
  await page.getByTestId('lifetimes.admin.edit').click();
  const modal = page.getByTestId('lifetimes.admin.modal');
  await expect(modal).toContainText(vps.hostname);
  await page.getByTestId('lifetimes.admin.expiration').fill(expiration);
  await page.getByTestId('lifetimes.admin.reason').fill('retain this lifecycle draft');
  await page.getByTestId('lifetimes.admin.state').selectOption('soft_delete');
  await modal.getByRole('button', { name: 'Save', exact: true }).click();
  const confirmation = page.getByTestId('lifetimes.admin.confirm_delete');
  await expect(confirmation).toBeVisible();
  await expect(confirmation).toContainText(vps.hostname);
  expect(writes).toEqual([]);
  await page.screenshot({ path: testInfo.outputPath('admin-deletion-confirmation-en.png'), scale: 'css' });
  await confirmation.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(page.getByTestId('lifetimes.admin.reason')).toHaveValue('retain this lifecycle draft');
  await page.getByTestId('lifetimes.admin.state').selectOption('active');
  await modal.getByRole('button', { name: 'Save', exact: true }).click();
  await expect.poll(() => writes.length).toBe(1);
  await expect(page.getByText('Lifecycle edit rejected for this target', { exact: true }).first()).toBeVisible();
  await expect(modal).toBeVisible();
  await expect(page.getByTestId('lifetimes.admin.expiration')).toHaveValue(expiration);
  await expect(page.getByTestId('lifetimes.admin.reason')).toHaveValue('retain this lifecycle draft');
  await expect(modal.getByRole('button', { name: 'Save', exact: true })).toBeEnabled();
  await page.getByTestId('lifetimes.admin.reason').scrollIntoViewIfNeeded();
  await page.screenshot({ path: testInfo.outputPath('admin-rejected-draft-en.png'), scale: 'css' });
  expect(writes).toEqual([
    {
      expiration_date: expirationIso,
      remind_after_date: vps.remind_after_date,
      change_reason: 'retain this lifecycle draft',
    },
  ]);
  await modal.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(modal).toBeHidden();
  expect(writes).toEqual([writes[0], writes[0]]);
  await testInfo.attach('admin-lifecycle-explicit-retry-writes', {
    body: JSON.stringify(writes),
    contentType: 'application/json',
  });
});

test('@content-account-a5 member Overview snooze preserves expiry warning and rejected date for retry cs', async ({
  page,
}, testInfo) => {
  await bootstrapVpsAdminWindow(page);
  await setUiSettingsLocalStorage(page, { language: 'cs', theme: 'dark' });
  const vps = lifecyclePanelVps();
  const customDate = '2027-02-02T10:15';
  const customIso = new Date(customDate).toISOString();
  const writes: unknown[] = [];
  await installHaveApiMock(page, {
    user: { id: 1, login: 'test', level: 1 },
    handlers: {
      'GET vpses/123': () => ({ vps }),
      'GET vpses/123/statuses': () => ({ statuses: [] }),
      'GET vpses/123/mounts': () => ({ mounts: [] }),
      'GET ip_addresses': () => ({ ip_addresses: [] }),
      'GET transaction_chains': () => ({ transaction_chains: [] }),
      'PUT vpses/123': ({ params }) => {
        writes.push(params['vps']);
        if (writes.length === 1) return failEnvelope('Reminder change rejected for this target');
        vps.remind_after_date = customIso;
        return { vps, _meta: {} };
      },
    },
  });
  await page.goto('/app/vps/123');
  const panel = page.getByTestId('vps.overview.lifecycle');
  await expect(panel).toBeVisible();
  await expect(page.getByTestId('lifetimes.admin.edit')).toHaveCount(0);
  await panel.screenshot({ path: testInfo.outputPath('member-active-cs.png'), scale: 'css' });
  await page.getByTestId('lifetimes.user.snooze').click();
  const modal = page.getByTestId('lifetimes.snooze.modal');
  await page.getByTestId('lifetimes.snooze.preset').selectOption('custom');
  await page.getByTestId('lifetimes.snooze.custom').fill(customDate);
  await expect(modal).toContainText('před vypršením už nemusíš dostat žádné připomínky');
  const save = modal.getByRole('button', { name: 'Odložit', exact: true });
  await page.screenshot({ path: testInfo.outputPath('member-snooze-expiry-warning-cs.png'), scale: 'css' });
  await save.click();
  await expect.poll(() => writes.length).toBe(1);
  await expect(page.getByText('Reminder change rejected for this target', { exact: true }).first()).toBeVisible();
  await expect(modal).toBeVisible();
  await expect(page.getByTestId('lifetimes.snooze.preset')).toHaveValue('custom');
  await expect(page.getByTestId('lifetimes.snooze.custom')).toHaveValue(customDate);
  await expect(save).toBeEnabled();
  await page.screenshot({ path: testInfo.outputPath('member-rejected-snooze-cs.png'), scale: 'css' });
  expect(writes).toEqual([{ remind_after_date: customIso }]);
  await save.click();
  await expect(modal).toBeHidden();
  expect(writes).toEqual([{ remind_after_date: customIso }, { remind_after_date: customIso }]);
  vps.object_state = 'suspended';
  await page.reload();
  await expect(panel).toContainText(csProfile_help['lifetimes.help.suspended']);
  await expect(panel).toContainText('Připomínky lze odložit jen když je objekt aktivní.');
  await expect(page.getByTestId('lifetimes.user.snooze')).toHaveCount(0);
  await panel.screenshot({ path: testInfo.outputPath('member-suspended-cs.png'), scale: 'css' });
  await testInfo.attach('member-snooze-explicit-retry-writes', {
    body: JSON.stringify(writes),
    contentType: 'application/json',
  });
});
