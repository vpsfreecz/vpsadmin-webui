import { expect, test } from '@playwright/test';
import { bootstrapVpsAdminWindow, installHaveApiMock, setUiSettingsLocalStorage } from '../../fixtures';
import { expectNoDocumentHorizontalOverflow } from '../../helpers/horizontalOverflow';

for (const language of ['cs', 'en'] as const) {
  test(`@pr-smoke @pr-smoke-mobile ${language} Prague suggestions continue past shared Playground addresses`, async ({ page, isMobile }, testInfo) => {
    await bootstrapVpsAdminWindow(page);
    await setUiSettingsLocalStorage(page, { language, theme: 'dark' });
    const cursors: Array<string | null> = [];
    const address = (id: number, location: number) => ({
      id, addr: `192.0.2.${id}`, prefix: 32, user: null, network_interface: null,
      network: { id: location + 100, enabled: true, purpose: 'vps', role: 'public_access', ip_version: 4,
        primary_location: { id: location, label: location === 3 ? 'Praha' : 'Playground', environment: { id: 1, label: 'Production' } } },
    });
    await installHaveApiMock(page, {
      user: { id: 1, login: 'synthetic-admin', level: 99 },
      handlers: {
        'GET locations': () => ({ locations: [{ id: 3, label: 'Praha', environment: { id: 1, label: 'Production' } }] }),
        'GET ip_addresses': (ctx) => {
          if (ctx.searchParams.get('ip_address[version]') !== '4' || ctx.searchParams.get('ip_address[role]') !== 'public_access') {
            return { ip_addresses: [] };
          }
          const cursor = ctx.searchParams.get('ip_address[from_id]');
          cursors.push(cursor);
          return { ip_addresses: cursor === null
            ? Array.from({ length: 50 }, (_, i) => address(i + 1, 5))
            : [51, 52, 53].map((id) => address(id, 3)) };
        },
      },
    });
    await page.goto('/admin/networking/ip-addresses');
    const kind = isMobile ? 'card' : 'row';
    for (const id of [51, 52, 53]) {
      await expect(page.getByTestId(`admin.ip_addresses.${kind}.${id}`)).toBeVisible();
      await expect(page.getByTestId(`admin.ip_addresses.${kind}.${id}`)).toContainText(isMobile ? 'Praha' : 'PRG');
    }
    await expect(page.getByTestId(`admin.ip_addresses.${kind}.1`)).toHaveCount(0);
    expect(cursors).toEqual([null, '50']);
    await expectNoDocumentHorizontalOverflow(page);
    const screenshot = await page.getByTestId('admin.ip_addresses.page').screenshot({ path: testInfo.outputPath(`primary-ip-${language}.png`) });
    await testInfo.attach('Implemented primary-location suggestions with synthetic data', { body: screenshot, contentType: 'image/png' });
  });
}
