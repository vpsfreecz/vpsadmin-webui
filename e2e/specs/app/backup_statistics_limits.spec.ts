import { expect, test } from '@playwright/test';
import { bootstrapVpsAdminWindow, failEnvelope, installHaveApiMock, setUiSettingsLocalStorage } from '../../fixtures';
for (const level of [1, 99])
  for (const scene of ['datasets-partial', 'downloads-partial', 'metadata-error', 'empty'] as const)
    test(`@pr-smoke @pr-smoke-mobile BAK03 truthful target ${scene} My level${level}`, async ({ page }, info) => {
      await page.setViewportSize(
        info.project.name.includes('mobile') ? { width: 320, height: 844 } : { width: 1440, height: 1000 }
      );
      const errors: string[] = [],
        writes: string[] = [];
      page.on('pageerror', (e) => errors.push(e.message));
      page.on('request', (r) => {
        if (new URL(r.url()).pathname.includes('/api/') && !['GET', 'HEAD', 'OPTIONS'].includes(r.method()))
          writes.push(r.method());
      });
      await bootstrapVpsAdminWindow(page, {
        sessionToken: 'TEST',
        webuiNext: { uiSettings: { persistence: 'local' } },
      });
      await setUiSettingsLocalStorage(page, { language: 'cs', theme: 'dark' });
      const ds = { id: 10, name: 'synthetic-only', full_name: 'synthetic/only', user: { id: 42 } },
        dl = {
          id: 41,
          state: 'ready',
          format: 'archive',
          url: '/download/41',
          snapshot: { id: 31, name: 'synthetic-only', dataset: { id: 10 } },
        };
      await installHaveApiMock(page, {
        user: { id: 42, login: 'synthetic-owner', level },
        handlers: {
          'GET datasets': () =>
            scene === 'metadata-error'
              ? failEnvelope('Synthetic unavailable', 503)
              : {
                  datasets: scene === 'empty' ? [] : [ds],
                  _meta: { total_count: scene === 'datasets-partial' ? 2 : scene === 'empty' ? 0 : 1 },
                },
          'GET snapshot_downloads': () => ({
            snapshot_downloads: scene === 'empty' ? [] : [dl],
            _meta: { total_count: scene === 'downloads-partial' ? 2 : scene === 'empty' ? 0 : 1 },
          }),
          'GET help_boxes': () => ({ help_boxes: [] }),
          'GET action_states': () => ({ action_states: [] }),
        },
      });
      await page.route('**/api/**', (r) =>
        !['GET', 'HEAD', 'OPTIONS'].includes(r.request().method()) ? r.abort() : r.fallback()
      );
      await page.goto('/app/backups');
      if (scene === 'metadata-error' && level === 99) {
        await expect(page.getByTestId('backups.error')).toBeVisible();
        await expect(page.getByTestId('backups.stats.datasets.link')).toHaveCount(0);
        await expect(page.getByTestId('backups.stats.downloads.link')).toHaveCount(0);
      } else {
        await expect(page.getByTestId('backups.overview')).toBeVisible();
        const dsComplete = !['datasets-partial', 'metadata-error'].includes(scene),
          dlComplete = scene !== 'downloads-partial' && (level === 1 || dsComplete);
        await expect(page.getByTestId('backups.stats.datasets.link')).toHaveCount(dsComplete ? 1 : 0);
        await expect(page.getByTestId('backups.stats.downloads.link')).toHaveCount(dlComplete ? 1 : 0);
        for (const k of ['ready', 'pending', 'unavailable'])
          await expect(page.getByTestId('backups.stats.' + k).locator('a,button')).toHaveCount(0);
        if (scene === 'datasets-partial') await expect(page.getByTestId('backups.stats.datasets')).toContainText('≥ 1');
        if (scene === 'downloads-partial')
          await expect(page.getByTestId('backups.stats.downloads')).toContainText('≥ 1');
        if (scene === 'empty') {
          await expect(page.getByTestId('backups.stats.datasets')).toContainText('0');
          await page.getByTestId('backups.stats.datasets.link').click();
          await expect(page.getByTestId('backups.snapshots')).toBeVisible();
          await expect(page.getByTestId('backups.snapshots.row.10')).toHaveCount(0);
        }
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
        await page.evaluate(() => innerWidth)
      );
      expect(errors).toEqual([]);
      expect(writes).toEqual([]);
      await info.attach('bak03-limits-proof', {
        body: JSON.stringify({ scene, level, errors, writes, fixtureOnly: true }),
        contentType: 'application/json',
      });
    });
