import { expect, test } from '@playwright/test';

import { bootstrapVpsAdminWindow, installHaveApiMock, setUiSettingsLocalStorage } from '../../fixtures';

const contexts = [
  { key: 'member', level: 1, base: '/app/profile', prefix: 'profile', owner: null },
  { key: 'support-personal', level: 21, base: '/app/profile', prefix: 'profile', owner: null },
  { key: 'admin-personal', level: 100, base: '/admin/profile', prefix: 'profile', owner: '1' },
  { key: 'admin-my', level: 100, base: '/app/profile', prefix: 'profile', owner: '1' },
  { key: 'admin-selected', level: 100, base: '/admin', prefix: 'admin', owner: '42' },
] as const;

for (const context of contexts) {
  for (const family of ['userdata', 'namespaces', 'maps'] as const) {
    for (const language of ['cs', 'en'] as const) {
      test(`@pr-smoke @pr-smoke-mobile profile control rhythm ${context.key} ${family} ${language}`, async ({ page }) => {
        await bootstrapVpsAdminWindow(page, { sessionToken: 'SYNTHETIC_PROFILE_RHYTHM' });
        await setUiSettingsLocalStorage(page, { language, theme: language === 'cs' ? 'dark' : 'light' });
        const owners: (string | null)[] = [];
        const writes: string[] = [];
        let copied = '';
        await page.exposeFunction('profileRhythmCopy', (text: string) => { copied = text; });
        await page.addInitScript(() => {
          Object.defineProperty(navigator, 'clipboard', { configurable: true, value: {
            writeText: (text: string) => (window as unknown as { profileRhythmCopy: (value: string) => Promise<void> }).profileRhythmCopy(text),
          } });
        });
        page.on('request', request => {
          if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method())) writes.push(request.method() + ' ' + new URL(request.url()).pathname);
        });
        const user = { id: 1, login: 'audit-viewer', level: context.level };
        const owner = { id: context.owner === '42' ? 42 : 1, login: 'audit-owner', level: 1 };
        const namespace = { id: 101, size: 65536, user: owner };
        await installHaveApiMock(page, { user, handlers: {
          'GET users/42': () => ({ user: owner }),
          'GET user_namespaces': ({ searchParams }) => {
            owners.push(searchParams.get('user_namespace[user]'));
            return { user_namespaces: [namespace] };
          },
          'GET user_namespace_maps': ({ searchParams }) => {
            owners.push(searchParams.get('user_namespace_map[user]'));
            return { user_namespace_maps: [{ id: 501, label: 'Ověřovací dlouhý český název mapování', user_namespace: namespace }] };
          },
          'GET vps_user_data': ({ searchParams }) => {
            owners.push(searchParams.get('vps_user_data[user]'));
            return { vps_user_data: [{ id: 101, label: 'Ověřovací dlouhý český název šablony', format: 'script', content: '#!/bin/sh\necho fixture', created_at: '2026-11-07T12:00:00Z' }] };
          },
        } });
        const selected = context.key === 'admin-selected';
        const prefix = family === 'userdata'
          ? selected ? 'admin.user.user_data' : 'profile.user_data'
          : `${context.prefix}.userns.${family}`;
        const query = family === 'userdata' ? 'q=Ověřovací' : family === 'namespaces' ? 'size=65536' : 'user_namespace=101';
        const route = family === 'userdata'
          ? selected ? '/admin/users/42/user-data' : `${context.base}/user-data`
          : `${context.base}/user-namespaces/${family}`;
        await page.goto(`${route}?${query}${selected && family !== 'userdata' ? '&user=42' : ''}`);
        const field = page.getByTestId(`${prefix}.${family === 'userdata' ? 'filters.q' : 'search.input'}`);
        const help = page.getByTestId(`${prefix}.smart.help_button`);
        const actions = ['filters.advanced', 'filters.copy_link', 'filters.clear'];
        await expect(field).toBeVisible();
        await expect(page.getByTestId(`${prefix}.filters.clear`)).toBeVisible();
        await expect.poll(() => owners.length).toBeGreaterThan(0);
        expect(owners.every(value => value === context.owner)).toBe(true);
        const reference = await field.boundingBox();
        expect(reference?.height).toBe(44);
        for (const control of [help, ...actions.map(action => page.getByTestId(`${prefix}.${action}`)), ...(family === 'userdata' ? [page.getByTestId(`${prefix}.create`)] : [])]) {
          const box = await control.boundingBox();
          expect(box?.height).toBe(44);
          expect(box?.width).toBeGreaterThanOrEqual(44);
        }
        await help.focus();
        await page.keyboard.press('Enter');
        await expect(page.getByTestId(`${prefix}.smart.help`)).toBeVisible();
        await page.keyboard.press('Escape');
        await expect(help).toBeFocused();
        await page.getByTestId(`${prefix}.filters.advanced`).click();
        await expect(page.getByRole('dialog')).toBeVisible();
        await page.keyboard.press('Escape');
        const sharedUrl = page.url();
        await page.getByTestId(`${prefix}.filters.copy_link`).click();
        await expect.poll(() => copied).toBe(sharedUrl);
        await page.setViewportSize({ width: 320, height: 750 });
        await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(321);
        const narrowField = await field.boundingBox();
        expect(narrowField?.width).toBeGreaterThanOrEqual(200);
        const clear = page.getByTestId(`${prefix}.filters.clear`);
        const clearBox = await clear.boundingBox();
        expect(clearBox?.x).toBeGreaterThanOrEqual(0);
        expect((clearBox?.x ?? 0) + (clearBox?.width ?? 1000)).toBeLessThanOrEqual(321);
        await clear.click();
        await expect(page.getByTestId(`${prefix}.filters.clear`)).toHaveCount(0);
        expect(new URL(page.url()).searchParams.get(family === 'userdata' ? 'q' : family === 'namespaces' ? 'size' : 'user_namespace')).toBeNull();
        expect(writes.filter(write => !/^PUT \/api\/v7\.0\/webui_user_settings\/(ui|ui_setting)\/settings$/.test(write))).toEqual([]);
      });
    }
  }
}

for (const language of ['cs', 'en'] as const) {
  test(`@pr-smoke @pr-smoke-mobile profile personal action retains one readable line ${language}`, async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await bootstrapVpsAdminWindow(page, { sessionToken: 'SYNTHETIC_PROFILE_ACTION' });
    await setUiSettingsLocalStorage(page, { language, theme: language === 'cs' ? 'dark' : 'light' });
    const user = { id: 1, login: 'fixture', level: 1, full_name: 'Ověřovací dlouhé české jméno a příjmení', email: 'fixture@example.test', address: 'Dlouhá ulice, České Budějovice' };
    await installHaveApiMock(page, { user, handlers: { 'GET users/1': () => ({ user }) } });
    await page.goto('/app/profile');
    await page.getByTestId('profile.personal.address').fill('Změněná adresa, České Budějovice');
    await page.getByTestId('profile.personal.change_reason').fill('Ověřovací důvod změny adresy');
    const action = page.getByTestId('profile.personal.change.submit');
    await expect(action).toBeEnabled();
    const text = await action.evaluate(el => {
      const range = document.createRange(); range.selectNodeContents(el);
      return { height: range.getBoundingClientRect().height, lineHeight: Number.parseFloat(getComputedStyle(el).lineHeight) };
    });
    expect(text.height).toBeLessThanOrEqual(text.lineHeight + 1);
    await page.setViewportSize({ width: 320, height: 750 });
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(321);
  });
}
