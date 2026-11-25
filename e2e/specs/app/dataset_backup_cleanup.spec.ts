import { expect, test, type Page } from '@playwright/test';
import { bootstrapVpsAdminWindow, defaultHaveApiDescription, failEnvelope, installHaveApiMock } from '../../fixtures';
import { setUiSettingsLocalStorage } from '../../fixtures/uiSettings';
import { expectNoDocumentHorizontalOverflow } from '../../helpers/horizontalOverflow';
import { enStorage } from '../../../src/i18n/locales/en/storage';
import { csStorage } from '../../../src/i18n/locales/cs/storage';

async function fixture(
  page: Page,
  language: 'en' | 'cs',
  opts: { level?: number; supported?: boolean; unknown?: boolean } = {}
) {
  const description = {
    ...defaultHaveApiDescription(),
    resources:
      opts.supported === false
        ? {}
        : {
            dataset: {
              actions: {
                disable_backups: { method: 'POST', input: { parameters: { recursive: {}, backup_first: {} } } },
              },
            },
          },
  };
  await bootstrapVpsAdminWindow(page, { sessionToken: 'TEST', description });
  await setUiSettingsLocalStorage(page, { language, theme: 'dark' });
  const requests: unknown[] = [];
  let assigned = false;
  const mock = await installHaveApiMock(page, {
    description,
    user: { id: 1, login: 'synthetic-admin', level: opts.level ?? 90 },
    handlers: {
      'GET datasets/42': () => ({
        dataset: {
          id: 42,
          name: 'root',
          full_name: 'synthetic/root',
          environment: { id: 7, label: 'Synthetic' },
          object_state: 'active',
        },
      }),
      'GET datasets/42/plans': () => ({
        plans: assigned
          ? [{ id: 2, environment_dataset_plan: { id: 12, label: 'Daily backup', user_remove: true } }]
          : [],
      }),
      'GET environments/7/dataset_plans': () => ({ dataset_plans: [] }),
      'POST datasets/42/disable_backups': ({ json }) => {
        requests.push(json);
        return opts.unknown ? { status: 503, body: 'Unavailable' } : { dataset: {}, _meta: { action_state_id: 71 } };
      },
      'GET action_states/71': () => ({
        action_state: {
          id: 71,
          finished: false,
          status: true,
          current: 0,
          total: 1,
          label: 'Synthetic backup cleanup',
        },
      }),
    },
  });
  return {
    requests,
    mock,
    showPlan: () => {
      assigned = true;
    },
  };
}

for (const language of ['en', 'cs'] as const) {
  test(`@pr-smoke @pr-smoke-mobile admin cleanup is available without plans and submits one ordinary task (${language})`, async ({
    page,
  }, testInfo) => {
    const copy = language === 'cs' ? csStorage : enStorage;
    const f = await fixture(page, language);
    await page.goto('/admin/datasets/42/plans?recursive=true');
    await expect(page.getByTestId('dataset.plans.empty')).toBeVisible();
    const form = page.getByTestId('dataset.backup_cleanup.form');
    await expect(form).toBeVisible();
    await expect(form).toContainText(copy['dataset.backup_cleanup.description']);
    await expect(page.getByTestId('dataset.backup_cleanup.open')).toHaveCount(0);
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.getByTestId('dataset.backup_cleanup.recursive')).not.toBeChecked();
    await expect(page.getByTestId('dataset.backup_cleanup.backup_first')).toBeChecked();
    await expect(page.getByTestId('dataset.backup_cleanup.acknowledgement')).not.toBeChecked();
    await expect(page.getByTestId('dataset.backup_cleanup.submit')).toBeDisabled();
    await form.scrollIntoViewIfNeeded();
    await expectNoDocumentHorizontalOverflow(page);
    await testInfo.attach(`backup-cleanup-${language}-${testInfo.project.name}`, {
      body: await page.screenshot(),
      contentType: 'image/png',
    });
    await page.getByTestId('dataset.backup_cleanup.recursive').check();
    await page.getByTestId('dataset.backup_cleanup.acknowledgement').check();
    await page.getByTestId('dataset.backup_cleanup.submit').click();
    await expect(page.getByTestId('dataset.backup_cleanup.acknowledgement')).not.toBeChecked();
    await expect.poll(() => f.requests).toEqual([{ dataset: { recursive: true, backup_first: true } }]);
    await expect(page.getByTestId('modal.action_progress')).toBeVisible();
    await expect(page.getByTestId('dataset.plans.remove.explanation')).toBeVisible();
  });
  test(`explicit opt-out and unknown submission retain the inline form without replay (${language})`, async ({
    page,
  }) => {
    const f = await fixture(page, language, { unknown: true });
    await page.goto('/admin/datasets/42/plans');
    await expect(page.getByTestId('dataset.backup_cleanup.form')).toBeVisible();
    await page.getByTestId('dataset.backup_cleanup.backup_first').uncheck();
    await page.getByTestId('dataset.backup_cleanup.acknowledgement').check();
    await page.getByTestId('dataset.backup_cleanup.submit').click();
    await expect(page.getByTestId('dataset.backup_cleanup.error')).toBeVisible();
    await expect(page.getByTestId('dataset.backup_cleanup.submit')).toBeDisabled();
    expect(f.requests).toEqual([{ dataset: { recursive: false, backup_first: false } }]);
  });
}

test('ordinary plan removal explains retained snapshots even without cleanup support', async ({ page }, testInfo) => {
  const f = await fixture(page, 'en', { supported: false });
  f.showPlan();
  await page.goto('/admin/datasets/42/plans');
  await expect(page.getByTestId('dataset.plans.remove.explanation')).toContainText(
    enStorage['dataset.plans.remove.explanation']
  );
  await expect(page.getByTestId('dataset.backup_cleanup.form')).toHaveCount(0);
  await page
    .getByTestId(
      testInfo.project.name === 'mobile-chrome' ? 'dataset.plans.card.2.remove' : 'dataset.plans.row.2.remove'
    )
    .click();
  await expect(page.getByTestId('dataset.plans.remove.confirm')).toContainText(
    enStorage['dataset.plans.remove.explanation']
  );
});

test('member plans do not expose administrator cleanup', async ({ page }) => {
  const f = await fixture(page, 'en', { level: 1 });
  await page.goto('/app/datasets/42/plans');
  await expect(page.getByTestId('dataset.plans.remove.explanation')).toBeVisible();
  await expect(page.getByTestId('dataset.backup_cleanup.form')).toHaveCount(0);
  expect(f.requests).toEqual([]);
});

test('a known rejection retains the requested scope for deliberate correction', async ({ page }) => {
  const f = await fixture(page, 'en');
  f.mock.addHandler('POST datasets/42/disable_backups', () =>
    failEnvelope('Snapshot 17 is not preserved on backup target 8')
  );
  await page.goto('/admin/datasets/42/plans?recursive=true');
  await page.getByTestId('dataset.backup_cleanup.recursive').check();
  await page.getByTestId('dataset.backup_cleanup.acknowledgement').check();
  await page.getByTestId('dataset.backup_cleanup.submit').click();
  await expect(page.getByTestId('dataset.backup_cleanup.error')).toContainText(
    'Snapshot 17 is not preserved on backup target 8'
  );
  await expect(page.getByTestId('dataset.backup_cleanup.backup_first')).toBeChecked();
  await expect(page.getByTestId('dataset.backup_cleanup.submit')).toBeEnabled();
});
