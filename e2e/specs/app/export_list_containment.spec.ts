import { expect, test, type Locator } from '@playwright/test';
import { bootstrapVpsAdminWindow, installHaveApiMock, setUiSettingsLocalStorage } from '../../fixtures';

async function measureForeground(target: Locator, pseudo?: '::placeholder') {
  return target.evaluate((element, pseudo) => {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 1;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) throw new Error('sRGB canvas unavailable');
    const color = (value: string) => {
      if (!CSS.supports('color', value)) throw new Error('Unsupported computed color: ' + value);
      context.clearRect(0, 0, 1, 1);
      context.fillStyle = value;
      context.fillRect(0, 0, 1, 1);
      const data = context.getImageData(0, 0, 1, 1).data;
      return [data[0] ?? 0, data[1] ?? 0, data[2] ?? 0, (data[3] ?? 255) / 255];
    };
    const over = (front: number[], back: number[]) => [
      ...front.slice(0, 3).map((value, index) => value * (front[3] ?? 1) + (back[index] ?? 0) * (1 - (front[3] ?? 1))),
      1,
    ];
    const luminance = (values: number[]) =>
      values.slice(0, 3).reduce((sum, value, index) => {
        const channel = value / 255;
        return (
          sum +
          (channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4) *
            ([0.2126, 0.7152, 0.0722][index] ?? 0)
        );
      }, 0);
    const ancestors: Element[] = [];
    let parent: Element | null = element;
    while (parent) {
      ancestors.unshift(parent);
      parent = parent.parentElement;
    }
    let background = [255, 255, 255, 1];
    for (const ancestor of ancestors) background = over(color(getComputedStyle(ancestor).backgroundColor), background);
    const style = pseudo ? getComputedStyle(element, pseudo) : getComputedStyle(element);
    const textColor = color(style.color);
    if (pseudo) textColor[3] = (textColor[3] ?? 1) * Number(style.opacity || '1');
    const foreground = over(textColor, background);
    const a = luminance(foreground),
      b = luminance(background),
      rect = element.getBoundingClientRect();
    return {
      ratio: (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05),
      foreground,
      background,
      width: innerWidth,
      document: document.documentElement.scrollWidth,
      left: rect.left,
      right: rect.right,
      height: rect.height,
      outline: getComputedStyle(element).outline,
      boxShadow: getComputedStyle(element).boxShadow,
      opaque: ancestors.every((ancestor) => Number(getComputedStyle(ancestor).opacity) === 1),
      text:
        pseudo && (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement)
          ? element.placeholder
          : element.textContent,
      pseudoOpacity: pseudo ? Number(style.opacity || '1') : null,
    };
  }, pseudo);
}

for (const actor of ['member', 'admin'] as const)
  for (const [language, theme] of [
    ['cs', 'dark'],
    ['en', 'light'],
  ] as const)
    test(`@pr-smoke @pr-smoke-mobile export list complete values ${actor} ${language}`, async ({ page }, info) => {
      const writes: string[] = [],
        errors: string[] = [];
      page.on('pageerror', (error) => errors.push(String(error)));
      await page.clock.setFixedTime(new Date('2026-11-10T12:00:00Z'));
      await page.setViewportSize({ width: 1280, height: 1000 });
      await bootstrapVpsAdminWindow(page, { webuiNext: { uiSettings: { persistence: 'local' } } });
      await setUiSettingsLocalStorage(page, { language, theme });
      const user = { id: 42, login: 'fixture-actor', level: actor === 'admin' ? 99 : 1 };
      const owner = { id: actor === 'admin' ? 84 : 42, login: 'owner-with-long-login-12345' };
      const dataset = { id: 901, full_name: 'tank/overovaci-vlastnik/overovaci-dataset-s-dlouhym-nazvem', user: owner };
      const address = '2001:db8:1234:5678:1234:5678:1234:5678';
      const path = '/tank/overovaci-vlastnik/overovaci-dataset-s-dlouhym-nazvem';
      const row = {
        id: 10,
        dataset,
        user: owner,
        host_ip_address: { id: 5, addr: address },
        path,
        all_vps: false,
        rw: true,
        sync: true,
        enabled: true,
        threads: 8,
        updated_at: '2026-11-08T10:00:00Z',
      };
      await installHaveApiMock(page, {
        user,
        handlers: {
          'GET users/84': () => ({ user: owner }),
          'GET users': () => ({ users: [owner] }),
          'GET exports': () => ({
            exports: [
              row,
              { ...row, id: 11, enabled: false },
              { ...row, id: 12, snapshot: { id: 200, name: 'overovaci-snapshot-s-dlouhym-nazvem-bez-mezer' } },
            ],
            _meta: { total_count: 3 },
          }),
        },
      });
      await page.route('**/api/**', (route) => {
        if (!['GET', 'HEAD', 'OPTIONS'].includes(route.request().method())) {
          writes.push(route.request().method());
          return route.abort();
        }
        return route.fallback();
      });
      const mode = actor === 'admin' ? 'admin' : 'app';
      await page.goto(`/${mode}/exports${actor === 'admin' ? '?user=84' : ''}`);
      await expect(page.getByTestId('exports.row.10')).toBeVisible();
      const observations = [];
      for (const width of [1280, 768]) {
        await page.setViewportSize({ width, height: 1000 });
        const table = page.getByTestId('exports.table');
        const cells = await table
          .locator('th,tbody td')
          .evaluateAll((elements) =>
            elements.map((element) => ({
              text: element.textContent,
              client: element.clientWidth,
              scroll: element.scrollWidth,
              width: element.getBoundingClientRect().width,
            }))
          );
        await info.attach('export-cell-observations', {
          body: JSON.stringify({ width, cells }),
          contentType: 'application/json',
        });
        expect(cells.length).toBeGreaterThan(20);
        for (const cell of cells) {
          expect(cell.width, cell.text ?? '').toBeGreaterThan(0);
          expect(cell.scroll, cell.text ?? '').toBeLessThanOrEqual(cell.client + 1);
        }
        expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width + 1);
        const scroller = table.locator('div.overflow-x-auto').first();
        await scroller.evaluate((element) => {
          element.scrollLeft = element.scrollWidth;
        });
        if (width === 768) expect(await scroller.evaluate((element) => element.scrollLeft)).toBeGreaterThan(0);
        await scroller.evaluate((element) => {
          element.scrollLeft = 0;
        });
        observations.push({ width, cells });
      }
      await page.setViewportSize({ width: 320, height: 1000 });
      for (const id of [10, 11, 12]) {
        const card = page.getByTestId(`exports.card.${id}`);
        await expect(card).toBeVisible();
        await expect(card).toContainText(dataset.full_name);
        await expect(card).toContainText(address);
        await expect(card).toContainText(path);
        const geometry = await card.evaluate((element) => ({
          client: element.clientWidth,
          scroll: element.scrollWidth,
        }));
        expect(geometry.scroll).toBeLessThanOrEqual(geometry.client + 1);
        observations.push({ id, ...geometry });
      }
      if (actor === 'admin') {
        const ownerLabel = page
          .getByTestId('exports.card.11')
          .locator('div')
          .filter({ hasText: new RegExp(`^${language === 'cs' ? 'Uživatel' : 'User'}: ${owner.login}$`) });
        await expect(ownerLabel).toHaveCount(1);
        const contrast = await measureForeground(ownerLabel);
        await info.attach('export-owner-contrast', { body: JSON.stringify(contrast), contentType: 'application/json' });
        expect(contrast.opaque).toBe(true);
        expect(contrast.ratio).toBeGreaterThanOrEqual(4.5);
      }
      const link = page.getByTestId('exports.card.10').getByRole('link');
      await expect(link).toHaveAttribute('href', `/${mode}/exports/10`);
      await link.focus();
      await page.keyboard.press('Tab');
      await page.keyboard.press('Shift+Tab');
      await expect(link).toBeFocused();
      expect(await link.evaluate((element) => element.matches(':focus-visible'))).toBe(true);
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(321);
      expect(writes).toEqual([]);
      expect(errors).toEqual([]);
      await info.attach('export-containment', {
        body: JSON.stringify({ actor, language, theme, observations, writes, errors, fixtureOnly: true }),
        contentType: 'application/json',
      });
    });
