import { expect, test } from '@playwright/test';
import { bootstrapVpsAdminWindow, installHaveApiMock } from '../../fixtures';
import { expectNoDocumentHorizontalOverflow } from '../../helpers/horizontalOverflow';

test.use({ locale: 'en-US', colorScheme: 'dark' });
for (const path of ['/', '/news']) {
  test(`@pr-smoke @pr-smoke-mobile anonymous news follows explicit language on ${path}`, async ({ page, hasTouch }, testInfo) => {
    await bootstrapVpsAdminWindow(page, { sessionToken: '' });
    const privateCalls: string[] = [];
    page.on('request', (request) => {
      if (/webui_user_settings/.test(request.url())) privateCalls.push(request.url());
    });
    await installHaveApiMock(page, { handlers: {
      'GET cluster/public_stats': () => ({ public_stats: { user_count: 0, vps_count: 0, ipv4_left: 10 } }),
      'GET nodes/public_status': () => ({ nodes: [] }),
      'GET outages': () => ({ outages: [] }),
      'GET news_logs': () => { return { news_logs: [
        { id: 1, message: 'English announcement', en_message: 'English announcement', cs_message: 'Česká novinka', published_at: '2026-11-01T09:00:00Z' },
        { id: 2, message: 'Legacy fallback' },
        { id: 3, message: 'Default fallback', en_message: 'English-only announcement', cs_message: '' },
      ] }; },
    } });
    await page.goto(path);
    const content = path === '/' ? page.getByTestId('public.news.card') : page.getByTestId('public.news.page');
    await expect(content).toContainText('English announcement');
    const switchLanguage = async (language: 'CS' | 'EN') => {
      const menu = page.getByRole('button', { name: /^(Open menu|Otevřít menu)$/ });
      if (!(await page.getByTestId('public.language.switcher').isVisible()) && await menu.isVisible()) {
        if (hasTouch) await menu.tap(); else await menu.click();
      }
      const button = page.getByRole('button', { name: language, exact: true });
      if (hasTouch) await button.tap(); else await button.click();
    };
    await switchLanguage('CS');
    await expect(page.locator('html')).toHaveAttribute('lang', 'cs');
    await expect(content).toContainText('Česká novinka');
    await expect(content).not.toContainText('English announcement');
    await expect(content).toContainText('Legacy fallback');
    await expect(content).toContainText('English-only announcement');
    await expectNoDocumentHorizontalOverflow(page);
    await content.screenshot({ path: testInfo.outputPath('anonymous-news-cs.png') });
    await switchLanguage('EN');
    await expect(content).toContainText('English announcement');
    expect(privateCalls).toEqual([]);
    await switchLanguage('CS');
    await page.reload();
    await expect(content).toContainText('Česká novinka');
  });
}
