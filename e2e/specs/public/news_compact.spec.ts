import { expect, test } from '@playwright/test';
import { bootstrapVpsAdminWindow, failEnvelope, installHaveApiMock, jsonFulfill, setUiSettingsLocalStorage } from '../../fixtures';

const published = '2026-06-04T16:30:00Z';
const longUrl = `https://example.test/${'long-path-'.repeat(30)}`;
const news = [
  { id: 12, published_at: published, message: 'Added NixOS 26.05', cs_message: 'Přidán NixOS 26.05', en_message: 'Added NixOS 26.05' },
  { id: 11, published_at: published, message: 'Added Fedora 44', cs_message: 'Přidána Fedora 44', en_message: 'Added Fedora 44' },
  { id: 10, published_at: published, message: '<p>Read the <a href="https://example.test/update">release notes</a> for details.</p>' },
  ...Array.from({ length: 7 }, (_, i) => ({ id: 9 - i, published_at: published, message: `Service update ${9 - i}` })),
  { id: 2, published_at: published, message: '<p>Scheduled maintenance information.</p><p>Existing services remain available while the update is prepared.</p><ul><li>First phase</li><li>Final phase</li></ul>' },
  { id: 1, message: `<a href="${longUrl}">${longUrl}</a>` },
];

for (const language of ['cs', 'en'] as const) {
  test.describe(language, () => {
    test.use({ locale: language === 'cs' ? 'cs-CZ' : 'en-GB' });
    for (const theme of ['light', 'dark'] as const) {
      test(`@pr-smoke @pr-smoke-mobile compact anonymous news in ${language} ${theme}`, async ({ page }, testInfo) => {
        await setUiSettingsLocalStorage(page, { language, theme });
        await bootstrapVpsAdminWindow(page);
        await installHaveApiMock(page, { handlers: {
          'GET users/current': () => jsonFulfill(failEnvelope('Unauthorized'), 401),
          'GET news_logs': () => ({ news_logs: news }),
        } });
        await page.goto('/news');
        const rows = page.getByTestId('public.news.item');
        await expect(rows).toHaveCount(news.length);
        await expect(rows.first()).toContainText(language === 'cs' ? 'Přidán NixOS' : 'Added NixOS');
        await expect(rows.first().locator('time')).toHaveAttribute('datetime', published);
        await expect(rows.last().locator('time')).toHaveText('—');
        await expect(page.getByRole('link', { name: 'release notes' })).toHaveAttribute('href', 'https://example.test/update');
        await expect(rows.nth(10)).toContainText('Final phase');
        const first = await rows.first().boundingBox();
        const second = await rows.nth(1).boundingBox();
        expect(first).not.toBeNull();
        expect(second).not.toBeNull();
        const mobile = page.viewportSize()!.width < 640;
        expect(second!.y - first!.y).toBeLessThanOrEqual(mobile ? 72 : 48);
        expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
        await page.screenshot({ path: testInfo.outputPath('news.png'), fullPage: true });
      });
    }
  });
}

for (const state of ['empty', 'error'] as const) {
  test(`@pr-smoke @pr-smoke-mobile news preserves ${state} state`, async ({ page }) => {
    await setUiSettingsLocalStorage(page, { language: 'en' });
    await bootstrapVpsAdminWindow(page);
    await installHaveApiMock(page, { handlers: {
      'GET users/current': () => jsonFulfill(failEnvelope('Unauthorized'), 401),
      'GET news_logs': () => state === 'empty' ? { news_logs: [] } : jsonFulfill(failEnvelope('Unavailable'), 503),
    } });
    await page.goto('/news');
    const content = page.getByTestId('public.news.page');
    await expect(page.getByTestId('public.news.item')).toHaveCount(0);
    await expect(content).toContainText(state === 'empty' ? 'No news' : 'Failed');
  });
}
