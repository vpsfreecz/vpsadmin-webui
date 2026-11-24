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
    test(`@pr-smoke @pr-smoke-mobile VPS list context and usage stay readable ${actor} ${language}`, async ({
      page,
    }, info) => {
      const writes: string[] = [],
        errors: string[] = [];
      page.on('pageerror', (error) => errors.push(String(error)));
      await page.clock.setFixedTime(new Date('2026-11-10T12:00:00Z'));
      await page.setViewportSize({ width: 1280, height: 1000 });
      await bootstrapVpsAdminWindow(page, { webuiNext: { uiSettings: { persistence: 'local' } } });
      await setUiSettingsLocalStorage(page, { language, theme });
      const owner = { id: actor === 'admin' ? 84 : 42, login: 'overovacivlastniksdlouhymjmenem001' };
      const nodeName = 'overovaciuzelsvelmidlouhymtechnickymoznacenimbezmezery001.example.test';
      const vps = {
        id: 123,
        hostname: 'vps123.example',
        object_state: 'active',
        is_running: true,
        cpu: 4,
        cpus: 4,
        memory: 2048,
        swap: 512,
        diskspace: 20480,
        used_memory: 1900,
        used_swap: 100,
        used_diskspace: 19200,
        uptime: 12345,
        loadavg1: 0.12,
        node: {
          id: 7,
          domain_name: nodeName,
          location: { id: 2, label: 'Ověřovací vzdálené umístění s dlouhým českým označením' },
        },
        user: owner,
      };
      await installHaveApiMock(page, {
        user: { id: 42, login: 'synthetic-vps-context', level: actor === 'admin' ? 99 : 1 },
        handlers: {
          'GET vpses': () => ({ vpses: [vps], _meta: { total_count: 1 } }),
          'GET transaction_chains': () => ({ transaction_chains: [] }),
          'GET action_states': () => ({ action_states: [] }),
          'GET oom_reports': () => ({ oom_reports: [] }),
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
      await page.goto(`/${mode}/vps`);
      const row = page.getByTestId('vps.row.123');
      await expect(row).toBeVisible();
      const context = row.locator('td').nth(3);
      await expect(context).toContainText(nodeName);
      if (actor === 'admin') await expect(context).toContainText(owner.login);
      const geometry = await context.evaluate((element) => ({
        client: element.clientWidth,
        scroll: element.scrollWidth,
      }));
      expect(geometry.scroll).toBeLessThanOrEqual(geometry.client + 1);
      const observations: Awaited<ReturnType<typeof measureForeground>>[] = [];
      const inspectValues = async (values: Locator) => {
        await expect(values).toHaveCount(2);
        for (const value of await values.all()) {
          const result = await measureForeground(value);
          expect(result.opaque).toBe(true);
          expect(result.right - result.left).toBeGreaterThan(20);
          expect(result.height).toBeGreaterThanOrEqual(12);
          expect(result.ratio).toBeGreaterThanOrEqual(4.5);
          observations.push(result);
        }
      };
      await inspectValues(row.locator('td').nth(4).locator('span').filter({ hasText: /\// }).filter({ visible: true }));
      await page.setViewportSize({ width: 320, height: 1000 });
      const card = page.getByTestId('vps.card.123');
      await expect(card).toBeVisible();
      await inspectValues(card.locator('span').filter({ hasText: /\// }).filter({ visible: true }));
      const cardGeometry = await card.evaluate((element) => ({
        client: element.clientWidth,
        scroll: element.scrollWidth,
      }));
      expect(cardGeometry.scroll).toBeLessThanOrEqual(cardGeometry.client + 1);
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(321);
      const details = card.getByTestId('vps.card.123.action.details');
      await expect(details).toHaveAttribute('href', `/${mode}/vps/123`);
      await details.focus();
      await page.keyboard.press('Tab');
      await page.keyboard.press('Shift+Tab');
      await expect(details).toBeFocused();
      expect(await details.evaluate((element) => element.matches(':focus-visible'))).toBe(true);
      expect(writes).toEqual([]);
      expect(errors).toEqual([]);
      await info.attach('vps-context-readability', {
        body: JSON.stringify({
          actor,
          language,
          theme,
          geometry,
          cardGeometry,
          observations,
          writes,
          errors,
          fixtureOnly: true,
        }),
        contentType: 'application/json',
      });
    });
