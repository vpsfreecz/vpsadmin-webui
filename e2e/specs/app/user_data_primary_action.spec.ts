import { expect, test } from '@playwright/test';
import { bootstrapVpsAdminWindow, installHaveApiMock, setUiSettingsLocalStorage } from '../../fixtures';

for (const language of ['cs', 'en'] as const) for (const selectedOwner of [false, true]) {
  test(`@pr-smoke @pr-smoke-mobile one user-data creation entry preserves the editor ${language} selected=${selectedOwner}`, async ({ page, hasTouch }) => {
    await page.setViewportSize({ width: hasTouch ? 320 : 1440, height: 1000 });
    await bootstrapVpsAdminWindow(page, { sessionToken: 'SYNTHETIC_USER_DATA_ACTION', webuiNext: { uiSettings: { persistence: 'local' } } });
    await setUiSettingsLocalStorage(page, { language, theme: language === 'cs' ? 'dark' : 'light' });
    const user = { id: 1, login: 'fixture', level: selectedOwner ? 99 : 1 }, owner = { id: 42, login: 'selected-owner', level: 1 };
    const owners: (string | null)[] = [], writes: string[] = [];
    page.on('request', r => { if (new URL(r.url()).pathname.startsWith('/api/') && !['GET', 'HEAD', 'OPTIONS'].includes(r.method())) writes.push(r.method()); });
    await installHaveApiMock(page, { user, handlers: {
      'GET users/42': () => ({ user: owner }),
      'GET vps_user_data': ({ searchParams }) => { owners.push(searchParams.get('vps_user_data[user]')); return { vps_user_data: [] }; },
    } });
    const prefix = selectedOwner ? 'admin.user.user_data' : 'profile.user_data';
    await page.goto(selectedOwner ? '/admin/users/42/user-data' : '/app/profile/user-data');
    await expect(page.getByTestId(prefix + '.empty')).toBeVisible();
    const create = page.getByTestId(prefix + '.create');
    await expect(create).toBeVisible();
    const label = await create.innerText();
    await expect(page.getByRole('button', { name: label, exact: true })).toHaveCount(1);
    await create.focus(); await page.keyboard.press('Enter');
    const editor = page.getByTestId(prefix + '.editor.drawer'); await expect(editor).toBeVisible();
    await expect(editor.getByTestId(prefix + '.editor.create')).toBeDisabled();
    await editor.getByTestId(prefix + '.editor.label').fill('Ověřovací šablona');
    await editor.getByTestId(prefix + '.editor.content').fill('#!/bin/sh\necho fixture');
    await expect(editor.getByTestId(prefix + '.editor.create')).toBeEnabled();
    await page.keyboard.press('Escape'); await expect(editor).toHaveCount(0); await expect(create).toBeFocused();
    await expect.poll(() => owners.length).toBeGreaterThan(0);
    expect(owners.every(v => v === (selectedOwner ? '42' : null))).toBe(true);
    expect(writes).toEqual([]);
  });
}
