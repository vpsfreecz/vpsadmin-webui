import { expect, test } from '@playwright/test';
import { bootstrapVpsAdminWindow, installHaveApiMock, setUiSettingsLocalStorage } from '../../fixtures';
const datasets = [
  {
    id: 10,
    name: 'synthetic-root',
    full_name: 'tank/synteticky-dataset-pro-overeni-10',
    user: { id: 42 },
    vps: { id: 20, hostname: 'synthetic-vps' },
  },
  { id: 11, name: 'synthetic-archive', full_name: 'tank/synteticky-archiv-pro-overeni-11', user: { id: 42 } },
];
const downloads = [
  {
    id: 41,
    state: 'ready',
    format: 'archive',
    url: '/download/41',
    snapshot: { id: 31, name: 'synthetic-before-upgrade', dataset: { id: 10 } },
  },
  { id: 42, state: 'pending', format: 'archive', snapshot: { id: 32, name: 'synthetic-monthly', dataset: { id: 11 } } },
  { id: 43, state: 'failed', format: 'archive', snapshot: { id: 33, name: 'synthetic-failed', dataset: { id: 10 } } },
];
for (const language of ['cs', 'en'] as const)
  for (const level of [1, 99, 21])
    test(`@pr-smoke @pr-smoke-mobile BAK03 exact roster ${language} My level${level}`, async ({ page }, info) => {
      const mobile = info.project.name.includes('mobile');
      await page.setViewportSize(mobile ? { width: 320, height: 844 } : { width: 1440, height: 1000 });
      const errors: string[] = [],
        writes: string[] = [],
        requests: { path: string; params: string }[] = [];
      const pending = new Set<unknown>();
      page.on('pageerror', (e) => errors.push(e.message));
      page.on('request', (r) => {
        if (new URL(r.url()).pathname.includes('/api/')) {
          pending.add(r);
          if (!['GET', 'HEAD', 'OPTIONS'].includes(r.method())) writes.push(r.method());
        }
      });
      page.on('requestfinished', (r) => pending.delete(r));
      page.on('requestfailed', (r) => pending.delete(r));
      await bootstrapVpsAdminWindow(page, {
        sessionToken: 'TEST',
        webuiNext: { uiSettings: { persistence: 'local' } },
      });
      await setUiSettingsLocalStorage(page, { language, theme: language === 'cs' ? 'dark' : 'light' });
      await installHaveApiMock(page, {
        user: { id: 42, login: 'synthetic-owner', level },
        handlers: {
          'GET datasets': ({ searchParams }) => {
            requests.push({ path: 'datasets', params: searchParams.toString() });
            expect(searchParams.get('dataset[q]')).toBeNull();
            expect(searchParams.get('dataset[user]')).toBe(level === 1 ? null : '42');
            return { datasets, _meta: { total_count: 2 } };
          },
          'GET snapshot_downloads': ({ searchParams }) => {
            requests.push({ path: 'snapshot_downloads', params: searchParams.toString() });
            expect(searchParams.get('snapshot_download[user]')).toBeNull();
            expect(searchParams.get('snapshot_download[q]')).toBeNull();
            const id = searchParams.get('snapshot_download[dataset]');
            if (level !== 1) expect(['10', '11']).toContain(id);
            const rows = id ? downloads.filter((d) => String(d.snapshot.dataset.id) === id) : downloads;
            return { snapshot_downloads: rows, _meta: { total_count: rows.length } };
          },
          'GET help_boxes': () => ({ help_boxes: [] }),
          'GET transaction_chains': () => ({ transaction_chains: [] }),
          'GET action_states': () => ({ action_states: [] }),
        },
      });
      await page.route('**/api/**', (r) =>
        !['GET', 'HEAD', 'OPTIONS'].includes(r.request().method()) ? r.abort() : r.fallback()
      );
      const original =
        '/app/backups?q=missing&dataset=10&intent=restore&backup_snapshot_cursor=999&unrelated=preserved';
      await page.goto(original);
      await expect(page.getByTestId('backups.overview')).toBeVisible();
      await expect.poll(() => pending.size).toBe(0);
      await expect(page.getByTestId('backups.stats.datasets')).toContainText('2');
      await expect(page.getByTestId('backups.stats.downloads')).toContainText('3');
      for (const k of ['ready', 'pending', 'unavailable']) {
        await expect(page.getByTestId('backups.stats.' + k + '.link')).toHaveCount(0);
        await expect(page.getByTestId('backups.stats.' + k).locator('a,button,[role=link]')).toHaveCount(0);
      }
      if (language === 'cs' && level === 1)
        await page.screenshot({ path: info.outputPath('after-overview.png'), fullPage: true });
      for (const [key, tab, expectedIds] of [
        ['datasets', 'snapshots', [10, 11]],
        ['downloads', 'downloads', [41, 42, 43]],
      ] as const) {
        {
          const link = page.getByTestId('backups.stats.' + key + '.link');
          await expect(link).toHaveAttribute('href', /unrelated=preserved/);
          await link.focus();
          await expect(link).toBeFocused();
          await page.keyboard.press('Enter');
        }
        await expect(page.getByTestId('backups.' + tab)).toBeVisible();
        await expect(page.getByTestId('backups.filter')).toHaveValue('');
        const p = new URL(page.url()).searchParams;
        expect(p.get('tab')).toBe(tab);
        expect(p.get('unrelated')).toBe('preserved');
        for (const k of ['q', 'dataset', 'intent', 'backup_snapshot_cursor']) expect(p.has(k)).toBe(false);
        const roster = async () =>
          page
            .locator(
              tab === 'snapshots'
                ? '[data-testid^="backups.snapshots.row."]'
                : `[data-testid^="backups.downloads.${mobile ? 'card' : 'row'}."]`
            )
            .evaluateAll((es) =>
              es
                .map((e) => e.getAttribute('data-testid')!)
                .filter((s) => /^backups\.(snapshots\.row|downloads\.(row|card))\.\d+$/.test(s))
                .map((s) => Number(s.split('.').at(-1)))
                .sort((a, b) => a - b)
            );
        await expect.poll(roster).toEqual([...expectedIds]);
        if (language === 'cs' && level === 1)
          await page.screenshot({ path: info.outputPath('after-' + tab + '.png'), fullPage: true });
        await page.reload();
        await expect(page.getByTestId('backups.' + tab)).toBeVisible();
        await expect.poll(roster).toEqual([...expectedIds]);
        {
          await page.goBack();
          await expect(page.getByTestId('backups.overview')).toBeVisible();
          expect(new URL(page.url()).searchParams.get('q')).toBe('missing');
        }
        await expect(page.getByTestId('backups.overview')).toBeVisible();
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
        await page.evaluate(() => innerWidth)
      );
      expect(errors).toEqual([]);
      expect(writes).toEqual([]);
      await info.attach('bak03-roster-proof', {
        body: JSON.stringify({
          source: process.env['AUDIT_TARGET_SHA'],
          language,
          theme: language === 'cs' ? 'dark' : 'light',
          level,
          mobile,
          ids: { datasets: [10, 11], downloads: [41, 42, 43] },
          requests,
          errors,
          writes,
          fixtureOnly: true,
        }),
        contentType: 'application/json',
      });
    });
