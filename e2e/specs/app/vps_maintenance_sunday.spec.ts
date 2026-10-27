import { expect, test } from '@playwright/test';
import { bootstrapVpsAdminWindow, failEnvelope, installHaveApiMock } from '../../fixtures';

const vps = { id: 123, hostname: 'sample.example', object_state: 'active', user: { id: 7 }, node: { id: 1 } };
const windows = () =>
  Array.from({ length: 7 }, (_, weekday) => ({
    id: 40 + weekday,
    weekday,
    is_open: true,
    opens_at: 120,
    closes_at: 240,
  }));

for (const level of [1, 90]) {
  test(`@pr-smoke @pr-smoke-mobile Sunday loads, saves and reloads using weekday 0 (${level})`, async ({
    page,
  }, testInfo) => {
    await bootstrapVpsAdminWindow(page, { sessionToken: 'TEST' });
    const saved = windows();
    const writes: unknown[] = [];
    let reject = true;
    await installHaveApiMock(page, {
      user: { id: 7, login: 'member', level },
      handlers: {
        'GET vpses/123': () => ({ vps }),
        'GET transaction_chains': () => ({ transaction_chains: [] }),
        'GET vpses/123/maintenance_windows': () => ({ maintenance_windows: saved }),
        'PUT vpses/123/maintenance_windows/0': (ctx) => {
          const body = ctx.request.postDataJSON() as {
            maintenance_window: { is_open: boolean; opens_at?: number; closes_at?: number };
          };
          writes.push(body);
          if (reject) return failEnvelope('Example Sunday validation failure');
          saved[0] = {
            id: 40,
            weekday: 0,
            is_open: body.maintenance_window.is_open,
            opens_at: body.maintenance_window.opens_at ?? 0,
            closes_at: body.maintenance_window.closes_at ?? 1440,
          };
          return { maintenance_window: saved[0] };
        },
      },
    });
    await page.goto('/app/vps/123/maintenance');
    const sunday = page.getByTestId('vps.maintenance.day.0');
    const open = page.getByTestId('vps.maintenance.day.0.open');
    await expect(sunday).toContainText('Sunday');
    await expect(open).toBeChecked();
    await expect(page.getByTestId('vps.maintenance.day.0.opens.h')).toHaveValue('2');
    await expect(page.getByTestId('vps.maintenance.day.7')).toHaveCount(0);
    await expect(page.getByTestId('vps.maintenance.save')).toBeDisabled();
    await page.getByTestId('vps.maintenance.day.0.opens.h').selectOption('3');
    await page.getByTestId('vps.maintenance.save').click();
    await expect(page.getByTestId('vps.maintenance.save_error')).toContainText('Example Sunday validation failure');
    await expect(page.getByTestId('vps.maintenance.day.0.opens.h')).toHaveValue('3');
    reject = false;
    await page.getByTestId('vps.maintenance.save').click();
    await expect(page.getByTestId('vps.maintenance.save_success')).toBeVisible();
    expect(writes).toEqual([
      { maintenance_window: { is_open: true, opens_at: 180, closes_at: 240 } },
      { maintenance_window: { is_open: true, opens_at: 180, closes_at: 240 } },
    ]);
    await page.reload();
    await expect(open).toBeChecked();
    await expect(page.getByTestId('vps.maintenance.day.0.opens.h')).toHaveValue('3');
    await open.uncheck();
    await page.getByTestId('vps.maintenance.save').click();
    await expect(page.getByTestId('vps.maintenance.save_success')).toBeVisible();
    expect(writes[2]).toEqual({ maintenance_window: { is_open: false } });
    await page.reload();
    await expect(open).not.toBeChecked();
    await open.check();
    await page.getByTestId('vps.maintenance.save').click();
    await expect(page.getByTestId('vps.maintenance.save_success')).toBeVisible();
    expect(writes[3]).toEqual({ maintenance_window: { is_open: true, opens_at: 0, closes_at: 1440 } });
    await page.reload();
    await expect(open).toBeChecked();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath('sunday-maintenance.png'), fullPage: true, scale: 'css' });
  });
}

test('@pr-smoke @pr-smoke-mobile allow anytime writes each API weekday exactly once including Sunday 0', async ({
  page,
}) => {
  await bootstrapVpsAdminWindow(page, { sessionToken: 'TEST' });
  const saved = windows();
  const changed: number[] = [];
  const handlers = Object.fromEntries(
    saved.map((window) => [
      `PUT vpses/123/maintenance_windows/${window.weekday}`,
      () => {
        changed.push(window.weekday);
        Object.assign(window, { opens_at: 0, closes_at: 1440 });
        return { maintenance_window: window };
      },
    ])
  );
  await installHaveApiMock(page, {
    user: { id: 7, login: 'member', level: 1 },
    handlers: {
      ...handlers,
      'GET vpses/123': () => ({ vps }),
      'GET transaction_chains': () => ({ transaction_chains: [] }),
      'GET vpses/123/maintenance_windows': () => ({ maintenance_windows: saved }),
    },
  });
  await page.goto('/app/vps/123/maintenance');
  await expect(page.getByTestId('vps.maintenance.day.0.open')).toBeChecked();
  await page.getByTestId('vps.maintenance.allow_anytime').click();
  await page.getByTestId('vps.maintenance.save').click();
  await expect(page.getByTestId('vps.maintenance.save_success')).toBeVisible();
  expect(changed).toEqual([1, 2, 3, 4, 5, 6, 0]);
  await expect(page.getByTestId('vps.maintenance.save')).toBeDisabled();
});
