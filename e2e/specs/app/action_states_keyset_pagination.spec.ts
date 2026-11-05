import { expect, test } from '@playwright/test';

import { bootstrapVpsAdminWindow, installHaveApiMock, setUiSettingsLocalStorage } from '../../fixtures';

test.describe('Action states keyset pagination', () => {
  test('Next/Prev updates URL and data', async ({ page }) => {
    await bootstrapVpsAdminWindow(page, {
      sessionToken: 'TEST_TOKEN',
    });

    const makeAction = (id: number) => ({
      id,
      label: `Action ${id}`,
      state: 'running',
      created_at: new Date('2026-01-26T00:00:00.000Z').toISOString(),
      updated_at: new Date('2026-01-26T00:00:00.000Z').toISOString(),
      can_cancel: true,
      current: 5,
      total: 10,
      unit: 'tx',
      finished: false,
      status: true,
    });

    const page1 = Array.from({ length: 50 }, (_, i) => 300 - i).map(makeAction);
    const page2 = Array.from({ length: 50 }, (_, i) => 250 - i).map(makeAction);

    await installHaveApiMock(page, {
      user: { id: 1, login: 'test', level: 1 },
      handlers: {
        'GET action_states': ({ searchParams }) => {
          const fromId = searchParams.get('action_state[from_id]');
          return { action_states: fromId ? page2 : page1, _meta: { total_count: 100 } };
        },
        // Detail
        'GET action_states/300': () => makeAction(300),
        'GET action_states/250': () => makeAction(250),
      },
    });

    await page.goto('/app/action-states');

    await expect(page.getByTestId('action_states.page')).toBeVisible();
    await expect(page.getByTestId('action_states.row.300')).toBeVisible();

    await page.getByTestId('action_states.pagination.next').click();
    await expect(page).toHaveURL(/from_id=251/);
    await expect(page).toHaveURL(/page=2/);
    await expect(page.getByTestId('action_states.row.250')).toBeVisible();

    await page.getByTestId('action_states.pagination.prev').click();
    await expect(page).toHaveURL(/page=1/);
    await expect(page).not.toHaveURL(/from_id=/);
    await expect(page.getByTestId('action_states.row.300')).toBeVisible();
  });

  test('filters rows by operation visibility taxonomy', async ({ page }) => {
    await bootstrapVpsAdminWindow(page, {
      sessionToken: 'TEST_TOKEN',
    });

    const actions = [
      {
        id: 301,
        label: 'Restart VPS #16',
        state: 'done',
        created_at: new Date('2026-01-26T00:00:00.000Z').toISOString(),
        updated_at: new Date('2026-01-26T00:01:00.000Z').toISOString(),
        can_cancel: false,
        finished: true,
        status: true,
      },
      {
        id: 302,
        label: 'Automatic backup retention cleanup',
        state: 'running',
        created_at: new Date('2026-01-26T00:02:00.000Z').toISOString(),
        updated_at: new Date('2026-01-26T00:03:00.000Z').toISOString(),
        can_cancel: false,
        finished: false,
        status: true,
      },
      {
        id: 303,
        label: 'Evacuate node #4',
        state: 'queued',
        created_at: new Date('2026-01-26T00:04:00.000Z').toISOString(),
        updated_at: new Date('2026-01-26T00:05:00.000Z').toISOString(),
        can_cancel: true,
        finished: false,
        status: true,
      },
    ];

    await installHaveApiMock(page, {
      user: { id: 1, login: 'test', level: 1 },
      handlers: {
        'GET action_states': () => ({ action_states: actions, _meta: { total_count: actions.length } }),
      },
    });

    await page.goto('/app/action-states');

    await expect(page.getByTestId('action_states.row.301')).toBeVisible();
    await expect(page.getByTestId('action_states.row.302')).toBeVisible();
    await expect(page.getByTestId('action_states.row.303')).toBeVisible();

    await page.getByTestId('action_states.visibility.system').click();
    await expect(page).toHaveURL(/visibility=system/);
    await expect(page.getByTestId('action_states.row.302')).toBeVisible();
    await expect(page.getByTestId('action_states.row.301')).toHaveCount(0);
    await expect(page.getByTestId('action_states.row.303')).toHaveCount(0);

    await page.getByTestId('action_states.visibility.admin').click();
    await expect(page).toHaveURL(/visibility=admin/);
    await expect(page.getByTestId('action_states.row.303')).toBeVisible();
    await expect(page.getByTestId('action_states.row.301')).toHaveCount(0);
    await expect(page.getByTestId('action_states.row.302')).toHaveCount(0);

    await page.getByTestId('action_states.visibility.user').click();
    await expect(page).toHaveURL(/visibility=user/);
    await expect(page.getByTestId('action_states.row.301')).toBeVisible();
    await expect(page.getByTestId('action_states.row.302')).toHaveCount(0);
    await expect(page.getByTestId('action_states.row.303')).toHaveCount(0);
  });
});

test('@o2-mixed-history mixed terminal failure active unknown and filter recovery', async ({ page }, testInfo) => {
  const language = testInfo.project.name === 'chromium' ? 'en' : 'cs';
  await bootstrapVpsAdminWindow(page, { sessionToken: 'TEST_TOKEN' });
  await setUiSettingsLocalStorage(page, { language, theme: language === 'cs' ? 'dark' : 'light' });
  const common = { created_at: '2026-01-26T00:00:00Z', updated_at: '2026-01-26T00:01:00Z' };
  const actions = [
    {
      ...common,
      id: 811,
      label: 'Create VPS #16',
      finished: true,
      status: true,
      current: 2,
      total: 2,
      can_cancel: false,
    },
    {
      ...common,
      id: 812,
      label: 'Delete VPS #17',
      finished: true,
      status: false,
      current: 1,
      total: 3,
      can_cancel: false,
    },
    {
      ...common,
      id: 813,
      label: 'Evacuate node #4',
      finished: false,
      status: true,
      current: 0,
      total: 3,
      can_cancel: true,
    },
    {
      ...common,
      id: 814,
      label: 'Unclassified fixture operation',
      finished: true,
      status: null,
      current: null,
      total: null,
    },
  ];
  await installHaveApiMock(page, {
    user: { id: 1, login: 'test', level: 1 },
    handlers: {
      'GET action_states': () => ({ action_states: actions, _meta: { total_count: actions.length } }),
      ...Object.fromEntries(
        actions.map((action) => [`GET action_states/${action.id}`, () => ({ action_state: action })])
      ),
    },
  });
  await page.goto('/app/action-states');
  for (const action of actions) await expect(page.getByTestId(`action_states.row.${action.id}`)).toBeVisible();
  await expect(page.getByTestId('action_states.row.811')).toContainText('2/2');
  await expect(page.getByTestId('action_states.row.811')).toContainText('100%');
  await expect(page.getByTestId('action_states.row.812')).toContainText('1/3');
  await expect(page.getByTestId('action_states.row.813')).toContainText('0/3');
  await expect(
    page
      .getByTestId('action_states.row.813')
      .getByRole('button', { name: language === 'cs' ? 'Zrušit' : 'Cancel', exact: true })
  ).toBeVisible();
  await expect(page.getByTestId('action_states.row.814')).not.toContainText('100%');
  await expect(page.getByTestId('action_states.row.811').locator('.h-2.bg-surface-2')).toHaveCount(0);
  await expect(page.getByTestId('action_states.row.813').locator('.h-2.bg-surface-2')).toHaveCount(1);
  await expect(page.getByTestId('action_states.row.812').locator('.h-2.bg-surface-2')).toHaveCount(1);
  await expect(page.getByTestId('action_states.row.814')).toHaveClass(/bg-ok-row/);
  await expect(
    page.getByTestId('action_states.row.811').getByText(language === 'cs' ? 'Běžné' : 'Normal', { exact: true })
  ).toHaveCount(0);
  await expect(page.getByTestId('action_states.row.812')).toContainText(
    language === 'cs' ? 'Destruktivní' : 'Destructive'
  );
  await page.screenshot({ path: testInfo.outputPath(`action-mixed-${language}.png`), fullPage: true });
  const pin = page
    .getByTestId('action_states.row.811')
    .getByRole('button', { name: language === 'cs' ? 'Připnout' : 'Pin', exact: true });
  await pin.click();
  await expect(
    page
      .getByTestId('action_states.row.811')
      .getByRole('button', { name: language === 'cs' ? 'Odepnout' : 'Unpin', exact: true })
  ).toBeVisible();
  const filter = page.getByTestId('action_states.smart_filter.input');
  await filter.fill('order:invalid');
  await filter.press('Enter');
  const error = page.getByTestId('action_states.chip.error.0');
  await expect(error).toBeVisible();
  const errorText = await error.innerText();
  await expect(page.getByTestId('toast.viewport').getByText(errorText, { exact: true })).toHaveCount(0);
  const localAnnouncement = await page
    .getByTestId('action_states.page')
    .locator('[role="alert"], [aria-live="polite"], [aria-live="assertive"]')
    .allTextContents();
  await page.screenshot({ path: testInfo.outputPath(`action-filter-invalid-${language}.png`) });
  await page.getByTestId('action_states.clear_filters').click();
  await expect(error).toHaveCount(0);
  await expect(page.getByTestId('action_states.row.811')).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath(`action-filter-recovered-${language}.png`) });
  await testInfo.attach('action-filter-and-status', {
    body: JSON.stringify({
      errorText,
      localAnnouncement,
      completed: await page.getByTestId('action_states.row.811').innerText(),
      unknown: await page.getByTestId('action_states.row.814').innerText(),
    }),
    contentType: 'application/json',
  });
  // Candidate error announcements and selected-locale status are hard guards.
  expect(localAnnouncement.some((text) => text.includes('invalid'))).toBe(true);
  if (language === 'cs')
    await expect(page.getByTestId('action_states.row.811').getByText('Hotovo', { exact: true })).toHaveCount(1);
});
