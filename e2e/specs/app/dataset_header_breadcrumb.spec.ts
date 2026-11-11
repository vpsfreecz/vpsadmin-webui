import { expect, test } from '@playwright/test';
import { bootstrapVpsAdminWindow, installHaveApiMock, setUiSettingsLocalStorage } from '../../fixtures';

const actors = [
  { name: 'member', base: '/app', level: 1, owner: 7 },
  { name: 'admin', base: '/admin', level: 99, owner: 42 },
  { name: 'admin-My', base: '/app', level: 99, owner: 7 },
  { name: 'support-My', base: '/app', level: 21, owner: 7 },
  { name: 'support', base: '/admin', level: 21, owner: 42 },
] as const;
const fullName = 'tank/vps/synteticky-dlouhy-nazev-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa/data';

for (const [index, actor] of actors.entries())
  for (const kind of ['nas', 'vps'] as const) {
    // A finite pairwise matrix covers all four language/theme combinations in
    // each browser profile, plus every relevant member/admin/My/support context.
    const language = (index + (kind === 'vps' ? 1 : 0)) % 2 ? 'cs' : 'en';
    const theme = index === 2 || index === 3 ? (kind === 'nas' ? 'dark' : 'light') : kind === 'nas' ? 'light' : 'dark';
    test(`@pr-smoke @pr-smoke-mobile Dataset breadcrumb ${actor.name} ${kind} ${language} ${theme}`, async ({
      page,
      isMobile,
    }, info) => {
      const errors: string[] = [],
        writes: string[] = [];
      page.on('pageerror', (error) => errors.push(String(error)));
      page.on('request', (request) => {
        if (request.url().includes('/api/') && !['GET', 'HEAD', 'OPTIONS'].includes(request.method()))
          writes.push(request.method() + ' ' + request.url());
      });
      await page.setViewportSize({ width: isMobile ? 320 : 1280, height: 900 });
      await page.clock.setFixedTime(new Date('2026-11-11T17:00:00Z'));
      await bootstrapVpsAdminWindow(page, {
        sessionToken: 'TEST',
        webuiNext: { uiSettings: { persistence: 'local' } },
      });
      await setUiSettingsLocalStorage(page, { language, theme });
      const name = kind === 'nas' ? '2943' : fullName;
      const dataset = {
        id: 8675,
        name: kind === 'nas' ? name : 'short-alias',
        full_name: name,
        user: { id: actor.owner, login: 'synthetic-owner' },
        parent: null,
        vps: kind === 'vps' ? { id: 20, hostname: 'synthetic-vps.example.test', user: { id: actor.owner } } : null,
        role: 'primary',
        object_state: 'active',
        used: 1024,
        avail: 10240,
        quota: 0,
        refquota: 10240,
        recordsize: 131072,
        compression: true,
        atime: false,
        relatime: false,
        sync: 'standard',
        snapshots_count: 0,
        mount_count: 0,
        export_count: 0,
      };
      await installHaveApiMock(page, {
        user: { id: 7, login: 'synthetic-viewer', level: actor.level },
        handlers: {
          'GET datasets/8675': () => ({ dataset }),
          'GET datasets': () => ({ datasets: [dataset], _meta: { total_count: 1 } }),
          'GET transaction_chains': ({ searchParams }) => ({
            transaction_chains:
              kind === 'vps' && searchParams.get('transaction_chain[row_id]') === '8675'
                ? [{ id: 901, state: 'queued', label: 'Synthetic dataset operation', user: { id: actor.owner } }]
                : [],
          }),
          'GET help_boxes': () => ({ help_boxes: [] }),
          'GET action_states': () => ({ action_states: [] }),
        },
      });
      const section = kind === 'nas' ? 'nas' : 'datasets';
      const path = `${actor.base}/${section}/8675`;
      const returnPath = kind === 'vps' && actor.base === '/app' ? '/app/vps/20/storage' : `${actor.base}/${section}`;
      const returnLabel =
        kind === 'nas'
          ? 'NAS'
          : actor.base === '/app'
            ? language === 'cs'
              ? 'Úložiště'
              : 'Storage'
            : language === 'cs'
              ? 'Datasety'
              : 'Datasets';
      await page.goto(path);
      const header = page.getByTestId('dataset.header');
      const breadcrumb = header.getByRole('navigation', {
        name: language === 'cs' ? 'Cesta datasetu' : 'Dataset path',
      });
      await expect(breadcrumb).toBeVisible();
      const title = header.getByRole('heading', { level: 1 });
      const labelledName = (language === 'cs' ? 'Název datasetu: ' : 'Dataset name: ') + name;
      await expect(title).toHaveText(labelledName);
      await expect(breadcrumb.locator('[aria-current="page"]')).toHaveText(labelledName);
      const idLabel = language === 'cs' ? 'Interní ID: #8675' : 'Internal ID: #8675';
      await expect(breadcrumb.getByText(idLabel, { exact: true })).toHaveCount(1);
      await expect(title).not.toContainText(idLabel);
      await expect.poll(() => page.title()).toContain(name);
      expect(await page.title()).not.toContain(idLabel);
      const back = breadcrumb.getByRole('link', { name: returnLabel, exact: true });
      await expect(back).toHaveAttribute('href', returnPath);
      if (kind === 'vps') {
        await expect(
          header.getByRole('link', { name: 'VPS: synthetic-vps.example.test', exact: true })
        ).toHaveAttribute('href', `${actor.base}/vps/20`);
        const busy = header.getByText(language === 'cs' ? 'Probíhá operace' : 'Busy', { exact: true });
        await expect(busy).toBeVisible();
        await expect(busy).toHaveAttribute('title', /#901/);
        // Exercise the existing 60s stale TTL and loss of authoritative Busy
        // without an API mutation or
        // a fixture that pretends to certify live backend permissions.
        await page.waitForLoadState('networkidle');
        await page.clock.setFixedTime(new Date('2026-11-11T17:01:01Z'));
        await page.evaluate(() => window.dispatchEvent(new Event('offline')));
        await expect(page.getByTestId('stale.lock.alert')).toBeVisible();
        await expect(page.getByTestId('stale.lock.alert.last-known')).toContainText('#901');
        await expect(busy).toHaveCount(0);
        await page.evaluate(() => window.dispatchEvent(new Event('online')));
        await expect(page.getByTestId('stale.lock.alert')).toHaveCount(0);
        await expect(busy).toBeVisible();
      }
      const bounds = await title.evaluate((element) => {
        const box = element.getBoundingClientRect();
        const range = document.createRange();
        range.selectNodeContents(element);
        return {
          box: { left: box.left, right: box.right },
          text: Array.from(range.getClientRects(), (r) => ({ left: r.left, right: r.right })),
          document: document.documentElement.scrollWidth,
          viewport: document.documentElement.clientWidth,
        };
      });
      expect(bounds.document).toBeLessThanOrEqual(bounds.viewport + 1);
      for (const rect of bounds.text) {
        expect(rect.left).toBeGreaterThanOrEqual(bounds.box.left - 1);
        expect(rect.right).toBeLessThanOrEqual(bounds.box.right + 1);
      }
      const snapshotTab = header.getByRole('link', {
        name: language === 'cs' ? 'Snapshoty' : 'Snapshots',
        exact: true,
      });
      await expect(snapshotTab).toHaveAttribute('href', path + '/snapshots');
      await snapshotTab.focus();
      await page.keyboard.press('Enter');
      await expect.poll(() => new URL(page.url()).pathname).toBe(path + '/snapshots');
      await expect(snapshotTab).toHaveAttribute('aria-current', 'page');
      await expect(title).toHaveText(labelledName);
      await page.waitForLoadState('networkidle');
      if (isMobile) await back.tap();
      else {
        await back.focus();
        await page.keyboard.press('Enter');
      }
      await expect.poll(() => new URL(page.url()).pathname).toBe(returnPath);
      await page.waitForLoadState('networkidle');
      expect(errors).toEqual([]);
      expect(writes).toEqual([]);
      await info.attach('dataset-breadcrumb-contract', {
        body: JSON.stringify({
          actor,
          kind,
          language,
          theme,
          path,
          returnPath,
          labelledName,
          idLabel,
          bounds,
          errors,
          writes,
          fixtureOnly: true,
        }),
        contentType: 'application/json',
      });
    });
  }
