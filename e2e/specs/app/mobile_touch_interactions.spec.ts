import { expect, test, type Locator, type Page } from '@playwright/test';

import { bootstrapVpsAdminWindow, failEnvelope, installHaveApiMock } from '../../fixtures';
import { expectNoDocumentHorizontalOverflow, expectTableHorizontalScrollUsable } from '../../helpers/horizontalOverflow';

const vps = {
  id: 3, hostname: 'touch.example.test', object_state: 'active', is_running: true,
  cpus: 2, memory: 2048, diskspace: 20480,
  node: { id: 1, domain_name: 'node.example.test' }, user: { id: 1, login: 'touch-test' },
};

async function setup(page: Page) {
  await bootstrapVpsAdminWindow(page, { sessionToken: 'TEST' });
  return installHaveApiMock(page, {
    user: { id: 1, login: 'touch-test', level: 99 },
    handlers: {
      'GET vpses': () => ({ vpses: [vps], _meta: { total_count: 1 } }),
      'GET vpses/3': () => ({ vps }),
      'GET help_boxes': () => ({ help_boxes: [] }),
      'GET users': () => ({ users: [] }),
      'GET nodes': () => ({ nodes: [] }),
    },
  });
}

async function touchTarget(locator: Locator) {
  const box = await locator.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.height).toBeGreaterThanOrEqual(44);
  expect(box!.width).toBeGreaterThanOrEqual(44);
}

// No test retries: a successful second attempt must not hide a lost first tap.
test.describe('@pr-smoke-mobile Mobile first-touch interactions', () => {
  test.describe.configure({ retries: 0 });
  test.use({ locale: 'cs-CZ' });
  test.beforeEach(async ({ hasTouch }) => { test.skip(!hasTouch, 'Uses real touchscreen input'); });

  for (const viewport of [{ width: 320, height: 568 }, { width: 360, height: 640 }, { width: 390, height: 500 }]) {
    test(`navigation, account and tasks respond to one tap at ${viewport.width}x${viewport.height}`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await setup(page);
      await page.goto('/app/vps');
      await expect(page.getByTestId('vps.list')).toBeVisible();
      for (let i = 0; i < 3; i += 1) {
        await page.getByTestId('shell.mobile-nav-button').tap();
        await expect(page.getByTestId('nav.drawer')).toBeVisible();
        // Selecting the current destination must still dismiss navigation.
        await page.getByTestId('nav.drawer.vps').tap();
        await expect(page.getByTestId('nav.drawer')).toBeHidden();
        await page.getByTestId('tasks.open-button').tap();
        await expect(page.getByTestId('tasks.drawer')).toBeVisible();
        await page.getByTestId('tasks.close-button').tap();
        await expect(page.getByTestId('tasks.drawer')).toBeHidden();
        await page.getByTestId('shell.user-menu-button').tap();
        await expect(page.getByTestId('shell.user-menu')).toBeVisible();
        await page.getByTestId('shell.user-menu-button').tap();
        await expect(page.getByTestId('shell.user-menu')).toBeHidden();
      }
      await expectNoDocumentHorizontalOverflow(page);
    });

    test(`search selection works with a focused input at ${viewport.width}x${viewport.height}`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await setup(page);
      await page.goto('/app/vps');
      await page.getByTestId('palette.open').tap();
      await expect(page.getByTestId('palette.modal')).toBeVisible();
      await page.getByTestId('palette.input').fill('touch');
      const result = page.getByTestId('palette.result.0');
      await expect(result).toContainText('touch.example.test');
      await result.tap();
      await expect(page).toHaveURL(/\/app\/vps\/3$/);
      await expect(page.getByTestId('palette.modal')).toBeHidden();
      await expectNoDocumentHorizontalOverflow(page);
    });

    test(`failed confirmation remains cancellable on first tap at ${viewport.width}x${viewport.height}`, async ({ page }) => {
      await page.setViewportSize(viewport);
      const mock = await setup(page);
      let posts = 0;
      let release = () => {};
      const responseGate = new Promise<void>((resolve) => { release = resolve; });
      mock.addHandler('POST vpses/3/restart', async () => {
        posts += 1;
        await responseGate;
        return failEnvelope('Synthetic rejection');
      });
      await page.goto('/app/vps');
      await page.getByTestId('vps.card.3.action.restart').tap();
      const confirm = page.getByTestId('vps.list.power_confirm.confirm');
      const cancel = page.getByTestId('vps.list.power_confirm.cancel');
      await touchTarget(confirm);
      await touchTarget(cancel);
      await confirm.tap();
      try {
        await expect.poll(() => posts).toBe(1);
        await expect(confirm).toBeDisabled();
      } finally {
        release();
      }
      await expect(page.getByTestId('vps.list.power_confirm.error')).toBeVisible();
      await expect(cancel).toBeEnabled();
      // Tap near the edge of the actual target, not only its forgiving centre.
      const box = await cancel.boundingBox();
      await cancel.tap({ position: { x: box!.width / 2, y: box!.height - 2 } });
      await expect(page.getByTestId('vps.list.power_confirm')).toBeHidden();
      expect(posts).toBe(1);
      await expectNoDocumentHorizontalOverflow(page);
    });
  }

  test('a cold search opens immediately and can close before its code arrives', async ({ page }) => {
    await setup(page);
    let release = () => {};
    const chunkGate = new Promise<void>((resolve) => { release = resolve; });
    let requested = false;
    await page.route(/\/src\/components\/layout\/CommandPalette\.tsx(?:\?|$)|\/assets\/app-chrome-overlays-[^/]+\.js$/, async (route) => {
      requested = true;
      await chunkGate;
      await route.continue();
    });
    await page.goto('/app/vps');
    await expect(page.getByTestId('vps.list')).toBeVisible();
    const before = await page.getByTestId('shell.header').boundingBox();
    try {
      await page.getByTestId('palette.open').tap();
      await expect.poll(() => requested).toBe(true);
      const loading = page.getByTestId('shell.command_palette.loading');
      await expect(loading).toHaveAttribute('role', 'dialog');
      await expect(loading).toBeInViewport();
      await expect(loading.getByRole('status')).toBeVisible();
      expect(await page.getByTestId('shell.header').boundingBox()).toEqual(before);
      await page.getByTestId('shell.command_palette.loading.close').tap();
      await expect(loading).toBeHidden();
      // Reopening while the same import is pending must also need just one tap.
      await page.getByTestId('palette.open').tap();
      await expect(loading).toBeVisible();
    } finally {
      release();
    }
    await expect(page.getByTestId('palette.input')).toBeFocused();
    await expect(page.getByTestId('shell.command_palette.loading')).toBeHidden();
    await expectNoDocumentHorizontalOverflow(page);
  });

  test('selects a partially visible filter suggestion without a second tap', async ({ page }) => {
    await setup(page);
    await page.goto('/admin/vps');
    const input = page.getByTestId('vps.smart_filter.input');
    await input.tap();
    await input.fill('5');
    const option = page.getByTestId('vps.smart_filter.suggest.map');
    const list = page.getByTestId('vps.smart_filter.input.dropdown');
    await expect(option).toBeVisible();
    await list.evaluate((element) => {
      const last = element.querySelector<HTMLElement>('li:last-child');
      if (!last) throw new Error('Missing final filter suggestion');
      element.scrollTop = last.offsetTop - element.clientHeight + 12;
    });
    const box = await option.boundingBox();
    const bounds = await list.boundingBox();
    expect(box).not.toBeNull();
    expect(bounds).not.toBeNull();
    // Raw coordinates preserve partial clipping; Locator.tap auto-scrolls it away.
    await page.touchscreen.tap(box!.x + box!.width / 2, Math.min(bounds!.y + bounds!.height - 4, box!.y + 6));
    await expect(input).toHaveValue('');
    await expect(page).toHaveURL(/user_namespace_map=5/);
  });

  test('VPS suggestions stay usable after selecting the owner filter', async ({ page }) => {
    const mock = await setup(page);
    mock.addHandler('GET users', () => ({ users: [{ id: 7, login: 'alice' }] }));
    mock.addHandler('GET vpses', () => ({ vpses: [vps] }));
    mock.addHandler('GET network_interface_monitors', () => ({ network_interface_monitors: [] }));
    await page.goto('/admin/networking/live?paused=1');
    await page.getByTestId('admin.network_live.filter.user').fill('ali');
    await page.getByTestId('admin.network_live.filter.user.opt.7').tap();
    const input = page.getByTestId('admin.network_live.filter.vps');
    await input.fill('touch');
    const option = page.getByTestId('admin.network_live.filter.vps.opt.3');
    await expect(option).toBeVisible();
    await option.tap();
    await expect(page).toHaveURL(/vps=3/);
    await expect(input).toHaveValue('#3');
  });

  test('a scrolled mailbox form stays inside the viewport and saves on one tap', async ({ page }) => {
    await page.setViewportSize({ width: 393, height: 727 });
    const mock = await setup(page);
    mock.addHandler('GET mailboxes/20', () => ({ mailbox: {
      id: 20, label: 'Test inbox', server: 'imap.example.test', port: 993,
      user: 'test@example.test', enable_ssl: true, handlers_count: 1,
    } }));
    mock.addHandler('GET mailboxes/20/handler', () => ({
      handlers: [{ id: 201, class_name: 'Custom::Handler', order: 1, continue: false }],
      _meta: { total_count: 1 },
    }));
    let saves = 0;
    mock.addHandler('PUT mailboxes/20/handler/201', () => {
      saves += 1;
      return failEnvelope('Synthetic rejection');
    });
    await page.goto('/admin/mailer/mailboxes/20');
    await expect(page.getByTestId('admin.mailer.mailboxes.handler.201')).toBeVisible();
    await expectNoDocumentHorizontalOverflow(page);
    await page.getByTestId('admin.mailer.mailboxes.handler.201.edit').tap();
    await page.getByTestId('admin.mailer.mailboxes.handler.modal.order').fill('2');
    await page.getByTestId('admin.mailer.mailboxes.handler.modal.continue').tap();
    const save = page.getByTestId('admin.mailer.mailboxes.handler.modal.save');
    await touchTarget(save);
    await expect(save).toBeInViewport({ ratio: 1 });
    await save.tap();
    await expect(page.getByTestId('admin.mailer.mailboxes.handler.modal.error')).toContainText('Synthetic rejection');
    expect(saves).toBe(1);
    await expectNoDocumentHorizontalOverflow(page);
  });

  test('compact controls stay finger-sized on a landscape touch screen', async ({ page }) => {
    await page.setViewportSize({ width: 844, height: 390 });
    await setup(page);
    await page.goto('/app/vps');
    await touchTarget(page.getByTestId('vps.list.copy_link'));
    await expectNoDocumentHorizontalOverflow(page);
    await expectTableHorizontalScrollUsable(page, 'vps.table');
    const actionsStayInCell = await page.getByTestId('vps.row.3').evaluate((row) => {
      const cell = row.querySelector('td:last-child');
      if (!cell) return false;
      const bounds = cell.getBoundingClientRect();
      return [...cell.querySelectorAll('button,a')].every((control) => {
        const box = control.getBoundingClientRect();
        return box.left >= bounds.left && box.right <= bounds.right;
      });
    });
    expect(actionsStayInCell).toBe(true);
    await page.getByTestId('vps.row.3.action.restart').tap();
    await expect(page.getByTestId('vps.list.power_confirm')).toBeVisible();
    await page.getByTestId('vps.list.power_confirm.cancel').tap();
    await expect(page.getByTestId('vps.list.power_confirm')).toBeHidden();
  });
});

test('compact mouse controls retain their desktop height', async ({ page, hasTouch }) => {
  test.skip(hasTouch, 'Desktop mouse layout');
  await setup(page);
  await page.goto('/app/vps');
  const box = await page.getByTestId('vps.list.copy_link').boundingBox();
  expect(box?.height).toBe(32);
});
