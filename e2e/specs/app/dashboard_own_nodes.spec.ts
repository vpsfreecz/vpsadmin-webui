import { expect, test, type Page } from '@playwright/test';
import { bootstrapVpsAdminWindow, installHaveApiMock, setUiSettingsLocalStorage } from '../../fixtures';
import { expectNoDocumentHorizontalOverflow } from '../../helpers/horizontalOverflow';

const nodes = [
  { id: 1, name: 'owned-node-one', status: false, location: { label: 'Praha' } },
  { id: 2, name: 'other-node', status: false, location: { label: 'Brno' } },
  { id: 3, name: 'owned-node-later-page', status: true, location: { label: 'Brno' } },
];
type FixtureState = 'populated' | 'empty' | 'error' | 'foreign' | 'missing' | 'status-id-missing';

async function setup(page: Page, level: number, language: 'cs' | 'en', theme: 'light' | 'dark', nodeScope: 'all' | 'mine' = 'all') {
  await bootstrapVpsAdminWindow(page, {
    sessionToken: 'SYNTHETIC_OWN_NODES',
    webuiNext: { haveApi: { authHeader: 'X-HaveAPI-Auth-Token', metaNamespace: '_meta' }, uiSettings: { persistence: 'server', server: { path: '/webui_user_settings', namespace: 'ui', field: 'settings' } } },
  });
  await setUiSettingsLocalStorage(page, { language, theme });
  const value = { language, theme, dashboard: { density: 'compact', nodeScope } };
  let setting = { id: 1, namespace: 'ui', key: 'settings', value: JSON.stringify(value) };
  const fixture = { state: 'populated' as FixtureState, lookups: [] as string[], statusAuth: [] as boolean[], writes: [] as string[] };
  page.on('request', r => {
    if (['PUT', 'POST', 'PATCH', 'DELETE'].includes(r.method())) fixture.writes.push(`${r.method()} ${new URL(r.url()).pathname}`);
  });
  await installHaveApiMock(page, {
    user: { id: 53, login: 'synthetic-member', level },
    handlers: {
      'GET webui_user_settings': () => ({ webui_user_settings: [setting] }),
      'PUT webui_user_settings/ui/settings': ({ request }) => {
        const payload = request.postDataJSON() as { webui_user_setting: { value: string } };
        setting = { ...setting, value: payload.webui_user_setting.value };
        return { webui_user_setting: setting };
      },
      'GET vpses': ({ url, searchParams }) => {
        if (searchParams.get('_meta[includes]') !== 'node,user') return { vpses: [], _meta: { total_count: 201 } };
        fixture.lookups.push(url.search);
        if (fixture.state === 'error') return { status: 503, contentType: 'application/json', body: JSON.stringify({ status: false, message: 'Synthetic failure' }) };
        if (fixture.state === 'empty') return { vpses: [] };
        const owner = fixture.state === 'foreign' ? 84 : 53;
        if (fixture.state === 'missing') return { vpses: [{ id: 1, user: { id: owner }, node: { id: 99 } }] };
        const from = Number(searchParams.get('vps[from_id]') ?? 0);
        return {
          vpses: from === 0 ? Array.from({ length: 200 }, (_, i) => ({ id: i + 1, user: { id: owner }, node: { id: 1 } }))
            : [{ id: 201, user: { id: owner }, node: { id: 3 } }],
          _meta: { total_count: 201 },
        };
      },
      'GET nodes/public_status': ({ headers }) => {
        const authenticated = headers['x-haveapi-auth-token'] === 'SYNTHETIC_OWN_NODES';
        fixture.statusAuth.push(authenticated);
        // Real API deliberately omits IDs for anonymous callers, even on /app.
        return { nodes: authenticated && fixture.state !== 'status-id-missing' ? nodes : nodes.map(({ id: _id, ...node }) => node) };
      },
      'GET cluster/full_stats': () => ({ cluster: { user_count: 10, vps_count: 201, node_count: 3 } }),
      'GET datasets': () => ({ datasets: [], _meta: { total_count: 0 } }),
      'GET dns_zones': () => ({ dns_zones: [], _meta: { total_count: 0 } }),
      'GET outages': () => ({ outages: [] }),
      'GET news_logs': () => ({ news_logs: [] }),
      'GET security_advisories': () => ({ security_advisories: [] }),
    },
  });
  return { fixture, saved: () => setting.value };
}

for (const actor of [{ mode: 'app', level: 1 }, { mode: 'app', level: 21 }, { mode: 'app', level: 100 }, { mode: 'admin', level: 21 }, { mode: 'admin', level: 100 }] as const)
  for (const language of ['cs', 'en'] as const)
    for (const theme of ['light', 'dark'] as const) {
      test(`@pr-smoke @pr-smoke-mobile own-server choice ${actor.mode}/${actor.level} ${language} ${theme}`, async ({ page, isMobile }, info) => {
        await page.setViewportSize(isMobile ? { width: 320, height: 820 } : { width: 1440, height: 1100 });
        const { fixture, saved } = await setup(page, actor.level, language, theme, actor.mode === 'admin' ? 'mine' : 'all');
        await page.goto(`/${actor.mode}?user=84`);
        const card = page.getByTestId('app.dashboard.cluster.card');
        if (actor.mode === 'admin') {
          await expect(card.getByTestId('app.dashboard.cluster.scope')).toHaveCount(0);
          await expect(card.getByTestId('app.dashboard.cluster.scope.retry')).toHaveCount(0);
          await expect(card.getByTestId('app.dashboard.cluster.availability')).toHaveText('1/3 online');
          expect(fixture.lookups).toEqual([]);
          expect(fixture.statusAuth.length).toBeGreaterThan(0);
          expect(fixture.statusAuth.every(Boolean)).toBe(true);
          await expect.poll(saved).toContain('"nodeScope":"mine"');
          await page.reload();
          await expect(card.getByTestId('app.dashboard.cluster.scope')).toHaveCount(0);
          await expect(card.getByTestId('app.dashboard.cluster.availability')).toHaveText('1/3 online');
          expect(fixture.lookups).toEqual([]);
          await card.screenshot({ path: info.outputPath('admin-all-servers.png') });
          await expectNoDocumentHorizontalOverflow(page);
          // The saved personal choice still applies when returning to My view.
          await page.goto('/app?user=84');
          await expect(card.getByTestId('app.dashboard.cluster.scope')).toHaveValue('mine');
          await expect(card.getByTestId('app.dashboard.cluster.availability')).toHaveText('1/2 online');
          expect(fixture.lookups.every(query => new URLSearchParams(query).get('vps[user]') === (actor.level >= 90 ? '53' : null))).toBe(true);
          return;
        }
        const select = card.getByTestId('app.dashboard.cluster.scope');
        await expect(select).toHaveValue('all');
        await expect(card.getByText('other-node', { exact: true }).filter({ visible: true })).toBeVisible();
        expect(fixture.lookups).toEqual([]);
        const originalUrl = page.url();
        await select.selectOption('mine');
        await expect(card.getByTestId('app.dashboard.cluster.availability')).toHaveText('1/2 online');
        await expect(card.getByText('other-node', { exact: true })).toHaveCount(0);
        await expect(card.getByText('owned-node-later-page', { exact: true }).filter({ visible: true })).toBeVisible();
        await expect.poll(saved).toContain('"nodeScope":"mine"');
        expect(fixture.lookups.some(query => new URLSearchParams(query).get('vps[from_id]') === '200')).toBe(true);
        expect(fixture.lookups.every(query => new URLSearchParams(query).get('vps[user]') === (actor.level >= 90 ? '53' : null))).toBe(true);
        expect(fixture.statusAuth.length).toBeGreaterThan(0);
        expect(fixture.statusAuth.every(Boolean)).toBe(true);
        await expect(page).toHaveURL(originalUrl);
        expect((await select.boundingBox())?.height).toBe(isMobile ? 44 : 36);
        if (!isMobile) {
          const collapseBox = await card.getByTestId('app.dashboard.widget.cluster.collapse').boundingBox();
          expect(Math.abs((await select.boundingBox())!.y - collapseBox!.y)).toBeLessThanOrEqual(1);
        }
        await select.focus();
        await page.keyboard.press('Tab');
        await expect(card.getByTestId('app.dashboard.widget.cluster.collapse')).toBeFocused();
        await page.keyboard.press('Shift+Tab');
        await expect(select).toBeFocused();
        await card.screenshot({ path: info.outputPath('own-servers.png') });
        if (language === 'cs' && theme === 'light') {
          await page.evaluate(() => window.scrollTo(0, 0));
          await page.screenshot({ path: info.outputPath('own-servers-page.png'), fullPage: true });
        }
        await expectNoDocumentHorizontalOverflow(page);
        await page.reload();
        await expect(select).toHaveValue('mine');
        await expect(card.getByTestId('app.dashboard.cluster.availability')).toHaveText('1/2 online');
        await card.getByTestId('app.dashboard.widget.cluster.collapse').click();
        await expect(card.getByTestId('app.dashboard.cluster.groups')).toHaveCount(0);
        await expect(select).toBeVisible();
        await select.selectOption('all');
        await card.getByTestId('app.dashboard.widget.cluster.collapse').click();
        await expect(card.getByText('other-node', { exact: true }).filter({ visible: true })).toBeVisible();
        await expect(card.getByTestId('app.dashboard.cluster.availability')).toHaveText('1/3 online');
        expect(fixture.writes.filter(w => w !== 'PUT /api/v7.0/webui_user_settings/ui/settings')).toEqual([]);
      });
    }

for (const state of ['empty', 'error', 'foreign', 'missing', 'status-id-missing'] as const) {
  test(`@pr-smoke @pr-smoke-mobile own-server choice preserves ${state} state`, async ({ page }) => {
    const { fixture } = await setup(page, 100, 'cs', 'light');
    fixture.state = state;
    await page.goto('/app');
    const card = page.getByTestId('app.dashboard.cluster.card');
    await card.getByTestId('app.dashboard.cluster.scope').selectOption('mine');
    if (state === 'empty') {
      await expect(card.getByText('Nemáš žádné VPS.', { exact: true })).toBeVisible();
    } else {
      await expect(card.getByText('Servery s tvými VPS se nepodařilo určit.', { exact: true })).toBeVisible();
      await expect(card.getByTestId('app.dashboard.cluster.availability')).toHaveCount(0);
      fixture.state = 'populated';
      await card.getByTestId('app.dashboard.cluster.scope.retry').click();
      await expect(card.getByTestId('app.dashboard.cluster.availability')).toHaveText('1/2 online');
    }
    await card.getByTestId('app.dashboard.cluster.scope').selectOption('all');
    await expect(card.getByText('other-node', { exact: true }).filter({ visible: true })).toBeVisible();
  });
}
