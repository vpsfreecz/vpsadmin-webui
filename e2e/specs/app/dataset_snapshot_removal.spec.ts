import { expect, test, type Page } from '@playwright/test';
import { bootstrapVpsAdminWindow, defaultHaveApiDescription, failEnvelope, installHaveApiMock } from '../../fixtures';
import { setUiSettingsLocalStorage } from '../../fixtures/uiSettings';
import { expectNoDocumentHorizontalOverflow } from '../../helpers/horizontalOverflow';
import { snapshotRemovalDescription, snapshotRemovalFixture } from '../../../src/test/snapshotRemoval';
import { enStorage } from '../../../src/i18n/locales/en/storage';
import { csStorage } from '../../../src/i18n/locales/cs/storage';

async function fixture(page: Page, language: 'en' | 'cs', opts: { level?: number; supported?: boolean; unknown?: boolean } = {}) {
  const description = { ...defaultHaveApiDescription(), ...snapshotRemovalDescription() };
  if (opts.supported === false) description.resources = {} as typeof description.resources;
  await bootstrapVpsAdminWindow(page, { sessionToken: 'TEST', description });
  await setUiSettingsLocalStorage(page, { language, theme: 'dark' });
  const previews: unknown[] = [];
  const removals: unknown[] = [];
  const mock = await installHaveApiMock(page, { description, user: { id: 1, login: 'synthetic-admin', level: opts.level ?? 90 }, handlers: {
    'GET datasets/42': () => ({ dataset: { id: 42, name: 'root', full_name: 'synthetic/root', environment: { id: 7, label: 'Synthetic' }, object_state: 'active' } }),
    'GET datasets/42/plans': () => ({ plans: [] }),
    'GET environments/7/dataset_plans': () => ({ dataset_plans: [] }),
    'POST datasets/42/preview_snapshot_removal': ({ json }) => {
      previews.push(json);
      const body = json as { dataset: { recursive: boolean; disable_plans: boolean } };
      return { dataset: snapshotRemovalFixture(body.dataset, 125) };
    },
    'POST datasets/42/remove_snapshots': ({ json }) => {
      removals.push(json);
      return opts.unknown ? { status: 503, body: 'Unavailable' } : { dataset: {}, _meta: { action_state_id: 71 } };
    },
    'GET action_states/71': () => ({ action_state: { id: 71, finished: false, status: true, current: 0, total: 1, label: 'Synthetic snapshot removal' } }),
  } });
  return { previews, removals, mock };
}

for (const language of ['en', 'cs'] as const) {
  test(`@pr-smoke @pr-smoke-mobile complete inventory and two separate removal confirmations (${language})`, async ({ page }, testInfo) => {
    const copy = language === 'cs' ? csStorage : enStorage;
    const f = await fixture(page, language);
    await page.goto('/admin/datasets/42/plans?recursive=true');
    const card = page.getByTestId('dataset.snapshot_removal');
    await expect(card).toBeVisible();
    await expect(page.getByTestId('dataset.plans.empty')).toBeVisible();
    await expect(page.getByTestId('dataset.snapshot_removal.recursive')).not.toBeChecked();
    await expect(page.getByTestId('dataset.snapshot_removal.disable_plans')).toBeChecked();
    await page.getByTestId('dataset.snapshot_removal.preview').click();
    const inventory = page.getByTestId('dataset.snapshot_removal.inventory');
    await expect(inventory).toBeVisible();
    await expect(inventory).toContainText('snapshot-125');
    await expect(inventory).toContainText('tree.1-empty');
    await expect(inventory).toContainText('branch.empty');
    await expect(inventory).toContainText('501');
    await expect(inventory).toContainText('502');
    await expect(inventory).toContainText(copy['dataset.snapshot_removal.plan.remove']);
    await expect(page.getByTestId('dataset.snapshot_removal.continue')).toBeDisabled();
    expect(f.removals).toEqual([]);
    await page.getByTestId('dataset.snapshot_removal.acknowledgement').check();
    await page.getByTestId('dataset.snapshot_removal.continue').focus();
    await page.keyboard.press('Enter');
    const final = page.getByTestId('dataset.snapshot_removal.final');
    await expect(final).toBeVisible();
    expect(f.removals).toEqual([]);
    await expect(final).toContainText('synthetic/root (#42)');
    await expect(final).toContainText(copy['dataset.snapshot_removal.scope_root']);
    await expect(final).toContainText(copy['dataset.snapshot_removal.plans_disabled']);
    expect(await final.locator('dt').evaluateAll(labels => labels.every(label => label.scrollWidth <= label.clientWidth))).toBe(true);
    await expectNoDocumentHorizontalOverflow(page);
    await testInfo.attach(`snapshot-removal-final-${language}-${testInfo.project.name}`, { body: await page.screenshot(), contentType: 'image/png' });
    await page.keyboard.press('Escape');
    await expect(final).toHaveCount(0);
    await expect(inventory).toBeVisible();
    await page.getByTestId('dataset.snapshot_removal').scrollIntoViewIfNeeded();
    await expectNoDocumentHorizontalOverflow(page);
    await testInfo.attach(`snapshot-removal-review-${language}-${testInfo.project.name}`, { body: await page.screenshot(), contentType: 'image/png' });
    await page.getByTestId('dataset.snapshot_removal.continue').click();
    await page.getByTestId('dataset.snapshot_removal.final.confirm').dblclick();
    await expect.poll(() => f.removals).toEqual([{ dataset: { recursive: false, disable_plans: true, manifest_digest: `v1:${'a'.repeat(64)}` } }]);
    expect(f.previews).toEqual([{ dataset: { recursive: false, disable_plans: true } }]);
    await expect(page.getByTestId('modal.action_progress')).toBeVisible();
  });

  test(`option edits and stale review require a new complete preview (${language})`, async ({ page }) => {
    const copy = language === 'cs' ? csStorage : enStorage;
    const f = await fixture(page, language);
    f.mock.addHandler('POST datasets/42/remove_snapshots', ({ json }) => {
      f.removals.push(json); return failEnvelope('Review again', { manifest_digest: ['stale_preview'] });
    });
    await page.goto('/admin/datasets/42/plans');
    await page.getByTestId('dataset.snapshot_removal.disable_plans').uncheck();
    await page.getByTestId('dataset.snapshot_removal.preview').click();
    await expect(page.getByTestId('dataset.snapshot_removal.inventory')).toContainText(copy['dataset.snapshot_removal.plan.retain']);
    await page.getByTestId('dataset.snapshot_removal.acknowledgement').check();
    await page.getByTestId('dataset.snapshot_removal.recursive').check();
    await expect(page.getByTestId('dataset.snapshot_removal.inventory')).toHaveCount(0);
    await page.getByTestId('dataset.snapshot_removal.preview').click();
    await expect(page.getByTestId('dataset.snapshot_removal.acknowledgement')).not.toBeChecked();
    await page.getByTestId('dataset.snapshot_removal.acknowledgement').check();
    await page.getByTestId('dataset.snapshot_removal.continue').click();
    await page.getByTestId('dataset.snapshot_removal.final.confirm').click();
    await expect(page.getByTestId('dataset.snapshot_removal.error')).toContainText(copy['dataset.snapshot_removal.stale']);
    await expect(page.getByTestId('dataset.snapshot_removal.inventory')).toHaveCount(0);
    await expect(page.getByTestId('dataset.snapshot_removal.disable_plans')).not.toBeChecked();
    expect(f.previews).toHaveLength(2); expect(f.removals).toHaveLength(1);
    await page.getByTestId('dataset.snapshot_removal.preview').click();
    await expect(page.getByTestId('dataset.snapshot_removal.acknowledgement')).not.toBeChecked();
    expect(f.removals).toHaveLength(1);
  });
}

test('unknown removal outcome blocks a fresh preview and replay', async ({ page }) => {
  const f = await fixture(page, 'en', { unknown: true });
  await page.goto('/admin/datasets/42/plans');
  await page.getByTestId('dataset.snapshot_removal.preview').click();
  await page.getByTestId('dataset.snapshot_removal.acknowledgement').check();
  await page.getByTestId('dataset.snapshot_removal.continue').click();
  await page.getByTestId('dataset.snapshot_removal.final.confirm').click();
  await expect(page.getByTestId('dataset.snapshot_removal.error')).toContainText(enStorage['dataset.snapshot_removal.unknown']);
  await expect(page.getByTestId('dataset.snapshot_removal.preview')).toBeDisabled();
  expect(f.removals).toHaveLength(1);
});

test('members and older APIs expose no removal controls', async ({ page }) => {
  const f = await fixture(page, 'en', { level: 1, supported: false });
  await page.goto('/app/datasets/42/plans');
  await expect(page.getByTestId('dataset.plans.empty')).toBeVisible();
  await expect(page.getByTestId('dataset.snapshot_removal')).toHaveCount(0);
  expect(f.previews).toEqual([]); expect(f.removals).toEqual([]);
});
