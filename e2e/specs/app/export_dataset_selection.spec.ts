import { expect, test, type Page } from '@playwright/test';
import { bootstrapVpsAdminWindow, installHaveApiMock, setUiSettingsLocalStorage } from '../../fixtures';
import { expectNoDocumentHorizontalOverflow } from '../../helpers/horizontalOverflow';

type Role = 'member' | 'support' | 'admin' | 'my';
async function choose(page: Page, id: number, hasTouch: boolean) {
  const option = page.getByTestId(`exports.create.dataset.opt.${id}`);
  if (hasTouch) await option.tap();
  else await option.click();
}

async function setup(page: Page, language: 'cs' | 'en', role: Role, outcome = 'ok', responseGate?: Promise<void>) {
  await bootstrapVpsAdminWindow(page, { webuiNext: { uiSettings: { persistence: 'local' } } });
  await setUiSettingsLocalStorage(page, { language, theme: language === 'cs' ? 'dark' : 'light' });
  const owner = { id: 90, login: 'selection-fixture' };
  const numeric = { id: 20, name: '999', full_name: '999', user: owner, object_state: 'active' };
  const long = {
    id: 21,
    name: 'second',
    full_name: `tank/fixture/${'dlouhydatasetbezmezer'.repeat(10)}`,
    user: owner,
    object_state: 'active',
  };
  const foreign = {
    id: 999,
    name: 'foreign',
    full_name: 'tank/foreign/data',
    user: { id: 44, login: 'other-fixture' },
    object_state: 'active',
  };
  const lists: Array<{ user: string | null; limit: string | null }> = [];
  const shows: number[] = [];
  const snapshots: number[] = [];
  const writes: unknown[] = [];
  let attempts = 0;
  let created: {
    id: number;
    dataset: typeof numeric;
    user: typeof owner;
    enabled: boolean;
    snapshot?: { id: number };
  } = { id: 70, dataset: numeric, user: owner, enabled: true };
  await installHaveApiMock(page, {
    user: { ...owner, level: role === 'member' ? 1 : role === 'support' ? 21 : 99 },
    handlers: {
      'GET exports': () => ({ exports: [] }),
      'GET datasets': (ctx) => {
        lists.push({
          user: ctx.url.searchParams.get('dataset[user]'),
          limit: ctx.url.searchParams.get('dataset[limit]'),
        });
        attempts++;
        if (outcome === 'list-error' && attempts === 1)
          return {
            status: 503,
            contentType: 'application/json',
            body: JSON.stringify({ status: false, message: 'Synthetic list unavailable', response: null }),
          };
        return { datasets: [numeric, long, foreign], _meta: { total_count: outcome === 'partial' ? 1001 : 3 } };
      },
      'GET datasets/20': () => {
        shows.push(20);
        return { dataset: numeric };
      },
      'GET datasets/21': () => {
        shows.push(21);
        return { dataset: long };
      },
      'GET datasets/999': () => {
        shows.push(999);
        return role === 'my' || role === 'admin'
          ? { dataset: foreign }
          : {
              status: 403,
              contentType: 'application/json',
              body: JSON.stringify({ status: false, message: 'Synthetic forbidden dataset', response: null }),
            };
      },
      'GET datasets/20/snapshots': () => {
        snapshots.push(20);
        return { snapshots: [{ id: 101, name: 'backup-a' }] };
      },
      'GET datasets/21/snapshots': () => {
        snapshots.push(21);
        return { snapshots: [{ id: 102, name: 'backup-b' }] };
      },
      'GET datasets/999/snapshots': () => {
        snapshots.push(999);
        if (role === 'admin') return { snapshots: [{ id: 303, name: 'foreign-backup' }] };
        throw Error('Foreign dataset must not load snapshots');
      },
      'POST exports': async (ctx) => {
        const payload = ctx.request.postDataJSON() as { export: { dataset?: number; snapshot?: number } };
        writes.push(payload);
        await responseGate;
        if (outcome === 'create-reject')
          return {
            status: 400,
            contentType: 'application/json',
            body: JSON.stringify({ status: false, message: 'Synthetic export rejection', response: null }),
          };
        const picked = payload.export.snapshot ? long : payload.export.dataset === 999 ? foreign : numeric;
        created = {
          id: 70,
          dataset: picked,
          ...(payload.export.snapshot ? { snapshot: { id: payload.export.snapshot } } : {}),
          user: picked.user,
          enabled: true,
        };
        return { export: created, _meta: { action_state_id: 510 } };
      },
      'GET exports/70': () => ({ export: created }),
      'GET exports/70/hosts': () => ({ hosts: [] }),
      'GET transaction_chains': () => ({ transaction_chains: [] }),
      'GET action_states/510': () => ({
        action_state: { id: 510, label: 'Create export', finished: false, status: true, current: 1, total: 3 },
      }),
    },
  });
  const base = role === 'admin' ? '/admin' : '/app';
  await page.goto(`${base}/exports`);
  await page.getByTestId('exports.create.open').click();
  return { numeric, long, lists, shows, snapshots, writes, base };
}

for (const language of ['cs', 'en'] as const) {
  for (const role of ['member', 'support', 'admin', 'my'] as const) {
    for (const source of ['dataset', 'snapshot'] as const) {
      test(`@pr-smoke @pr-smoke-mobile ${language} ${role} chooses an authorized ${source} export source`, async ({
        page,
        hasTouch,
      }, info) => {
        const fixture = await setup(page, language, role);
        const input = page.getByTestId('exports.create.dataset');
        await expect(input).toHaveAttribute('role', 'combobox');
        await input.fill('999');
        // Numeric dataset names do not select an unrelated resource by API ID.
        await expect(page.getByTestId('exports.create.submit')).toBeDisabled();
        await choose(page, 20, hasTouch);
        await expect(input).toHaveValue('999');
        await expect(page.getByTestId('exports.create.dataset_picker.selected_id')).toHaveText('ID: #20');
        await expect(page.getByTestId('exports.create.submit')).toBeEnabled();
        expect(fixture.shows).not.toContain(999);
        const list = fixture.lists.find((row) => row.limit === '1000');
        expect(list).toEqual({ user: role === 'my' ? '90' : null, limit: '1000' });
        if (source === 'snapshot') {
          await page
            .getByRole('combobox', { name: language === 'cs' ? 'Typ zdroje' : 'Source type', exact: true })
            .selectOption('snapshot');
          const snapshot = page.getByRole('combobox', { name: 'Snapshot', exact: true });
          await snapshot.selectOption('101');
          await input.fill('bezmezer');
          await expect(snapshot).toHaveValue('');
          const option = page.getByTestId('exports.create.dataset.opt.21');
          await expect(option).toContainText(fixture.long.full_name);
          await expectNoDocumentHorizontalOverflow(page);
          if (hasTouch) await option.tap();
          else await option.click();
          await expect(snapshot.getByRole('option', { name: 'backup-a', exact: true })).toHaveCount(0);
          await snapshot.selectOption('102');
          expect(fixture.snapshots).toContain(20);
          expect(fixture.snapshots).toContain(21);
        }
        if (role === 'member')
          await page.screenshot({ path: info.outputPath(`selection-${language}-${source}.png`), scale: 'css' });
        await page.getByTestId('exports.create.submit').click();
        await expect(page).toHaveURL(`${fixture.base}/exports/70`);
        expect(fixture.writes).toHaveLength(1);
        const body = fixture.writes[0] as { export: Record<string, unknown> };
        expect(body.export).toMatchObject(source === 'snapshot' ? { snapshot: 102 } : { dataset: 20 });
        expect(body.export[source === 'snapshot' ? 'dataset' : 'snapshot']).toBeUndefined();
        if (role === 'member' || role === 'support') expect(body.export['threads']).toBeUndefined();
        expect(fixture.snapshots).not.toContain(999);
      });
    }
  }
  test(`@pr-smoke @pr-smoke-mobile ${language} global admin can choose another owner dataset`, async ({
    page,
    hasTouch,
  }) => {
    const fixture = await setup(page, language, 'admin');
    await page.getByTestId('exports.create.dataset').fill('foreign');
    await choose(page, 999, hasTouch);
    await expect(page.getByTestId('exports.create.dataset_picker.selected_id')).toHaveText('ID: #999');
    await expect(page.getByTestId('exports.create.submit')).toBeEnabled();
    await page.getByTestId('exports.create.submit').click();
    await expect(page).toHaveURL('/admin/exports/70');
    expect(fixture.writes).toHaveLength(1);
    expect(fixture.writes[0]).toMatchObject({ export: { dataset: 999 } });
    expect(fixture.lists.find((row) => row.limit === '1000')?.user).toBeNull();
  });
  for (const role of ['member', 'support', 'my'] as const) {
    test(`@pr-smoke @pr-smoke-mobile ${language} ${role} hides foreign choices and rejects a foreign #ID`, async ({
      page,
    }) => {
      const fixture = await setup(page, language, role);
      const input = page.getByTestId('exports.create.dataset');
      await input.fill('foreign');
      await expect(page.getByTestId('exports.create.dataset.opt.999')).toHaveCount(0);
      await input.fill('#999');
      await input.press('Enter');
      await expect.poll(() => fixture.shows.includes(999)).toBe(true);
      await expect(page.getByTestId('exports.create.submit')).toBeDisabled();
      expect(fixture.snapshots).not.toContain(999);
      expect(fixture.writes).toEqual([]);
    });
  }
  test(`@pr-smoke @pr-smoke-mobile ${language} list failure can retry without offering stale choices`, async ({
    page,
  }) => {
    const fixture = await setup(page, language, 'member', 'list-error');
    await page.getByTestId('exports.create.dataset').focus();
    await expect(page.getByTestId('exports.create.dataset_picker.retry')).toBeVisible();
    await expect(page.getByTestId('exports.create.dataset.opt.20')).toHaveCount(0);
    await page.getByTestId('exports.create.dataset_picker.retry').click();
    await page.getByTestId('exports.create.dataset').focus();
    await expect(page.getByTestId('exports.create.dataset.opt.20')).toBeVisible();
    expect(fixture.writes).toEqual([]);
  });
  test(`@pr-smoke @pr-smoke-mobile ${language} partial list keeps explicit #ID lookup and clears on reopen`, async ({
    page,
  }) => {
    const fixture = await setup(page, language, 'member', 'partial');
    await expect(page.getByTestId('exports.create.dataset_picker.limited')).toBeVisible();
    await page.getByTestId('exports.create.dataset').fill('#20');
    await expect(page.getByTestId('exports.create.submit')).toBeEnabled();
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: language === 'cs' ? 'Zrušit' : 'Cancel', exact: true }).click();
    await page.getByTestId('exports.create.open').click();
    await expect(page.getByTestId('exports.create.dataset')).toHaveValue('');
    await expect(page.getByTestId('exports.create.submit')).toBeDisabled();
    expect(fixture.writes).toEqual([]);
  });
  test(`@pr-smoke @pr-smoke-mobile ${language} unbroken dataset name remains readable in its review`, async ({
    page,
    hasTouch,
  }, info) => {
    const fixture = await setup(page, language, 'member');
    await page.getByTestId('exports.create.dataset').fill('bezmezer');
    const option = page.getByTestId('exports.create.dataset.opt.21');
    await expect(option).toContainText(fixture.long.full_name);
    await expectNoDocumentHorizontalOverflow(page);
    if (hasTouch) await option.tap();
    else await option.click();
    const review = page.getByTestId('exports.create.review');
    await expect(page.getByTestId('exports.create.submit')).toBeEnabled();
    await expect(review).toContainText(fixture.long.full_name);
    await expect(page.getByTestId('exports.create.dataset_picker.selected_id')).toHaveText('ID: #21');
    await review.scrollIntoViewIfNeeded();
    await page.screenshot({ path: info.outputPath(`unbroken-review-${language}.png`), scale: 'css' });
    expect(await review.evaluate((el) => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
    await expect(review).toContainText(fixture.long.full_name);
    expect(fixture.writes).toEqual([]);
  });
  test(`@pr-smoke @pr-smoke-mobile ${language} pending creation disables the dataset picker`, async ({
    page,
    hasTouch,
  }) => {
    let respond = () => {};
    const gate = new Promise<void>((resolve) => {
      respond = resolve;
    });
    const fixture = await setup(page, language, 'member', 'create-reject', gate);
    await page.getByTestId('exports.create.dataset').fill('999');
    await choose(page, 20, hasTouch);
    await page.getByTestId('exports.create.submit').click();
    try {
      await expect.poll(() => fixture.writes.length).toBe(1);
      await expect(page.getByTestId('exports.create.dataset')).toBeDisabled();
      await expect(page.getByTestId('exports.create.submit')).toBeDisabled();
    } finally {
      respond();
    }
    await expect(page.getByText('Synthetic export rejection', { exact: false })).toBeVisible();
    await expect(page.getByTestId('exports.create.dataset')).toBeEnabled();
    await expect(page.getByTestId('exports.create.dataset')).toHaveValue('999');
    expect(fixture.writes).toHaveLength(1);
  });
  test(`@pr-smoke @pr-smoke-mobile ${language} export rejection retains the named selection`, async ({
    page,
    hasTouch,
  }) => {
    const fixture = await setup(page, language, 'member', 'create-reject');
    await page.getByTestId('exports.create.dataset').fill('999');
    await choose(page, 20, hasTouch);
    await page.getByTestId('exports.create.submit').click();
    await expect(page.getByText('Synthetic export rejection', { exact: false })).toBeVisible();
    await expect(page.getByTestId('exports.create.dataset')).toHaveValue('999');
    await expect(page.getByTestId('exports.create.submit')).toBeEnabled();
    expect(fixture.writes).toHaveLength(1);
  });
}
