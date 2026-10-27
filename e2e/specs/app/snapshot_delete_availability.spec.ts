import { expect, test, type Page } from '@playwright/test';
import { bootstrapVpsAdminWindow, installHaveApiMock, setUiSettingsLocalStorage } from '../../fixtures';

function action(page: Page, name: string, id = 200) {
  return page.locator(
    `[data-testid="dataset.snapshots.row.${id}.${name}"]:visible, [data-testid="dataset.snapshots.card.${id}.${name}"]:visible`
  );
}

async function setup(
  page: Page,
  options: { language?: 'cs' | 'en'; admin?: boolean; vps?: boolean; backups?: boolean; references?: boolean } = {}
) {
  await bootstrapVpsAdminWindow(page, { sessionToken: 'TEST' });
  await setUiSettingsLocalStorage(page, { language: options.language ?? 'en', theme: 'dark' });
  const state = {
    backups: options.backups ?? false,
    probeError: false,
    wrongTarget: false,
    rejection: '',
    deleted: false,
  };
  const deletes: string[] = [];
  const probes: string[] = [];
  const dataset = {
    id: 10,
    name: 'sample-storage',
    full_name: 'sample-storage',
    user: { id: 2, login: 'sample-member' },
    object_state: 'active',
    vps: options.vps ? { id: 300, hostname: 'sample.example' } : null,
  };
  await installHaveApiMock(page, {
    user: { id: 2, login: 'sample-member', level: options.admin ? 100 : 1 },
    handlers: {
      'GET datasets/10': () => ({ dataset }),
      'GET datasets/11': () => ({ dataset: { ...dataset, id: 11, name: 'other-storage' } }),
      'GET transaction_chains': () => ({ transaction_chains: [] }),
      'GET datasets': ({ searchParams }) => {
        const role = searchParams.get('dataset[role]');
        if (role === 'backup' || role === 'primary') {
          probes.push(role);
          expect(searchParams.get('dataset[dataset]')).toBe('10');
          expect(searchParams.get('dataset[to_depth]')).toBe('0');
          expect(searchParams.get('dataset[limit]')).toBe('1');
          expect(searchParams.has('dataset[subtree]')).toBe(false);
          if (state.probeError) return { status: false, message: 'Read unavailable' };
          if (state.wrongTarget) return { datasets: [{ ...dataset, id: 999 }] };
          return { datasets: role === 'primary' ? (options.vps ? [] : [dataset]) : state.backups ? [dataset] : [] };
        }
        return { datasets: [dataset] };
      },
      'GET datasets/10/snapshots': () => ({
        snapshots: state.deleted
          ? []
          : [
              { id: 200, name: 'Before update', created_at: '2026-10-26T12:00:00Z' },
              ...(options.references
                ? [
                    { id: 201, name: 'Mounted snapshot', mount: { id: 30 } },
                    { id: 202, name: 'Exported snapshot', export: { id: 31 } },
                  ]
                : []),
            ],
      }),
      'GET datasets/11/snapshots': () => ({ snapshots: [{ id: 201, name: 'Other snapshot' }] }),
      'GET snapshot_downloads': () => ({ snapshot_downloads: [] }),
      'DELETE datasets/10/snapshots/200': ({ request }) => {
        deletes.push(request.pathname);
        if (state.rejection) {
          state.backups = state.rejection.includes('with backups');
          return { status: false, message: state.rejection };
        }
        state.deleted = true;
        return { _meta: { action_state_id: 801 } };
      },
      'GET action_states/801': () => ({
        action_state: { id: 801, finished: true, status: true, current: 1, total: 1 },
      }),
    },
  });
  return { state, deletes, probes };
}

for (const language of ['cs', 'en'] as const)
  for (const admin of [false, true]) {
    test(`@pr-smoke @pr-smoke-mobile ${language} ${admin ? 'admin' : 'member'} cannot delete VPS snapshots from detail or Backup Center`, async ({
      page,
    }, info) => {
      const { deletes, probes } = await setup(page, { language, admin, vps: true });
      const base = admin ? '/admin' : '/app';
      for (const path of [`${base}/datasets/10/snapshots`, `/app/backups?tab=snapshots&dataset=10`]) {
        await page.goto(path);
        await expect(action(page, 'rollback')).toBeVisible();
        await expect(page.getByTestId('dataset.snapshots.deletion.notice')).toContainText(
          language === 'cs' ? 'Snapshoty VPS' : 'VPS snapshots'
        );
        await expect(action(page, 'delete')).toHaveCount(0);
        await expect(action(page, 'download')).toBeVisible();
        await expect(action(page, 'export')).toBeVisible();
        expect(deletes).toEqual([]);
        expect(probes).toEqual([]);
      }
      if (language === 'cs' && admin)
        await page.screenshot({ path: info.outputPath('vps-snapshots.png'), fullPage: true, scale: 'css' });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    });
    test(`@pr-smoke @pr-smoke-mobile ${language} ${admin ? 'admin' : 'member'} can delete an unreferenced NAS snapshot after review`, async ({
      page,
    }, info) => {
      const { deletes, probes } = await setup(page, { language, admin, references: true });
      await page.goto(`${admin ? '/admin' : '/app'}/nas/10/snapshots`);
      await expect(action(page, 'delete')).toBeEnabled();
      await expect(action(page, 'delete', 201)).toHaveCount(0);
      await expect(action(page, 'delete', 202)).toHaveCount(0);
      await action(page, 'delete').click();
      await expect(page.getByTestId('dataset.snapshots.delete_confirm')).toContainText('Before update');
      expect(deletes).toEqual([]);
      await page.getByTestId('dataset.snapshots.delete_confirm.cancel').click();
      expect(deletes).toEqual([]);
      await action(page, 'delete').click();
      if (language === 'cs' && admin)
        await page.screenshot({ path: info.outputPath('nas-delete-review.png'), scale: 'css' });
      const checksBeforeDelete = probes.filter((role) => role === 'backup').length;
      await page.getByTestId('dataset.snapshots.delete_confirm.confirm').click();
      await expect(page.getByTestId('dataset.snapshots.delete_confirm')).toBeHidden();
      expect(deletes).toHaveLength(1);
      expect(deletes[0]).toMatch(/\/datasets\/10\/snapshots\/200$/);
      expect(probes.filter((role) => role === 'backup').length).toBeGreaterThan(checksBeforeDelete);
    });
  }

test('@pr-smoke @pr-smoke-mobile NAS backups and failed or unscoped reads never offer Delete; retry restores availability', async ({
  page,
}) => {
  const { state, deletes } = await setup(page, { backups: true });
  await page.goto('/app/nas/10/snapshots');
  await expect(page.getByTestId('dataset.snapshots.deletion.notice')).toContainText('backup copies');
  await expect(action(page, 'delete')).toHaveCount(0);
  state.backups = false;
  state.probeError = true;
  await page.reload();
  await expect(page.getByTestId('dataset.snapshots.deletion.retry')).toBeVisible();
  await expect(action(page, 'delete')).toHaveCount(0);
  state.probeError = false;
  state.wrongTarget = true;
  await page.getByTestId('dataset.snapshots.deletion.retry').click();
  await expect(page.getByTestId('dataset.snapshots.deletion.retry')).toBeVisible();
  await expect(action(page, 'delete')).toHaveCount(0);
  state.wrongTarget = false;
  await page.getByTestId('dataset.snapshots.deletion.retry').click();
  await expect(action(page, 'delete')).toBeEnabled();
  expect(deletes).toEqual([]);
});

test('@pr-smoke @pr-smoke-mobile rechecks backup membership immediately before deletion', async ({ page }) => {
  const { state, deletes } = await setup(page);
  await page.goto('/app/nas/10/snapshots');
  await action(page, 'delete').click();
  state.backups = true;
  await page.getByTestId('dataset.snapshots.delete_confirm.confirm').click();
  await expect(page.getByTestId('dataset.snapshots.delete_confirm')).toContainText('backup copies');
  expect(deletes).toEqual([]);
  await page.getByTestId('dataset.snapshots.delete_confirm.cancel').click();
  await expect(action(page, 'delete')).toHaveCount(0);
});

for (const language of ['cs', 'en'] as const)
  for (const message of [
    'cannot destroy snapshot with backups',
    'this snapshot cannot be destroyed as others are depending on it',
  ]) {
    test(`@pr-smoke @pr-smoke-mobile ${language} explains the final API rejection: ${message}`, async ({
      page,
    }, info) => {
      const { state, deletes } = await setup(page, { language });
      await page.goto('/app/nas/10/snapshots');
      await action(page, 'delete').click();
      state.rejection = message;
      await page.getByTestId('dataset.snapshots.delete_confirm.confirm').click();
      const dialog = page.getByTestId('dataset.snapshots.delete_confirm');
      await expect(dialog).toContainText(language === 'cs' ? 'nelze' : 'cannot be deleted');
      await expect(dialog).not.toContainText('HaveApiError');
      await expect(dialog).not.toContainText(message);
      expect(deletes).toHaveLength(1);
      if (language === 'cs' && message.includes('with backups'))
        await page.screenshot({ path: info.outputPath('rejection.png'), scale: 'css' });
      await page.getByTestId('dataset.snapshots.delete_confirm.cancel').click();
      await expect(action(page, 'delete')).toHaveCount(0);
    });
  }
