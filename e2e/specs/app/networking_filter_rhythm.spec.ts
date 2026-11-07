import { expect, test } from '@playwright/test';

import { bootstrapVpsAdminWindow, installHaveApiMock, setUiSettingsLocalStorage } from '../../fixtures';

const scenes = [
  { route: '/admin/networking/host-ip-addresses', prefix: 'admin.host_ip_addresses', endpoint: 'host_ip_addresses', namespace: 'host_ip_address' },
  { route: '/admin/networking/ip-address-assignments', prefix: 'admin.ip_assignments', endpoint: 'ip_address_assignments', namespace: 'ip_address_assignment' },
  { route: '/admin/networking/live', prefix: 'admin.network_live', endpoint: 'network_interface_monitors', namespace: 'network_interface_monitor' },
];
for (const scene of scenes) for (const level of [21, 100]) for (const language of ['cs', 'en'] as const) {
  test(`@pr-smoke @pr-smoke-mobile networking filter dimensions ${scene.prefix} ${level} ${language}`, async ({ page }, info) => {
    await page.setViewportSize(info.project.name.startsWith('mobile') ? { width: 390, height: 844 } : { width: 1440, height: 1000 });
    await bootstrapVpsAdminWindow(page, { sessionToken: 'SYNTHETIC_NETWORK_RHYTHM' });
    await setUiSettingsLocalStorage(page, { language, theme: language === 'cs' ? 'dark' : 'light' });
    const vpsQueries: (string | null)[] = [];
    const writes: string[] = [];
    page.on('request', request => {
      if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method())) writes.push(request.method() + ' ' + new URL(request.url()).pathname);
    });
    await installHaveApiMock(page, { user: { id: 1, login: 'audit-viewer', level }, handlers: {
      ['GET ' + scene.endpoint]: ({ searchParams }) => {
        vpsQueries.push(searchParams.get(scene.namespace + '[vps]'));
        return { [scene.endpoint]: [] };
      },
      'GET vpses': () => ({ vpses: [{ id: 42, hostname: 'Dlouhý ověřovací český název VPS', user: { id: 1, login: 'audit-viewer' } }] }),
      'GET environments': () => ({ environments: [] }),
      'GET locations': () => ({ locations: [] }),
      'GET nodes': () => ({ nodes: [] }),
      'GET users': () => ({ users: [] }),
      'GET network_interfaces': () => ({ network_interfaces: [] }),
    } });
    await page.goto(scene.route + '?vps=42');
    const field = page.getByTestId(scene.prefix + '.filter.vps');
    await expect(field).toHaveValue('#42');
    await expect.poll(() => vpsQueries).toContain('42');
    const shell = page.getByTestId(scene.prefix + '.page');
    const controls = shell.locator('input[data-testid*=".filter."],select[data-testid*=".filter."],button[data-testid$=".filter.clear"]');
    for (const control of await controls.all()) {
      if (await control.isVisible()) expect((await control.boundingBox())?.height).toBe(44);
    }
    await field.focus();
    await page.keyboard.press('Shift+Tab');
    await page.keyboard.press('Tab');
    await expect(field).toBeFocused();
    await field.fill('#43');
    await expect.poll(() => vpsQueries).toContain('43');
    expect(new URL(page.url()).searchParams.get('vps')).toBe('43');
    await page.keyboard.press('Escape');
    await page.setViewportSize({ width: 320, height: 750 });
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(321);
    const clear = page.getByTestId(scene.prefix + '.filter.clear');
    const box = await clear.boundingBox();
    expect(box?.height).toBe(44);
    expect((box?.x ?? 0) + (box?.width ?? 1000)).toBeLessThanOrEqual(321);
    await clear.click();
    await expect.poll(() => new URL(page.url()).searchParams.get('vps')).toBeNull();
    await expect.poll(() => vpsQueries.at(-1)).toBeNull();
    expect(writes.filter(write => !/^PUT \/api\/v7\.0\/webui_user_settings\/(ui|ui_setting)\/settings$/.test(write))).toEqual([]);
  });
}
