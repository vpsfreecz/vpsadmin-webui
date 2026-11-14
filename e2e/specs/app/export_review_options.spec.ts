import { expect, test } from '@playwright/test';
import { bootstrapVpsAdminWindow, installHaveApiMock, setUiSettingsLocalStorage } from '../../fixtures';
import { expectNoDocumentHorizontalOverflow } from '../../helpers/horizontalOverflow';

for (const language of ['cs', 'en'] as const) {
  for (const theme of ['light', 'dark'] as const) {
    for (const role of ['member', 'admin', 'my'] as const) {
      test(`@pr-smoke @pr-smoke-mobile export NFS options ${language} ${theme} ${role}`, async ({ page }, testInfo) => {
        const baseline = process.env['CAPTURE_SIDE']?.startsWith('baseline') ?? false;
        await bootstrapVpsAdminWindow(page);
        await setUiSettingsLocalStorage(page, { language, theme });
        const dataset = { id: 20, name: 'archive', full_name: 'tank/demo/archive', user: { id: 1 }, object_state: 'active' };
        const writes: Record<string, unknown>[] = [];
        await installHaveApiMock(page, {
          user: { id: 1, login: 'demo', level: role === 'member' ? 1 : 99 },
          handlers: {
            'GET exports': () => ({ exports: [] }),
            'GET datasets/20': () => ({ dataset }),
            'GET datasets/20/snapshots': () => ({ snapshots: [] }),
            'POST exports': ({ params }) => { writes.push(params); return { status: 409, contentType: 'application/json', body: JSON.stringify({ status: false, message: 'Synthetic NFS rejection: draft retained' }) }; },
          },
        });
        await page.goto(`/${role === 'admin' ? 'admin' : 'app'}/exports`);
        await page.getByTestId('exports.create.open').click();
        const dialog = page.getByTestId('exports.create');
        await dialog.getByTestId('exports.create.dataset').fill('20');
        await expect(dialog.getByTestId('exports.create.submit')).toBeEnabled();
        const sync = dialog.getByRole('checkbox', { name: language === 'cs' ? 'Synchronně' : 'Sync', exact: true });
        const subtree = dialog.getByRole('checkbox', { name: language === 'cs' ? 'Kontrola podstromu' : 'Subtree check', exact: true });
        const review = dialog.getByTestId('exports.create.review');
        await expect(sync).toBeChecked();
        await expect(subtree).not.toBeChecked();
        if (baseline) {
          await expect(review.getByTestId('exports.create.review.sync')).toHaveCount(0);
          await expect(review.getByTestId('exports.create.review.subtree_check')).toHaveCount(0);
        }
        for (const [syncOn, subtreeOn] of [[true, false], [false, false], [false, true], [true, true]]) {
          await sync.setChecked(syncOn!);
          await subtree.setChecked(subtreeOn!);
          if (!baseline) {
            await expect(review.getByTestId('exports.create.review.sync')).toContainText(language === 'cs'
              ? `Synchronní režim je ${syncOn ? 'zapnutý' : 'vypnutý'}`
              : `Sync is ${syncOn ? 'enabled' : 'disabled'}`);
            await expect(review.getByTestId('exports.create.review.subtree_check')).toContainText(language === 'cs'
              ? `Kontrola podstromu je ${subtreeOn ? 'zapnutá' : 'vypnutá'}`
              : `Subtree check is ${subtreeOn ? 'enabled' : 'disabled'}`);
          }
          const expectedWrites = writes.length + 1;
          await dialog.getByTestId('exports.create.submit').click();
          await expect.poll(() => writes.length).toBe(expectedWrites);
          await expect(dialog.getByTestId('exports.create.submit')).toBeEnabled();
          const payload = writes.at(-1)?.['export'] as Record<string, unknown>;
          expect(payload).toMatchObject({ dataset: 20, sync: syncOn, subtree_check: subtreeOn });
          expect(payload['snapshot']).toBeUndefined();
          if (role === 'member') expect(payload['threads']).toBeUndefined();
          await expect(dialog).toBeVisible();
        }
        if (role === 'member') {
          await review.scrollIntoViewIfNeeded();
          await page.screenshot({ path: testInfo.outputPath(`export-review-${language}-${theme}.png`) });
        }
        await expectNoDocumentHorizontalOverflow(page);
        await page.keyboard.press('Escape');
        await expect(dialog).toBeHidden();
      });
    }
  }
}
