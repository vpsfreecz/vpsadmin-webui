import { expect, type Locator, type Page } from '@playwright/test';

export async function expectNoDocumentHorizontalOverflow(page: Page) {
  const metrics = await page.evaluate(() => ({
    viewportWidth: document.documentElement.clientWidth,
    documentWidth: document.documentElement.scrollWidth,
    bodyWidth: document.body?.scrollWidth ?? 0,
    offenders: [...document.querySelectorAll<HTMLElement>('body *')]
      .map((element) => {
        const rect = element.getBoundingClientRect();
        return {
          tag: element.tagName.toLowerCase(),
          testId: element.dataset['testid'] ?? null,
          className: typeof element.className === 'string' ? element.className : '',
          left: Math.round(rect.left),
          right: Math.round(rect.right),
          width: Math.round(rect.width),
        };
      })
      .filter((element) => element.left < -1 || element.right > document.documentElement.clientWidth + 1)
      .sort((a, b) => b.right - a.right)
      .slice(0, 12),
  }));

  const widestDocument = Math.max(metrics.documentWidth, metrics.bodyWidth);
  expect(widestDocument, JSON.stringify(metrics, null, 2)).toBeLessThanOrEqual(metrics.viewportWidth);
}

export async function expectTableHorizontalScrollUsable(page: Page, tableTestId: string) {
  const metrics = await page.getByTestId(tableTestId).evaluate((table) => {
    const scroller = table.parentElement as HTMLElement | null;
    if (!scroller) return null;

    const rect = scroller.getBoundingClientRect();
    const initialScrollLeft = scroller.scrollLeft;
    scroller.scrollLeft = 0;
    const startScrollLeft = scroller.scrollLeft;
    scroller.scrollLeft = scroller.scrollWidth;
    const endScrollLeft = scroller.scrollLeft;
    scroller.scrollLeft = initialScrollLeft;

    return {
      overflowX: getComputedStyle(scroller).overflowX,
      clientWidth: scroller.clientWidth,
      scrollWidth: scroller.scrollWidth,
      startScrollLeft,
      endScrollLeft,
      left: Math.round(rect.left),
      right: Math.round(rect.right),
      viewportWidth: document.documentElement.clientWidth,
    };
  });

  expect(metrics, `Table ${tableTestId} has no direct scroll container`).not.toBeNull();
  if (!metrics) throw new Error(`Table ${tableTestId} has no direct scroll container`);

  expect(metrics.overflowX).toMatch(/^(auto|scroll)$/);
  expect(metrics.scrollWidth).toBeGreaterThan(metrics.clientWidth);
  expect(metrics.endScrollLeft).toBeGreaterThan(metrics.startScrollLeft);
  expect(metrics.left).toBeGreaterThanOrEqual(-1);
  expect(metrics.right).toBeLessThanOrEqual(metrics.viewportWidth + 1);
}

/** Form overlays must be centered, bounded and scroll within their surface. */
export async function expectCenteredDialog(page: Page, dialog: Locator) {
  await expect(dialog).toBeVisible();
  await expect(dialog).toHaveAttribute('data-overlay', 'modal');
  // visualViewport resize is delivered asynchronously after setViewportSize.
  await expect(async () => {
    const box = await dialog.boundingBox();
    const viewport = page.viewportSize();
    if (!box || !viewport) throw new Error('Missing dialog or viewport geometry');
    expect(Math.abs(box.x + box.width / 2 - viewport.width / 2)).toBeLessThanOrEqual(2);
    expect(Math.abs(box.y + box.height / 2 - viewport.height / 2)).toBeLessThanOrEqual(2);
    expect(box.x).toBeGreaterThanOrEqual(15);
    expect(box.y).toBeGreaterThanOrEqual(15);
    expect(box.x + box.width).toBeLessThanOrEqual(viewport.width - 15);
    expect(box.y + box.height).toBeLessThanOrEqual(viewport.height - 15);
  }).toPass({ timeout: 3000 });
  await expectNoDocumentHorizontalOverflow(page);
}
