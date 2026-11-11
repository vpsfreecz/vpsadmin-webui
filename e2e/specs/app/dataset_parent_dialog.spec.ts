import { expect, test, type Locator, type Page } from '@playwright/test';
import { bootstrapVpsAdminWindow, failEnvelope, installHaveApiMock, setUiSettingsLocalStorage } from '../../fixtures';

const longParent =
  'tank/nas/synteticky-rodic-pro-overeni-uplneho-kontextu-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa/data';
const actors = [
  { name: 'member', base: '/app', level: 1, numeric: false },
  { name: 'admin-selected', base: '/admin', level: 99, numeric: false },
  { name: 'admin-My', base: '/app', level: 99, numeric: true },
  { name: 'support-My', base: '/app', level: 21, numeric: false },
] as const;

async function completeTitle(page: Page, dialog: Locator) {
  const geometry = await dialog.evaluate((element) => {
    const box = element.getBoundingClientRect();
    const id = element.getAttribute('aria-labelledby');
    const heading = id ? document.getElementById(id) : null;
    if (!heading) throw new Error('Missing accessible dialog title');
    const walker = document.createTreeWalker(heading, NodeFilter.SHOW_TEXT);
    const rects: { left: number; right: number }[] = [];
    let node: Node | null;
    while ((node = walker.nextNode())) {
      if (!node.textContent?.trim()) continue;
      const range = document.createRange();
      range.selectNodeContents(node);
      rects.push(...Array.from(range.getClientRects(), (r) => ({ left: r.left, right: r.right })));
    }
    return {
      left: box.left,
      right: box.right,
      rects,
      text: heading.textContent,
      document: document.documentElement.scrollWidth,
    };
  });
  await test
    .info()
    .attach('complete-parent-title', { body: JSON.stringify(geometry), contentType: 'application/json' });
  expect(geometry.rects.length).toBeGreaterThan(0);
  for (const r of geometry.rects) {
    expect.soft(r.left).toBeGreaterThanOrEqual(geometry.left);
    expect.soft(r.right).toBeLessThanOrEqual(geometry.right);
  }
  const width = page.viewportSize()!.width;
  expect.soft(geometry.left).toBeGreaterThanOrEqual(0);
  expect.soft(geometry.right).toBeLessThanOrEqual(width + 1);
  expect.soft(geometry.document).toBeLessThanOrEqual(width + 1);
}

for (const actor of actors)
  for (const language of ['cs', 'en'] as const)
    for (const theme of ['light', 'dark'] as const) {
      test(`@pr-smoke @pr-smoke-mobile NAS parent dialog ${actor.name} ${language} ${theme}`, async ({
        page,
      }, info) => {
        const errors: string[] = [],
          posts: unknown[] = [];
        page.on('pageerror', (e) => errors.push(String(e)));
        await page.clock.setFixedTime(new Date('2026-11-11T12:00:00Z'));
        await bootstrapVpsAdminWindow(page, {
          sessionToken: 'TEST',
          webuiNext: { uiSettings: { persistence: 'local' } },
        });
        await setUiSettingsLocalStorage(page, { language, theme });
        const parent = actor.numeric ? '1701' : longParent;
        const dataset = {
          id: 10,
          name: actor.numeric ? '1701' : 'data',
          ...(actor.numeric ? {} : { full_name: longParent }),
          user: { id: 42, login: 'synthetic-owner' },
          parent: { id: 9 },
          vps: null,
          role: 'primary',
          object_state: 'active',
          used: 1024,
          avail: 10240,
          quota: 0,
          refquota: 10240,
          recordsize: 131072,
          compression: true,
          atime: false,
          relatime: false,
          sync: 'standard',
          snapshots_count: 0,
          mount_count: 0,
          export_count: 0,
        };
        await installHaveApiMock(page, {
          user: { id: 42, login: 'synthetic-owner', level: actor.level },
          handlers: {
            'GET datasets': () => ({ datasets: [dataset], _meta: { total_count: 1 } }),
            'GET datasets/10': () => ({ dataset }),
            'GET transaction_chains': () => ({ transaction_chains: [] }),
            'GET help_boxes': () => ({ help_boxes: [] }),
            'GET action_states': () => ({ action_states: [] }),
            'POST datasets': (request) => {
              posts.push(request.json);
              return {
                status: 403,
                contentType: 'application/json',
                body: JSON.stringify(failEnvelope('Synthetic rejection; keep parent context and the draft.')),
              };
            },
          },
        });
        const widths = [...new Set([info.project.name.startsWith('mobile') ? 390 : 1280, 320])];
        await page.setViewportSize({ width: widths[0]!, height: 900 });
        await page.goto(actor.base + '/nas/10');
        await page.getByTestId('dataset.manage.create.open').click();
        const dialog = page.getByRole('dialog');
        const title = language === 'cs' ? `Vytvořit vnořený dataset v ${parent}` : `Create subdataset under ${parent}`;
        await expect(dialog).toHaveAccessibleName(title);
        await expect(page.getByTestId('dataset.manage.create.modal')).not.toContainText(
          language === 'cs' ? 'Nadřazený dataset:' : 'Parent dataset:'
        );
        await expect(page.getByTestId('dataset.manage.create.name')).toBeEmpty();
        await page.getByTestId('dataset.manage.create.name').fill('synthetic-child');
        for (const width of widths) {
          await page.setViewportSize({ width, height: 900 });
          await completeTitle(page, dialog);
        }
        await page.getByTestId('dataset.manage.create.submit').click();
        await expect(dialog).toContainText('Synthetic rejection');
        await expect(dialog).toHaveAccessibleName(title);
        await expect(page.getByTestId('dataset.manage.create.name')).toHaveValue('synthetic-child');
        expect(posts).toEqual([{ dataset: { dataset: 10, name: 'synthetic-child', automount: true } }]);
        await completeTitle(page, dialog);
        await dialog.screenshot({
          path: info.outputPath('parent-dialog-320.png'),
          animations: 'disabled',
          scale: 'css',
        });
        if (actor.name === 'member' && language === 'cs' && theme === 'dark') {
          await page.setViewportSize({ width: widths[0]!, height: 900 });
          await completeTitle(page, dialog);
          await dialog.screenshot({
            path: info.outputPath('parent-dialog-normal.png'),
            animations: 'disabled',
            scale: 'css',
          });
          await page.setViewportSize({ width: 320, height: 900 });
        }
        await page.getByTestId('dataset.manage.create.name').focus();
        await page.keyboard.press('Tab');
        await page.keyboard.press('Shift+Tab');
        await expect(page.getByTestId('dataset.manage.create.name')).toBeFocused();
        await dialog.getByRole('button', { name: language === 'cs' ? 'Zrušit' : 'Cancel', exact: true }).click();
        await expect(dialog).toHaveCount(0);
        await page.getByTestId('dataset.manage.create.open').click();
        await expect(page.getByTestId('dataset.manage.create.name')).toBeEmpty();
        await expect(page.getByRole('dialog')).toHaveAccessibleName(title);
        await page.keyboard.press('Escape');
        await expect(page.getByRole('dialog')).toHaveCount(0);
        expect(posts).toHaveLength(1);
        expect(errors).toEqual([]);
      });
    }

for (const language of ['cs', 'en'] as const)
  for (const theme of ['light', 'dark'] as const) {
    test(`@pr-smoke @pr-smoke-mobile NAS parent read-only support ${language} ${theme}`, async ({ page }) => {
      const writes: string[] = [];
      await bootstrapVpsAdminWindow(page, {
        sessionToken: 'TEST',
        webuiNext: { uiSettings: { persistence: 'local' } },
      });
      await setUiSettingsLocalStorage(page, { language, theme });
      await installHaveApiMock(page, {
        user: { id: 42, login: 'synthetic-support', level: 21 },
        handlers: {
          'GET datasets/10': () => ({
            dataset: {
              id: 10,
              name: 'foreign-parent',
              full_name: 'tank/foreign-parent',
              user: { id: 77, login: 'synthetic-other' },
              parent: { id: 9 },
              role: 'primary',
              object_state: 'active',
              vps: null,
              used: 1024,
              refquota: 10240,
            },
          }),
          'GET transaction_chains': () => ({ transaction_chains: [] }),
        },
      });
      page.on('request', (r) => {
        if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(r.method())) writes.push(r.method());
      });
      await page.goto('/admin/nas/10');
      await expect(page.getByTestId('dataset.overview')).toBeVisible();
      await expect(page.getByTestId('dataset.manage.create.open')).toHaveCount(0);
      await expect(page.getByRole('dialog')).toHaveCount(0);
      expect(writes).toEqual([]);
    });
  }
