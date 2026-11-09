import { expect, test, type Page } from '@playwright/test';
import { bootstrapVpsAdminWindow, failEnvelope, installHaveApiMock, jsonFulfill, setUiSettingsLocalStorage } from '../../fixtures';
import { expectNoDocumentHorizontalOverflow } from '../../helpers/horizontalOverflow';
const vps = {
  id: 123,
  hostname: 'vps123.example',
  object_state: 'active',
  is_running: true,
  enable_network: true,
  cpu: 2,
  memory: 2048,
  swap: 0,
  diskspace: 20480,
  used_memory: 768,
  used_swap: 0,
  used_diskspace: 5120,
  uptime: 12345,
  loadavg1: 0.12,
  dataset: { id: 10, name: 'tank/data' },
  node: {
    id: 1,
    domain_name: 'node1.example',
    location: { id: 2, label: 'Praha', remote_console_server: '/_console', environment: { id: 1, label: 'prod' } },
  },
  user: { id: 10, login: 'alice' },
  os_template: { id: 6, label: 'Debian 12' },
  dns_resolver: null,
};

const actors = [
  { id: 'member', path: '/app', level: 1, page: 'dashboard', action: 'index' },
  { id: 'admin', path: '/admin', level: 99, page: 'dashboard', action: 'admin_index' },
  { id: 'support-object', path: '/app/vps/123', level: 21, page: 'vps', action: 'overview' },
  { id: 'public-news', path: '/news', level: 0, page: 'news', action: 'list' },
  { id: 'public-overview', path: '/', level: 0, page: 'public', action: 'index' },
] as const;
type Actor = typeof actors[number];

async function setup(page: Page, actor: Actor, language: 'cs' | 'en', theme: 'light' | 'dark') {
  const authenticated = actor.level > 0;
  await bootstrapVpsAdminWindow(page, {
    sessionToken: authenticated ? 'SYNTHETIC_PAGE_HELP' : '',
    webuiNext: { haveApi: { authHeader: 'X-HaveAPI-Auth-Token', metaNamespace: '_meta' }, uiSettings: { persistence: 'server', server: { path: '/webui_user_settings', namespace: 'ui', field: 'settings' } } },
  });
  await setUiSettingsLocalStorage(page, { language, theme });
  await page.addInitScript(() => {
    localStorage.setItem('vpsadmin.contextualHelp.expanded.v1', '1');
    localStorage.setItem('vpsadmin.contextualHelp.placement.v1', 'bottom');
  });
  const queries: Array<{ page: string | null; action: string | null; view: string | null; authenticated: boolean }> = [];
  const writes: string[] = [];
  const state = { kind: 'available' as 'available' | 'empty' | 'blank' | 'error' };
  page.on('request', request => {
    const url = new URL(request.url());
    if (url.pathname.includes('/help_boxes')) queries.push({ page: url.searchParams.get('help_box[page]'), action: url.searchParams.get('help_box[action]'), view: url.searchParams.get('help_box[view]'), authenticated: request.headers()['x-haveapi-auth-token'] === 'SYNTHETIC_PAGE_HELP' });
    if (url.pathname.includes('/api/') && !['GET', 'HEAD', 'OPTIONS'].includes(request.method())) writes.push(request.method() + ' ' + url.pathname);
  });
  const first = language === 'cs' ? 'První část nápovědy' : 'First help section';
  const last = language === 'cs' ? 'Konec dlouhé nápovědy' : 'End of the long help';
  const link = language === 'cs' ? 'Odkaz na příručku' : 'Guide link';
  await installHaveApiMock(page, {
    user: { id: 10, login: 'synthetic-help-user', level: actor.level || 1 },
    handlers: {
      'GET users/current': () => authenticated
        ? { user: { id: 10, login: 'synthetic-help-user', level: actor.level } }
        : jsonFulfill(failEnvelope('Synthetic anonymous identity'), 401),
      'GET webui_user_settings': () => ({ webui_user_settings: [{ id: 1, namespace: 'ui', key: 'settings', value: JSON.stringify({ language, theme }) }] }),
      'GET vpses/123': () => ({ vps }),
      'GET vpses/124': () => jsonFulfill(failEnvelope('Synthetic VPS load failure'), 503),
      'GET vpses': () => ({ vpses: [], _meta: { total_count: 0 } }),
      'GET dns_zones': () => ({ dns_zones: [], _meta: { total_count: 0 } }),
      'GET nodes/public_status': () => ({ nodes: [] }),
      'GET cluster/full_stats': () => ({ cluster: { user_count: 1, vps_count: 0, node_count: 0 } }),
      'GET cluster/public_stats': () => ({ cluster: { user_count: 1, vps_count: 0, ipv4_left: 0 } }),
      'GET news_logs': () => ({ news_logs: [] }),
      'GET security_advisories': () => ({ security_advisories: [] }),
      'GET outages': () => ({ outages: [] }),
      'GET languages': () => ({ languages: [] }),
      'GET transaction_chains': () => ({ transaction_chains: [] }),
      'GET help_boxes': ({ searchParams }) => {
        if (state.kind === 'error') return jsonFulfill(failEnvelope('Synthetic help failure'), 503);
        if (state.kind === 'empty') return { help_boxes: [] };
        if (state.kind === 'blank') return { help_boxes: [{ id: 401, content: '   ' }] };
        const context = `${searchParams.get('help_box[page]')}/${searchParams.get('help_box[action]')}`;
        return { help_boxes: [
          { id: 402, order: 20, content: '<h2>Second section</h2>' + Array.from({ length: 35 }, (_, i) => `<p>Paragraph ${i + 1}: synthetic content with a deliberately long explanation for a scrollable help dialog.</p>`).join('') + `<p>${last}</p>` },
          { id: 401, order: 10, content: `<h2>${first}</h2><p><strong>Formatting preserved</strong></p><p>${context}</p><table><tr><th>Key</th><td>Value</td></tr></table><a href="https://kb.example.test/guide">${link}</a>` },
        ] };
      },
    },
  });
  return { queries, writes, state, first, last, link };
}

for (const actor of actors) for (const language of ['cs', 'en'] as const) for (const theme of ['light', 'dark'] as const) {
  // One representative per surface in PR smoke; the whole matrix runs on the clean package.
  const smoke = language === (actor.id === 'admin' || actor.id === 'public-news' ? 'en' : 'cs') &&
    theme === (actor.id === 'member' || actor.id === 'public-news' ? 'dark' : 'light');
  test(`${smoke ? '@pr-smoke @pr-smoke-mobile ' : ''}contextual help modal ${actor.id} ${language} ${theme}`, async ({ page, isMobile, browserName }, info) => {
    await page.setViewportSize(isMobile ? { width: 320, height: 820 } : { width: 1440, height: 1100 });
    const data = await setup(page, actor, language, theme);
    await page.goto(actor.path);
    const trigger = page.getByTestId('contextual.help.toggle');
    const title = language === 'cs' ? 'Nápověda k této stránce' : 'Page help';
    await expect(trigger).toBeVisible(); await expect(trigger).toHaveCount(1);
    await expect(trigger).toHaveAttribute('title', title);
    await expect(trigger).toHaveAttribute('aria-label', title);
    await expect(trigger).toHaveAttribute('aria-haspopup', 'dialog');
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
    await expect(page.getByTestId('contextual.help.panel')).toHaveCount(0);
    await expect(page.getByTestId('contextual.help.manage')).toHaveCount(0);
    expect(await trigger.evaluate(button => Boolean(button.parentElement?.parentElement?.querySelector('h1')))).toBe(true);
    const activate = async () => {
      if (isMobile) await trigger.tap();
      else { await trigger.focus(); await page.keyboard.press('Enter'); }
    };
    await activate();
    const dialog = page.getByTestId('contextual.help.dialog');
    await expect(dialog).toBeVisible(); await expect(dialog).toHaveAttribute('aria-modal', 'true');
    const box = (await dialog.boundingBox())!;
    expect(box.width).toBeLessThanOrEqual(isMobile ? 288 : 800);
    if (!isMobile) expect(box.width).toBeGreaterThanOrEqual(650);
    expect(Math.abs(box.x - ((isMobile ? 320 : 1440) - box.width) / 2)).toBeLessThanOrEqual(1);
    if (isMobile) {
      expect((await trigger.boundingBox())!.height).toBeGreaterThanOrEqual(44);
      expect((await trigger.boundingBox())!.width).toBeGreaterThanOrEqual(44);
    }
    const first = page.frameLocator('[data-testid="contextual.help.box.401"] iframe');
    await expect(first.getByRole('heading', { name: data.first })).toBeVisible();
    await expect(first.getByRole('link', { name: data.link })).toHaveAttribute('href', 'https://kb.example.test/guide');
    await expect(first.locator('strong')).toHaveText('Formatting preserved');
    await expect(first.getByRole('table')).toHaveCount(1);
    await expect(dialog.locator('iframe').first()).toHaveAttribute('title', language === 'cs' ? 'Nápověda 401' : 'Help box 401');
    await expect(dialog.locator('iframe').first()).toHaveAttribute('sandbox', 'allow-same-origin');
    await expect(page.getByTestId('contextual.help.manage')).toHaveCount(actor.level >= 21 ? 1 : 0);
    if (actor.level >= 21) await expect(page.getByTestId('contextual.help.manage')).toHaveAttribute('href', `/admin/content/help-boxes?page=${actor.page}&action=${actor.action}`);
    await expect.poll(() => data.queries.length).toBeGreaterThan(0);
    expect(data.queries.some(q => q.page === actor.page && q.action === actor.action && q.view === 'true' && q.authenticated === (actor.level > 0))).toBe(true);
    // Native Tab must reach sandboxed links while staying inside the existing modal trap.
    await page.getByTestId('contextual.help.close').focus();
    let frameReached = false;
    for (let i = 0; i < 8; i++) {
      await page.keyboard.press('Tab');
      const focus = await dialog.evaluate(el => ({ inside: el.contains(document.activeElement), frame: document.activeElement?.tagName === 'IFRAME' }));
      expect(focus.inside).toBe(true); frameReached ||= focus.frame;
    }
    expect(frameReached).toBe(true);
    await first.getByRole('link', { name: data.link }).focus();
    if (browserName === 'webkit') {
      // WebKit does not dispatch Escape in this script-free srcdoc. Preserve
      // the sandbox and verify the native Tab route back to a dialog control.
      for (let i = 0; i < 6 && await page.evaluate(() => document.activeElement?.tagName === 'IFRAME'); i++) {
        await page.keyboard.press('Tab');
      }
      expect(await dialog.evaluate(el => el.contains(document.activeElement) && document.activeElement?.tagName !== 'IFRAME')).toBe(true);
    }
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0); await expect(trigger).toBeFocused();
    await activate();
    await page.locator('[data-overlay-backdrop="true"]').click({ position: { x: 2, y: 2 } });
    await expect(dialog).toHaveCount(0); await expect(trigger).toBeFocused();
    await activate();
    const scroll = dialog.locator('div.overflow-y-auto').first();
    await expect.poll(() => scroll.evaluate(el => el.scrollHeight - el.clientHeight)).toBeGreaterThan(400);
    const last = page.frameLocator('[data-testid="contextual.help.box.402"] iframe').getByText(data.last, { exact: true });
    await expect(last).toBeAttached();
    // Move the dialog's own scroll container. A cross-frame locator may consider
    // text visible inside the iframe even while the dialog clips that iframe.
    await scroll.evaluate(el => { el.scrollTop = el.scrollHeight; });
    await expect.poll(() => scroll.evaluate(el => el.scrollTop)).toBeGreaterThan(0);
    await expect.poll(async () => {
      const viewport = await scroll.boundingBox();
      const paragraph = await last.boundingBox();
      return Boolean(viewport && paragraph &&
        paragraph.y >= viewport.y && paragraph.y + paragraph.height <= viewport.y + viewport.height + 1);
    }).toBe(true);
    await expect(page.getByTestId('contextual.help.done')).toBeInViewport();
    await page.getByTestId('contextual.help.done').click();
    await expect(dialog).toHaveCount(0); await expect(trigger).toBeFocused();
    await activate();
    await page.screenshot({ path: info.outputPath('page-help-modal.png'), fullPage: true });
    await expectNoDocumentHorizontalOverflow(page);
    await page.getByTestId('contextual.help.close').click();
    await page.reload();
    await expect(trigger).toBeVisible(); await expect(dialog).toHaveCount(0);
    expect(data.writes).toEqual([]);
  });
}

for (const kind of ['empty', 'blank', 'error'] as const) {
  test(`@pr-smoke @pr-smoke-mobile contextual help hides ${kind} content`, async ({ page }) => {
    const data = await setup(page, actors[0], 'cs', 'light'); data.state.kind = kind;
    const reply = page.waitForResponse(response => new URL(response.url()).pathname.endsWith('/help_boxes'));
    await page.goto('/app');
    await (await reply).finished();
    await page.waitForLoadState('networkidle');
    await expect.poll(() => data.queries.length).toBeGreaterThan(0);
    await expect(page.getByTestId('contextual.help.toggle')).toHaveCount(0);
    await expect(page.getByTestId('contextual.help.panel')).toHaveCount(0);
    await expect(page.getByTestId('contextual.help.dialog')).toHaveCount(0);
  });
}
test('@pr-smoke @pr-smoke-mobile contextual help remains available on a failed page', async ({ page }) => {
  await setup(page, actors[2], 'en', 'dark');
  await page.goto('/app/vps/124');
  await expect(page.getByTestId('vps.detail.error')).toContainText('Synthetic VPS load failure');
  await page.getByTestId('contextual.help.toggle').click();
  await expect(page.getByTestId('contextual.help.dialog')).toBeVisible();
  await expect(page.getByTestId('vps.detail.error')).toContainText('Synthetic VPS load failure');
});
test('@pr-smoke @pr-smoke-mobile contextual help resets on SPA context changes', async ({ page }) => {
  await setup(page, actors[0], 'en', 'light'); await page.goto('/app');
  await page.getByTestId('contextual.help.toggle').click();
  await expect(page.getByTestId('contextual.help.dialog')).toBeVisible();
  await page.evaluate(() => { history.pushState({}, '', '/app/profile'); dispatchEvent(new PopStateEvent('popstate')); });
  await expect(page.getByTestId('contextual.help.dialog')).toHaveCount(0);
  await page.getByTestId('contextual.help.toggle').click();
  await expect(page.frameLocator('[data-testid="contextual.help.box.401"] iframe').getByText('profile/overview', { exact: true })).toBeVisible();
});
