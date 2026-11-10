import { expect, test } from '@playwright/test';

import { bootstrapVpsAdminWindow, installHaveApiMock, setUiSettingsLocalStorage } from '../../fixtures';

test('admin IP addresses traverse ascending API pages and paginate loaded rows locally', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name.startsWith('mobile-'), 'Desktop table pagination is covered separately from mobile cards.');

  await bootstrapVpsAdminWindow(page, { sessionToken: 'TEST' });

  const rows = Array.from({ length: 275 }, (_, offset) => {
    const id = 125 + offset;
    return {
      id,
      addr: offset === 0 ? '10.0.0.1' : `198.51.${100 + Math.floor(offset / 250)}.${(offset % 250) + 1}`,
      prefix: 32,
      routed: id % 2 === 0,
      user: { id: 1000 + (id % 10), login: `u${id % 10}` },
      vps: { id: 2000 + (id % 10), hostname: `vps${id % 10}` },
      network: offset === 0
        ? { id: 3000, address: '10.0.0.0', prefix: 24 }
        : { id: 3001 + Math.floor(offset / 250), address: `198.51.${100 + Math.floor(offset / 250)}.0`, prefix: 24 },
      network_interface: id % 2 === 0 ? { id: 4000, name: 'eth0' } : null,
      created_at: '2025-01-01T00:00:00Z',
    };
  });
  const apiRequests: Array<{
    fromId: string | null;
    limit: string | null;
    order: string | null;
    purpose: string | null;
    addr: string | null;
  }> = [];

  await installHaveApiMock(page, {
    user: { id: 1, login: 'admin', level: 100 },
    handlers: {
      'GET locations': () => ({ locations: [] }),
      'GET ip_addresses': (ctx) => {
        const request = {
          fromId: ctx.searchParams.get('ip_address[from_id]'),
          limit: ctx.searchParams.get('ip_address[limit]'),
          order: ctx.searchParams.get('ip_address[order]'),
          purpose: ctx.searchParams.get('ip_address[purpose]'),
          addr: ctx.searchParams.get('ip_address[addr]'),
        };
        apiRequests.push(request);

        if (request.addr) {
          const match = rows.filter((row) => row.addr === request.addr);
          return { ip_addresses: match, _meta: { total_count: match.length } };
        }

        const fromId = request.fromId === null ? 0 : Number(request.fromId);
        const ip_addresses = rows.filter((row) => row.id > fromId).slice(0, Number(request.limit));
        return { ip_addresses, _meta: { total_count: rows.length } };
      },
    },
  });

  await page.goto('/admin/ip-addresses?order=asc&occupancy=any');

  await expect(page.getByTestId('admin.ip_addresses.row.125')).toBeVisible();
  await expect.poll(() => apiRequests).toEqual([
    { fromId: null, limit: '250', order: 'asc', purpose: 'vps', addr: null },
    { fromId: '374', limit: '250', order: 'asc', purpose: 'vps', addr: null },
  ]);
  await expect(page).not.toHaveURL(/(?:\?|&)(?:from_id|page)=/);
  await expect(page.getByTestId('admin.ip_addresses.row.125')).toHaveAttribute('data-row-variant', 'warn');
  await expect(page.getByTestId('admin.ip_addresses.row.125.dot')).toBeVisible();
  const incidentsAction = page.getByTestId('admin.ip_addresses.row.125.action.incidents');
  const assignmentsAction = page.getByTestId('admin.ip_addresses.row.125.action.assignments');
  const routeAction = page.getByTestId('admin.ip_addresses.row.125.action.route');
  const editAction = page.getByTestId('admin.ip_addresses.row.125.action.edit');
  await expect(incidentsAction).toHaveAttribute('aria-label', 'Incidents');
  await expect(assignmentsAction).toHaveAttribute('aria-label', 'Assignment history');
  await expect(routeAction).toHaveAttribute('aria-label', 'Assign to VPS');
  await expect(routeAction).toHaveAttribute('title', 'Assign to VPS');
  await expect(routeAction).toHaveAttribute('href', '/admin/ip-addresses/125?action=assign#route');
  await expect(editAction).toHaveAttribute('aria-label', 'Edit');
  await expect(editAction).toHaveAttribute('href', '/admin/ip-addresses/125');
  await expect(incidentsAction).toHaveText('');
  await expect(routeAction).toBeVisible();
  await expect(routeAction).toHaveText('');
  await expect(page.getByTestId('admin.ip_addresses.row.126.action.route')).toHaveAttribute('aria-label', 'Remove from VPS');

  const proofScreenshot = process.env['E2E_IP_ACTIONS_PROOF_SCREENSHOT']?.trim();
  if (proofScreenshot) {
    await page.screenshot({ path: proofScreenshot });
  }

  // Moving through the loaded rows does not request another API page or emit a URL cursor.
  await page.getByTestId('admin.ip_addresses.pagination.desktop.next').click();
  await expect(page.getByTestId('admin.ip_addresses.row.175')).toBeVisible();
  await expect(page.getByTestId('admin.ip_addresses.row.175')).toHaveAttribute('data-row-variant', 'warn');
  await expect(page.getByTestId('admin.ip_addresses.row.125')).toHaveCount(0);
  await expect(page).not.toHaveURL(/(?:\?|&)(?:from_id|page)=/);
  expect(apiRequests).toHaveLength(2);

  // An exact server filter replaces the loaded inventory and resets the local page.
  const sfi = page.getByTestId('admin.ip_addresses.smart_filter.input');
  await sfi.fill('addr:10.0.0.1');
  await expect(sfi).toHaveValue('addr:10.0.0.1');
  await sfi.press('Enter');
  await expect(page).toHaveURL(/(?:\?|&)addr=10\.0\.0\.1(?:&|$)/);
  await expect(page.getByTestId('admin.ip_addresses.row.125')).toContainText('10.0.0.1');
  await expect(page.getByTestId('admin.ip_addresses.row.175')).toHaveCount(0);
  await expect(page.getByTestId('admin.ip_addresses.pagination.desktop.next')).toHaveCount(0);
  expect(apiRequests).toHaveLength(3);
  expect(apiRequests.at(-1)).toEqual({
    fromId: null, limit: '250', order: 'asc', purpose: 'vps', addr: '10.0.0.1',
  });
  await expect(page).not.toHaveURL(/(?:\?|&)(?:from_id|page)=/);
});

test('admin IP address cards keep compact actions on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await bootstrapVpsAdminWindow(page, { sessionToken: 'TEST' });
  await installHaveApiMock(page, {
    user: { id: 1, login: 'admin', level: 100 },
    handlers: {
      'GET locations': () => ({ locations: [] }),
      'GET ip_addresses': () => ({
        ip_addresses: [{
          id: 125,
          addr: '192.0.2.125',
          prefix: 32,
          routed: true,
          user: { id: 7, login: 'alice' },
          vps: { id: 42, hostname: 'vps-42' },
          network: { id: 3000, address: '192.0.2.0', prefix: 24 },
          network_interface: { id: 4000, name: 'eth0' },
          created_at: '2025-01-01T00:00:00Z',
        }],
      }),
    },
  });

  await page.goto('/admin/ip-addresses');

  const card = page.getByTestId('admin.ip_addresses.card.125');
  await expect(card).toBeVisible();
  await expect(card.getByTestId('admin.ip_addresses.card.125.action.incidents')).toHaveAttribute('aria-label', 'Incidents');
  await expect(card.getByTestId('admin.ip_addresses.card.125.action.route')).toHaveAttribute('aria-label', 'Remove from VPS');
  await expect(card.getByTestId('admin.ip_addresses.card.125.action.edit')).toHaveAttribute('aria-label', 'Edit');

  const proofScreenshot = process.env['E2E_IP_ACTIONS_MOBILE_PROOF_SCREENSHOT']?.trim();
  if (proofScreenshot) await page.screenshot({ path: proofScreenshot, fullPage: true });
});

test('@pr-smoke @pr-smoke-mobile admin IP address search resolves an exact user login and shows owned addresses', async ({ page }, testInfo) => {
  await bootstrapVpsAdminWindow(page, { sessionToken: 'TEST' });

  const ipRequests: Array<{
    user: string | null;
    q: string | null;
    assigned: string | null;
    version: string | null;
    fromId: string | null;
    limit: string | null;
  }> = [];

  await installHaveApiMock(page, {
    user: { id: 1, login: 'admin', level: 100 },
    handlers: {
      'GET locations': () => ({ locations: [] }),
      'GET users': (ctx) => ({
        users: ctx.searchParams.get('user[login]') === 'base48'
          ? [{ id: 48, login: 'base48', level: 1 }]
          : [],
      }),
      'POST cluster/search': () => ({ cluster_search: [] }),
      'GET ip_addresses': (ctx) => {
        const request = {
          user: ctx.searchParams.get('ip_address[user]'),
          q: ctx.searchParams.get('ip_address[q]'),
          assigned: ctx.searchParams.get('ip_address[assigned_to_interface]'),
          version: ctx.searchParams.get('ip_address[version]'),
          fromId: ctx.searchParams.get('ip_address[from_id]'),
          limit: ctx.searchParams.get('ip_address[limit]'),
        };
        ipRequests.push(request);

        if (request.user !== '48') return { ip_addresses: [] };
        return {
          ip_addresses: [{
            id: 480,
            addr: '83.167.228.48',
            prefix: 32,
            user: { id: 48, login: 'base48' },
            vps: { id: 148, hostname: 'base48-vps' },
            network: { id: 12, address: '83.167.228.0', prefix: 24 },
            network_interface: { id: 1480, name: 'eth0' },
          }],
        };
      },
    },
  });

  for (const query of ['base48', 'q:base48', 'user:base48']) {
    await page.goto('/admin/ip-addresses?limit=25&page=2&from_id=51');

    const input = page.getByTestId('admin.ip_addresses.smart_filter.input');
    await input.fill(query);
    await input.press('Enter');

    await expect(page).toHaveURL(/(?:\?|&)user=48(?:&|$)/);
    await expect(page).not.toHaveURL(/(?:\?|&)q=/);
    await expect(page).not.toHaveURL(/(?:\?|&)from_id=/);
    await expect(page).not.toHaveURL(/(?:\?|&)page=/);
    await expect(page).toHaveURL(/(?:\?|&)limit=25(?:&|$)/);
    await expect(page.getByTestId('admin.ip_addresses.quick.occupancy.any')).toHaveClass(/bg-surface/);
    const itemKind = testInfo.project.name.startsWith('mobile-') ? 'card' : 'row';
    const address = page.getByTestId(`admin.ip_addresses.${itemKind}.480`);
    await expect(address).toContainText('83.167.228.48');
    await expect(address).toContainText('base48');

    await expect.poll(() => ipRequests.at(-1)).toEqual({
      user: '48',
      q: null,
      assigned: null,
      version: null,
      fromId: null,
      limit: '250',
    });
  }

  await page.goto('/admin/ip-addresses?q=base48&limit=25&page=2&from_id=51');
  await expect(page).toHaveURL(/(?:\?|&)user=48(?:&|$)/);
  await expect(page).not.toHaveURL(/(?:\?|&)q=/);
  await expect(page).not.toHaveURL(/(?:\?|&)from_id=/);
  await expect(page).not.toHaveURL(/(?:\?|&)page=/);
  await expect(page).toHaveURL(/(?:\?|&)limit=25(?:&|$)/);
  await expect.poll(() => ipRequests.at(-1)).toEqual({
    user: '48',
    q: null,
    assigned: null,
    version: null,
    fromId: null,
    limit: '250',
  });

  await page.goto('/admin/ip-addresses');
  const atomicInput = page.getByTestId('admin.ip_addresses.smart_filter.input');
  await atomicInput.fill('version:4 assigned:true user:base48');
  await atomicInput.press('Enter');
  await expect(page).toHaveURL(/(?:\?|&)user=48(?:&|$)/);
  await expect(page).toHaveURL(/(?:\?|&)version=4(?:&|$)/);
  await expect(page).toHaveURL(/(?:\?|&)assigned_to_interface=1(?:&|$)/);
  await expect.poll(() => ipRequests.at(-1)).toEqual({
    user: '48',
    q: null,
    assigned: 'true',
    version: '4',
    fromId: null,
    limit: '250',
  });

  await atomicInput.fill('assigned:any user:base48');
  await atomicInput.press('Enter');
  await expect(page).toHaveURL(/(?:\?|&)occupancy=any(?:&|$)/);
  await expect(page).not.toHaveURL(/(?:\?|&)assigned_to_interface=/);
  await expect(page.getByTestId('admin.ip_addresses.quick.occupancy.any')).toHaveClass(/bg-surface/);
  await expect.poll(() => ipRequests.at(-1)).toEqual({
    user: '48',
    q: null,
    assigned: null,
    version: '4',
    fromId: null,
    limit: '250',
  });
});

test('@pr-smoke @pr-smoke-mobile admin IP address search never falls back to an unfiltered list for an unknown login', async ({ page }, testInfo) => {
  await bootstrapVpsAdminWindow(page, { sessionToken: 'TEST' });

  let ipRequestCount = 0;
  await installHaveApiMock(page, {
    user: { id: 1, login: 'admin', level: 100 },
    handlers: {
      'GET locations': () => ({ locations: [] }),
      'GET users': () => ({ users: [] }),
      'POST cluster/search': () => ({ cluster_search: [] }),
      'GET ip_addresses': () => {
        ipRequestCount += 1;
        return {
          ip_addresses: [{
            id: 125,
            addr: '192.0.2.125',
            prefix: 32,
            network: { id: 12, address: '192.0.2.0', prefix: 24 },
          }],
        };
      },
    },
  });

  await page.goto('/admin/ip-addresses');
  const itemKind = testInfo.project.name.startsWith('mobile-') ? 'card' : 'row';
  const unrelatedAddress = page.getByTestId(`admin.ip_addresses.${itemKind}.125`);
  await expect(unrelatedAddress).toBeVisible();
  const requestsBeforeSearch = ipRequestCount;

  const input = page.getByTestId('admin.ip_addresses.smart_filter.input');
  await input.fill('missing-user');
  await input.press('Enter');

  await expect(page.getByTestId('admin.ip_addresses.chip.error.0')).toContainText(
    'Cannot resolve user: missing-user'
  );
  await expect(unrelatedAddress).toHaveCount(0);
  await expect(page.getByTestId('admin.ip_addresses.empty')).toBeVisible();
  expect(ipRequestCount).toBe(requestsBeforeSearch);

  await page.getByTestId('admin.ip_addresses.chip.error.0').getByRole('button', { name: 'Remove' }).click();
  await expect(input).toHaveValue('');
  await expect(unrelatedAddress).toBeVisible();

  await page.goto('/admin/ip-addresses?q=missing-user&page=2&from_id=125');
  await expect(page.getByTestId('admin.ip_addresses.chip.error.0')).toContainText(
    'Cannot resolve user: missing-user'
  );
  await expect(unrelatedAddress).toHaveCount(0);
  await page.getByTestId('admin.ip_addresses.chip.error.0').getByRole('button', { name: 'Remove' }).click();
  await expect(page).not.toHaveURL(/(?:\?|&)q=/);
  await expect(page).not.toHaveURL(/(?:\?|&)page=/);
  await expect(page).not.toHaveURL(/(?:\?|&)from_id=/);
  await expect(input).toHaveValue('');
  await expect(unrelatedAddress).toBeVisible();

  await input.fill('missing-user');
  await input.press('Enter');
  await expect(page.getByTestId('admin.ip_addresses.empty')).toBeVisible();
  const requestsBeforeUrlChange = ipRequestCount;

  await page.getByTestId('admin.ip_addresses.quick.shortcut.ipv6').click();
  await expect(page).toHaveURL(/(?:\?|&)version=6(?:&|$)/);
  await expect(page.getByTestId('admin.ip_addresses.chip.error.0')).toHaveCount(0);
  await expect(unrelatedAddress).toBeVisible();
  await expect.poll(() => ipRequestCount).toBeGreaterThan(requestsBeforeUrlChange);
});

test('@pr-smoke @pr-smoke-mobile admin IP address search keeps a newer URL filter when login lookup finishes late', async ({ page }) => {
  await bootstrapVpsAdminWindow(page, { sessionToken: 'TEST' });

  let userLookupStarted = false;
  let userLookupFinished = false;
  let releaseUserLookup!: () => void;
  const userLookupGate = new Promise<void>((resolve) => {
    releaseUserLookup = resolve;
  });
  const ipRequests: Array<{ user: string | null; version: string | null }> = [];
  await installHaveApiMock(page, {
    user: { id: 1, login: 'admin', level: 100 },
    handlers: {
      'GET locations': () => ({ locations: [] }),
      'GET users': async () => {
        userLookupStarted = true;
        await userLookupGate;
        userLookupFinished = true;
        return { users: [{ id: 48, login: 'base48', level: 1 }] };
      },
      'GET ip_addresses': (ctx) => {
        ipRequests.push({
          user: ctx.searchParams.get('ip_address[user]'),
          version: ctx.searchParams.get('ip_address[version]'),
        });
        return { ip_addresses: [] };
      },
    },
  });

  await page.goto('/admin/ip-addresses');
  const input = page.getByTestId('admin.ip_addresses.smart_filter.input');
  await input.fill('base48');
  await input.press('Enter');
  try {
    await expect.poll(() => userLookupStarted).toBe(true);
    // Keep the response pending until the newer filter has actually committed.
    // A timer can finish before mobile WebKit delivers the click on a busy CI host.
    await page.getByTestId('admin.ip_addresses.quick.shortcut.ipv6').click();
    await expect(page).toHaveURL(/(?:\?|&)version=6(?:&|$)/);
    expect(userLookupFinished).toBe(false);
  } finally {
    releaseUserLookup();
  }
  await expect.poll(() => userLookupFinished).toBe(true);

  await expect(page).not.toHaveURL(/(?:\?|&)user=48(?:&|$)/);
  await expect(input).toHaveValue('base48');
  await expect.poll(() => ipRequests.at(-1)).toEqual({ user: null, version: '6' });
});

test('@pr-smoke @pr-smoke-mobile admin IP address search restarts a legacy URL lookup after another filter changes', async ({ page }) => {
  await bootstrapVpsAdminWindow(page, { sessionToken: 'TEST' });

  let userLookupCount = 0;
  const ipRequests: Array<{ user: string | null; version: string | null }> = [];
  await installHaveApiMock(page, {
    user: { id: 1, login: 'admin', level: 100 },
    handlers: {
      'GET locations': () => ({ locations: [] }),
      'GET users': async () => {
        userLookupCount += 1;
        await new Promise<void>((resolve) => setTimeout(resolve, 350));
        return { users: [{ id: 48, login: 'base48', level: 1 }] };
      },
      'GET ip_addresses': (ctx) => {
        ipRequests.push({
          user: ctx.searchParams.get('ip_address[user]'),
          version: ctx.searchParams.get('ip_address[version]'),
        });
        return { ip_addresses: [] };
      },
    },
  });

  await page.goto('/admin/ip-addresses?q=base48');
  await expect.poll(() => userLookupCount).toBeGreaterThan(0);
  await page.getByTestId('admin.ip_addresses.quick.shortcut.ipv6').click();

  await expect(page).toHaveURL(/(?:\?|&)version=6(?:&|$)/);
  await expect(page).toHaveURL(/(?:\?|&)user=48(?:&|$)/);
  await expect(page).not.toHaveURL(/(?:\?|&)q=/);
  await expect.poll(() => ipRequests.at(-1)).toEqual({ user: '48', version: '6' });
});

test('@pr-smoke @pr-smoke-mobile admin IP address search distinguishes lookup failure from a missing user', async ({ page }) => {
  await bootstrapVpsAdminWindow(page, { sessionToken: 'TEST' });

  await installHaveApiMock(page, {
    user: { id: 1, login: 'admin', level: 100 },
    handlers: {
      'GET locations': () => ({ locations: [] }),
      'GET users': () => ({ status: false, message: 'lookup unavailable', response: null }),
      'GET ip_addresses': () => ({ ip_addresses: [] }),
    },
  });

  await page.goto('/admin/ip-addresses');
  const input = page.getByTestId('admin.ip_addresses.smart_filter.input');
  await input.fill('base48');
  await input.press('Enter');

  await expect(page.getByTestId('admin.ip_addresses.chip.error.0')).toContainText(
    'Could not verify user base48. Try again.'
  );
  await expect(page).not.toHaveURL(/(?:\?|&)user=/);
});

test('@pr-smoke @pr-smoke-mobile IP inventory keeps legacy IPv6 searchable and offers compact icon actions on the first tap', async ({ page }, testInfo) => {
  await bootstrapVpsAdminWindow(page, { sessionToken: 'TEST' });
  const location = { id: 7, label: 'Brno', environment: { id: 1, label: 'Production' } };
  const network = { id: 10, ip_version: 6, address: '2001:db8::', prefix: 48, enabled: true, primary_location: location };
  const old = { id: 11, addr: '2001:db8::9', prefix: 128, network };
  const block = { id: 99, addr: '2001:db8:1::', prefix: 64, network };
  const requests: URL[] = [];
  await installHaveApiMock(page, {
    user: { id: 1, login: 'admin', level: 100 },
    handlers: {
      'GET locations': () => ({ locations: [location] }),
      'GET ip_addresses': (ctx) => {
        requests.push(new URL(ctx.url.href));
        const prefix = ctx.searchParams.get('ip_address[prefix]');
        if (prefix === '128') return { ip_addresses: [old] };
        if (ctx.searchParams.get('ip_address[version]') === '4') return { ip_addresses: [] };
        // The old /128 fills the API's first page unless the query selects /64.
        return { ip_addresses: prefix === '64' ? [block] : [old] };
      },
      'GET ip_addresses/11': () => ({ ip_address: old }),
      'GET ip_addresses/99': () => ({ ip_address: block }),
      'GET host_ip_addresses': () => ({ host_ip_addresses: [] }),
    },
  });
  const mobile = testInfo.project.name.startsWith('mobile-');
  const prefix = `admin.ip_addresses.${mobile ? 'card' : 'row'}`;
  const tap = async (id: string) => {
    const target = page.getByTestId(id);
    if (mobile) await target.tap();
    else await target.click();
  };
  await page.goto('/admin/networking/ip-addresses');
  await expect(page.getByTestId(`${prefix}.99`)).toBeVisible();
  await expect(page.getByTestId(`${prefix}.11`)).toHaveCount(0);
  expect(requests.filter(url => url.searchParams.get('ip_address[version]') === '6')
    .every(url => url.searchParams.get('ip_address[prefix]') === '64')).toBe(true);

  const filtered = '/admin/networking/ip-addresses?version=6&prefix=128';
  await page.goto(filtered);
  await expect(page.getByTestId(`${prefix}.11`)).toContainText('2001:db8::9/128');
  await expect(page.getByTestId(`${prefix}.11.action.incidents`)).toHaveAttribute('aria-label', 'Incidents');
  await expect(page.getByTestId(`${prefix}.11.action.assignments`)).toHaveAttribute('aria-label', 'Assignment history');
  let previousBox: { x: number; y: number; width: number } | undefined;
  for (const action of ['incidents', 'assignments', 'edit', 'route']) {
    const target = page.getByTestId(`${prefix}.11.action.${action}`);
    await expect(target).toBeVisible();
    await expect(target).toHaveText('');
    const label = await target.getAttribute('aria-label');
    expect(label).toBeTruthy();
    await expect(target).toHaveAttribute('title', label!);
    const box = (await target.boundingBox())!;
    if (mobile) {
      expect(box.height).toBeGreaterThanOrEqual(44);
      expect(box.width).toBeGreaterThanOrEqual(44);
    }
    if (previousBox) {
      expect(Math.abs(box.y - previousBox.y)).toBeLessThan(1);
      expect(box.x).toBeGreaterThanOrEqual(previousBox.x + previousBox.width);
      expect(box.x - previousBox.x - previousBox.width).toBeLessThanOrEqual(5);
    }
    previousBox = box;
  }
  const width = await page.evaluate(() => ({ full: document.documentElement.scrollWidth, viewport: innerWidth }));
  expect(width.full).toBeLessThanOrEqual(width.viewport + 1);
  const screenshot = process.env['E2E_IP_INVENTORY_SCREENSHOTS'];
  if (screenshot) await page.getByTestId(mobile ? `${prefix}.11` : 'admin.ip_addresses.table').screenshot({ path: `${screenshot}/${testInfo.project.name}.png`, scale: 'css' });
  await tap(`${prefix}.11.action.edit`);
  await expect(page).toHaveURL(/\/ip-addresses\/11$/);
  for (const section of ['details', 'owner', 'hosts']) {
    await expect(page.getByTestId(`admin.ip_address.${section}.card`)).toBeVisible();
  }
  await page.goto(filtered);
  if (mobile) await tap(`${prefix}.11.action.route`);
  else await page.getByTestId(`${prefix}.11.action.route`).press('Enter');
  await expect(page).toHaveURL(/\/ip-addresses\/11#route$/);
  await expect(page.getByTestId('admin.ip_address.route.card')).toBeInViewport();
  for (const action of ['incidents', 'assignments']) {
    await page.goto(filtered);
    await tap(`${prefix}.11.action.${action}`);
    await expect.poll(() => new URL(page.url()).searchParams.get('ip_addr')).toBe(old.addr);
    await expect(page).toHaveURL(action === 'incidents' ? /\/incidents\?/ : /\/ip-address-assignments\?/);
  }
});

for (const language of ['cs', 'en'] as const) {
  test(`@pr-smoke @pr-smoke-mobile ${language} numeric IP search filters user 5008 rather than IP 5008`, async ({ page }, testInfo) => {
    await bootstrapVpsAdminWindow(page, { sessionToken: 'TEST' });
    await setUiSettingsLocalStorage(page, { language, theme: 'dark' });
    const requests: Array<{ user: string | null; assigned: string | null; q: string | null }> = [];
    const owned = [
      { id: 9101, addr: '192.0.2.11', prefix: 32, network_interface: { id: 71, name: 'eth0' } },
      { id: 9102, addr: '2001:db8:50::', prefix: 64 },
      { id: 9103, addr: '2001:db8:50::1', prefix: 128 },
    ].map((ip) => ({ ...ip, user: { id: 5008, login: 'sample-owner' }, routed: true }));
    await installHaveApiMock(page, {
      user: { id: 1, login: 'admin', level: 100 },
      handlers: {
        'GET locations': () => ({ locations: [] }),
        'GET ip_addresses': (ctx) => {
          const request = {
            user: ctx.searchParams.get('ip_address[user]'),
            assigned: ctx.searchParams.get('ip_address[assigned_to_interface]'),
            q: ctx.searchParams.get('ip_address[q]'),
          };
          requests.push(request);
          return { ip_addresses: request.user === '5008' ? owned : [], _meta: { total_count: request.user === '5008' ? 3 : 0 } };
        },
      },
    });
    await page.goto('/admin/networking/ip-addresses');
    const input = page.getByTestId('admin.ip_addresses.smart_filter.input');
    await input.fill('5008');
    const suggestion = page.getByTestId('admin.ip_addresses.smart.suggest.user');
    await expect(suggestion).toContainText(language === 'cs' ? 'IP adresy uživatele #5008' : 'IP addresses owned by user #5008');
    await expect(page.getByTestId('admin.ip_addresses.smart.suggest.open')).toBeVisible();
    await input.press('Enter');
    await expect(page).toHaveURL(/\/admin\/networking\/ip-addresses\?user=5008$/);
    await expect(page.getByTestId('admin.ip_addresses.chip.user')).toContainText('5008');
    const kind = testInfo.project.name.startsWith('mobile-') ? 'card' : 'row';
    for (const ip of owned) await expect(page.getByTestId(`admin.ip_addresses.${kind}.${ip.id}`)).toContainText(ip.addr);
    await expect.poll(() => requests.at(-1)).toEqual({ user: '5008', assigned: null, q: null });
    await expect(page.getByTestId('admin.ip_addresses.quick.occupancy.any')).toHaveClass(/bg-surface/);
    await page.screenshot({ path: testInfo.outputPath(`owner-5008-${language}.png`), fullPage: true });

    await page.reload();
    await expect(page.getByTestId(`admin.ip_addresses.${kind}.9101`)).toBeVisible();
    await page.getByTestId('admin.ip_addresses.clear').click();
    await input.fill('5008');
    if (testInfo.project.name.startsWith('mobile-')) await suggestion.tap();
    else await suggestion.click();
    await expect(page).toHaveURL(/(?:\?|&)user=5008(?:&|$)/);
    await expect(page.getByTestId(`admin.ip_addresses.${kind}.9102`)).toBeVisible();

    await page.goto('/admin/networking/ip-addresses?q=5008&limit=25&page=2&from_id=90');
    await expect(page).toHaveURL(/(?:\?|&)user=5008(?:&|$)/);
    await expect(page).not.toHaveURL(/(?:\?|&)(?:q|page|from_id)=/);
    await expect(page.getByTestId(`admin.ip_addresses.${kind}.9103`)).toBeVisible();
  });

  test(`@pr-smoke @pr-smoke-mobile ${language} explicit IP IDs retain direct navigation`, async ({ page }) => {
    await bootstrapVpsAdminWindow(page, { sessionToken: 'TEST' });
    await setUiSettingsLocalStorage(page, { language, theme: 'dark' });
    await installHaveApiMock(page, {
      user: { id: 1, login: 'admin', level: 100 },
      handlers: {
        'GET locations': () => ({ locations: [] }),
        'GET ip_addresses': () => ({ ip_addresses: [] }),
        'GET ip_addresses/5008': () => ({ ip_address: { id: 5008, addr: '192.0.2.80', prefix: 32, user: { id: 99, login: 'another-owner' } } }),
      },
    });
    for (const query of ['#5008', 'id:5008']) {
      await page.goto('/admin/networking/ip-addresses');
      const input = page.getByTestId('admin.ip_addresses.smart_filter.input');
      await input.fill(query);
      await expect(page.getByTestId('admin.ip_addresses.smart.suggest.user')).toHaveCount(0);
      await input.press('Enter');
      await expect(page).toHaveURL(/\/admin\/networking\/ip-addresses\/5008$/);
      await expect(page.getByTestId('admin.ip_address.header')).toContainText('192.0.2.80');
    }
  });
}

// Keep the complete occupancy labels reachable beside the quick-filter fields.
for (const [language, theme] of [['cs', 'dark'], ['en', 'light']] as const) {
  test(`@pr-smoke @pr-smoke-mobile ${language} IP occupancy targets retain keyboard filtering at narrow widths`, async ({ page }) => {
    const writes: string[] = [];
    await bootstrapVpsAdminWindow(page, { webuiNext: { uiSettings: { persistence: 'local' } } });
    await setUiSettingsLocalStorage(page, { language, theme });
    await installHaveApiMock(page, {
      user: { id: 1, login: 'synthetic-admin', level: 99 },
      handlers: {
        'GET locations': () => ({ locations: [] }),
        'GET ip_addresses': () => ({ ip_addresses: [] }),
      },
    });
    await page.route('**/api/**', (route) => {
      if (!['GET', 'HEAD', 'OPTIONS'].includes(route.request().method())) {
        writes.push(route.request().method());
        return route.abort();
      }
      return route.fallback();
    });
    await page.goto('/admin/networking/ip-addresses?version=6');
    const heading = page.getByTestId('admin.ip_addresses.quick_filters').getByText(language === 'cs' ? 'Rychlé filtry' : 'Quick filters', { exact: true });
    const contrast = await heading.evaluate((element) => {
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 1;
      const context = canvas.getContext('2d')!;
      const rgba = (value: string) => {
        context.clearRect(0, 0, 1, 1);
        context.fillStyle = value;
        context.fillRect(0, 0, 1, 1);
        const pixel = context.getImageData(0, 0, 1, 1).data;
        return [pixel[0]!, pixel[1]!, pixel[2]!, pixel[3]! / 255];
      };
      const over = (foreground: number[], background: number[]) => foreground.slice(0, 3).map((value, index) => value * foreground[3]! + background[index]! * (1 - foreground[3]!));
      const luminance = (color: number[]) => color.slice(0, 3).map((value) => {
        const channel = value / 255;
        return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
      }).reduce((sum, value, index) => sum + value * [0.2126, 0.7152, 0.0722][index]!, 0);
      const ancestors: Element[] = [];
      for (let current: Element | null = element; current; current = current.parentElement) ancestors.unshift(current);
      let background = [255, 255, 255];
      for (const ancestor of ancestors) background = over(rgba(getComputedStyle(ancestor).backgroundColor), background);
      const foreground = over(rgba(getComputedStyle(element).color), background);
      const a = luminance(background);
      const b = luminance(foreground);
      return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
    });
    expect(contrast).toBeGreaterThanOrEqual(4.5);
    const coarse = await page.evaluate(() => matchMedia('(any-pointer:coarse)').matches);
    for (const width of [page.viewportSize()!.width, 320, 768]) {
      await page.setViewportSize({ width, height: 900 });
      for (const [key, value] of [['any', 'any'], ['assigned', '1'], ['unassigned', '0']] as const) {
        const button = page.getByTestId(`admin.ip_addresses.quick.occupancy.${key}`);
        await button.scrollIntoViewIfNeeded();
        await button.focus();
        await expect(button).toBeFocused();
        const bounds = await button.evaluate((element) => {
          const box = element.getBoundingClientRect();
          const range = document.createRange();
          range.selectNodeContents(element);
          return {
            x: box.x, width: box.width, height: box.height,
            scrollWidth: element.scrollWidth, clientWidth: element.clientWidth,
            parentOverflow: getComputedStyle(element.parentElement!).overflow,
            fragments: [...range.getClientRects()].map((rect) => ({ left: rect.left, right: rect.right })),
          };
        });
        expect(bounds.height).toBeGreaterThanOrEqual(coarse ? 44 : 36);
        expect(bounds.parentOverflow).toBe('visible');
        expect(bounds.scrollWidth).toBeLessThanOrEqual(bounds.clientWidth + 1);
        for (const fragment of bounds.fragments) {
          expect(fragment.left).toBeGreaterThanOrEqual(bounds.x - 1);
          expect(fragment.right).toBeLessThanOrEqual(bounds.x + bounds.width + 1);
        }
        await button.press('Enter');
        await expect.poll(() => new URL(page.url()).searchParams.get(key === 'any' ? 'occupancy' : 'assigned_to_interface')).toBe(value);
        expect(new URL(page.url()).searchParams.get('version')).toBe('6');
        await expect(button).toHaveClass(/bg-surface/);
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true);
    }
    expect(writes).toEqual([]);
  });
}

// Exercise the measured error-chip and secondary table/card text surfaces.
for (const actor of [{ name: 'admin', level: 99 }, { name: 'support', level: 21 }]) {
  for (const [language, theme] of [['cs', 'dark'], ['en', 'light']] as const) {
    test(`@pr-smoke @pr-smoke-mobile ${language} ${actor.name} IP error chips and metadata remain readable`, async ({ page }, testInfo) => {
      const address = '2001:0db8:1234:5678:9abc:def0:1234:5678';
      const writes: string[] = [];
      const requests: string[] = [];
      const chipGeometry: unknown[] = [];
      const observations: Array<{ width: number; text: Array<{ label: string; ratio: number }> }> = [];
      await bootstrapVpsAdminWindow(page, { webuiNext: { uiSettings: { persistence: 'local' } } });
      await setUiSettingsLocalStorage(page, { language, theme });
      await installHaveApiMock(page, {
        user: { id: 1, login: `synthetic-${actor.name}`, level: actor.level },
        handlers: {
          'GET locations': () => ({ locations: [] }),
          'GET ip_addresses': (ctx) => {
            requests.push(ctx.url.search);
            return { ip_addresses: [0, 1, 2].map((offset) => ({ id: 100 + offset, addr: address, prefix: 128, routed: true, user: null, vps: null, network: { id: 3, address: '2001:db8::', prefix: 32 }, network_interface: offset < 2 ? { id: 6, name: 'eth0' } : null })) };
          },
        },
      });
      await page.route('**/api/**', (route) => {
        if (!['GET', 'HEAD', 'OPTIONS'].includes(route.request().method())) {
          writes.push(route.request().method());
          return route.abort();
        }
        return route.fallback();
      });
      await page.goto(`/admin/networking/ip-addresses?version=6&addr=${encodeURIComponent(address)}&prefix=128&marker=retained`);
      const area = page.getByTestId('admin.ip_addresses.page');
      await expect(area).toContainText('#100');
      const input = page.getByTestId('admin.ip_addresses.smart_filter.input');
      await input.fill('prefix:999');
      await input.press('Enter');
      const error = page.getByTestId('admin.ip_addresses.chip.error.0');
      await expect(error).toContainText(language === 'cs' ? 'Neplatný prefix: 999' : 'Invalid prefix: 999');
      const addressChip = page.getByTestId('admin.ip_addresses.chip.addr');
      await expect(addressChip).toContainText(`addr:${address}/128`);
      expect(new URL(page.url()).searchParams.get('addr')).toBe(address);
      expect(new URL(page.url()).searchParams.get('prefix')).toBe('128');
      const coarse = await page.evaluate(() => matchMedia('(any-pointer:coarse)').matches);
      for (const width of [page.viewportSize()!.width, 320, 768]) {
        await page.setViewportSize({ width, height: 900 });
        for (const chip of [error, page.getByTestId('admin.ip_addresses.chip.version')]) {
          const remove = chip.getByRole('button', { name: language === 'cs' ? 'Odebrat' : 'Remove', exact: true });
          const bounds = await remove.boundingBox();
          expect(bounds).not.toBeNull();
          expect.soft(bounds!.width).toBeGreaterThanOrEqual(coarse ? 44 : 16);
          expect.soft(bounds!.height).toBeGreaterThanOrEqual(coarse ? 44 : 16);
        }
        const geometry = await addressChip.evaluate((chip) => {
          const label = chip.querySelector('span')!;
          const button = chip.querySelector('button')!;
          const range = document.createRange();
          range.selectNodeContents(label);
          const fragments = [...range.getClientRects()].map((r) => ({ left: r.left, right: r.right, top: r.top, bottom: r.bottom }));
          const bounds = chip.getBoundingClientRect();
          const target = button.getBoundingClientRect();
          const labelBounds = label.getBoundingClientRect();
          return { fragments, left: bounds.left, right: bounds.right, top: bounds.top, bottom: bounds.bottom, targetLeft: target.left, targetRight: target.right, labelRight: labelBounds.right, scrollWidth: label.scrollWidth, clientWidth: label.clientWidth, documentWidth: document.documentElement.scrollWidth, viewport: innerWidth };
        });
        chipGeometry.push({ width, coarse, geometry });
        expect.soft(geometry.scrollWidth).toBeLessThanOrEqual(geometry.clientWidth + 1);
        expect.soft(geometry.documentWidth).toBeLessThanOrEqual(width + 1);
        expect.soft(geometry.labelRight).toBeLessThanOrEqual(geometry.targetLeft + 1);
        for (const fragment of geometry.fragments) {
          expect.soft(fragment.left).toBeGreaterThanOrEqual(geometry.left - 1);
          expect.soft(fragment.right).toBeLessThanOrEqual(geometry.targetLeft + 1);
          expect.soft(fragment.top).toBeGreaterThanOrEqual(geometry.top - 1);
          expect.soft(fragment.bottom).toBeLessThanOrEqual(geometry.bottom + 1);
        }
        expect.soft(geometry.targetRight).toBeLessThanOrEqual(geometry.right + 1);
        if (width === 320) {
          await addressChip.scrollIntoViewIfNeeded();
          await page.screenshot({ path: testInfo.outputPath('long-chip-320.png'), animations: 'disabled', scale: 'css' });
        }
        const text = await area.evaluate((root) => {
          const canvas = document.createElement('canvas');
          canvas.width = canvas.height = 1;
          const context = canvas.getContext('2d')!;
          const rgba = (value: string) => {
            context.clearRect(0, 0, 1, 1);
            context.fillStyle = value;
            context.fillRect(0, 0, 1, 1);
            const pixel = context.getImageData(0, 0, 1, 1).data;
            return [pixel[0]!, pixel[1]!, pixel[2]!, pixel[3]! / 255];
          };
          const over = (foreground: number[], background: number[]) => foreground.slice(0, 3).map((value, index) => value * foreground[3]! + background[index]! * (1 - foreground[3]!));
          const luminance = (color: number[]) => color.slice(0, 3).map((value) => {
            const channel = value / 255;
            return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
          }).reduce((sum, value, index) => sum + value * [0.2126, 0.7152, 0.0722][index]!, 0);
          return [...root.querySelectorAll('h1,h2,h3,p,th,td,span,div,label')].filter((element) => element.getBoundingClientRect().width > 0 && element.children.length === 0 && element.textContent?.trim() && !element.closest('.sr-only')).flatMap((element) => {
            const ancestors: Element[] = [];
            for (let current: Element | null = element; current; current = current.parentElement) ancestors.unshift(current);
            if (ancestors.some((ancestor) => Number(getComputedStyle(ancestor).opacity) < 1)) return [];
            let background = [255, 255, 255];
            for (const ancestor of ancestors) background = over(rgba(getComputedStyle(ancestor).backgroundColor), background);
            const foreground = over(rgba(getComputedStyle(element).color), background);
            const a = luminance(background);
            const b = luminance(foreground);
            return [{ label: element.textContent!.trim(), ratio: (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05) }];
          });
        });
        for (const id of ['#100', '#101', '#102']) expect(text.some((sample) => sample.label === id)).toBe(true);
        expect(text.some((sample) => sample.label.includes('999'))).toBe(true);
        for (const sample of text.filter((sample) => sample.label !== '·')) expect.soft(sample.ratio, sample.label).toBeGreaterThanOrEqual(4.5);
        observations.push({ width, text });
      }
      const remove = error.getByRole('button', { name: language === 'cs' ? 'Odebrat' : 'Remove', exact: true });
      await remove.focus();
      await expect(remove).toBeFocused();
      await page.keyboard.press('Enter');
      await expect(error).toHaveCount(0);
      await expect(page.getByTestId('admin.ip_addresses.chip.version')).toBeVisible();
      expect(new URL(page.url()).searchParams.get('version')).toBe('6');
      await page.setViewportSize({ width: 320, height: 900 });
      const versionChip = page.getByTestId('admin.ip_addresses.chip.version');
      const versionRemove = versionChip.getByRole('button', { name: language === 'cs' ? 'Odebrat' : 'Remove', exact: true });
      if (coarse) await versionRemove.tap();
      else await versionRemove.press('Enter');
      await expect(versionChip).toHaveCount(0);
      expect(new URL(page.url()).searchParams.get('version')).toBeNull();
      expect(new URL(page.url()).searchParams.get('addr')).toBe(address);
      expect(new URL(page.url()).searchParams.get('prefix')).toBe('128');
      expect(new URL(page.url()).searchParams.get('marker')).toBe('retained');
      await expect.poll(() => requests.some((query) => new URLSearchParams(query).get('ip_address[addr]') === address && new URLSearchParams(query).get('ip_address[prefix]') === '128')).toBe(true);
      await testInfo.attach('long-chip-geometry-and-requests', { body: JSON.stringify({ chipGeometry, requests, writes }, null, 2), contentType: 'application/json' });
      expect(writes).toEqual([]);
      await testInfo.attach('rendered-contrast-and-widths', { body: JSON.stringify(observations, null, 2), contentType: 'application/json' });
    });
  }
}
