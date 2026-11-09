import { expect, test } from '@playwright/test';
import { bootstrapVpsAdminWindow, failEnvelope, installHaveApiMock, jsonFulfill, setUiSettingsLocalStorage } from '../../fixtures';
import { expectNoDocumentHorizontalOverflow } from '../../helpers/horizontalOverflow';

for (const language of ['cs', 'en'] as const) {
  for (const theme of ['light', 'dark'] as const) {
    test(`@pr-smoke @pr-smoke-mobile public overview spacing and heatmap guide in ${language} ${theme}`, async ({ page, hasTouch }, testInfo) => {
      await setUiSettingsLocalStorage(page, { language, theme });
      await bootstrapVpsAdminWindow(page, { sessionToken: '' });
      await installHaveApiMock(page, { handlers: {
        'GET cluster/public_stats': () => ({ cluster: { user_count: 123, vps_count: 456, ipv4_left: 200 } }),
        'GET nodes/public_status': () => ({ nodes: [{
          name: 'node1', fqdn: 'node1.prg.example', type: 'node', maintenance_lock: 'no',
          status: true, location: { label: 'Praha' }, vps_count: 42, cpu_idle: 75, pool_state: 'online',
        }] }),
        'GET outages': () => ({ outages: theme === 'dark' ? [{
          id: 1, begins_at: '2100-01-01T09:00:00Z', duration: 45, type: 'planned_outage',
          en_summary: 'Node maintenance', cs_summary: 'Údržba nodu',
        }, {
          id: 2, begins_at: '2020-01-01T09:00:00Z', type: 'unplanned_outage',
          en_summary: 'Network issue', cs_summary: 'Problém se sítí',
        }, {
          id: 3, begins_at: '2025-01-01T09:00:00Z', finished_at: '2025-01-01T09:45:00Z', state: 'resolved',
          en_summary: 'Resolved maintenance', cs_summary: 'Vyřešená odstávka',
        }] : [] }),
        'GET outages/1/entities': () => ({ entities: [] }),
        'GET outages/2/entities': () => ({ entities: [] }),
        'GET outages/3/entities': () => ({ entities: [] }),
        'GET security_advisories': () => ({ security_advisories: [{
          id: 1, name: 'Kernel update', state: 'published', published_at: '2026-11-01T09:00:00Z',
          cs_summary: 'Aktualizace jádra', en_summary: 'Kernel update', cves: [],
        }, { id: 99, name: 'Unpublished draft', state: 'draft' }] }),
        'GET news_logs': () => ({ news_logs: [{
          id: 1, message: 'English announcement', en_message: 'English announcement',
          cs_message: 'Česká novinka', published_at: '2026-11-01T09:00:00Z',
        }] }),
        'GET system_configs/webui/goresheat_url': () => ({ system_config: { value: 'https://heatmap.example/charts/' } }),
      } });
      let frameRequests = 0;
      await page.route('https://heatmap.example/**', route => {
        frameRequests++;
        return route.fulfill({ contentType: 'text/html', body: '<!doctype html><body>Fixture heatmap</body>' });
      });
      await page.goto('/');
      const overview = page.getByTestId('public.overview.page');
      await expect(page.getByTestId('public.stats.members')).toContainText('123');
      await expect(page.getByTestId('public.advisories.card')).toContainText('Kernel update');
      await expect(overview).not.toContainText('Unpublished draft');
      await expect(page.getByTestId('public.nodes.section')).toContainText('node1');
      await expect(page.getByTestId('public.outages.card')).toHaveCount(theme === 'dark' ? 1 : 0);
      await expect(page.getByTestId('public.outages.resolved')).toHaveCount(theme === 'dark' ? 1 : 0);
      const order = await overview.locator(':scope > [data-testid]').evaluateAll(elements => elements.map(el => el.getAttribute('data-testid')));
      expect(order).toEqual([...(theme === 'dark' ? ['public.outages.card'] : []), 'public.news.card', 'public.advisories.card', 'public.nodes.section', 'public.summary-row', ...(theme === 'dark' ? ['public.outages.resolved'] : [])]);
      await expect(overview).not.toContainText(language === 'cs' ? 'Vše běží normálně' : 'All systems nominal');
      await expect(page.getByTestId('public.news.card')).toContainText(language === 'cs' ? 'Česká novinka' : 'English announcement');
      await expect(page.getByRole('heading', { level: 1 })).toContainClass('sr-only');
      const stats = page.getByTestId('public.summary-grid');
      await expect(page.getByTestId('public.summary-row').locator('svg')).toHaveCount(0);
      const values = await stats.locator('.tabular-nums').evaluateAll(elements => elements.map(el => ({
        y: el.getBoundingClientRect().y, size: getComputedStyle(el).fontSize,
      })));
      expect(values.map(value => value.size)).toEqual(['24px', '24px']);
      if (page.viewportSize()!.width >= 768) {
        expect(Math.max(...values.map(value => value.y)) - Math.min(...values.map(value => value.y))).toBeLessThanOrEqual(1);
        const cards = await stats.locator(':scope > div').evaluateAll(elements => elements.map(el => el.getBoundingClientRect().width));
        expect(Math.max(...cards) - Math.min(...cards)).toBeLessThanOrEqual(1);
      }
      for (const subtitle of ['Poslední oznámení', 'Latest announcements', 'Veřejný stav', 'Public status', 'Rozdělené podle lokace', 'Grouped by location']) {
        await expect(overview.getByText(subtitle, { exact: true })).toHaveCount(0);
      }
      const padding = await overview.evaluate(el => {
        const ids = ['public.stats.members', 'public.stats.vps', 'public.news.card', 'public.advisories.card', 'public.nodes.section'];
        if (el.querySelector('[data-testid="public.outages.card"]')) ids.push('public.outages.card');
        return ids.map(id => {
          const host = el.querySelector(`[data-testid="${id}"]`)!;
          const card = host.matches('.rounded-lg.border') ? host : host.querySelector('.rounded-lg.border')!;
          const style = getComputedStyle(card.firstElementChild!);
          return [style.paddingTop, style.paddingRight, style.paddingBottom, style.paddingLeft];
        });
      });
      expect(padding).toEqual(Array.from({ length: theme === 'dark' ? 6 : 5 }, () => ['12px', '12px', '12px', '12px']));
      await expectNoDocumentHorizontalOverflow(page);
      await page.screenshot({ path: testInfo.outputPath('overview.png'), fullPage: true });
      expect(frameRequests).toBe(0);
      const trigger = page.locator('[data-testid="nodes.heatmap.open.node1.prg.example"]:visible');
      if (hasTouch) await trigger.tap(); else await trigger.click();
      const modal = page.getByTestId('nodes.heatmap.modal');
      await expect(modal).toBeVisible();
      const guide = page.getByTestId('nodes.heatmap.guide');
      await expect(guide).toContainText(language === 'cs' ? 'nejnovější je nahoře' : 'newest is at the top');
      await expect(guide).toContainText(language === 'cs' ? 'v idle naopak volné CPU' : 'in idle it means free CPU');
      await expect(guide).toContainText(language === 'cs' ? 'popisky CPU a disků' : 'CPU and disk labels');
      await expect(page.frameLocator('[data-testid="nodes.heatmap.frame"]').getByText('Fixture heatmap')).toBeVisible();
      await expectNoDocumentHorizontalOverflow(page);
      await page.screenshot({ path: testInfo.outputPath('heatmap-guide.png') });
      await page.getByTestId('nodes.heatmap.close').click();
      await expect(modal).toHaveCount(0);
      await expect(page.getByTestId('nodes.heatmap.frame')).toHaveCount(0);
      for (const path of ['/outages', '/security-advisories']) {
        await page.goto(path);
        const content = page.getByTestId(path === '/outages' ? 'public.outages.page' : 'public.security_advisories.page');
        await expect(content).toContainText(path === '/security-advisories'
          ? 'Kernel update'
          : theme === 'dark' ? (language === 'cs' ? 'Údržba nodu' : 'Node maintenance')
          : language === 'cs' ? 'Žádné výpadky' : 'No outages');
        const heading = page.getByRole('heading', { level: 1 });
        await expect(heading).toContainClass('sr-only');
        expect((await heading.boundingBox())!.height).toBeLessThanOrEqual(1);
        await expectNoDocumentHorizontalOverflow(page);
        await page.screenshot({ path: testInfo.outputPath(path === '/outages' ? 'outages.png' : 'advisories.png'), fullPage: true });
      }
    });
  }
}

for (const surface of ['outages', 'advisories'] as const) {
  test(`@pr-smoke @pr-smoke-mobile public overview keeps ${surface} failures explicit`, async ({ page }) => {
    await setUiSettingsLocalStorage(page, { language: 'en', theme: 'light' });
    await bootstrapVpsAdminWindow(page, { sessionToken: '' });
    await installHaveApiMock(page, { handlers: {
      'GET cluster/public_stats': () => ({ cluster: { user_count: 12, vps_count: 34, ipv4_left: 200 } }),
      'GET nodes/public_status': () => ({ nodes: [] }),
      'GET outages': () => surface === 'outages' ? jsonFulfill(failEnvelope('Unavailable'), 503) : ({ outages: [] }),
      'GET security_advisories': () => surface === 'advisories' ? jsonFulfill(failEnvelope('Unavailable'), 503) : ({ security_advisories: [] }),
      'GET news_logs': () => ({ news_logs: [{ id: 1, message: 'Unaffected news' }] }),
      'GET system_configs/webui/goresheat_url': () => ({ system_config: { value: '' } }),
    } });
    await page.goto('/');
    const card = page.getByTestId(surface === 'outages' ? 'public.outages.card' : 'public.advisories.card');
    await expect(card).toContainText(surface === 'outages' ? 'Failed to load outages' : 'Failed to load security advisories');
    await expect(page.getByTestId('public.news.card')).toContainText('Unaffected news');
    await expect(page.getByTestId('public.stats.members')).toContainText('12');
    await expect(page.getByTestId('public.outages.resolved')).toHaveCount(0);
    await expect(page.getByTestId('public.overview.page')).not.toContainText('All systems nominal');
    await expectNoDocumentHorizontalOverflow(page);
  });
}
