import { expect, test } from '@playwright/test';

import { bootstrapVpsAdminWindow, installHaveApiMock, setUiSettingsLocalStorage } from '../../fixtures';
import { expectNoDocumentHorizontalOverflow } from '../../helpers/horizontalOverflow';

for (const mode of ['member', 'admin'] as const) {
  test(`@pr-smoke @pr-smoke-mobile snapshot NFS export preserves its source (${mode})`, async ({ page, hasTouch }, testInfo) => {
    await bootstrapVpsAdminWindow(page);
    const cs = mode === 'member';
    await setUiSettingsLocalStorage(page, { language: cs ? 'cs' : 'en', theme: 'dark' });
    const dataset = {
      id: 10, name: 'backup-test', full_name: 'tank/backup-test', object_state: 'active',
      user: { id: 1, login: 'backup-test' }, snapshots_count: 3,
    };
    const snapshots = [131, 132, 133].map((id) => ({
      id, name: `backup-${id}`, label: `Backup ${id}`, created_at: '2026-10-17T09:00:00Z',
      ...(id === 133 ? { export: { id: 70 } } : {}),
    }));
    const writes: Record<string, unknown>[] = [];
    let pickerLoaded = false;
    await installHaveApiMock(page, {
      user: { id: 1, login: 'backup-test', level: cs ? 1 : 99 },
      handlers: {
        'GET datasets/10': () => dataset,
        'GET datasets': () => ({ datasets: [dataset], _meta: { total_count: 1 } }),
        'GET transaction_chains': () => ({ transaction_chains: [] }),
        'GET exports/70': () => ({ id: 70, dataset, snapshot: snapshots[2], user: dataset.user, enabled: true }),
        'GET exports/71': () => ({ id: 71, dataset, snapshot: snapshots[1], user: dataset.user, enabled: true }),
        'GET exports/70/hosts': () => ({ hosts: [] }),
        'GET exports/71/hosts': () => ({ hosts: [] }),
        'GET datasets/10/snapshots': ({ searchParams }) => {
          // The selected row is outside the export picker's first 100 results.
          if (searchParams.get('snapshot[limit]') === '100') {
            pickerLoaded = true;
            return { snapshots: [{ id: 1, name: 'unrelated-backup' }] };
          }
          return { snapshots, _meta: { total_count: 3 } };
        },
        'POST exports': ({ params }) => {
          writes.push(params);
          return { export: { id: 71, snapshot: { id: 132 }, dataset } };
        },
      },
    });
    const base = cs ? '/app' : '/admin';
    const path = cs ? '/app/backups?tab=snapshots&dataset=10' : '/admin/datasets/10/snapshots';
    await page.goto(path);
    const layout = hasTouch ? 'card' : 'row';
    const action = (id: number) => page.getByTestId(`dataset.snapshots.${layout}.${id}.export`);
    await expect(action(131)).toBeVisible();
    await expect(page.getByTestId(`dataset.snapshots.${layout}.131`).getByText('#131', { exact: true })).toHaveCount(1);
    await expect(action(133)).toHaveAttribute('href', `${base}/exports/70`);
    await expectNoDocumentHorizontalOverflow(page);
    await page.screenshot({ path: testInfo.outputPath(`snapshot-actions-${mode}.png`), fullPage: true });
    const activate = async (id: number) => hasTouch ? action(id).tap() : action(id).click();
    await activate(131);
    const dialog = page.getByTestId('dataset.exports.create');
    await expect(dialog).toBeVisible();
    await expect.poll(() => pickerLoaded).toBe(true);
    await expect(dialog.getByRole('combobox', { name: cs ? 'Typ zdroje' : 'Source type', exact: true })).toHaveValue('snapshot');
    await expect(dialog.getByRole('combobox', { name: 'Snapshot', exact: true })).toHaveValue('131');
    await expect(dialog.getByRole('combobox', { name: 'Snapshot', exact: true })).toBeEnabled();
    await expect(dialog).toContainText('tank/backup-test');
    expect(writes).toEqual([]);
    await expectNoDocumentHorizontalOverflow(page);
    await page.screenshot({ path: testInfo.outputPath(`snapshot-export-${mode}.png`), fullPage: false });
    await dialog.getByRole('button', { name: cs ? 'Zrušit' : 'Cancel', exact: true }).click();
    await expect(dialog).not.toBeVisible();
    await activate(132);
    await expect(dialog.getByRole('combobox', { name: 'Snapshot', exact: true })).toHaveValue('132');
    await expect(page.getByTestId('exports.create.submit')).toBeEnabled();
    if (hasTouch) await page.getByTestId('exports.create.submit').tap();
    else await page.getByTestId('exports.create.submit').click();
    await expect.poll(() => writes.length).toBe(1);
    expect(writes[0]).toMatchObject({ export: { snapshot: 132 } });
    expect((writes[0]?.['export'] as Record<string, unknown>)['dataset']).toBeUndefined();
    await expect(page).toHaveURL(new RegExp(`${base}/exports/71$`));
    await expect(page.getByTestId('exports.detail.page')).toBeVisible();
    await page.goto(path);
    await activate(133);
    await expect(page).toHaveURL(new RegExp(`${base}/exports/70$`));
    await expect(page.getByTestId('exports.detail.page')).toBeVisible();
    expect(writes).toHaveLength(1);
  });
}
