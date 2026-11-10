import { expect, test, type Locator } from '@playwright/test';

import { bootstrapVpsAdminWindow, installHaveApiMock, setUiSettingsLocalStorage } from '../../fixtures';

const variants = [
  { theme: 'light', language: 'en', scheme: 'dark' },
  { theme: 'dark', language: 'cs', scheme: 'light' },
  { theme: 'system', language: 'en', scheme: 'light' },
  { theme: 'system', language: 'cs', scheme: 'dark' },
] as const;

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

for (const variant of variants)
  for (const surface of ['gallery', 'confirmation'] as const) {
    test(`@pr-smoke @pr-smoke-mobile destructive ${surface} ${variant.theme} ${variant.scheme}`, async ({
      page,
    }, info) => {
      const writes: string[] = [];
      const errors: string[] = [];
      page.on('request', (request) => {
        if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method())) writes.push(request.method());
      });
      page.on('pageerror', (error) => errors.push(String(error)));
      await page.emulateMedia({ colorScheme: variant.scheme });
      await bootstrapVpsAdminWindow(page, {
        webuiNext: {
          uiSettings: { persistence: 'local' },
          ...(surface === 'gallery' ? { enableDesignSandbox: true } : {}),
        },
      });
      await setUiSettingsLocalStorage(page, { language: variant.language, theme: variant.theme });
      const dataset = {
        id: 10,
        name: 'synthetic-child',
        full_name: 'synthetic/child',
        user: { id: 42, login: 'synthetic-member' },
        parent: { id: 9 },
        vps: null,
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
        user: { id: 42, login: 'synthetic-member', level: surface === 'gallery' ? 1 : 99 },
        handlers: {
          'GET datasets/10': () => ({ dataset }),
          'GET transaction_chains': () => ({ transaction_chains: [] }),
          'GET help_boxes': () => ({ help_boxes: [] }),
          'GET action_states': () => ({ action_states: [] }),
        },
      });
      await page.goto(surface === 'gallery' ? '/app/_design' : '/admin/datasets/10');
      if (surface === 'confirmation') await page.getByTestId('dataset.manage.delete.open').click();
      const group = page.getByTestId(
        surface === 'gallery' ? 'design.components.buttons' : 'dataset.manage.delete.confirm'
      );
      const button =
        surface === 'gallery'
          ? group.getByRole('button', { name: 'Danger', exact: true })
          : page.getByTestId('dataset.manage.delete.confirm.confirm');
      await expect(button).toBeVisible();
      const observations = [];
      for (const width of [...new Set([320, page.viewportSize()!.width])]) {
        await page.setViewportSize({ width, height: 900 });
        await button.scrollIntoViewIfNeeded();
        for (const state of ['normal', 'focus', 'hover'] as const) {
          if (state === 'hover' && !(await page.evaluate(() => matchMedia('(hover: hover)').matches))) continue;
          if (state === 'normal') {
            await button.blur();
            await page.mouse.move(0, 0);
          } else if (state === 'focus') {
            await button.focus();
            await page.keyboard.press('Tab');
            await page.keyboard.press('Shift+Tab');
            await expect(button).toBeFocused();
            expect(await button.evaluate((element) => element.matches(':focus-visible'))).toBe(true);
          } else {
            await button.blur();
            await button.hover();
          }
          const measure = (target: Locator = button) => measureForeground(target);
          await info.attach('sample-' + width + '-' + state, {
            body: JSON.stringify({ variant, state, ...(await measure()) }),
            contentType: 'application/json',
          });
          if (process.env['DANGER_CAPTURE'] === '1' && width === 320 && state === 'normal') {
            await group.screenshot({ path: info.outputPath('destructive-buttons-320.png'), animations: 'disabled' });
          }
          // Let the actual color transition settle while retaining the numeric requirement.
          await expect.poll(async () => (await measure()).ratio).toBeGreaterThanOrEqual(4.5);
          if (surface === 'gallery' && state === 'normal') {
            const samples = [
              page.getByText('Tertiary text (text-faint)', { exact: true }),
              page
                .getByTestId('design.tables.table')
                .locator('tbody tr')
                .nth(1)
                .getByText('7.5 GiB / 8 GiB', { exact: true }),
            ];
            for (const sample of samples) {
              await expect(sample).toBeVisible();
              const reading = await measure(sample);
              await info.attach('tertiary-' + width, {
                body: JSON.stringify(reading),
                contentType: 'application/json',
              });
              expect(reading.opaque).toBe(true);
              expect(reading.ratio).toBeGreaterThanOrEqual(4.5);
            }
          }
          const observation = await measure();
          expect(observation.opaque).toBe(true);
          expect(observation.document).toBeLessThanOrEqual(width + 1);
          expect(observation.left).toBeGreaterThanOrEqual(-1);
          expect(observation.right).toBeLessThanOrEqual(width + 1);
          expect(observation.height).toBeGreaterThanOrEqual(info.project.name === 'chromium' ? 36 : 44);
          observations.push({ state, ...observation });
        }
      }
      if (surface === 'confirmation') {
        await page.getByTestId('dataset.manage.delete.confirm.cancel').click();
        await expect(group).toBeHidden();
      }
      expect(writes).toEqual([]);
      expect(errors).toEqual([]);
      await info.attach('destructive-observations', {
        body: JSON.stringify({ variant, surface, observations, writes, errors, fixtureOnly: true }),
        contentType: 'application/json',
      });
    });
  }

for (const variant of variants)
  for (const surface of ['table', 'cards', 'public', 'placeholders'] as const) {
    test(`@pr-smoke @pr-smoke-mobile readable text foregrounds ${surface} ${variant.theme} ${variant.scheme}`, async ({
      page,
    }, info) => {
      const writes: string[] = [],
        errors: string[] = [];
      page.on('request', (request) => {
        if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method())) writes.push(request.method());
      });
      page.on('pageerror', (error) => errors.push(String(error)));
      await page.clock.setFixedTime(new Date('2026-01-24T12:00:00Z'));
      await page.emulateMedia({ colorScheme: variant.scheme });
      await bootstrapVpsAdminWindow(page, {
        webuiNext: {
          uiSettings: { persistence: 'local' },
          ...(surface === 'placeholders' ? { enableDesignSandbox: true } : {}),
        },
      });
      await setUiSettingsLocalStorage(page, { language: variant.language, theme: variant.theme });
      const row = {
        id: 501,
        addr: '2001:db8::1',
        prefix: 128,
        user: { id: 42, login: 'synthetic-member' },
        vps: { id: 101, hostname: 'synthetic-server.example.test' },
        network_interface: { id: 99, name: 'eth0' },
        network: { id: 9, address: '2001:db8::', prefix: 64, enabled: true, purpose: 'vps', ip_version: 6 },
      };
      await installHaveApiMock(page, {
        user: { id: 42, login: 'synthetic-admin', level: 99 },
        handlers: {
          'GET locations': () => ({ locations: [] }),
          'GET ip_addresses': () => ({
            ip_addresses: [
              row,
              { ...row, id: 502, addr: '2001:db8::2' },
              { ...row, id: 503, addr: '2001:db8::3', user: null, vps: null, network_interface: null },
            ],
            _meta: { total_count: 3 },
          }),
          'GET security_advisories': (ctx) => {
            const rows =
              ctx.searchParams.get('security_advisory[state]') === 'retracted'
                ? []
                : [
                    {
                      id: 200,
                      name: 'Synthetic shared foreground advisory',
                      state: 'published',
                      published_at: '2026-01-01T00:00:00Z',
                      security_advisory_cves: [],
                    },
                  ];
            return { security_advisories: rows, _meta: { total_count: rows.length } };
          },
        },
      });
      await page.setViewportSize({ width: surface === 'table' ? 1280 : 320, height: 1000 });
      await page.goto(
        surface === 'public'
          ? '/security-advisories'
          : surface === 'placeholders'
            ? '/app/_design'
            : '/admin/networking/ip-addresses?version=6&occupancy=any'
      );
      const root = page.getByTestId(
        surface === 'public'
          ? 'public.security_advisories.page'
          : surface === 'placeholders'
            ? 'design.page'
            : 'admin.ip_addresses.page'
      );
      await expect(root).toBeVisible();
      const links =
        surface === 'placeholders'
          ? [
              root.getByPlaceholder('Search…', { exact: true }),
              root.getByPlaceholder('Invalid…', { exact: true }),
              root.getByPlaceholder('Multiline input…', { exact: true }),
            ]
          : surface === 'public'
            ? [root.getByRole('link', { name: 'Synthetic shared foreground advisory', exact: true })]
            : [501, 502, 503].map((id) =>
                page
                  .getByTestId(`admin.ip_addresses.${surface === 'table' ? 'row' : 'card'}.${id}`)
                  .locator('a.text-accent')
                  .first()
              );
      const observations = [];
      for (const link of links) {
        await expect(link).toBeVisible();
        await link.scrollIntoViewIfNeeded();
        for (const state of ['normal', 'focus', 'hover'] as const) {
          if (state === 'hover' && !(await page.evaluate(() => matchMedia('(hover: hover)').matches))) continue;
          if (state === 'normal') {
            await link.blur();
            await page.mouse.move(0, 0);
          } else if (state === 'focus') {
            await link.focus();
            await page.keyboard.press('Tab');
            await page.keyboard.press('Shift+Tab');
            await expect(link).toBeFocused();
            expect(await link.evaluate((e) => e.matches(':focus-visible'))).toBe(true);
          } else {
            await link.blur();
            await link.hover();
          }
          const reading = await measureForeground(link, surface === 'placeholders' ? '::placeholder' : undefined);
          await info.attach('shared-link-sample', {
            body: JSON.stringify({ variant, surface, state, ...reading }),
            contentType: 'application/json',
          });
          expect(reading.opaque).toBe(true);
          expect(reading.ratio).toBeGreaterThanOrEqual(4.5);
          observations.push({ state, ...reading });
        }
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
        page.viewportSize()!.width + 1
      );
      expect(writes).toEqual([]);
      expect(errors).toEqual([]);
      await info.attach('readable-link-observations', {
        body: JSON.stringify({ variant, surface, observations, writes, errors, fixtureOnly: true }),
        contentType: 'application/json',
      });
    });
  }
