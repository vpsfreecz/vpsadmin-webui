import { expect, test, type Page, type TestInfo } from '@playwright/test';
import { bootstrapVpsAdminWindow, installHaveApiMock, setUiSettingsLocalStorage } from '../../fixtures';

async function setup(page: Page, info: TestInfo, kind: 'nas' | 'vps', language: 'cs' | 'en' = 'cs', level = 1) {
  const mobile = info.project.name.includes('mobile');
  await page.setViewportSize(mobile ? { width: 320, height: 844 } : { width: 1440, height: 1000 });
  await page.clock.setFixedTime(new Date('2026-11-11T20:00:00Z'));
  const errors: string[] = [],
    writes: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('request', (r) => {
    if (new URL(r.url()).pathname.includes('/api/') && !['GET', 'HEAD', 'OPTIONS'].includes(r.method()))
      writes.push(r.method() + ' ' + new URL(r.url()).pathname);
  });
  await bootstrapVpsAdminWindow(page, { sessionToken: 'TEST', webuiNext: { uiSettings: { persistence: 'local' } } });
  await setUiSettingsLocalStorage(page, { language, theme: language === 'cs' ? 'dark' : 'light' });
  const dataset = {
    id: 10,
    name: 'synthetic-dataset',
    full_name: 'synthetic-dataset',
    user: { id: 7, login: 'synthetic-viewer' },
    vps: kind === 'vps' ? { id: 20, hostname: 'synthetic.example.test' } : null,
    used: 1024,
    refquota: 10240,
    snapshots_count: 1,
  };
  const download = {
    id: 41,
    state: 'ready',
    ready: true,
    format: 'archive',
    file_name: 'synthetic-snapshot.tar.gz',
    url: '/download/41',
    expiration_date: '2099-12-01T12:00:00Z',
    snapshot: { id: 31, name: 'synthetic-snapshot', dataset: { id: 10 } },
  };
  await installHaveApiMock(page, {
    user: { id: 7, login: 'synthetic-viewer', level },
    handlers: {
      'GET datasets': () => ({ datasets: [dataset], _meta: { total_count: 1 } }),
      'GET datasets/10': () => ({ dataset }),
      'GET datasets/10/snapshots': () => ({
        snapshots: [{ id: 31, name: 'synthetic-snapshot', dataset: { id: 10 } }],
        _meta: { total_count: 1 },
      }),
      'GET snapshot_downloads': () => ({ snapshot_downloads: [download], _meta: { total_count: 1 } }),
      'GET transaction_chains': () => ({ transaction_chains: [], _meta: { total_count: 0 } }),
      'GET action_states': () => ({ action_states: [] }),
      'GET help_boxes': () => ({ help_boxes: [] }),
    },
  });
  return {
    mobile,
    errors,
    writes,
    path: `/app/${kind === 'nas' ? 'nas' : 'datasets'}/10`,
    label: language === 'cs' ? 'Zálohy' : 'Backups',
  };
}
async function navigation(page: Page, mobile: boolean) {
  if (mobile) await page.getByTestId('shell.mobile-nav-button').click();
  return page.locator(`[data-testid^="nav.${mobile ? 'drawer' : 'sidebar'}."][aria-current="page"]`);
}
async function closeNavigation(page: Page, mobile: boolean) {
  if (mobile) await page.getByTestId('nav.drawer.close').click();
}
async function journal(info: TestInfo, ctx: Awaited<ReturnType<typeof setup>>) {
  expect(ctx.errors).toEqual([]);
  expect(ctx.writes).toEqual([]);
  await info.attach('backup-navigation-journal', {
    body: JSON.stringify({ errors: ctx.errors, writes: ctx.writes, fixtureOnly: true }),
    contentType: 'application/json',
  });
}

for (const kind of ['nas', 'vps'] as const) {
  for (const actor of [
    { name: 'member', level: 1 },
    { name: 'admin-My', level: 99 },
    { name: 'support-My', level: 21 },
  ])
    for (const language of ['cs', 'en'] as const) {
      test(`@pr-smoke @pr-smoke-mobile center detail ${kind} ${actor.name} ${language}`, async ({ page }, info) => {
        const ctx = await setup(page, info, kind, language, actor.level);
        await page.goto('/app/backups?tab=downloads&q=synthetic');
        await page
          .locator(
            '[data-testid="backups.downloads.card.41.detail"]:visible,[data-testid="backups.downloads.row.41.detail"]:visible'
          )
          .click();
        await expect(page).toHaveURL(new RegExp(ctx.path + '/downloads\\?'));
        await expect(page.getByTestId('dataset.header')).toBeVisible();
        await expect(
          page.locator(
            '[data-testid="dataset.downloads.row.41"]:visible,[data-testid="dataset.downloads.card.41"]:visible'
          )
        ).toBeVisible();
        const detailUrl = page.url();
        expect(new URL(detailUrl).searchParams.get('from')).toBe('backups');
        const back = page.getByTestId('dataset.header').getByRole('link', { name: ctx.label, exact: true });
        await expect(back).toHaveAttribute('href', '/app/backups?tab=downloads&q=synthetic');
        await page.reload();
        await expect(back).toBeVisible();
        await expect(
          page.locator(
            '[data-testid="dataset.downloads.row.41"]:visible,[data-testid="dataset.downloads.card.41"]:visible'
          )
        ).toBeVisible();
        const active = await navigation(page, ctx.mobile);
        await expect(active).toHaveCount(1);
        await expect(active).toHaveAttribute('href', '/app/backups?tab=downloads&q=synthetic');
        await expect(active).toHaveAttribute('data-testid', `nav.${ctx.mobile ? 'drawer' : 'sidebar'}.backups`);
        if (actor.level === 1 && language === 'cs')
          await page.screenshot({ path: info.outputPath('candidate-navigation.png'), fullPage: true });
        await closeNavigation(page, ctx.mobile);
        await page
          .getByTestId('dataset.header')
          .getByRole('link', { name: 'Snapshoty', exact: true })
          .or(page.getByTestId('dataset.header').getByRole('link', { name: 'Snapshots', exact: true }))
          .click();
        await expect(page).toHaveURL(new RegExp(ctx.path + '/snapshots\\?'));
        for (const key of ['from', 'backups.tab', 'backups.q']) {
          expect(new URL(page.url()).searchParams.get(key)).toBe(new URL(detailUrl).searchParams.get(key));
        }
        await back.focus();
        await page.keyboard.press('Enter');
        await expect(page).toHaveURL(/\/app\/backups\?tab=downloads&q=synthetic$/);
        await expect(page.getByTestId('backups.filter')).toHaveValue('synthetic');
        await journal(info, ctx);
      });
    }
  for (const section of ['snapshots', 'plans'])
    test(`@pr-smoke @pr-smoke-mobile workspace detail ${kind} ${section}`, async ({ page }, info) => {
      const ctx = await setup(page, info, kind, 'en');
      await page.goto(
        `/app/backups?tab=${section}&q=synthetic&dataset=10${section === 'snapshots' ? '&backup_snapshot_limit=25' : ''}`
      );
      await expect(page.getByTestId('backups.workspace.selection')).toBeVisible();
      if (section === 'snapshots') {
        await expect(
          page.locator(
            '[data-testid="dataset.snapshots.row.31"]:visible,[data-testid="dataset.snapshots.card.31"]:visible'
          )
        ).toBeVisible();
      }
      const centerUrl = page.url();
      await page.getByTestId('backups.workspace.selection').getByRole('link').click();
      await expect(page.getByTestId('dataset.header')).toBeVisible();
      await page.getByTestId('dataset.header').getByRole('link', { name: ctx.label, exact: true }).click();
      await expect(page).toHaveURL(centerUrl);
      await expect(page.getByTestId('backups.workspace.selection')).toBeVisible();
      await journal(info, ctx);
    });
  test(`@pr-smoke @pr-smoke-mobile overview detail ${kind}`, async ({ page }, info) => {
    const ctx = await setup(page, info, kind, 'en');
    await page.goto('/app/backups');
    await page
      .locator(
        '[data-testid="backups.downloads.card.41.detail"]:visible,[data-testid="backups.downloads.row.41.detail"]:visible'
      )
      .click();
    await expect(page.getByTestId('dataset.header')).toBeVisible();
    const active = await navigation(page, ctx.mobile);
    await expect(active).toHaveCount(1);
    await expect(active).toHaveAttribute('href', '/app/backups');
    await active.click();
    await expect(page.getByTestId('backups.overview')).toBeVisible();
    await expect(page).toHaveURL(/\/app\/backups$/);
    await journal(info, ctx);
  });
  for (const base of ['/app', '/admin']) {
    test(`@pr-smoke @pr-smoke-mobile direct detail ${base} ${kind}`, async ({ page }, info) => {
      const ctx = await setup(page, info, kind, 'en', base === '/admin' ? 99 : 1);
      const path = ctx.path.replace('/app', base);
      await page.goto(path + '/downloads' + (base === '/admin' ? '?from=backups&backups.tab=downloads' : ''));
      await expect(page.getByTestId('dataset.header')).toBeVisible();
      const active = await navigation(page, ctx.mobile);
      await expect(active).toHaveCount(1);
      await expect(active).toHaveAttribute(
        'data-testid',
        `nav.${ctx.mobile ? 'drawer' : 'sidebar'}.${kind === 'nas' ? 'nas' : base === '/admin' ? 'datasets' : 'vps'}`
      );
      await closeNavigation(page, ctx.mobile);
      await expect(page.getByTestId('dataset.header').getByRole('link', { name: ctx.label, exact: true })).toHaveCount(
        0
      );
      await journal(info, ctx);
    });
  }
}
