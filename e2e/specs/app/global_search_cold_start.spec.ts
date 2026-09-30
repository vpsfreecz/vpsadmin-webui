import { expect, test, type Page } from '@playwright/test';
import { bootstrapVpsAdminWindow, installHaveApiMock } from '../../fixtures';

async function searchUi(page: Page, mobile: boolean) {
  if (mobile) await page.getByTestId('palette.open').click();
  const prefix = mobile ? 'palette' : 'shell.inline-search';
  return {
    input: page.getByTestId(`${prefix}.input`),
    result: (index: number) => page.getByTestId(`${prefix}.result.${index}`),
    error: page.getByTestId(mobile ? 'palette.error' : 'shell.inline-search.status'),
  };
}

for (const language of ['en', 'cs']) {
  test(`cold admin search keeps DNS hits after eight VPS matches (${language})`, async ({ page, isMobile }, testInfo) => {
    await page.addInitScript((language) => {
      localStorage.setItem('vpsadmin.uiSettings.v1', JSON.stringify({ language, theme: 'dark' }));
    }, language);
    await bootstrapVpsAdminWindow(page);
    let searches = 0;
    await installHaveApiMock(page, {
      user: { id: 42, login: 'search-admin', level: 100 },
      handlers: {
        'POST cluster/search': () => {
          searches++;
          return { cluster_search: [
            ...Array.from({ length: 9 }, (_, index) => ({ resource: 'Vps', id: index + 1, value: `letsball-${index}.example`, attribute: 'hostname' })),
            { resource: 'DnsZone', id: 80, value: 'letsball.example.', attribute: 'name' },
          ] };
        },
      },
    });
    await page.goto('/admin/profile');
    const ui = await searchUi(page, isMobile);
    const { input } = ui;
    await input.fill('letsball');
    const last = ui.result(9);
    await expect(last).toContainText('letsball.example.');
    for (let i = 0; i < 9; i++) await input.press('ArrowDown');
    await expect(last).toBeInViewport();
    await expect(input).toBeFocused();
    expect(searches).toBe(1);
    await page.screenshot({ path: testInfo.outputPath(`dns-search-${language}.png`) });
    await input.press('Enter');
    await expect(page).toHaveURL(/\/admin\/dns\/zones\/80$/);
  });
}

for (const level of [1, 100]) {
  test(`fresh My view finds assigned IP and second-page DNS for level ${level}`, async ({ page, isMobile }, testInfo) => {
    await bootstrapVpsAdminWindow(page);
    const ipFilters: (string | null)[] = [];
    const zonePages: (string | null)[] = [];
    await installHaveApiMock(page, {
      user: { id: 42, login: 'search-user', level },
      handlers: {
        'GET vpses': () => ({ vpses: [] }),
        'GET ip_addresses': (ctx) => {
          const addr = ctx.searchParams.get('ip_address[addr]');
          if (!addr) return { ip_addresses: [] };
          const user = ctx.searchParams.get('ip_address[user]');
          ipFilters.push(user);
          // Mirror the API: the assigned IP has no direct user_id.
          return { ip_addresses: user ? [] : [
            { id: 1, addr, prefix: 32, network_interface: { id: 3, vps: { id: 55, hostname: 'mail.example', user: { id: 42 } } } },
            { id: 2, addr, prefix: 32, user: { id: 99 } },
          ] };
        },
        'GET dns_zones': (ctx) => {
          const cursor = ctx.searchParams.get('dns_zone[from_id]');
          zonePages.push(cursor);
          if (level === 100) expect(ctx.searchParams.get('dns_zone[user]')).toBe('42');
          return { dns_zones: cursor ? [{ id: 90, name: 'snajpa.example.' }] :
            Array.from({ length: 100 }, (_, i) => ({ id: 200 - i, name: `other-${i}.example.` })) };
        },
      },
    });
    await page.goto('/app/profile');
    const ui = await searchUi(page, isMobile);
    const { input } = ui;
    await input.fill('203.0.113.20');
    await expect(ui.result(0)).toContainText('mail.example');
    await expect(ui.result(1)).toContainText('203.0.113.20/32');
    await expect(ui.result(2)).toHaveCount(0);
    expect(ipFilters).toEqual([null]);
    await page.screenshot({ path: testInfo.outputPath('owned-ip-search.png') });
    await input.fill('snajpa');
    await expect(ui.result(0)).toContainText('snajpa.example.');
    expect(zonePages).toEqual([null, '101']);
    await page.reload();
    await searchUi(page, isMobile);
    await input.fill('snajpa');
    await expect(ui.result(0)).toContainText('snajpa.example.');
  });
}

test('failed DNS lookup is an error, not an empty search, and a new query retries', async ({ page, isMobile }) => {
  await bootstrapVpsAdminWindow(page);
  let fail = true;
  await installHaveApiMock(page, { user: { id: 42, login: 'search-user', level: 1 }, handlers: {
    'GET vpses': () => ({ vpses: [] }),
    'GET dns_zones': () => ({ dns_zones: [{ id: 90, name: 'snajpa.example.' }] }),
  } });
  await page.route('**/dns_zones?**', async (route) => {
    if (fail) await route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ status: false, message: 'DNS unavailable' }) });
    else await route.fallback();
  });
  await page.goto('/app/profile');
  const ui = await searchUi(page, isMobile);
    const { input } = ui;
  await input.fill('snajpa');
  await expect(ui.error).toContainText('Error');
  fail = false;
  await input.fill('snajpa.example');
  await expect(ui.result(0)).toContainText('snajpa.example.');
});

for (const language of ['en', 'cs']) {
  test(`incomplete member IP lookup uses a localized error (${language})`, async ({ page, isMobile }) => {
    await page.addInitScript((language) => {
      localStorage.setItem('vpsadmin.uiSettings.v1', JSON.stringify({ language }));
    }, language);
    await bootstrapVpsAdminWindow(page);
    await installHaveApiMock(page, { user: { id: 42, login: 'search-user', level: 1 }, handlers: {
      'GET vpses': () => ({ vpses: [] }),
      'GET dns_zones': () => ({ dns_zones: [] }),
      'GET ip_addresses': () => ({ ip_addresses: Array.from({ length: 100 }, (_, i) => ({ id: i + 1, addr: '192.0.2.1' })) }),
    } });
    await page.goto('/app/profile');
    const ui = await searchUi(page, isMobile);
    await ui.input.fill('192.0.2.1');
    await expect(ui.error).toContainText(language === 'cs'
      ? 'Vyhledávání IP adres se nepodařilo dokončit.'
      : 'IP search could not be completed.');
    await expect(ui.result(0)).toHaveCount(0);
  });
}
