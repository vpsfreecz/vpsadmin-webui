import { expect, test, type Page, type TestInfo } from '@playwright/test';
import { bootstrapVpsAdminWindow, installHaveApiMock, setUiSettingsLocalStorage } from '../../fixtures';

type FixtureDownload = {
  id: number;
  state?: string;
  ready?: boolean;
  format: 'archive' | 'stream' | 'incremental_stream';
  file_name: string;
  url: string;
  expiration_date: string;
  snapshot: { id: number; name: string; dataset: { id: number } };
  from_snapshot?: { id: number; name: string };
  sha256sum?: string;
};

async function setup(
  page: Page,
  info: TestInfo,
  kind: 'nas' | 'vps',
  language: 'cs' | 'en' = 'cs',
  level = 1,
  scenario = 'ready',
  ownerId = 7
) {
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
    name: 'synthetic-dataset-' + 'dlouhy-nazev-'.repeat(12),
    full_name: 'synthetic-dataset-' + 'dlouhy-nazev-'.repeat(12),
    user: { id: ownerId, login: 'synthetic-owner' },
    vps: kind === 'vps' ? { id: 20, hostname: 'synthetic.example.test' } : null,
    used: 1024,
    refquota: 10240,
    snapshots_count: 1,
  };
  const download: FixtureDownload = {
    id: 41,
    state: 'ready',
    ready: true,
    format: 'archive',
    file_name: 'synthetic-' + 'dlouhy-neprerusovanynazev'.repeat(15) + '.tar.gz',
    url: '/download/41',
    expiration_date: '2099-12-01T12:00:00Z',
    snapshot: { id: 31, name: 'synthetic-snapshot', dataset: { id: 10 } },
  };
  if (scenario === 'pending') {
    download.state = 'preparing';
    download.ready = false;
  }
  if (scenario === 'failed') {
    download.state = 'failed';
    download.ready = false;
  }
  if (scenario === 'expired') download.expiration_date = '2020-01-01T00:00:00Z';
  if (scenario === 'legacy-no-url') download.url = '';
  if (scenario === 'rejected-link') download.url = 'http://[invalid';
  if (scenario === 'unknown') {
    download.state = 'future-state';
    delete download.ready;
    download.url = 'http://[invalid';
  }
  if (scenario === 'incremental') {
    download.format = 'incremental_stream';
    download.from_snapshot = { id: 30, name: 'synthetic-from-snapshot' };
  }
  if (scenario === 'checksum') download.sha256sum = 'ab'.repeat(32);
  const reads: { resource: string; params: Record<string, unknown> }[] = [];
  await installHaveApiMock(page, {
    user: { id: 7, login: 'synthetic-viewer', level },
    handlers: {
      'GET datasets': (req) => {
        reads.push({ resource: 'datasets', params: req.params });
        return { datasets: [dataset], _meta: { total_count: 1 } };
      },
      'GET datasets/10': () => ({ dataset }),
      'GET users/8': () => ({ user: { id: 8, login: 'synthetic-owner', level: 1 } }),
      'GET datasets/10/snapshots': () => ({
        snapshots: [{ id: 31, name: 'synthetic-snapshot', dataset: { id: 10 } }],
        _meta: { total_count: 1 },
      }),
      'GET snapshot_downloads': (req) => {
        reads.push({ resource: 'downloads', params: req.params });
        return {
          snapshot_downloads: scenario === 'empty' ? [] : [download],
          _meta: { total_count: scenario === 'empty' ? 0 : 1 },
        };
      },
      'GET transaction_chains': () => ({ transaction_chains: [], _meta: { total_count: 0 } }),
      'GET action_states': () => ({ action_states: [] }),
      'GET help_boxes': () => ({ help_boxes: [] }),
    },
  });
  return {
    mobile,
    download,
    reads,
    errors,
    writes,
    path: `/app/${kind === 'nas' ? 'nas' : 'datasets'}/10`,
    label: language === 'cs' ? 'Zálohy' : 'Backups',
  };
}

const scenarios = [
  ...(['cs', 'en'] as const).flatMap((language) =>
    ['ready', 'pending', 'failed', 'expired', 'legacy-no-url', 'rejected-link'].map((state) => ({
      kind: 'nas' as const,
      language,
      level: 1,
      state,
    }))
  ),
  ...[
    { language: 'cs' as const, level: 99 },
    { language: 'en' as const, level: 21 },
  ].flatMap((actor) => ['ready', 'pending', 'failed'].map((state) => ({ kind: 'nas' as const, ...actor, state }))),
  ...(['cs', 'en'] as const).flatMap((language) =>
    ['ready', 'failed'].map((state) => ({ kind: 'vps' as const, language, level: 1, state }))
  ),
  ...['unknown', 'incremental', 'checksum'].map((state) => ({
    kind: 'nas' as const,
    language: 'cs' as const,
    level: 1,
    state,
  })),
  ...(['cs', 'en'] as const).map((language) => ({ kind: 'nas' as const, language, level: 1, state: 'empty' })),
];

for (const scenario of scenarios)
  test(`@pr-smoke @pr-smoke-mobile shared download ${scenario.kind} ${scenario.language} ${scenario.level} ${scenario.state}`, async ({
    page,
  }, info) => {
    const ctx = await setup(page, info, scenario.kind, scenario.language, scenario.level, scenario.state);
    await page.goto('/app/backups?tab=downloads&q=synthetic');
    const row = (scope: string) =>
      page.locator(`[data-testid="${scope}.card.41"]:visible,[data-testid="${scope}.row.41"]:visible`);
    const bounds = async () =>
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
        await page.evaluate(() => innerWidth)
      );
    const shape = async (scope: string) => {
      const item = row(scope);
      await expect(item).toBeVisible();
      await expect(page.locator(`[data-testid="${scope}.filename.41"]:visible`)).toHaveText(
        String(ctx.download.file_name)
      );
      const leaf = page.locator(`[data-testid="${scope}.filename.41"]:visible`);
      expect(
        await leaf.evaluate((el) => ({
          wrap: getComputedStyle(el).overflowWrap,
          ellipsis: getComputedStyle(el).textOverflow,
          client: el.clientWidth,
          scroll: el.scrollWidth,
        }))
      ).toEqual(expect.objectContaining({ wrap: 'anywhere', ellipsis: 'clip' }));
      expect(await leaf.evaluate((el) => el.scrollWidth - el.clientWidth)).toBeLessThanOrEqual(1);
      await expect(item).toContainText('synthetic-snapshot');
      const prefix = `${scope}.${ctx.mobile ? 'card' : 'row'}.41`;
      const status = await item.getByTestId(prefix + '.status').innerText();
      const expires = await item.getByTestId(prefix + '.expiration').innerText();
      const link = item.getByTestId(prefix + '.download');
      const ready = ['ready', 'legacy-no-url', 'incremental', 'checksum'].includes(scenario.state);
      if (ready) {
        await expect(link).toHaveAttribute('target', '_blank');
        await expect(link).toHaveAttribute('rel', 'noopener noreferrer');
      } else await expect(link).toBeDisabled();
      if (scenario.state === 'incremental') await expect(item).toContainText('synthetic-from-snapshot');
      if (scenario.state === 'checksum') await expect(item).toContainText('ab'.repeat(32));
      await bounds();
      const labels = ctx.mobile
        ? await item.locator('dt').allTextContents()
        : await page
            .getByTestId(scope + '.table')
            .locator('th')
            .allTextContents();
      return {
        status,
        expires,
        href: await link.getAttribute('href'),
        labels: scope === 'backups.downloads' ? labels.slice(1) : labels,
      };
    };
    if (scenario.state === 'empty') {
      await expect(page.getByTestId('backups.downloads.row.41')).toHaveCount(0);
      await page.goto(ctx.path + '/downloads');
      await expect(page.getByTestId('dataset.downloads.list')).toContainText(
        scenario.language === 'cs' ? 'Žádné' : 'No'
      );
      await expect(row('dataset.downloads')).toHaveCount(0);
    } else {
      const center = row('backups.downloads');
      await expect(center).toBeVisible();
      await expect(center).toContainText('synthetic-dataset-');
      const before = await shape('backups.downloads');
      await expect(center.getByTestId(`backups.downloads.${ctx.mobile ? 'card' : 'row'}.41.delete`)).toHaveCount(0);
      await expect(center.getByTestId(`backups.downloads.${ctx.mobile ? 'card' : 'row'}.41.retry`)).toHaveCount(0);
      if (scenario.state === 'ready' && scenario.language === 'cs' && scenario.level === 1)
        await page.screenshot({ path: info.outputPath('implemented-center.png'), fullPage: true });
      const open = center.getByTestId(`backups.downloads.${ctx.mobile ? 'card' : 'row'}.41.detail`);
      await open.focus();
      await page.keyboard.press('Enter');
      await expect(page).toHaveURL(new RegExp(ctx.path + '/downloads'));
      const after = await shape('dataset.downloads');
      expect(after).toEqual(before);
      if (scenario.state === 'ready' && scenario.language === 'cs' && scenario.level === 1)
        await page.screenshot({ path: info.outputPath('implemented-detail.png'), fullPage: true });
      const detail = row('dataset.downloads');
      const prefix = `dataset.downloads.${ctx.mobile ? 'card' : 'row'}.41`;
      await expect(detail.getByTestId(prefix + '.delete')).toBeVisible();
      if (['expired', 'failed', 'rejected-link'].includes(scenario.state))
        await expect(detail.getByTestId(prefix + '.retry')).toBeVisible();
      await expect(page.getByTestId('dataset.downloads.list')).toBeVisible();
    }
    await bounds();
    expect(ctx.errors).toEqual([]);
    expect(ctx.writes).toEqual([]);
    await info.attach('shared-download-journal', {
      body: JSON.stringify({ errors: ctx.errors, writes: ctx.writes, reads: ctx.reads, fixtureOnly: true, scenario }),
      contentType: 'application/json',
    });
  });

for (const width of [768, 1024])
  test(`@pr-smoke @pr-smoke-mobile shared download intermediate ${width}`, async ({ page }, info) => {
    const ctx = await setup(page, info, 'nas', 'cs');
    await page.setViewportSize({ width, height: 1000 });
    await page.goto('/app/backups?tab=downloads&q=synthetic');
    const center = page.getByTestId('backups.downloads.card.41');
    await expect(center).toBeVisible();
    const labels = await center.locator('dt').allTextContents();
    const link = center.getByTestId('backups.downloads.card.41.detail');
    await link.focus();
    await page.keyboard.press('Enter');
    const detail = page.getByTestId('dataset.downloads.card.41');
    await expect(detail).toBeVisible();
    expect(await detail.locator('dt').allTextContents()).toEqual(labels.slice(1));
    const filename = page.locator('[data-testid="dataset.downloads.filename.41"]:visible');
    await expect(filename).toHaveText(ctx.download.file_name);
    expect(await filename.evaluate((el) => el.scrollWidth - el.clientWidth)).toBeLessThanOrEqual(1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    expect(ctx.errors).toEqual([]);
    expect(ctx.writes).toEqual([]);
    await info.attach('shared-download-journal', {
      body: JSON.stringify({ width, errors: ctx.errors, writes: ctx.writes, fixtureOnly: true }),
      contentType: 'application/json',
    });
  });

test('@pr-smoke @pr-smoke-mobile shared download admin selected-owner client actions', async ({ page }, info) => {
  const ctx = await setup(page, info, 'nas', 'cs', 99, 'checksum', 8);
  await page.addInitScript(() => {
    const target = window as Window & { __copiedDownload?: string };
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: async (text: string) => {
          target.__copiedDownload = text;
        },
      },
    });
  });
  await page.goto('/admin/datasets/10/downloads');
  const id = `dataset.downloads.${ctx.mobile ? 'card' : 'row'}.41`;
  const row = page.getByTestId(id);
  await expect(row).toBeVisible();
  const href = await row.getByTestId(id + '.download').getAttribute('href');
  expect(href).toBeTruthy();
  await row.getByTestId(id + '.copy_link').focus();
  await page.keyboard.press('Enter');
  await expect
    .poll(() => page.evaluate(() => (window as Window & { __copiedDownload?: string }).__copiedDownload))
    .toBe(href);
  await row.getByTestId(id + '.copy_sha256').focus();
  await page.keyboard.press('Enter');
  await expect
    .poll(() => page.evaluate(() => (window as Window & { __copiedDownload?: string }).__copiedDownload))
    .toBe('ab'.repeat(32));
  const remove = row.getByTestId(id + '.delete');
  await expect(remove).toBeEnabled();
  await remove.click();
  const confirm = page.getByTestId('dataset.downloads.delete_confirm');
  await expect(confirm).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(confirm).not.toBeVisible();
  expect(ctx.errors).toEqual([]);
  expect(ctx.writes).toEqual([]);
  await info.attach('shared-download-journal', {
    body: JSON.stringify({
      ownerId: 8,
      adminId: 7,
      clipboardApiSpy: true,
      errors: ctx.errors,
      writes: ctx.writes,
      reads: ctx.reads,
      fixtureOnly: true,
    }),
    contentType: 'application/json',
  });
});
