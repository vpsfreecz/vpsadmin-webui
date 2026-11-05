import { expect, test } from '../../fixtures/bootstrap';
import { failEnvelope, setupHaveApiMock, type HaveApiMock } from '../../fixtures/haveapi';
import { setUiSettingsLocalStorage } from '../../fixtures/uiSettings';
import { withAppUrl } from '../../fixtures/url';

const compactWidths = {
  chromium: [1024, 1152],
  'mobile-chrome': [768, 390, 320],
} as const;

let apiMock: HaveApiMock;

test.beforeEach(async ({ page }) => {
  apiMock = await setupHaveApiMock(page, {
    user: { id: 1, login: 'e2e', level: 100 },
    handlers: {
      'GET vpses/123': () => ({
        vps: {
          id: 123,
          hostname: 'oom-mobile.example.test',
          user: { id: 7, login: 'mobile-admin' },
          node: { id: 4, domain_name: 'node4.example.test' },
        },
      }),
      'GET oom_report_rules': () => ({
        oom_report_rules: [
          {
            id: 77,
            action: 'notify',
            cgroup_pattern: '^/lxc/123/user.slice/a-very-long-cgroup-segment-without-a-natural-breakpoint$',
            hit_count: 42,
          },
        ],
      }),
    },
  });
});

test('@pr-smoke @pr-smoke-mobile keeps OOM rule actions reachable in narrow content', async ({ page }, testInfo) => {
  const mutations: string[] = [];
  page.on('request', (request) => {
    const url = new URL(request.url());
    if (request.method() !== 'GET' && url.pathname.startsWith('/api/v7.0/oom_report_rules')) {
      mutations.push(`${request.method()} ${url.pathname}`);
    }
  });

  await page.goto(withAppUrl('/admin/oom-reports/rules/123'));
  await expect(page.getByTestId('oom.rules.table')).toBeVisible();

  const widths = compactWidths[testInfo.project.name as keyof typeof compactWidths] ?? [];
  for (const width of widths) {
    await page.setViewportSize({ width, height: 900 });

    const metrics = await page.getByTestId('oom.rules.table').evaluate((table) => {
      const scroller = table.parentElement;
      const edit = document.querySelector<HTMLElement>('[data-testid="oom.rules.row.77.edit"]');
      const remove = document.querySelector<HTMLElement>('[data-testid="oom.rules.row.77.delete"]');
      const card = document.querySelector<HTMLElement>('[data-testid="oom.rules.list"]');
      const editRect = edit?.getBoundingClientRect();
      const removeRect = remove?.getBoundingClientRect();
      const cardRect = card?.getBoundingClientRect();

      return {
        tableDisplay: getComputedStyle(table).display,
        documentOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        innerOverflow: scroller ? scroller.scrollWidth - scroller.clientWidth : -1,
        scrollLeft: scroller?.scrollLeft ?? -1,
        editHeight: editRect?.height ?? 0,
        removeHeight: removeRect?.height ?? 0,
        controlsInsideCard: Boolean(
          editRect && removeRect && cardRect && editRect.left >= cardRect.left && removeRect.right <= cardRect.right
        ),
        cardInsideViewport: Boolean(
          cardRect && cardRect.left >= 0 && cardRect.right <= document.documentElement.clientWidth
        ),
      };
    });

    expect(metrics.tableDisplay, `${width}px should use the compact rule layout`).toBe('block');
    // At the exact md breakpoint the app-shell account button has a pre-existing 4px overflow;
    // keep this regression assertion scoped to the OOM card there.
    if (width !== 768) {
      expect(metrics.documentOverflow, `${width}px document overflow`).toBeLessThanOrEqual(1);
    }
    expect(metrics.innerOverflow, `${width}px rule list overflow`).toBeLessThanOrEqual(1);
    expect(metrics.scrollLeft, `${width}px hidden horizontal offset`).toBe(0);
    expect(metrics.cardInsideViewport, `${width}px rule card should stay in the viewport`).toBe(true);
    expect(metrics.controlsInsideCard, `${width}px actions should stay inside the card`).toBe(true);
    expect(metrics.editHeight, `${width}px edit target`).toBeGreaterThanOrEqual(44);
    expect(metrics.removeHeight, `${width}px delete target`).toBeGreaterThanOrEqual(44);

    const row = page.getByTestId('oom.rules.row.77');
    await expect(row.getByText('ID', { exact: true })).toBeVisible();
    await expect(row.getByText('cgroup regex', { exact: true })).toBeVisible();
    await expect(row.getByText('Hits', { exact: true })).toBeVisible();
  }

  if (testInfo.project.name === 'chromium') {
    await page.setViewportSize({ width: 1280, height: 900 });
    const metrics = await page.getByTestId('oom.rules.table').evaluate((table) => {
      const edit = document.querySelector<HTMLElement>('[data-testid="oom.rules.row.77.edit"]');
      const remove = document.querySelector<HTMLElement>('[data-testid="oom.rules.row.77.delete"]');
      const actionCell = remove?.closest('td');
      return {
        tableDisplay: getComputedStyle(table).display,
        editHeight: edit?.getBoundingClientRect().height ?? 0,
        removeHeight: remove?.getBoundingClientRect().height ?? 0,
        actionAlignment: actionCell ? getComputedStyle(actionCell).textAlign : '',
      };
    });

    expect(metrics.tableDisplay).toBe('table');
    expect(metrics.editHeight).toBeGreaterThanOrEqual(32);
    expect(metrics.editHeight).toBeLessThan(44);
    expect(metrics.removeHeight).toBeGreaterThanOrEqual(32);
    expect(metrics.removeHeight).toBeLessThan(44);
    expect(metrics.actionAlignment).toBe('right');
  }

  await page.getByTestId('oom.rules.row.77.edit').click();
  await expect(page.getByTestId('oom.rules.row.77.save')).toBeVisible();
  await expect(page.getByTestId('oom.rules.row.77.cancel')).toBeVisible();
  const editMetrics = await page.getByTestId('oom.rules.table.scroller').evaluate((scroller) => {
    const save = document.querySelector<HTMLElement>('[data-testid="oom.rules.row.77.save"]');
    const cancel = document.querySelector<HTMLElement>('[data-testid="oom.rules.row.77.cancel"]');
    const card = document.querySelector<HTMLElement>('[data-testid="oom.rules.list"]');
    const saveRect = save?.getBoundingClientRect();
    const cancelRect = cancel?.getBoundingClientRect();
    const cardRect = card?.getBoundingClientRect();
    return {
      innerOverflow: scroller.scrollWidth - scroller.clientWidth,
      saveHeight: saveRect?.height ?? 0,
      cancelHeight: cancelRect?.height ?? 0,
      controlsInsideCard: Boolean(
        saveRect && cancelRect && cardRect && saveRect.left >= cardRect.left && cancelRect.right <= cardRect.right
      ),
    };
  });
  expect(editMetrics.innerOverflow).toBeLessThanOrEqual(1);
  expect(editMetrics.controlsInsideCard).toBe(true);
  if (testInfo.project.name === 'mobile-chrome') {
    expect(editMetrics.saveHeight).toBeGreaterThanOrEqual(44);
    expect(editMetrics.cancelHeight).toBeGreaterThanOrEqual(44);
  }
  await page.getByTestId('oom.rules.row.77.cancel').click();

  await page.getByTestId('oom.rules.row.77.delete').click();
  const modal = page.getByTestId('oom.rules.delete.modal');
  await expect(modal).toBeVisible();
  await modal.getByRole('button', { name: /Cancel|Zrušit/ }).click();
  await expect(modal).toBeHidden();

  expect(mutations).toEqual([]);
  await expect(page.getByRole('table')).toHaveCount(1);
});

test('OOM rule rejections retain local draft, target and retry', async ({ page }, testInfo) => {
  const language = testInfo.project.name === 'mobile-chrome' ? 'cs' : 'en';
  await setUiSettingsLocalStorage(page, { language, theme: language === 'cs' ? 'dark' : 'light' });
  const toastCloses = page.getByTestId(/^toast\.item\..+\.close$/);
  const originalPattern = '^/review/original$';
  const otherPattern = '^/review/other$';
  const createPattern = '^/review/new$';
  const editPattern = '^/review/changed$';
  let rules = [
    { id: 77, action: 'notify', cgroup_pattern: originalPattern, hit_count: 42 },
    { id: 78, action: 'notify', cgroup_pattern: otherPattern, hit_count: 0 },
  ];
  const attempts: Array<{ method: string; path: string | null; body: unknown }> = [];
  const reads: Array<string | null> = [];
  let createAttempts = 0;
  let updateAttempts = 0;
  let deleteAttempts = 0;
  apiMock.addHandlers({
    'GET oom_report_rules': ({ searchParams }) => {
      reads.push(searchParams.get('oom_report_rule[vps]'));
      return { oom_report_rules: rules };
    },
    'POST oom_report_rules': ({ method, relPath, reqJson }) => {
      attempts.push({ method, path: relPath, body: reqJson });
      createAttempts += 1;
      if (createAttempts === 1) return failEnvelope('Synthetic create rejection');
      const rule = { id: 79, action: 'ignore', cgroup_pattern: createPattern, hit_count: 0 };
      rules = [...rules, rule];
      return { oom_report_rule: rule };
    },
    'PUT oom_report_rules/77': ({ method, relPath, reqJson }) => {
      attempts.push({ method, path: relPath, body: reqJson });
      updateAttempts += 1;
      if (updateAttempts === 1) return failEnvelope('Synthetic update rejection');
      const rule = { id: 77, action: 'ignore', cgroup_pattern: editPattern, hit_count: 42 };
      rules = rules.map((item) => (item.id === 77 ? rule : item));
      return { oom_report_rule: rule };
    },
    'DELETE oom_report_rules/77': ({ method, relPath, reqJson }) => {
      attempts.push({ method, path: relPath, body: reqJson });
      deleteAttempts += 1;
      if (deleteAttempts === 1) return failEnvelope('Synthetic delete rejection');
      rules = rules.filter((item) => item.id !== 77);
      return { oom_report_rule: {} };
    },
  });
  const mutations: string[] = [];
  page.on('request', (request) => {
    const url = new URL(request.url());
    if (request.method() !== 'GET' && url.pathname.startsWith('/api/v7.0/oom_report_rules')) {
      mutations.push(`${request.method()} ${url.pathname}`);
    }
  });
  await page.goto(withAppUrl('/admin/oom-reports/rules/123'));
  const create = page.getByTestId('oom.rules.create');
  const row = page.getByTestId('oom.rules.row.77');
  const otherRow = page.getByTestId('oom.rules.row.78');
  await expect(row).toBeVisible();
  await create.locator('input').fill(createPattern);
  await create.locator('select').selectOption('ignore');
  await page.getByTestId('oom.rules.create.submit').click();
  await expect.poll(() => createAttempts).toBe(1);
  await expect(page.getByTestId('oom.rules.create.submit')).toBeEnabled();
  await expect(create.locator('input')).toHaveValue(createPattern);
  await expect(create.locator('select')).toHaveValue('ignore');
  await page.screenshot({ path: testInfo.outputPath('oom-rule-create-rejected.png'), fullPage: true, scale: 'css' });
  const createError = create.getByRole('alert').filter({ hasText: 'Synthetic create rejection' });
  await expect.soft(createError).toBeVisible({ timeout: 1_000 });
  await expect.soft(createError).toHaveAttribute('role', 'alert', { timeout: 1_000 });
  await expect.soft(createError).toContainText('Synthetic create rejection', { timeout: 1_000 });
  while (await toastCloses.count()) await toastCloses.first().click();
  await page.getByTestId('oom.rules.create.submit').click();
  await expect(page.getByTestId('oom.rules.row.79')).toContainText(createPattern);
  await expect(create.locator('input')).toHaveValue('');

  await row.getByTestId('oom.rules.row.77.edit').click();
  await row.locator('input').fill(editPattern);
  await row.locator('select').selectOption('ignore');
  await row.getByTestId('oom.rules.row.77.save').click();
  await expect.poll(() => updateAttempts).toBe(1);
  await expect(row.getByTestId('oom.rules.row.77.save')).toBeEnabled();
  await expect(row.locator('input')).toHaveValue(editPattern);
  await expect(row.locator('select')).toHaveValue('ignore');
  await page.screenshot({ path: testInfo.outputPath('oom-rule-update-rejected.png'), fullPage: true, scale: 'css' });
  const updateError = row.getByRole('alert').filter({ hasText: 'Synthetic update rejection' });
  await expect.soft(updateError).toBeVisible({ timeout: 1_000 });
  await expect.soft(updateError).toHaveAttribute('role', 'alert', { timeout: 1_000 });
  await expect.soft(updateError).toContainText('Synthetic update rejection', { timeout: 1_000 });
  while (await toastCloses.count()) await toastCloses.first().click();
  await row.getByTestId('oom.rules.row.77.cancel').click();
  await otherRow.getByTestId('oom.rules.row.78.edit').click();
  await expect(otherRow.locator('input')).toHaveValue(otherPattern);
  await expect(otherRow.getByRole('alert').filter({ hasText: 'Synthetic update rejection' })).toHaveCount(0);
  await otherRow.getByTestId('oom.rules.row.78.cancel').click();
  await row.getByTestId('oom.rules.row.77.edit').click();
  await row.locator('input').fill(editPattern);
  await row.locator('select').selectOption('ignore');
  await row.getByTestId('oom.rules.row.77.save').click();
  await expect(row.locator('input')).toHaveCount(0);
  await expect(row).toContainText(editPattern);

  await row.getByTestId('oom.rules.row.77.delete').click();
  const modal = page.getByTestId('oom.rules.delete.modal');
  const confirm = modal.getByRole('button', { name: /^(Delete|Smazat)$/ });
  const cancel = modal.getByRole('button', { name: /^(Cancel|Zrušit)$/ });
  await confirm.click();
  await expect.poll(() => deleteAttempts).toBe(1);
  await expect(confirm).toBeEnabled();
  await expect(modal).toContainText('#77');
  await expect(modal).toContainText(editPattern);
  await page.screenshot({ path: testInfo.outputPath('oom-rule-delete-rejected.png'), fullPage: true, scale: 'css' });
  const deleteError = modal.getByRole('alert').filter({ hasText: 'Synthetic delete rejection' });
  await expect.soft(deleteError).toBeVisible({ timeout: 1_000 });
  await expect.soft(deleteError).toHaveAttribute('role', 'alert', { timeout: 1_000 });
  await expect.soft(deleteError).toContainText('Synthetic delete rejection', { timeout: 1_000 });
  const modalToastCloses = modal.getByTestId(/^toast\.item\..+\.close$/);
  while (await modalToastCloses.count()) await modalToastCloses.first().click();
  await cancel.click();
  await otherRow.getByTestId('oom.rules.row.78.delete').click();
  await expect(modal).toContainText('#78');
  await expect(modal).toContainText(otherPattern);
  await expect(deleteError).toHaveCount(0);
  await cancel.click();
  await row.getByTestId('oom.rules.row.77.delete').click();
  await confirm.click();
  await expect(modal).toBeHidden();
  await expect(row).toHaveCount(0);
  await expect(otherRow).toBeVisible();
  expect([createAttempts, updateAttempts, deleteAttempts]).toEqual([2, 2, 2]);
  expect(reads.length).toBeGreaterThan(0);
  expect(reads.every((vps) => vps === '123')).toBe(true);
  expect(mutations).toEqual([
    'POST /api/v7.0/oom_report_rules',
    'POST /api/v7.0/oom_report_rules',
    'PUT /api/v7.0/oom_report_rules/77',
    'PUT /api/v7.0/oom_report_rules/77',
    'DELETE /api/v7.0/oom_report_rules/77',
    'DELETE /api/v7.0/oom_report_rules/77',
  ]);
  expect(attempts.slice(0, 4).map((attempt) => attempt.body)).toEqual([
    { oom_report_rule: { vps: 123, action: 'ignore', cgroup_pattern: createPattern } },
    { oom_report_rule: { vps: 123, action: 'ignore', cgroup_pattern: createPattern } },
    { oom_report_rule: { action: 'ignore', cgroup_pattern: editPattern } },
    { oom_report_rule: { action: 'ignore', cgroup_pattern: editPattern } },
  ]);
  await testInfo.attach('oom-rule-attempts.json', {
    body: JSON.stringify({ attempts, reads, mutations }, null, 2),
    contentType: 'application/json',
  });
});
