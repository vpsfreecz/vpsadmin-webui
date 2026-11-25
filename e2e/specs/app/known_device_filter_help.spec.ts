import { expect, test } from '@playwright/test';
import { bootstrapVpsAdminWindow, installHaveApiMock, setUiSettingsLocalStorage } from '../../fixtures';

for (const language of ['cs', 'en'] as const) for (const selectedOwner of [false, true]) {
  test(`@pr-smoke @pr-smoke-mobile known-device help, refresh and automatic deletion refresh ${language} selected=${selectedOwner}`, async ({ page, hasTouch }) => {
    await page.setViewportSize({ width: hasTouch ? 320 : 1440, height: 1000 });
    await bootstrapVpsAdminWindow(page, { sessionToken: 'SYNTHETIC_DEVICE_HELP', webuiNext: { uiSettings: { persistence: 'local' } } });
    await setUiSettingsLocalStorage(page, { language, theme: language === 'cs' ? 'dark' : 'light' });
    const id = selectedOwner ? 42 : 1, prefix = selectedOwner ? 'admin.user.mfa' : 'profile.mfa';
    const user = { id: 1, login: 'fixture', level: selectedOwner ? 99 : 1 }, owner = { id, login: 'owner', level: 1 };
    const device = { id: 30, client_ip_addr: '203.0.113.10', api_ip_addr: '203.0.113.11', user_agent: 'Firefox/130.0', last_seen_at: '2026-11-14T12:00:00Z' };
    let devices = [device], reads = 0;
    let totp = { id: 10, label: 'Fixture phone', enabled: true, confirmed: true };
    const updates: unknown[] = [];
    const writes: string[] = [], params: [string, string][][] = [];
    page.on('request', r => { if (new URL(r.url()).pathname.startsWith('/api/') && !['GET', 'HEAD', 'OPTIONS'].includes(r.method())) writes.push(r.method() + ' ' + new URL(r.url()).pathname); });
    await installHaveApiMock(page, { user, handlers: {
      [`GET users/${id}`]: () => ({ user: owner }),
      [`GET users/${id}/totp_devices`]: () => ({ totp_devices: [totp] }),
      [`PUT users/${id}/totp_devices/10`]: ({ request }) => { updates.push(request.postDataJSON()); totp = { ...totp, label: 'Updated fixture phone' }; return { totp_device: totp }; },
      [`GET users/${id}/webauthn_credentials`]: () => ({ webauthn_credentials: [] }),
      [`GET users/${id}/known_devices`]: ({ searchParams }) => { if (searchParams.get('known_device[limit]') === '26') reads++; params.push(Array.from(searchParams.entries())); return { known_devices: devices }; },
      [`DELETE users/${id}/known_devices/30`]: () => { devices = []; return { known_device: {} }; },
    } });
    await page.goto(selectedOwner ? '/admin/users/42/mfa' : '/app/profile/mfa');
    const search = page.getByTestId(prefix + '.known_devices.search');
    await expect(search).toHaveAccessibleName(language === 'cs' ? 'Najít' : 'Find');
    await expect(search).toHaveAccessibleDescription(language === 'cs' ? 'Filtruje jen zařízení na této stránce. Změny zde se načtou automaticky; tlačítkem Obnovit načteš změny odjinud.' : 'Filters devices on this page only. Changes here update automatically; Refresh loads changes made elsewhere.');
    await search.fill('203.0.113.10'); await expect(page.getByTestId(prefix + '.known_devices.row.30').filter({ visible: true })).toBeVisible();
    expect(params.flat().every(([key]) => key === 'known_device[limit]')).toBe(true);
    const before = reads; devices = [{ ...device, user_agent: 'Firefox/131.0' }];
    const refresh = page.getByTestId(prefix + '.known_devices.refresh'); await refresh.focus(); await page.keyboard.press('Enter');
    await expect.poll(() => reads).toBeGreaterThan(before);
    await expect(page.getByTestId(prefix + '.known_devices.row.30').filter({ visible: true })).toContainText('Firefox/131.0');
    await expect(search).toHaveValue('203.0.113.10');
    const forget = page.getByTestId(prefix + '.known_devices.forget.30').filter({ visible: true });
    await forget.click(); await page.getByTestId(prefix + '.known_devices.forget.confirm.confirm').click();
    await expect(page.getByTestId(prefix + '.known_devices.forget.confirm')).toHaveCount(0);
    await expect(page.getByTestId(prefix + '.known_devices.row.30')).toHaveCount(0);
    await expect(page.getByTestId(prefix + '.known_devices.empty')).toBeVisible();
    const beforeEdit = reads;
    await page.getByTestId(prefix + '.totp.row.10.edit').filter({ visible: true }).click();
    await page.getByTestId(prefix + '.totp.edit.label').fill('Updated fixture phone');
    await page.getByTestId(prefix + '.totp.edit.save').click();
    await expect(page.getByTestId(prefix + '.totp.edit')).toHaveCount(0);
    await expect(page.getByTestId(prefix + '.totp.row.10').filter({ visible: true })).toContainText('Updated fixture phone');
    await expect.poll(() => reads).toBeGreaterThan(beforeEdit);
    expect(updates).toEqual([{ totp_device: { label: 'Updated fixture phone', enabled: true } }]);
    expect(writes).toEqual([`DELETE /api/v7.0/users/${id}/known_devices/30`, `PUT /api/v7.0/users/${id}/totp_devices/10`]);
    expect(params.flat().every(([key]) => key === 'known_device[limit]')).toBe(true);
  });
}
