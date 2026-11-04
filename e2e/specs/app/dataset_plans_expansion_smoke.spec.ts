import { expect, test } from '@playwright/test';

import { bootstrapVpsAdminWindow, installHaveApiMock, setUiSettingsLocalStorage } from '../../fixtures';

test('@content-storage-plan-keep plan instructions, review and unavailable states stay visible', async ({ page }, testInfo) => {
  const language = testInfo.project.name === 'mobile-chrome' ? 'cs' : 'en';
  await bootstrapVpsAdminWindow(page, { sessionToken: 'TEST' });
  await setUiSettingsLocalStorage(page, { language, theme: 'dark' });
  let state: 'normal' | 'available-error' | 'missing-environment' | 'busy' = 'normal';
  const daily = { id: 12, label: 'Daily backup', user_add: true, user_remove: true,
    dataset_plan: { id: 3, label: 'daily_backup', description: 'Copies this dataset every day.' } };
  const weekly = { id: 13, label: 'Weekly backup', user_add: true, user_remove: false,
    dataset_plan: { id: 4, label: 'weekly_backup', description: 'Copies this dataset every week.' } };
  await installHaveApiMock(page, { user: { id: 10, login: 'alice', level: 1 }, handlers: {
    'GET datasets/42': () => ({ dataset: { id: 42, name: 'alice', full_name: 'tank/users/alice',
      user: { id: 10, login: 'alice' }, object_state: 'active',
      environment: state === 'missing-environment' ? null : { id: 7, label: 'Production' } } }),
    'GET transaction_chains': ({ searchParams }) => ({ transaction_chains:
      state === 'busy' && searchParams.get('transaction_chain[class_name]') === 'Dataset'
        && searchParams.get('transaction_chain[row_id]') === '42' ? [{ id: 900, state: 'running' }] : [] }),
    'GET datasets/42/plans': () => ({ plans: [{ id: 2, environment_dataset_plan: daily }] }),
    'GET environments/7/dataset_plans': () => state === 'available-error'
      ? { status: 503, contentType: 'application/json', body: JSON.stringify({ status: false, message: 'Available dataset plans unavailable' }) }
      : { dataset_plans: [daily, weekly] },
  } });
  const remove = page.locator('[data-testid="dataset.plans.row.2.remove"]:visible, [data-testid="dataset.plans.card.2.remove"]:visible');
  const availableCount = page.getByTestId('dataset.plans.summary')
    .getByText(language === 'cs' ? 'Dostupné k přiřazení' : 'Available to assign', { exact: true })
    .locator('..').locator('div').last();
  await page.goto('/app/datasets/42/plans');
  await expect(page.getByTestId('dataset.plans.summary')).toContainText('Production');
  await expect(availableCount).toHaveText('1');
  await expect(remove).toBeEnabled();
  await page.screenshot({ path: testInfo.outputPath(`plans-normal-${language}.png`), fullPage: true, scale: 'css' });
  await page.getByTestId('dataset.plans.assign.open').click();
  await page.getByTestId('dataset.plans.assign.select').selectOption('13');
  await expect(page.getByTestId('dataset.plans.assign.preview')).toContainText('Copies this dataset every week.');
  await expect(page.getByTestId('dataset.plans.assign.preview.source')).toContainText('weekly_backup');
  await page.screenshot({ path: testInfo.outputPath(`plans-preview-${language}.png`), fullPage: true, scale: 'css' });
  await page.getByTestId('dataset.plans.assign.modal').getByRole('button', { name: language === 'cs' ? 'Zrušit' : 'Cancel', exact: true }).click();
  await remove.click();
  await expect(page.getByTestId('dataset.plans.remove.confirm')).toContainText('Daily backup');
  await page.screenshot({ path: testInfo.outputPath(`plans-remove-review-${language}.png`), fullPage: true, scale: 'css' });
  await page.getByTestId('dataset.plans.remove.confirm.cancel').click();
  for (const next of ['available-error', 'missing-environment', 'busy'] as const) {
    state = next;
    await page.reload();
    await expect(page.getByTestId(next === 'available-error' ? 'dataset.plans.available_load_error'
      : next === 'missing-environment' ? 'dataset.plans.environment_missing' : 'dataset.plans.busy')).toBeVisible();
    await expect(availableCount).toHaveText(next === 'busy' ? '1' : '—');
    if (next === 'busy') await expect(remove).toBeDisabled();
    await page.screenshot({ path: testInfo.outputPath(`plans-${next}-${language}.png`), fullPage: true, scale: 'css' });
  }
});

test('@content-storage-plan-empty successful reads show zero available plans', async ({ page }, testInfo) => {
  await bootstrapVpsAdminWindow(page, { sessionToken: 'TEST' });
  await setUiSettingsLocalStorage(page, { language: 'en', theme: 'dark' });
  await installHaveApiMock(page, { user: { id: 10, login: 'alice', level: 1 }, handlers: {
    'GET datasets/42': () => ({ dataset: { id: 42, name: 'alice', full_name: 'tank/users/alice',
      user: { id: 10, login: 'alice' }, object_state: 'active',
      environment: { id: 7, label: 'Production' } } }),
    'GET transaction_chains': () => ({ transaction_chains: [] }),
    'GET datasets/42/plans': () => ({ plans: [] }),
    'GET environments/7/dataset_plans': () => ({ dataset_plans: [] }),
  } });
  await page.goto('/app/datasets/42/plans');
  const summary = page.getByTestId('dataset.plans.summary');
  await expect(summary).toContainText('Production');
  await expect(summary.getByText('Available to assign', { exact: true }).locator('..'))
    .toHaveText(/Available to assign\s*0/);
  await expect(page.getByTestId('dataset.plans.empty')).toContainText('No dataset plans assigned');
  await expect(page.getByTestId('dataset.plans.empty')).toContainText(
    'No assignable environment dataset plans are available for this dataset.'
  );
  await expect(page.getByTestId('dataset.plans.assign.open')).toHaveCount(0);
  await expect(page.getByTestId('dataset.plans.empty.assign')).toHaveCount(0);
  await page.screenshot({ path: testInfo.outputPath('plans-success-empty-en.png'), fullPage: true, scale: 'css' });
});

test('@content-storage-expansion-dialogs register and add-space keep their safeguards', async ({ page }, testInfo) => {
  const language = testInfo.project.name === 'mobile-chrome' ? 'cs' : 'en';
  await bootstrapVpsAdminWindow(page, { sessionToken: 'TEST' });
  await setUiSettingsLocalStorage(page, { language, theme: 'dark' });
  let expanded = false;
  await installHaveApiMock(page, { user: { id: 1, login: 'admin', level: 100 }, handlers: {
    'GET datasets/42': () => ({ dataset: { id: 42, name: 'alice', full_name: 'tank/users/alice',
      object_state: 'active', refquota: 20480, vps: { id: 300, hostname: 'mail.example.test' },
      ...(expanded ? { dataset_expansion: { id: 9 } } : {}) } }),
    'GET transaction_chains': () => ({ transaction_chains: [] }),
    'GET dataset_expansions/9': () => ({ dataset_expansion: { id: 9, state: 'active',
      original_refquota: 10240, added_space: 10240, enable_notifications: true, enable_shrink: true, stop_vps: true } }),
    'GET dataset_expansions/9/history': () => ({ histories: [] }),
  } });
  const writes: string[] = [];
  page.on('request', (request) => { if (['POST', 'PUT', 'DELETE'].includes(request.method()) && request.url().includes('/dataset_expansions')) writes.push(request.url()); });
  await page.goto('/admin/datasets/42/expansion');
  await page.getByTestId('dataset.expansion.register.open').click();
  const registration = page.getByTestId('dataset.expansion.create.modal');
  await expect(page.getByTestId('dataset.expansion.form.original_refquota')).toBeVisible();
  await expect(page.getByTestId('dataset.expansion.register.submit')).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath(`expansion-register-${language}.png`), fullPage: true, scale: 'css' });
  await registration.getByRole('button', { name: language === 'cs' ? 'Zrušit' : 'Cancel', exact: true }).click();
  expanded = true;
  await page.reload();
  await page.getByTestId('dataset.expansion.add_space.open').click();
  await expect(page.getByTestId('dataset.expansion.add_space.input')).toHaveValue('10');
  await expect(page.getByTestId('dataset.expansion.add_space.submit')).toBeEnabled();
  await page.screenshot({ path: testInfo.outputPath(`expansion-add-space-${language}.png`), fullPage: true, scale: 'css' });
  expect(writes).toEqual([]);
});

for (const language of ['en', 'cs'] as const) {
  test(`@pr-smoke @pr-smoke-mobile expansion missing or unknown state is not resolved (${language})`, async ({ page }, testInfo) => {
    await bootstrapVpsAdminWindow(page, { sessionToken: 'TEST' });
    await setUiSettingsLocalStorage(page, { language, theme: 'dark' });
    let state: string | null | undefined;
    await installHaveApiMock(page, { user: { id: 1, login: 'admin', level: 100 }, handlers: {
      'GET datasets/42': () => ({ dataset: {
        id: 42, full_name: 'tank/users/alice', name: 'alice',
        environment: { id: 7, label: 'Production' }, dataset_expansion: { id: 9 },
        object_state: 'active', refquota: 20480,
      } }),
      'GET transaction_chains': () => ({ transaction_chains: [] }),
      'GET dataset_expansions/9': () => ({ dataset_expansion: {
        id: 9, ...(state === undefined ? {} : { state }), added_space: 10240,
        original_refquota: 10240, created_at: '2026-02-27T10:00:00Z',
      } }),
      'GET dataset_expansions/9/history': () => ({ histories: [] }),
    } });

    for (const scenario of ['missing', 'null', 'unrecognized', 'resolved', 'active'] as const) {
      state = scenario === 'missing' ? undefined : scenario === 'null' ? null
        : scenario === 'unrecognized' ? 'unrecognized' : scenario;
      if (scenario === 'missing') await page.goto('/admin/datasets/42/expansion');
      else await page.reload();
      const summary = page.getByTestId('dataset.expansion.summary');
      await expect(summary).toBeVisible();
      await page.screenshot({ path: testInfo.outputPath(`expansion-${scenario}-${language}.png`), fullPage: true, scale: 'css' });
      if (scenario === 'resolved') {
        await expect(page.getByTestId('dataset.expansion.resolved')).toBeVisible();
      } else {
        await expect.soft(page.getByTestId('dataset.expansion.resolved')).toHaveCount(0, { timeout: 1_000 });
        if (scenario !== 'active') {
          await expect.soft(summary).toContainText(language === 'cs' ? 'Neznámý stav' : 'Unknown', { timeout: 1_000 });
          await expect(page.getByTestId('dataset.expansion.edit.open')).toBeVisible();
          await expect(page.getByTestId('dataset.expansion.add_space.open')).toBeDisabled();
        }
      }
    }
  });
}

test('@content-storage-space-values dataset space preserves unknown and known values', async ({ page }, testInfo) => {
  const language = testInfo.project.name === 'mobile-chrome' ? 'cs' : 'en';
  await bootstrapVpsAdminWindow(page, { sessionToken: 'TEST' });
  await setUiSettingsLocalStorage(page, { language, theme: 'dark' });
  let values: Record<string, unknown> = {};
  await installHaveApiMock(page, { user: { id: 10, login: 'alice', level: 1 }, handlers: {
    'GET datasets/42': () => ({ dataset: {
      id: 42, name: 'home', full_name: 'tank/users/alice/home', role: 'primary',
      user: { id: 10, login: 'alice' }, object_state: 'active', dataset_expansion: { id: 9 },
      ...values,
    } }),
    'GET transaction_chains': () => ({ transaction_chains: [] }),
  } });
  const scenarios = [
    { name: 'missing', values: { refquota: 20480 }, used: /—/, available: /—/, refquota: /20\s*GiB/, percent: null, noData: true },
    { name: 'null', values: { used: null, avail: null, refquota: 20480 }, used: /—/, available: /—/, refquota: /20\s*GiB/, percent: null, noData: true },
    { name: 'missing-used', values: { avail: 5120, refquota: 20480 }, used: /—/, available: /5\.0\s*GiB/, refquota: /20\s*GiB/, percent: null, noData: true },
    { name: 'missing-available', values: { used: 10240, refquota: 20480 }, used: /10\s*GiB/, available: /—/, refquota: /20\s*GiB/, percent: '50%', noData: true },
    { name: 'zero', values: { used: 0, avail: 0, refquota: 20480 }, used: /0\s*MiB/, available: /0\s*MiB/, refquota: /20\s*GiB/, percent: '0%', noData: true },
    { name: 'positive', values: { used: 10240, avail: 5120, refquota: 20480 }, used: /10\s*GiB/, available: /5\.0\s*GiB/, refquota: /20\s*GiB/, percent: '50%', noData: false },
    { name: 'unlimited', values: { used: 10240, avail: 5120, refquota: 0 }, used: /10\s*GiB/, available: /5\.0\s*GiB/, refquota: /∞/, percent: '∞', noData: false },
    { name: 'missing-refquota', values: { used: 10240, avail: 5120 }, used: /10\s*GiB/, available: /5\.0\s*GiB/, refquota: /—/, percent: null, noData: false },
    { name: 'null-refquota', values: { used: 10240, avail: 5120, refquota: null }, used: /10\s*GiB/, available: /5\.0\s*GiB/, refquota: /—/, percent: null, noData: false },
  ];
  for (const scenario of scenarios) {
    values = scenario.values;
    if (scenario.name === 'missing') await page.goto('/app/nas/42');
    else await page.reload();
    const space = page.getByTestId('dataset.overview.space');
    const used = space.getByText(language === 'cs' ? 'Použito' : 'Used', { exact: true }).locator('..');
    const available = space.getByText(language === 'cs' ? 'Volné' : 'Available', { exact: true }).locator('..');
    const referenceQuota = space.getByText(language === 'cs' ? 'Referenční kvóta' : 'Reference quota', { exact: true }).locator('..');
    await expect(used).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath(`space-${scenario.name}-${language}.png`), fullPage: true, scale: 'css' });
    await expect.soft(used).toContainText(scenario.used, { timeout: 500 });
    await expect.soft(available).toContainText(scenario.available, { timeout: 500 });
    await expect.soft(referenceQuota).toContainText(scenario.refquota, { timeout: 500 });
    if (scenario.percent === null) {
      await expect.soft(space.getByText(/^\d+%$/)).toHaveCount(0, { timeout: 500 });
      await expect.soft(space).not.toContainText('∞', { timeout: 500 });
    } else if (scenario.percent === '∞') {
      await expect(space).toContainText('∞');
    } else {
      await expect(space.getByText(scenario.percent, { exact: true })).toBeVisible();
    }
    if (scenario.noData) {
      await expect.soft(space.getByTitle(language === 'cs' ? 'Žádná data' : 'No data', { exact: true })).toHaveCount(1, { timeout: 500 });
    } else {
      const segments = space.getByRole('img').locator('[title]');
      await expect(segments).toHaveCount(2);
      expect.soft(await segments.first().evaluate((element) => parseFloat((element as HTMLElement).style.width))).toBeCloseTo(66.6667, 2);
    }
  }
  const expansion = page.getByTestId('dataset.overview.expansion');
  await expect(expansion).toContainText('#9');
  await expect(page.getByTestId('dataset.overview.expansion.open')).toHaveAttribute('href', '/app/nas/42/expansion');
  await expect.soft(expansion).not.toContainText(language === 'cs' ? /aktivní dočasné|aktivní navýšení/i : /active temporary increase|active increase/i, { timeout: 500 });
});

test('@content-storage-expansion-flags read-only expansion flags preserve unknown', async ({ page }, testInfo) => {
  const language = testInfo.project.name === 'mobile-chrome' ? 'cs' : 'en';
  await bootstrapVpsAdminWindow(page, { sessionToken: 'TEST' });
  await setUiSettingsLocalStorage(page, { language, theme: 'dark' });
  let flags: Record<string, boolean | null> = {};
  await installHaveApiMock(page, { user: { id: 1, login: 'admin', level: 100 }, handlers: {
    'GET datasets/42': () => ({ dataset: {
      id: 42, name: 'alice', full_name: 'tank/users/alice', refquota: 20480,
      dataset_expansion: { id: 9 }, object_state: 'active',
    } }),
    'GET transaction_chains': () => ({ transaction_chains: [] }),
    'GET dataset_expansions/9': () => ({ dataset_expansion: {
      id: 9, state: 'active', original_refquota: 10240, added_space: 10240, ...flags,
    } }),
    'GET dataset_expansions/9/history': () => ({ histories: [] }),
  } });
  for (const scenario of ['missing', 'null', 'enabled', 'disabled'] as const) {
    const value = scenario === 'null' ? null : scenario === 'enabled';
    flags = scenario === 'missing' ? {} : { enable_notifications: value, enable_shrink: value, stop_vps: value };
    if (scenario === 'missing') await page.goto('/admin/datasets/42/expansion');
    else await page.reload();
    const summary = page.getByTestId('dataset.expansion.summary');
    await expect(summary).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath(`expansion-flags-${scenario}-${language}.png`), fullPage: true, scale: 'css' });
    const expected = scenario === 'enabled' ? (language === 'cs' ? 'Povoleno' : 'Enabled')
      : scenario === 'disabled' ? (language === 'cs' ? 'Zakázáno' : 'Disabled')
      : (language === 'cs' ? 'Neznámý stav' : 'Unknown');
    for (const label of language === 'cs' ? ['Notifikace', 'Automatické zmenšení', 'Zastavit VPS'] : ['Notifications', 'Auto-shrink', 'Stop VPS']) {
      await expect.soft(summary.getByText(label, { exact: true }).locator('..')).toContainText(expected, { timeout: 500 });
    }
    await expect(page.getByTestId('dataset.expansion.add_space.open')).toBeEnabled();
    await expect(page.getByTestId('dataset.expansion.edit.open')).toBeEnabled();
  }
});

test.describe('@smoke dataset plans and expansion', () => {
  test('renders dataset plans tab', async ({ page }, testInfo) => {
    await bootstrapVpsAdminWindow(page, { sessionToken: 'TEST' });
    await installHaveApiMock(page, {
      user: { id: 10, login: 'alice', level: 1 },
      handlers: {
        'GET datasets/42': () => ({
          dataset: {
            id: 42,
            full_name: 'tank/users/alice',
            name: 'alice',
            environment: { id: 7, label: 'Production' },
            object_state: 'active',
          },
        }),
        'GET transaction_chains': () => ({ transaction_chains: [] }),
        'GET datasets/42/plans': () => ({
          plans: [
            {
              id: 2,
              environment_dataset_plan: {
                id: 12,
                label: 'Daily backup',
                dataset_plan: { id: 3, label: 'daily_backup' },
                user_add: true,
                user_remove: true,
              },
            },
          ],
        }),
        'GET environments/7/dataset_plans': () => ({
          dataset_plans: [
            { id: 12, label: 'Daily backup', dataset_plan: { id: 3, label: 'daily_backup' }, user_add: true, user_remove: true },
            { id: 13, label: 'Weekly backup', dataset_plan: { id: 4, label: 'weekly_backup' }, user_add: true, user_remove: false },
          ],
        }),
      },
    });

    await page.goto('/app/datasets/42/plans');
    await expect(page.getByTestId('dataset.plans.summary')).toBeVisible();
    await expect(
      page.getByTestId(testInfo.project.name === 'mobile-chrome' ? 'dataset.plans.card.2' : 'dataset.plans.row.2')
    ).toBeVisible();
  });

  test('renders dataset expansion tab with history', async ({ page }) => {
    await bootstrapVpsAdminWindow(page, { sessionToken: 'TEST' });
    await installHaveApiMock(page, {
      user: { id: 1, login: 'admin', level: 100 },
      handlers: {
        'GET datasets/42': () => ({
          dataset: {
            id: 42,
            full_name: 'tank/users/alice',
            name: 'alice',
            environment: { id: 7, label: 'Production' },
            dataset_expansion: { id: 9 },
            object_state: 'active',
            refquota: 20480,
            vps: { id: 300, hostname: 'mail.example.test' },
          },
        }),
        'GET transaction_chains': () => ({ transaction_chains: [] }),
        'GET dataset_expansions/9': () => ({
          dataset_expansion: {
            id: 9,
            state: 'active',
            added_space: 10240,
            original_refquota: 10240,
            enable_notifications: true,
            enable_shrink: true,
            stop_vps: true,
            over_refquota_seconds: 3600,
            max_over_refquota_seconds: 7200,
            created_at: '2026-02-27T10:00:00Z',
          },
        }),
        'GET dataset_expansions/9/history': () => ({
          histories: [
            {
              id: 1,
              added_space: 10240,
              original_refquota: 10240,
              new_refquota: 20480,
              created_at: '2026-02-27T10:00:00Z',
              admin: { id: 1, login: 'admin' },
            },
          ],
        }),
      },
    });

    await page.goto('/admin/datasets/42/expansion');
    await expect(page.getByTestId('dataset.expansion.summary')).toBeVisible();
    await expect(page.getByTestId('dataset.expansion.history.row.1')).toBeVisible();
  });

  test('keeps a failed expansion edit in context and allows retry', async ({ page }) => {
    await bootstrapVpsAdminWindow(page, { sessionToken: 'TEST' });
    let updateAttempts = 0;

    await installHaveApiMock(page, {
      user: { id: 1, login: 'admin', level: 100 },
      handlers: {
        'GET datasets/42': () => ({
          dataset: {
            id: 42,
            full_name: 'tank/users/alice',
            name: 'alice',
            environment: { id: 7, label: 'Production' },
            dataset_expansion: { id: 9 },
            object_state: 'active',
            refquota: 20480,
            vps: { id: 300, hostname: 'mail.example.test' },
          },
        }),
        'GET transaction_chains': () => ({ transaction_chains: [] }),
        'GET dataset_expansions/9': () => ({
          dataset_expansion: {
            id: 9,
            state: 'active',
            added_space: 10240,
            original_refquota: 10240,
            enable_notifications: true,
            enable_shrink: true,
            stop_vps: true,
            over_refquota_seconds: 3600,
            max_over_refquota_seconds: 7200,
            created_at: '2026-02-27T10:00:00Z',
          },
        }),
        'GET dataset_expansions/9/history': () => ({ histories: [] }),
        'PUT dataset_expansions/9': () => {
          updateAttempts += 1;
          if (updateAttempts === 1) {
            return {
              status: 500,
              contentType: 'application/json',
              body: JSON.stringify({ status: false, message: 'Expansion update rejected' }),
            };
          }
          return { dataset_expansion: { id: 9 } };
        },
      },
    });

    await page.goto('/admin/datasets/42/expansion');
    await page.getByTestId('dataset.expansion.edit.open').click();
    await page.getByTestId('dataset.expansion.edit.max_over').fill('14');
    await page.getByTestId('dataset.expansion.edit.submit').click();

    await expect(page.getByTestId('dataset.expansion.edit.error')).toContainText('Expansion update rejected');
    await expect(page.getByTestId('dataset.expansion.edit.max_over')).toHaveValue('14');

    await page.getByTestId('dataset.expansion.edit.submit').click();
    await expect(page.getByTestId('dataset.expansion.edit.modal')).toHaveCount(0);
    expect(updateAttempts).toBe(2);
  });

  test('hides admin-only temporary expansion entry points from a user without an active expansion', async ({ page }) => {
    await bootstrapVpsAdminWindow(page, { sessionToken: 'TEST' });
    await installHaveApiMock(page, {
      user: { id: 10, login: 'alice', level: 1 },
      handlers: {
        'GET datasets/42': () => ({
          dataset: {
            id: 42,
            full_name: 'tank/users/alice/10802',
            name: '10802',
            environment: { id: 7, label: 'Production' },
            object_state: 'active',
            used: 33 * 1024,
            avail: 210 * 1024,
            refquota: 240 * 1024,
            vps: { id: 300, hostname: 'mail.example.test' },
          },
        }),
        'GET transaction_chains': () => ({ transaction_chains: [] }),
      },
    });

    await page.goto('/app/datasets/42');
    await expect(page.getByTestId('dataset.overview.space')).toBeVisible();
    await expect(page.getByTestId('dataset.overview.details')).toHaveCount(0);
    await expect(page.getByTestId('dataset.overview.expansion')).toHaveCount(0);
    await expect(page.locator('a[href="/app/datasets/42/expansion"]')).toHaveCount(0);
  });

  test('creates a temporary expansion from the admin page', async ({ page }) => {
    await bootstrapVpsAdminWindow(page, { sessionToken: 'TEST' });
    let payload: Record<string, unknown> | undefined;

    await installHaveApiMock(page, {
      user: { id: 1, login: 'admin', level: 100 },
      handlers: {
        'GET datasets/42': () => ({
          dataset: {
            id: 42,
            full_name: 'tank/users/alice',
            name: 'alice',
            environment: { id: 7, label: 'Production' },
            object_state: 'active',
            refquota: 20480,
            vps: { id: 300, hostname: 'mail.example.test' },
          },
        }),
        'GET transaction_chains': () => ({ transaction_chains: [] }),
        'POST dataset_expansions': (ctx) => {
          payload = ctx.params;
          return { dataset_expansion: { id: 9 } };
        },
      },
    });

    await page.goto('/admin/datasets/42/expansion');
    await expect(page.getByTestId('dataset.expansion.create.form')).toBeVisible();
    await expect(page.getByTestId('dataset.expansion.form.added_space')).toHaveValue('20');
    await expect(page.getByTestId('dataset.expansion.form.max_over')).toHaveValue('30');

    await page.getByTestId('dataset.expansion.create.submit').click();
    await expect.poll(() => (payload?.dataset_expansion as Record<string, unknown> | undefined)).toEqual({
      dataset: 42,
      added_space: 20480,
      enable_notifications: true,
      enable_shrink: true,
      stop_vps: true,
      max_over_refquota_seconds: 2592000,
    });
  });

  test('redirects a user without an active expansion away from the admin-only form', async ({ page }) => {
    await bootstrapVpsAdminWindow(page, { sessionToken: 'TEST' });
    let createRequests = 0;

    await installHaveApiMock(page, {
      user: { id: 10, login: 'alice', level: 1 },
      handlers: {
        'GET datasets/42': () => ({
          dataset: {
            id: 42,
            full_name: 'tank/users/alice/10802',
            name: '10802',
            environment: { id: 7, label: 'Production' },
            object_state: 'active',
            refquota: 20480,
          },
        }),
        'GET transaction_chains': () => ({ transaction_chains: [] }),
        'POST dataset_expansions': () => {
          createRequests += 1;
          return { dataset_expansion: { id: 9 } };
        },
      },
    });

    await page.goto('/app/datasets/42/expansion');
    await expect(page).toHaveURL('/app/datasets/42');
    await expect(page.getByTestId('dataset.expansion.create.form')).toHaveCount(0);
    expect(createRequests).toBe(0);
  });

  test('keeps an admin account in user mode read-only for an active expansion', async ({ page }) => {
    await bootstrapVpsAdminWindow(page, { sessionToken: 'TEST' });
    const historyIncludes: Array<string | null> = [];

    await installHaveApiMock(page, {
      user: { id: 1, login: 'admin', level: 100 },
      handlers: {
        'GET datasets/42': () => ({
          dataset: {
            id: 42,
            full_name: 'tank/users/alice/10802',
            name: '10802',
            environment: { id: 7, label: 'Production' },
            dataset_expansion: { id: 9 },
            object_state: 'active',
            refquota: 20480,
          },
        }),
        'GET transaction_chains': () => ({ transaction_chains: [] }),
        'GET dataset_expansions/9': () => ({
          dataset_expansion: {
            id: 9,
            state: 'active',
            added_space: 10240,
            original_refquota: 10240,
            enable_notifications: true,
            enable_shrink: true,
            stop_vps: true,
            over_refquota_seconds: 3600,
            max_over_refquota_seconds: 7200,
            created_at: '2026-02-27T10:00:00Z',
          },
        }),
        'GET dataset_expansions/9/history': ({ searchParams }) => {
          historyIncludes.push(searchParams.get('_meta[includes]'));
          return {
            histories: [{
              id: 1,
              added_space: 10240,
              original_refquota: 10240,
              new_refquota: 20480,
              created_at: '2026-02-27T10:00:00Z',
              admin: { id: 1, login: 'must-not-render' },
            }],
          };
        },
      },
    });

    await page.goto('/app/datasets/42/expansion');
    await expect(page.getByTestId('dataset.expansion.summary')).toBeVisible();
    await expect(page.getByTestId('dataset.expansion.history.row.1')).toBeVisible();
    await expect(page.getByTestId('dataset.expansion.add_space.open')).toHaveCount(0);
    await expect(page.getByTestId('dataset.expansion.edit.open')).toHaveCount(0);
    await expect(page.getByText('must-not-render')).toHaveCount(0);
    await expect.poll(() => historyIncludes).toEqual([null]);
  });

  test('keeps support in admin mode away from admin-only expansion creation', async ({ page }) => {
    await bootstrapVpsAdminWindow(page, { sessionToken: 'TEST' });
    let createRequests = 0;

    await installHaveApiMock(page, {
      user: { id: 5, login: 'support', level: 50 },
      handlers: {
        'GET datasets/42': () => ({
          dataset: {
            id: 42,
            full_name: 'tank/users/alice/10802',
            name: '10802',
            environment: { id: 7, label: 'Production' },
            object_state: 'active',
            refquota: 20480,
            vps: { id: 300, hostname: 'mail.example.test' },
          },
        }),
        'GET transaction_chains': () => ({ transaction_chains: [] }),
        'POST dataset_expansions': () => {
          createRequests += 1;
          return { dataset_expansion: { id: 9 } };
        },
      },
    });

    await page.goto('/admin/datasets/42/expansion');
    await expect(page).toHaveURL('/admin/datasets/42');
    await expect(page.getByTestId('dataset.expansion.create.form')).toHaveCount(0);
    await expect(page.locator('a[href="/admin/datasets/42/expansion"]')).toHaveCount(0);
    expect(createRequests).toBe(0);
  });

  test('keeps an active NAS expansion inside the NAS detail route', async ({ page }) => {
    await bootstrapVpsAdminWindow(page, { sessionToken: 'TEST' });
    await installHaveApiMock(page, {
      user: { id: 10, login: 'alice', level: 1 },
      handlers: {
        'GET datasets/42': () => ({
          dataset: {
            id: 42,
            full_name: 'tank/users/alice/home',
            name: 'home',
            role: 'primary',
            dataset_expansion: { id: 9 },
            object_state: 'active',
            refquota: 20480,
          },
        }),
        'GET transaction_chains': () => ({ transaction_chains: [] }),
      },
    });

    await page.goto('/app/nas/42');
    await expect(page.getByTestId('dataset.overview.expansion.open')).toHaveAttribute(
      'href',
      '/app/nas/42/expansion',
    );
  });
});
