import { expect, test } from '@playwright/test';
import { bootstrapVpsAdminWindow, installHaveApiMock, setUiSettingsLocalStorage } from '../../fixtures';

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
          return { _meta: { action_state_id: 702 } };
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
