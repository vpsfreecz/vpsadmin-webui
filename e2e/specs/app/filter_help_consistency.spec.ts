import { expect, test } from '@playwright/test';
import { bootstrapVpsAdminWindow, installHaveApiMock, setUiSettingsLocalStorage } from '../../fixtures';
import { clickShellControl } from '../../helpers/shellNavigation';

const actors = [
  { name: 'member', base: '/app', level: 1, owner: null },
  { name: 'admin', base: '/admin', level: 99, owner: null },
  { name: 'admin-My', base: '/app', level: 99, owner: '7' },
  { name: 'support-My', base: '/app', level: 21, owner: '7' },
] as const;
for (const actor of actors)
  for (const surface of ['nas', 'snapshots', 'tasks'] as const) {
    // Backup Center is a My-view route; administrator coverage uses admin-My.
    if (actor.name === 'admin' && surface === 'snapshots') continue;
    test(`@pr-smoke @pr-smoke-mobile filter help ${actor.name} ${surface}`, async ({ page }, info) => {
      const mobile = info.project.name.startsWith('mobile');
      const language = mobile ? 'cs' : 'en';
      await page.setViewportSize({ width: mobile ? 320 : 1280, height: 900 });
      const errors: string[] = [],
        writes: string[] = [],
        reads: string[] = [];
      page.on('pageerror', (error) => errors.push(String(error)));
      page.on('request', (request) => {
        if (!request.url().includes('/api/')) return;
        if (request.method() === 'GET') reads.push(request.url());
        else if (!['HEAD', 'OPTIONS'].includes(request.method())) writes.push(request.method() + ' ' + request.url());
      });
      await page.clock.install({ time: new Date('2026-11-11T17:00:00Z') });
      await bootstrapVpsAdminWindow(page, {
        sessionToken: 'TEST',
        webuiNext: { uiSettings: { persistence: 'local' } },
      });
      await setUiSettingsLocalStorage(page, { language, theme: mobile ? 'dark' : 'light' });
      const datasets = [
        {
          id: 10,
          name: 'root',
          full_name: 'synthetic/root',
          vps: { id: 20, hostname: 'synthetic-vps' },
          user: { id: 7 },
          role: 'primary',
          object_state: 'active',
        },
        {
          id: 11,
          name: 'archive',
          full_name: 'synthetic/archive',
          vps: null,
          user: { id: 7 },
          role: 'primary',
          object_state: 'active',
        },
      ];
      const action = { id: 910, label: 'Synthetic operation', status: true, finished: true, current: 1, total: 1 };
      await page.addInitScript(() => {
        sessionStorage.setItem(
          'webui-next.tracked_action_states.user-7',
          JSON.stringify([
            {
              id: 910,
              addedAt: Date.now(),
              actionLabel: 'Synthetic operation',
              objectLabel: 'SyntheticTarget',
              object: { kind: 'Vps', id: 20 },
            },
          ])
        );
      });
      await installHaveApiMock(page, {
        user: { id: 7, login: 'synthetic-viewer', level: actor.level },
        handlers: {
          'GET datasets': ({ searchParams }) => {
            expect(searchParams.get('dataset[user]')).toBe(actor.owner);
            if (surface === 'snapshots') expect(searchParams.get('dataset[q]')).toBeNull();
            return { datasets, _meta: { total_count: 2 } };
          },
          'GET vpses': () => ({ vpses: [], _meta: { total_count: 0 } }),
          'GET snapshot_downloads': () => ({ snapshot_downloads: [], _meta: { total_count: 0 } }),
          'GET help_boxes': () => ({ help_boxes: [] }),
          'GET action_states': () => ({ action_states: [action], _meta: { total_count: 1 } }),
          'GET action_states/910': () => ({ action_state: action }),
          'GET transaction_chains/910': () => ({
            transaction_chain: {
              id: 910,
              label: 'Synthetic operation',
              state: 'done',
              progress: 1,
              size: 1,
              user: { id: 7 },
            },
          }),
          'GET transaction_chains': () => ({
            transaction_chains: [
              { id: 901, label: 'Other transaction', state: 'done', progress: 1, size: 1, user: { id: 7 } },
            ],
            _meta: { total_count: 1 },
          }),
        },
      });
      await page.goto(
        `${actor.base}/${surface === 'snapshots' ? 'backups?tab=snapshots' : 'nas?q=archive'}#filter-help`
      );
      if (surface === 'tasks') await clickShellControl(page, 'tasks.open-button', mobile);
      const input = page.getByTestId(
        surface === 'nas' ? 'datasets.search.input' : surface === 'tasks' ? 'tasks.filter-input' : 'backups.filter'
      );
      await expect(input).toBeVisible();
      const query = surface === 'nas' ? 'q:pending' : surface === 'tasks' ? 'SYNTHETICTARGET' : 'ARCHIVE';
      await input.fill(query);
      if (surface === 'nas') expect(new URL(page.url()).searchParams.get('q')).toBe('archive');
      if (surface === 'snapshots') {
        await expect(page.getByTestId(`backups.snapshots.row.11`)).toBeVisible();
        await expect(page.getByTestId(`backups.snapshots.row.10`)).toHaveCount(0);
      }
      if (surface === 'tasks') {
        await expect(page.getByTestId('tasks.row.910')).toBeVisible();
        await expect(page.getByTestId('tasks.chain.row.901')).toHaveCount(0);
      }
      await page.waitForLoadState('networkidle');
      // Freeze periodic polling after initial reads; keep all no-extra-read assertions.
      await page.clock.pauseAt(new Date('2026-11-11T17:01:00Z'));
      await page.waitForLoadState('networkidle');
      const originalUrl = page.url(),
        originalInput = await input.inputValue(),
        beforeReads = reads.length;
      const help =
        surface === 'nas'
          ? page
              .getByTestId('datasets.list.filters')
              .getByRole('button', { name: language === 'cs' ? 'Nápověda' : 'Help', exact: true })
          : page.getByTestId(surface === 'tasks' ? 'tasks.filter.help' : 'backups.filter.help');
      await expect(help).toHaveAccessibleName(language === 'cs' ? 'Nápověda' : 'Help');
      const box = await help.boundingBox();
      expect(box!.width).toBeGreaterThanOrEqual(44);
      expect(box!.height).toBeGreaterThanOrEqual(44);
      expect((await input.boundingBox())!.height).toBe(box!.height);
      const dialog = page.getByRole('dialog', {
        name:
          surface === 'nas'
            ? language === 'cs'
              ? 'Filtry datasetů'
              : 'Dataset filters'
            : surface === 'tasks'
              ? language === 'cs'
                ? 'Nápověda k filtru úloh'
                : 'Task filter help'
              : language === 'cs'
                ? 'Nápověda k filtru záloh'
                : 'Backup filter help',
      });
      for (const method of ['pointer', 'Enter', 'Space'] as const) {
        if (method === 'pointer') {
          if (mobile) await help.tap();
          else await help.click();
        } else {
          await help.focus();
          await page.keyboard.press(method);
        }
        await page.clock.runFor(32);
        await expect(dialog).toBeVisible();
        if (surface === 'snapshots')
          await expect(dialog).toContainText(
            language === 'cs'
              ? 'jednotlivé snapshoty ani plány se neprohledávají'
              : 'does not search individual snapshots or plans'
          );
        if (surface === 'tasks')
          await expect(dialog).toContainText(
            language === 'cs' ? 'Neprohledává celou historii' : 'does not search the full history'
          );
        if (surface === 'nas') await expect(dialog).toContainText('q:foo');
        if (method === 'pointer') {
          const imagePath = info.outputPath('help-visible.png');
          await page.screenshot({ path: imagePath });
          await info.attach('help-visible', { path: imagePath, contentType: 'image/png' });
          await dialog.getByRole('button', { name: language === 'cs' ? 'Zavřít' : 'Close', exact: true }).click();
        } else await page.keyboard.press('Escape');
        await expect(dialog).toHaveCount(0);
        await expect(help).toBeFocused();
        await expect(input).toHaveValue(originalInput);
        expect(page.url()).toBe(originalUrl);
        if (surface === 'tasks') await expect(page.getByTestId('tasks.drawer')).toBeVisible();
      }
      await page.waitForLoadState('networkidle');
      expect(reads.length).toBe(beforeReads);
      expect(writes).toEqual([]);
      expect(errors).toEqual([]);
      const bounds = await page.evaluate(() => ({
        scroll: document.documentElement.scrollWidth,
        width: document.documentElement.clientWidth,
      }));
      expect(bounds.scroll).toBeLessThanOrEqual(bounds.width + 1);
      await info.attach('filter-help-contract', {
        body: JSON.stringify({
          actor,
          surface,
          originalUrl,
          query,
          originalInput,
          beforeReads,
          afterReads: reads.length,
          bounds,
          errors,
          writes,
          fixtureOnly: true,
        }),
        contentType: 'application/json',
      });
    });
  }
