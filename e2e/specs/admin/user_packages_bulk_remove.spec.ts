import { expect, test, type Page } from '@playwright/test';
import {
  bootstrapVpsAdminWindow,
  failEnvelope,
  installHaveApiMock,
  setUiSettingsLocalStorage,
  type HaveApiHandler,
} from '../../fixtures';

function initialRows(userId = 53) {
  return [
    {
      id: 20,
      user: { id: userId },
      is_personal: true,
      environment: { id: 7, label: 'Production' },
      cluster_resource_package: { id: 10, label: 'Personal base', is_personal: true },
    },
    ...[21, 22, 23].map((id) => ({
      id,
      user: { id: userId },
      is_personal: false,
      environment: { id: id === 23 ? 8 : 7, label: id === 23 ? 'Playground' : 'Production' },
      cluster_resource_package: { id: 11, label: 'Standard', is_personal: false },
    })),
  ];
}
async function setup(page: Page, options: { language?: 'cs' | 'en'; level?: number; remove?: HaveApiHandler } = {}) {
  await bootstrapVpsAdminWindow(page, { sessionToken: 'TEST' });
  await setUiSettingsLocalStorage(page, { language: options.language ?? 'en', theme: 'dark' });
  let rows = initialRows();
  const writes: number[] = [];
  await installHaveApiMock(page, {
    user: { id: 1, login: 'admin', level: options.level ?? 100 },
    handlers: {
      'GET users/53': () => ({ user: { id: 53, login: 'sample-member', level: 1 } }),
      'GET users/54': () => ({ user: { id: 54, login: 'another-member', level: 1 } }),
      'GET vpses': () => ({ vpses: [], _meta: { total_count: 0 } }),
      'GET user_cluster_resources': () => ({ user_cluster_resources: [] }),
      'GET environments': () => ({
        environments: [
          { id: 7, label: 'Production' },
          { id: 8, label: 'Playground' },
        ],
      }),
      'GET cluster_resource_packages': () => ({ cluster_resource_packages: [] }),
      'GET cluster_resource_packages/10/items': () => ({ items: [] }),
      'GET cluster_resource_packages/11/items': () => ({
        items: [{ id: 1, cluster_resource: { id: 1, name: 'cpu', label: 'CPU' }, value: 2 }],
      }),
      'GET user_cluster_resource_packages': (ctx) => ({
        user_cluster_resource_packages:
          ctx.searchParams.get('user_cluster_resource_package[user]') === '54'
            ? [{ ...initialRows(54)[1]!, id: 31 }]
            : rows,
      }),
      ...Object.fromEntries(
        [20, 21, 22, 23, 31].map((id) => [
          `DELETE user_cluster_resource_packages/${id}`,
          async (ctx: Parameters<HaveApiHandler>[0]) => {
            writes.push(id);
            const custom = options.remove ? await options.remove(ctx) : undefined;
            if (custom) return custom;
            rows = rows.filter((row) => row.id !== id);
            return {};
          },
        ])
      ),
    },
  });
  await page.goto('/admin/users/53/resources');
  await expect(page.getByTestId('admin.user.resources.assignment.21')).toBeVisible();
  return {
    writes,
    erase: (id: number) => {
      rows = rows.filter((row) => row.id !== id);
    },
  };
}
const check = (page: Page, id: number) => page.getByTestId(`admin.user.resources.assignment.${id}.select`);
const review = (page: Page) => page.getByTestId('admin.user.resources.bulk.confirm');

for (const language of ['cs', 'en'] as const) {
  test(`@pr-smoke @pr-smoke-mobile ${language} selects exact member assignments, cancels and confirms bulk removal`, async ({
    page,
  }, info) => {
    const { writes } = await setup(page, { language });
    await expect(check(page, 20)).toBeDisabled();
    await page.getByTestId('admin.user.resources.bulk.all').click();
    for (const id of [21, 22, 23]) await expect(check(page, id)).toBeChecked();
    await check(page, 23).uncheck();
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: info.outputPath('selected-packages.png'), fullPage: true, scale: 'css' });
    await page.getByTestId('admin.user.resources.bulk.remove').click();
    await expect(review(page)).toContainText('sample-member');
    await expect(review(page)).toContainText('#21');
    await expect(review(page)).toContainText('#22');
    await expect(review(page)).not.toContainText('#23');
    await page.screenshot({ path: info.outputPath('confirm-packages.png'), fullPage: false, scale: 'css' });
    await page.getByTestId('admin.user.resources.bulk.confirm.cancel').click();
    expect(writes).toEqual([]);
    await page.getByTestId('admin.user.resources.bulk.remove').click();
    await page.keyboard.press('Escape');
    await expect(review(page)).toBeHidden();
    expect(writes).toEqual([]);
    await page.getByTestId('admin.user.resources.bulk.remove').click();
    await page.getByTestId('admin.user.resources.bulk.confirm.confirm').click();
    await expect(page.getByTestId('admin.user.resources.bulk.result')).toContainText('2');
    await expect(page.getByTestId('admin.user.resources.assignment.21')).toHaveCount(0);
    await expect(page.getByTestId('admin.user.resources.assignment.22')).toHaveCount(0);
    await expect(page.getByTestId('admin.user.resources.assignment.23')).toBeVisible();
    await expect(page.getByTestId('admin.user.resources.assignment.20')).toBeVisible();
    expect(writes).toEqual([21, 22]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  });
}

test('@pr-smoke @pr-smoke-mobile partial rejection retains only failed assignments for a reviewed retry', async ({
  page,
}) => {
  let rejected = false;
  const { writes } = await setup(page, {
    remove: (ctx) => {
      if (ctx.relPath?.endsWith('/22') && !rejected) {
        rejected = true;
        return failEnvelope('Example referenced package');
      }
      return undefined;
    },
  });
  await page.getByTestId('admin.user.resources.bulk.all').click();
  await page.getByTestId('admin.user.resources.bulk.remove').click();
  await page.getByTestId('admin.user.resources.bulk.confirm.confirm').click();
  await expect(page.getByTestId('admin.user.resources.bulk.result.22')).toContainText('Example referenced package');
  await expect(check(page, 22)).toBeChecked();
  expect(writes).toEqual([21, 22, 23]);
  await page.getByTestId('admin.user.resources.bulk.remove').click();
  await expect(review(page)).toContainText('#22');
  await expect(review(page)).not.toContainText('#21');
  await page.getByTestId('admin.user.resources.bulk.confirm.confirm').click();
  await expect(page.getByTestId('admin.user.resources.assignment.22')).toHaveCount(0);
  expect(writes).toEqual([21, 22, 23, 22]);
});

test('@pr-smoke @pr-smoke-mobile unknown outcome stops remaining deletes and requires a fresh explicit selection', async ({
  page,
}) => {
  const ctx = await setup(page, {
    remove: (request) => {
      if (request.relPath?.endsWith('/22')) {
        ctx.erase(22); // Simulate a committed delete whose response could not be trusted.
        return {
          status: 503,
          body: JSON.stringify({ status: false, message: 'Example uncertain response' }),
          contentType: 'application/json',
        };
      }
      return undefined;
    },
  });
  await page.getByTestId('admin.user.resources.bulk.all').click();
  await page.getByTestId('admin.user.resources.bulk.remove').click();
  await page.getByTestId('admin.user.resources.bulk.confirm.confirm').click();
  await expect(page.getByTestId('admin.user.resources.bulk.result.22')).toContainText('Outcome unknown');
  await expect(page.getByTestId('admin.user.resources.bulk.result.23')).toContainText('Not attempted');
  await expect(page.getByTestId('admin.user.resources.bulk.remove')).toBeDisabled();
  expect(ctx.writes).toEqual([21, 22]);
  await page.getByTestId('admin.user.resources.bulk.refresh').click();
  await expect(page.getByTestId('admin.user.resources.bulk.all')).toBeEnabled();
  await expect(check(page, 23)).not.toBeChecked();
  expect(ctx.writes).toEqual([21, 22]);
  await check(page, 23).check();
  await page.getByTestId('admin.user.resources.bulk.remove').click();
  await page.getByTestId('admin.user.resources.bulk.confirm.confirm').click();
  await expect(page.getByTestId('admin.user.resources.assignment.23')).toHaveCount(0);
  expect(ctx.writes).toEqual([21, 22, 23]);
});

test('@pr-smoke @pr-smoke-mobile pending batch cannot be dismissed or redirected to a different member', async ({
  page,
}) => {
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const { writes } = await setup(page, {
    remove: async (ctx) => {
      if (ctx.relPath?.endsWith('/21')) await gate;
      return undefined;
    },
  });
  await check(page, 21).check();
  await check(page, 22).check();
  await page.getByTestId('admin.user.resources.bulk.remove').click();
  await page.getByTestId('admin.user.resources.bulk.confirm.confirm').click();
  await expect.poll(() => writes).toEqual([21]);
  await page.keyboard.press('Escape');
  await expect(review(page)).toBeVisible();
  await expect(page.getByTestId('admin.user.resources.bulk.confirm.cancel')).toBeDisabled();
  await page.evaluate(() => {
    window.history.pushState({}, '', '/admin/users/54/resources');
    window.dispatchEvent(new PopStateEvent('popstate'));
  });
  await expect(page.getByTestId('admin.user.resources.assignment.31')).toBeVisible();
  await expect(check(page, 31)).not.toBeChecked();
  release();
  await expect.poll(() => writes).toEqual([21, 22]);
  await expect(page.getByTestId('admin.user.resources.bulk.result')).toHaveCount(0);
  expect(writes).not.toContain(31);
});

test('@pr-smoke @pr-smoke-mobile support has no bulk removal controls', async ({ page }) => {
  const { writes } = await setup(page, { level: 21 });
  await expect(page.getByTestId('admin.user.resources.bulk')).toHaveCount(0);
  await expect(check(page, 21)).toHaveCount(0);
  expect(writes).toEqual([]);
});
