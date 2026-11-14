import { expect, test } from '@playwright/test';
import { bootstrapVpsAdminWindow, installHaveApiMock, setUiSettingsLocalStorage } from '../../fixtures';
import { expectNoDocumentHorizontalOverflow } from '../../helpers/horizontalOverflow';

for (const language of ['cs', 'en'] as const) {
  for (const theme of ['light', 'dark'] as const) {
    for (const role of ['member', 'admin', 'my'] as const) {
      test(`@pr-smoke @pr-smoke-mobile export source action ${language} ${theme} ${role}`, async ({ page }, testInfo) => {
        const baseline = process.env['CAPTURE_SIDE']?.startsWith('baseline') ?? false;
        await bootstrapVpsAdminWindow(page);
        await setUiSettingsLocalStorage(page, { language, theme });
        const name = 'tank/demo/dlouhy-nazev-datasetu-se-zalohami-a-dalsimi-daty';
        const writes: string[] = [];
        await installHaveApiMock(page, {
          user: { id: 1, login: 'demo', level: role === 'member' ? 1 : 99 },
          handlers: {
            'GET exports/10': () => ({ export: { id: 10, dataset: { id: 20, full_name: name }, snapshot: { id: 21, label: 'Backup 2026-11-14' }, user: { id: 1 }, enabled: true, rw: false } }),
            'GET exports/10/hosts': () => ({ hosts: [] }),
            'GET datasets/20': () => ({ dataset: { id: 20, full_name: name, user: { id: 1 }, object_state: 'active' } }),
          },
        });
        page.on('request', req => { if (req.method() !== 'GET') writes.push(req.method()); });
        const base = role === 'admin' ? '/admin' : '/app';
        await page.goto(`${base}/exports/10`);
        const summary = page.getByTestId('exports.detail.summary');
        await expect(summary).toBeVisible();
        const action = summary.getByRole('link', { name: language === 'cs' ? 'Otevřít dataset' : 'Open dataset', exact: true });
        await expect(action).toHaveCount(1);
        await expect(action).toHaveAttribute('href', `${base}/datasets/20`);
        if (!baseline) {
          await expect(page.getByTestId('exports.detail.header')).not.toContainText(name);
          await expect(action).toHaveAttribute('data-testid', 'exports.detail.open_dataset');
          await expect(action).toHaveClass(/border/);
          expect((await action.boundingBox())!.height).toBeGreaterThanOrEqual(36);
        }
        await expect(summary.getByText(name + ' · Backup 2026-11-14', { exact: true })).toHaveCount(1);
        await expectNoDocumentHorizontalOverflow(page);
        if (role === 'member') await page.screenshot({ path: testInfo.outputPath(`export-source-${language}-${theme}.png`) });
        await action.focus();
        await page.keyboard.press('Enter');
        await expect(page).toHaveURL(`${base}/datasets/20`);
        expect(writes).toEqual([]);
      });
    }
  }
}
