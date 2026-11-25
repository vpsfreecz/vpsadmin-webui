import { expect, test, type Page } from '@playwright/test';

import { bootstrapVpsAdminWindow, failEnvelope, installHaveApiMock, setUiSettingsLocalStorage } from '../../fixtures';

type Role = 'member' | 'admin' | 'support';
type DataState = 'normal' | 'zero' | 'empty' | 'failure';
type Read = { resource: 'accounting' | 'monitor'; query: URLSearchParams };
const fixedTime = '2026-11-15T12:00:00.000Z';
const writesByPage = new WeakMap<Page, string[]>();

test.afterEach(async ({ page }) => {
  expect(writesByPage.get(page) ?? []).toEqual([]);
});

async function setup(page: Page, language: 'cs' | 'en', role: Role = 'member', initialState: DataState = 'normal') {
  await page.clock.setFixedTime(new Date(fixedTime));
  await bootstrapVpsAdminWindow(page, { sessionToken: 'TEST', webuiNext: { uiSettings: { persistence: 'local' } } });
  await setUiSettingsLocalStorage(page, { language, theme: language === 'cs' ? 'dark' : 'light' });
  const writes: string[] = [];
  writesByPage.set(page, writes);
  page.on('request', (request) => {
    if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method()))
      writes.push(request.method() + ' ' + new URL(request.url()).pathname);
  });
  let state = initialState;
  const reads: Read[] = [];
  const user = {
    id: role === 'admin' ? 1 : 7,
    login: 'synthetic-network-reader',
    level: role === 'admin' ? 99 : role === 'support' ? 50 : 1,
  };
  const environment = { id: 2, label: 'Synthetic environment' };
  const location = { id: 3, label: 'Synthetic location', environment };
  const node = { id: 4, domain_name: 'node4.example.test', location };
  const vps = { id: 901, hostname: 'network.example.test', user: { id: user.id, login: user.login }, node };
  const networkInterface = { id: 501, name: 'eth0', vps };
  const failed = () => ({
    status: 503,
    contentType: 'application/json',
    body: JSON.stringify(failEnvelope('Synthetic traffic read unavailable')),
  });
  await installHaveApiMock(page, {
    user,
    handlers: {
      'GET network_interface_accountings': ({ searchParams }) => {
        reads.push({ resource: 'accounting', query: new URLSearchParams(searchParams) });
        if (state === 'failure') return failed();
        if (state === 'empty') return { network_interface_accountings: [] };
        const year = Number(searchParams.get('network_interface_accounting[year]') ?? 2026);
        const month = Number(searchParams.get('network_interface_accounting[month]') ?? 11);
        const bytesIn = state === 'zero' ? 0 : ((month % 4) + 1) * 1024 ** 3;
        return {
          network_interface_accountings: [
            {
              year,
              month,
              bytes_in: bytesIn,
              bytes_out: 2 * bytesIn,
              bytes: 3 * bytesIn,
              created_at: fixedTime,
              updated_at: fixedTime,
              network_interface: networkInterface,
            },
          ],
        };
      },
      'GET network_interface_monitors': ({ searchParams }) => {
        reads.push({ resource: 'monitor', query: new URLSearchParams(searchParams) });
        if (state === 'failure') return failed();
        if (state === 'empty') return { network_interface_monitors: [] };
        const bytesIn = state === 'zero' ? 0 : 4 * 1024 ** 2;
        return {
          network_interface_monitors: [
            {
              id: 501,
              bytes_in: bytesIn,
              bytes_out: bytesIn / 2,
              bytes: bytesIn * 1.5,
              packets_in: 400,
              packets_out: 200,
              packets: 600,
              delta: 2,
              updated_at: fixedTime,
              network_interface: networkInterface,
            },
          ],
        };
      },
      'GET environments': () => ({ environments: [environment] }),
      'GET locations': () => ({ locations: [location] }),
      'GET nodes': () => ({ nodes: [node] }),
      'GET users': () => ({ users: [user] }),
      'GET vpses': () => ({ vpses: [vps] }),
      'GET network_interfaces': () => ({ network_interfaces: [networkInterface] }),
      'GET ip_addresses': () => ({ ip_addresses: [] }),
      'GET ip_address_assignments': () => ({ ip_address_assignments: [] }),
    },
  });
  return {
    reads,
    userId: user.id,
    setState(value: DataState) {
      state = value;
    },
  };
}

async function expectOrientation(page: Page, id: string, unit: 'GiB' | 'MiB/s' | 'B/s') {
  const chart = page.getByTestId(id),
    xAxis = page.getByTestId(id + '.x-axis'),
    yAxis = page.getByTestId(id + '.y-axis');
  await expect(chart).toHaveAttribute('role', 'group');
  await expect(chart).toHaveAttribute('tabindex', '0');
  await expect(xAxis).toBeVisible();
  await expect(yAxis).toBeVisible();
  await expect(yAxis).toContainText(unit);
  await expect(xAxis).toContainText('2026');
  for (const axis of [xAxis, yAxis]) {
    const metrics = await axis.evaluate((el) => ({
      left: el.getBoundingClientRect().left,
      right: el.getBoundingClientRect().right,
      fontSize: parseFloat(getComputedStyle(el).fontSize),
      viewportWidth: innerWidth,
    }));
    expect(metrics.left).toBeGreaterThanOrEqual(0);
    expect(metrics.right).toBeLessThanOrEqual(metrics.viewportWidth + 1);
    expect(metrics.fontSize).toBeGreaterThanOrEqual(12);
    for (const label of await axis.locator('span').all()) {
      const fits = await label.evaluate((el) => el.scrollWidth <= el.clientWidth + 1);
      expect(fits, 'complete axis label fits its own cell').toBe(true);
    }
  }
  await chart.focus();
  await expect(chart).toBeFocused();
  await expect(chart.getByRole('status')).toContainText(unit);
  await chart.press('Escape');
  await expect(chart.getByRole('status')).toHaveCount(0);
  await chart.blur();
  await expect(chart).not.toBeFocused();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
}

function expectOwner(reads: Read[], owner: number | null) {
  expect(reads.length).toBeGreaterThan(0);
  for (const read of reads) {
    const prefix = read.resource === 'accounting' ? 'network_interface_accounting' : 'network_interface_monitor';
    expect(read.query.get(prefix + '[user]')).toBe(owner === null ? null : String(owner));
    expect(Number(read.query.get(prefix + '[limit]'))).toBe(250);
  }
}

for (const language of ['cs', 'en'] as const) {
  test(`@pr-smoke @pr-smoke-mobile ${language} monthly traffic exposes scale, months and keyboard/touch values`, async ({
    page,
    hasTouch,
  }) => {
    const { reads } = await setup(page, language);
    await page.goto('/app/networking?tab=traffic');
    const id = 'network.user.traffic.chart',
      chart = page.getByTestId(id);
    await expectOrientation(page, id, 'GiB');
    await expect(page.getByTestId(id + '.x-axis').locator('span')).toHaveText(['2026/6', '2026/11']);
    await expect(page.getByTestId(id + '.y-axis').locator('span')).toHaveText(['12.0 GiB', '6.00 GiB', '0 B']);
    await chart.focus();
    await expect(chart.getByRole('status')).toHaveText(/12.0 GiB\s*2026\/11/);
    await chart.press('ArrowLeft');
    await expect(chart.getByRole('status')).toHaveText(/9.00 GiB\s*2026\/10/);
    await chart.press('ArrowRight');
    await expect(chart.getByRole('status')).toHaveText(/12.0 GiB\s*2026\/11/);
    const box = await chart.boundingBox();
    expect(box).not.toBeNull();
    if (!box) throw new Error('No chart geometry');
    const position = { x: box.width - 2, y: box.height / 2 };
    if (hasTouch) await chart.tap({ position });
    else await chart.hover({ position });
    await expect(chart.getByRole('status')).toContainText('12.0 GiB');
    await expect(chart).toBeFocused();
    await chart.hover({ position });
    await page.mouse.move(0, 0);
    await expect(chart.getByRole('status')).toContainText('12.0 GiB');
    await chart.blur();
    await expect(chart.getByRole('status')).toHaveCount(0);
    await chart.hover({ position });
    await expect(chart).not.toBeFocused();
    await expect(chart.getByRole('status')).toContainText('12.0 GiB');
    await page.mouse.move(0, 0);
    await expect(chart.getByRole('status')).toHaveCount(0);
    await chart.press('Escape');
    await expect(chart.getByRole('status')).toHaveCount(0);
    expectOwner(reads, null);
  });

  test(`@pr-smoke @pr-smoke-mobile ${language} member live axes preserve per-second values and time`, async ({
    page,
  }) => {
    const { reads } = await setup(page, language);
    await page.goto('/app/networking?tab=live');
    await expect(page.getByTestId('network.user.live.stat.in')).toContainText('2.00 MiB/s');
    await expect(page.getByTestId('network.user.live.stat.out')).toContainText('1.00 MiB/s');
    for (const [direction, value] of [
      ['in', '2.00 MiB/s'],
      ['out', '1.00 MiB/s'],
    ] as const) {
      const id = 'network.user.live.chart.' + direction;
      await expectOrientation(page, id, 'MiB/s');
      await expect(page.getByTestId(id + '.x-axis').locator('span')).toHaveCount(2);
      await page.getByTestId(id).focus();
      await expect(page.getByTestId(id).getByRole('status')).toContainText(value);
      await expect(page.getByTestId(id).getByRole('status')).toContainText(/\d{1,2}:\d{2}/);
    }
    expectOwner(reads, null);
    expect(
      reads
        .filter((r) => r.resource === 'monitor')
        .every((r) => r.query.get('network_interface_monitor[order]') === '-bytes')
    ).toBe(true);
  });

  for (const role of ['admin', 'support'] as const) {
    test(`@pr-smoke @pr-smoke-mobile ${language} ${role} My traffic and live retain explicit owner scope`, async ({
      page,
    }) => {
      const { reads, userId } = await setup(page, language, role);
      await page.goto('/app/networking?tab=traffic');
      await expectOrientation(page, 'network.user.traffic.chart', 'GiB');
      await page.goto('/app/networking?tab=live');
      await expectOrientation(page, 'network.user.live.chart.in', 'MiB/s');
      await expectOrientation(page, 'network.user.live.chart.out', 'MiB/s');
      expectOwner(reads, userId);
    });
  }

  test(`@pr-smoke @pr-smoke-mobile ${language} administrator first sample is inspectable and refresh retains bounded filters`, async ({
    page,
  }) => {
    const { reads } = await setup(page, language, 'admin');
    await page.goto('/admin/networking/live?environment=2&location=3&paused=1');
    for (const direction of ['in', 'out']) {
      const id = 'admin.network_live.chart.' + direction;
      await expectOrientation(page, id, 'MiB/s');
      await expect(page.getByTestId(id + '.x-axis').locator('span')).toHaveCount(1);
      await expect(page.getByTestId(id).locator('svg circle')).toHaveCount(1);
    }
    const before = reads.length;
    await page.clock.setFixedTime(new Date(Date.parse(fixedTime) + 10_000));
    await page.getByTestId('admin.network_live.refresh').click();
    await expect.poll(() => reads.length).toBeGreaterThan(before);
    await expect(page.getByTestId('admin.network_live.chart.in.x-axis').locator('span')).toHaveCount(2);
    for (const read of reads.filter((r) => r.resource === 'monitor')) {
      expect(read.query.get('network_interface_monitor[environment]')).toBe('2');
      expect(read.query.get('network_interface_monitor[location]')).toBe('3');
      expect(read.query.get('network_interface_monitor[limit]')).toBe('50');
      expect(read.query.get('network_interface_monitor[order]')).toBe('-updated_at');
      expect(read.query.has('network_interface_monitor[user]')).toBe(false);
    }
    await expect(page).toHaveURL(/paused=1/);
  });

  test(`@pr-smoke @pr-smoke-mobile ${language} member zero readings remain distinct from empty traffic`, async ({
    page,
  }) => {
    const fixture = await setup(page, language, 'member', 'zero');
    await page.goto('/app/networking?tab=traffic');
    const monthly = page.getByTestId('network.user.traffic.chart');
    await expect(monthly).toHaveAttribute('role', 'group');
    await monthly.focus();
    await expect(monthly.getByRole('status')).toContainText('0 B');
    await page.goto('/app/networking?tab=live');
    await expectOrientation(page, 'network.user.live.chart.in', 'B/s');
    await page.getByTestId('network.user.live.chart.in').focus();
    await expect(page.getByTestId('network.user.live.chart.in').getByRole('status')).toContainText('0 B/s');
    fixture.setState('empty');
    await page.reload();
    await expect(page.getByTestId('network.user.live.empty')).toBeVisible();
    await expect(page.getByTestId('network.user.live.chart.in')).toHaveCount(0);
    await page.goto('/app/networking?tab=traffic');
    await expect(page.getByTestId('network.user.traffic.empty')).toBeVisible();
    await expect(monthly).toHaveCount(0);
  });

  test(`@pr-smoke @pr-smoke-mobile ${language} administrator zero sample and empty history have different meanings`, async ({
    page,
  }) => {
    const fixture = await setup(page, language, 'admin', 'zero');
    await page.goto('/admin/networking/live?paused=1');
    const id = 'admin.network_live.chart.in';
    await expectOrientation(page, id, 'B/s');
    await page.getByTestId(id).focus();
    await expect(page.getByTestId(id).getByRole('status')).toContainText('0 B/s');
    fixture.setState('empty');
    await page.reload();
    await expect(page.getByTestId('admin.network_live.empty')).toBeVisible();
    await expect(page.getByTestId('admin.network_live.empty')).toContainText(
      language === 'cs' ? 'Nebyly nalezeny žádné řádky živého provozu.' : 'No live traffic rows found.'
    );
    await expect(page.getByTestId('admin.network_live.charts')).toHaveCount(0);
    await expect(page.getByTestId(id)).toHaveCount(0);
    await expect(page.getByTestId(id + '.x-axis')).toHaveCount(0);
    await expect(page.getByTestId('admin.network_live.dashboard').locator('svg')).toHaveCount(0);
  });

  for (const role of ['member', 'admin'] as const) {
    test(`@pr-smoke @pr-smoke-mobile ${language} ${role} failed live read retains error rather than a fabricated graph`, async ({
      page,
    }) => {
      await setup(page, language, role, 'failure');
      if (role === 'member') {
        await page.goto('/app/networking?tab=live');
        await expect(page.getByTestId('network.user.live.error')).toBeVisible();
        await expect(page.getByTestId('network.user.live.chart.in')).toHaveCount(0);
      } else {
        await page.goto('/admin/networking/live?paused=1');
        await expect(
          page.getByText(language === 'cs' ? 'Živý provoz se nepodařilo načíst' : 'Failed to load live traffic', {
            exact: true,
          })
        ).toBeVisible();
        await expect(
          page.getByRole('button', { name: language === 'cs' ? 'Zkusit znovu' : 'Retry', exact: true })
        ).toBeVisible();
        await expect(page.getByTestId('admin.network_live.chart.in.x-axis')).toHaveCount(0);
      }
    });
  }
}
