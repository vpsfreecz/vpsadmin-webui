import { expect, test } from '@playwright/test';
import { bootstrapVpsAdminWindow, failEnvelope, installHaveApiMock, setUiSettingsLocalStorage } from '../../fixtures';

for (const level of [1, 90]) {
  test(`@pr-smoke @pr-smoke-mobile explicit admin modification choice waits for completion and read-back (${level})`, async ({
    page,
  }, testInfo) => {
    await bootstrapVpsAdminWindow(page, { sessionToken: 'TEST' });
    await setUiSettingsLocalStorage(page, { language: level === 90 ? 'cs' : 'en', theme: 'dark' });
    let allow = true;
    let complete = false;
    const writes: unknown[] = [];
    const vps = () => ({
      id: 123,
      hostname: 'sample.example',
      object_state: 'active',
      user: { id: 7 },
      allow_admin_modifications: allow,
      node: { id: 1 },
    });
    await installHaveApiMock(page, {
      user: { id: 7, login: 'member', level },
      handlers: {
        'GET vpses/123': () => ({ vps: vps() }),
        'GET transaction_chains': () => ({ transaction_chains: [] }),
        'GET vpses/123/maintenance_windows': () => ({ maintenance_windows: [] }),
        'PUT vpses/123': (ctx) => {
          writes.push(ctx.request.postDataJSON());
          return { _meta: { action_state_id: 8001 } };
        },
        'GET action_states/8001': () => {
          if (complete) allow = false;
          return { action_state: { id: 8001, finished: complete, status: true, current: complete ? 1 : 0, total: 1 } };
        },
      },
    });
    const prefix = level === 90 ? '/admin' : '/app';
    await page.goto(`${prefix}/vps/123/maintenance`);
    await expect(page.getByTestId('vps.admin_modifications.allow')).toBeChecked();
    await expect(page.getByTestId('vps.admin_modifications.save')).toBeDisabled();
    expect(writes).toEqual([]);
    await page.screenshot({
      path: testInfo.outputPath('admin-modification-preference.png'),
      fullPage: true,
      scale: 'css',
    });
    await page.getByTestId('vps.admin_modifications.deny').check();
    expect(writes).toEqual([]);
    await page.getByTestId('vps.admin_modifications.save').click();
    await expect(page.getByTestId('vps.admin_modifications.pending')).toBeVisible();
    await expect(page.getByTestId('vps.admin_modifications.saved')).toHaveCount(0);
    expect(allow).toBe(true);
    expect(writes).toEqual([{ vps: { allow_admin_modifications: false } }]);
    complete = true;
    await expect(page.getByTestId('vps.admin_modifications.saved')).toBeVisible();
    await expect(page.getByTestId('vps.admin_modifications.deny')).toBeChecked();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.reload();
    await expect(page.getByTestId('vps.admin_modifications.deny')).toBeChecked();
    expect(writes).toHaveLength(1);
  });
}

for (const scenario of ['unknown', 'support', 'suspended'] as const) {
  test(`@pr-smoke @pr-smoke-mobile admin modification preference is safe for ${scenario}`, async ({ page }) => {
    await bootstrapVpsAdminWindow(page, { sessionToken: 'TEST' });
    const writes: string[] = [];
    page.on('request', (request) => {
      if (request.method() === 'PUT' && /\/vpses\/123$/.test(new URL(request.url()).pathname))
        writes.push(request.url());
    });
    await installHaveApiMock(page, {
      user: { id: 7, login: 'member', level: scenario === 'support' ? 21 : 1 },
      handlers: {
        'GET vpses/123': () => ({
          vps: {
            id: 123,
            hostname: 'sample.example',
            user: { id: scenario === 'support' ? 8 : 7 },
            object_state: scenario === 'suspended' ? 'suspended' : 'active',
            ...(scenario === 'unknown' ? {} : { allow_admin_modifications: false }),
            node: { id: 1 },
          },
        }),
        'GET transaction_chains': () => ({ transaction_chains: [] }),
        'GET vpses/123/maintenance_windows': () => ({ maintenance_windows: [] }),
      },
    });
    await page.goto(`${scenario === 'support' ? '/admin' : '/app'}/vps/123/maintenance`);
    await expect(page.getByTestId('vps.admin_modifications.allow')).toBeDisabled();
    await expect(page.getByTestId('vps.admin_modifications.deny')).toBeDisabled();
    if (scenario === 'support') await expect(page.getByTestId('vps.admin_modifications.save')).toHaveCount(0);
    else await expect(page.getByTestId('vps.admin_modifications.save')).toBeDisabled();
    if (scenario === 'unknown') {
      await expect(page.getByTestId('vps.admin_modifications.allow')).not.toBeChecked();
      await expect(page.getByTestId('vps.admin_modifications.deny')).not.toBeChecked();
    }
    expect(writes).toEqual([]);
  });
}

for (const outcome of ['rejected', 'malformed-receipt'] as const) {
  test(`@pr-smoke @pr-smoke-mobile admin modification preference retains choice after ${outcome}`, async ({ page }) => {
    await bootstrapVpsAdminWindow(page, { sessionToken: 'TEST' });
    let writes = 0;
    await installHaveApiMock(page, {
      user: { id: 7, login: 'member', level: 1 },
      handlers: {
        'GET vpses/123': () => ({
          vps: {
            id: 123,
            hostname: 'sample.example',
            user: { id: 7 },
            object_state: 'active',
            allow_admin_modifications: false,
            node: { id: 1 },
          },
        }),
        'GET transaction_chains': () => ({ transaction_chains: [] }),
        'GET vpses/123/maintenance_windows': () => ({ maintenance_windows: [] }),
        'PUT vpses/123': () => {
          writes += 1;
          return outcome === 'rejected' ? failEnvelope('Example rejected change') : { _meta: { action_state_id: 'invalid' } };
        },
      },
    });
    await page.goto('/app/vps/123/maintenance');
    await page.getByTestId('vps.admin_modifications.allow').check();
    await page.getByTestId('vps.admin_modifications.save').click();
    await expect(page.getByTestId('vps.admin_modifications.error')).toBeVisible();
    await expect(page.getByTestId('vps.admin_modifications.allow')).toBeChecked();
    await expect(page.getByTestId('vps.admin_modifications.saved')).toHaveCount(0);
    if (outcome === 'malformed-receipt') {
      await expect(page.getByTestId('vps.mutation.uncertain')).toBeVisible();
      await expect(page.getByTestId('vps.admin_modifications.save')).toBeDisabled();
    }
    expect(writes).toBe(1);
  });
}

for (const outcome of ['failed-action', 'readback-mismatch', 'unknown-action-status'] as const) {
  test(`@pr-smoke @pr-smoke-mobile admin modification change is not confirmed after ${outcome}`, async ({ page }) => {
    await bootstrapVpsAdminWindow(page, { sessionToken: 'TEST' });
    let submitted = false;
    await installHaveApiMock(page, {
      user: { id: 7, login: 'member', level: 1 },
      handlers: {
        'GET vpses/123': () => ({
          vps: {
            id: 123,
            hostname: 'sample.example',
            user: { id: 7 },
            object_state: 'active',
            allow_admin_modifications: outcome === 'unknown-action-status' && submitted,
            node: { id: 1 },
          },
        }),
        'GET transaction_chains': () => ({ transaction_chains: [] }),
        'GET vpses/123/maintenance_windows': () => ({ maintenance_windows: [] }),
        'PUT vpses/123': () => {
          submitted = true;
          return { _meta: { action_state_id: 8002 } };
        },
        'GET action_states/8002': () => ({
          action_state: {
            id: 8002,
            finished: true,
            ...(outcome === 'unknown-action-status' ? {} : { status: outcome !== 'failed-action' }),
            current: 1,
            total: 1,
          },
        }),
      },
    });
    await page.goto('/app/vps/123/maintenance');
    await page.getByTestId('vps.admin_modifications.allow').check();
    await page.getByTestId('vps.admin_modifications.save').click();
    await expect(page.getByTestId('vps.admin_modifications.failed')).toBeVisible();
    await expect(page.getByTestId('vps.admin_modifications.saved')).toHaveCount(0);
    await expect(page.getByTestId('vps.admin_modifications.allow')).toBeChecked();
  });
}


for (const level of [1, 90]) {
  test(`@pr-smoke @pr-smoke-mobile synchronous preference waits for read-back and leaves Sunday independent (${level})`, async ({ page }, testInfo) => {
    await bootstrapVpsAdminWindow(page, { sessionToken: 'TEST' });
    await setUiSettingsLocalStorage(page, { language: level === 90 ? 'cs' : 'en', theme: 'dark' });
    let allow = true;
    let submitted = false;
    let readBackRequested = false;
    let release = () => {};
    const readBackGate = new Promise<void>((resolve) => { release = resolve; });
    const writes: unknown[] = [];
    const windowWrites: unknown[] = [];
    const sunday = { weekday: 0, is_open: true, opens_at: 120, closes_at: 240 };
    let actionReads = 0;
    page.on('request', (request) => {
      if (/\/action_states\//.test(new URL(request.url()).pathname)) actionReads += 1;
    });
    await installHaveApiMock(page, {
      user: { id: 7, login: 'member', level },
      handlers: {
        'GET vpses/123': async () => {
          if (submitted) { readBackRequested = true; await readBackGate; }
          return { vps: { id: 123, hostname: 'sample.example', object_state: 'active', user: { id: 7 }, node: { id: 1 }, allow_admin_modifications: allow } };
        },
        'GET transaction_chains': () => ({ transaction_chains: [] }),
        'GET vpses/123/maintenance_windows': () => ({ maintenance_windows: [sunday] }),
        'PUT vpses/123': (ctx) => {
          const body = ctx.request.postDataJSON() as { vps: { allow_admin_modifications: boolean } };
          writes.push(body); allow = body.vps.allow_admin_modifications; submitted = true;
          // Empty successful output is the immediate-save API contract.
          return {};
        },
        'PUT vpses/123/maintenance_windows/0': (ctx) => {
          const body = ctx.request.postDataJSON() as { maintenance_window: typeof sunday };
          windowWrites.push(body); Object.assign(sunday, body.maintenance_window);
          return { maintenance_window: sunday };
        },
      },
    });
    await page.goto(`${level === 90 ? '/admin' : '/app'}/vps/123/maintenance`);
    await page.getByTestId('vps.admin_modifications.deny').check();
    const save = page.getByTestId('vps.admin_modifications.save');
    try {
      await save.click();
      await expect.poll(() => readBackRequested).toBe(true);
      await expect(save).toBeDisabled();
      await expect(page.getByTestId('vps.admin_modifications.saved')).toHaveCount(0);
      await expect(page.getByTestId('vps.mutation.uncertain')).toHaveCount(0);
    } finally { release(); }
    await expect(page.getByTestId('vps.admin_modifications.saved')).toBeVisible();
    await expect(page.getByTestId('vps.admin_modifications.deny')).toBeChecked();
    expect(writes).toEqual([{ vps: { allow_admin_modifications: false } }]);
    expect(windowWrites).toEqual([]);
    expect(actionReads).toBe(0);
    await page.getByTestId('vps.maintenance.day.0.opens.h').selectOption('3');
    await page.getByTestId('vps.maintenance.save').click();
    await expect(page.getByTestId('vps.maintenance.save_success')).toBeVisible();
    expect(windowWrites).toEqual([{ maintenance_window: { is_open: true, opens_at: 180, closes_at: 240 } }]);
    expect(writes).toHaveLength(1);
    await page.reload();
    await expect(page.getByTestId('vps.admin_modifications.deny')).toBeChecked();
    await expect(page.getByTestId('vps.maintenance.day.0.opens.h')).toHaveValue('3');
    await expect(page.getByTestId('vps.mutation.uncertain')).toHaveCount(0);
    await page.screenshot({ path: testInfo.outputPath('synchronous-preference-and-sunday.png'), fullPage: true, scale: 'css' });
  });
}

for (const outcome of ['mismatch', 'unavailable'] as const) {
  test(`@pr-smoke @pr-smoke-mobile synchronous preference is not confirmed after read-back ${outcome}`, async ({ page }) => {
    await bootstrapVpsAdminWindow(page, { sessionToken: 'TEST' });
    let submitted = false;
    let writes = 0;
    await installHaveApiMock(page, {
      user: { id: 7, login: 'member', level: 1 },
      handlers: {
        'GET vpses/123': () => submitted && outcome === 'unavailable' ? failEnvelope('Synthetic read-back failure') : { vps: {
          id: 123, hostname: 'sample.example', object_state: 'active', user: { id: 7 }, node: { id: 1 }, allow_admin_modifications: false,
        } },
        'GET transaction_chains': () => ({ transaction_chains: [] }),
        'GET vpses/123/maintenance_windows': () => ({ maintenance_windows: [] }),
        'PUT vpses/123': () => { submitted = true; writes += 1; return {}; },
      },
    });
    await page.goto('/app/vps/123/maintenance');
    await page.getByTestId('vps.admin_modifications.allow').check();
    await page.getByTestId('vps.admin_modifications.save').click();
    if (outcome === 'unavailable') await expect(page.getByTestId('vps.detail.error')).toBeVisible();
    else {
      await expect(page.getByTestId('vps.admin_modifications.failed')).toBeVisible();
      await expect(page.getByTestId('vps.admin_modifications.allow')).toBeChecked();
    }
    await expect(page.getByTestId('vps.admin_modifications.saved')).toHaveCount(0);
    expect(writes).toBe(1);
  });
}
