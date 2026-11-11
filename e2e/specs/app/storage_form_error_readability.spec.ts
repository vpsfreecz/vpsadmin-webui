import { expect, test, type Locator, type Page } from '@playwright/test';
import { bootstrapVpsAdminWindow, failEnvelope, installHaveApiMock, setUiSettingsLocalStorage } from '../../fixtures';

async function readable(page: Page, error: Locator) {
  const samples = [];
  for (const width of [...new Set([page.viewportSize()!.width, 320])]) {
    await page.setViewportSize({ width, height: 1000 });
    const sample = await error.evaluate((element) => {
      type Color = [number, number, number, number];
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 1;
      const context = canvas.getContext('2d', { willReadFrequently: true })!;
      const rgba = (value: string): Color => {
        if (!CSS.supports('color', value)) throw new Error(value);
        context.clearRect(0, 0, 1, 1);
        context.fillStyle = value;
        context.fillRect(0, 0, 1, 1);
        const p = context.getImageData(0, 0, 1, 1).data;
        return [p[0]!, p[1]!, p[2]!, p[3]! / 255];
      };
      const over = (f: Color, b: Color): Color => [
        f[0] * f[3] + b[0] * (1 - f[3]),
        f[1] * f[3] + b[1] * (1 - f[3]),
        f[2] * f[3] + b[2] * (1 - f[3]),
        1,
      ];
      const lum = (c: Color) =>
        c
          .slice(0, 3)
          .reduce(
            (sum, n, index) =>
              sum +
              (n / 255 <= 0.04045 ? n / 255 / 12.92 : ((n / 255 + 0.055) / 1.055) ** 2.4) *
                [0.2126, 0.7152, 0.0722][index]!,
            0
          );
      const text = element.querySelector('p') ?? element;
      const chain: Element[] = [];
      for (let p: Element | null = text; p; p = p.parentElement) chain.unshift(p);
      let background: Color = [255, 255, 255, 1];
      for (const p of chain) {
        const style = getComputedStyle(p);
        if (style.opacity !== '1' || style.backgroundImage !== 'none')
          throw new Error('Unsupported contrast composition');
        background = over(rgba(style.backgroundColor), background);
      }
      const style = getComputedStyle(text),
        outer = getComputedStyle(element);
      const a = lum(over(rgba(style.color), background)),
        b = lum(background);
      const range = document.createRange();
      range.selectNodeContents(text);
      const rect = element.getBoundingClientRect();
      return {
        ratio: (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05),
        weight: Number(style.fontWeight),
        marker: parseFloat(outer.borderLeftWidth),
        text: text.textContent,
        rects: Array.from(range.getClientRects(), (r) => ({ left: r.left, right: r.right })),
        left: rect.left,
        right: rect.right,
        document: document.documentElement.scrollWidth,
      };
    });
    await test.info().attach('lookup-error-presentation', {
      body: JSON.stringify({ width, ...sample }),
      contentType: 'application/json',
    });
    expect.soft(sample.ratio).toBeGreaterThanOrEqual(4.5);
    expect.soft(sample.weight).toBeGreaterThanOrEqual(500);
    expect.soft(sample.marker).toBeGreaterThanOrEqual(2);
    expect.soft(sample.left).toBeGreaterThanOrEqual(0);
    expect.soft(sample.right).toBeLessThanOrEqual(width + 1);
    expect.soft(sample.document).toBeLessThanOrEqual(width + 1);
    for (const rect of sample.rects) {
      expect.soft(rect.left).toBeGreaterThanOrEqual(0);
      expect.soft(rect.right).toBeLessThanOrEqual(width + 1);
    }
    samples.push({ width, ...sample });
  }
  return samples;
}

for (const actor of [
  { name: 'member', base: '/app', owner: 7, level: 1 },
  { name: 'admin', base: '/admin', owner: 42, level: 99 },
] as const)
  for (const language of ['cs', 'en'] as const)
    for (const theme of ['light', 'dark'] as const) {
      test(`@pr-smoke @pr-smoke-mobile Storage lookup feedback ${actor.name} ${language} ${theme}`, async ({
        page,
      }, info) => {
        const errors: string[] = [],
          writes: string[] = [],
          queries: { path: string; params: Record<string, string> }[] = [];
        page.on('pageerror', (e) => errors.push(String(e)));
        page.on('request', (r) => {
          if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(r.method())) writes.push(r.method());
        });
        await page.clock.setFixedTime(new Date('2026-11-11T13:00:00Z'));
        await bootstrapVpsAdminWindow(page, {
          sessionToken: 'TEST',
          webuiNext: { uiSettings: { persistence: 'local' } },
        });
        await setUiSettingsLocalStorage(page, { language, theme });
        await page.setViewportSize({ width: info.project.name.startsWith('mobile') ? 390 : 1280, height: 1000 });
        const owner = { id: actor.owner, login: 'synthetic-owner' };
        const root = {
          id: 10,
          name: 'tank/synthetic-storage',
          user: owner,
          used: 5120,
          avail: 15360,
          referenced: 4096,
          refquota: 20480,
          quota: 0,
          object_state: 'active',
        };
        const child = { ...root, id: 11, name: root.name + '/synthetic-child', parent: { id: 10 }, role: 'hypervisor' };
        let failed = true;
        const response = {
          status: 503,
          contentType: 'application/json',
          body: JSON.stringify(
            failEnvelope('Synthetic dataset lookup failure; retain the mount draft and allow retry.')
          ),
        };
        await installHaveApiMock(page, {
          user: { id: 7, login: 'synthetic-actor', level: actor.level },
          handlers: {
            'GET vpses/123': () => ({
              vps: {
                id: 123,
                hostname: 'synthetic-storage.example.test',
                object_state: 'active',
                is_running: true,
                enable_network: true,
                user: owner,
                dataset: { id: 10, name: root.name },
                node: { id: 1, domain_name: 'node.example.test', hypervisor_type: 'vpsadminos' },
              },
            }),
            'GET datasets/10': () => ({ dataset: root }),
            'GET vpses/123/mounts': () => ({ mounts: [] }),
            'GET ip_addresses': () => ({ ip_addresses: [] }),
            'GET transaction_chains': () => ({ transaction_chains: [] }),
            'GET datasets': ({ url }) => {
              queries.push({ path: 'index', params: Object.fromEntries(url.searchParams) });
              return failed ? response : { datasets: [child], _meta: { total_count: 1 } };
            },
            'GET datasets/find_by_name': ({ url }) => {
              queries.push({ path: 'find', params: Object.fromEntries(url.searchParams) });
              return failed ? response : { dataset: child };
            },
          },
        });
        await page.goto(actor.base + '/vps/123/storage');
        await page.getByTestId('vps.storage.mounts.add').click();
        const modal = page.getByTestId('vps.storage.mounts.create');
        await page.getByTestId('vps.storage.mounts.create.mountpoint').fill('/mnt/synthetic-draft');
        const picker = modal.getByTestId('vps.storage.dataset_picker');
        const current = (await picker.count()) > 0;
        let error: Locator;
        if (current) {
          await picker.getByTestId('vps.storage.dataset_picker.open').click();
          error = picker.getByRole('alert');
        } else {
          await page.getByTestId('vps.storage.mounts.create.dataset').fill(child.name);
          await page.getByTestId('vps.storage.mounts.create.find_dataset').click();
          error = modal.getByText('Synthetic dataset lookup failure; retain the mount draft and allow retry.', {
            exact: true,
          });
        }
        await expect(error).toBeVisible();
        const samples = await readable(page, error);
        await modal.screenshot({ path: info.outputPath('lookup-error-320.png'), animations: 'disabled', scale: 'css' });
        if (actor.name === 'member' && language === 'cs' && theme === 'dark') {
          await page.setViewportSize({ width: info.project.name.startsWith('mobile') ? 390 : 1280, height: 1000 });
          await modal.screenshot({
            path: info.outputPath('lookup-error-normal.png'),
            animations: 'disabled',
            scale: 'css',
          });
          await page.setViewportSize({ width: 320, height: 1000 });
        }
        await expect(page.getByTestId('vps.storage.mounts.create.mountpoint')).toHaveValue('/mnt/synthetic-draft');
        await expect(page.getByTestId('vps.storage.mounts.create.submit')).toBeDisabled();
        failed = false;
        if (current) {
          await error.getByRole('button').focus();
          await page.keyboard.press('Enter');
          await expect(picker.getByTestId('vps.storage.dataset_picker.candidate.11')).toBeVisible();
          await expect(error).toHaveCount(0);
          await picker.getByTestId('vps.storage.dataset_picker.candidate.11').click();
          await expect(picker.getByTestId('vps.storage.dataset_picker.choose')).toBeEnabled();
          await picker.getByRole('button', { name: language === 'cs' ? 'Zrušit' : 'Cancel', exact: true }).click();
          await expect(picker.getByTestId('vps.storage.dataset_picker.open')).toBeFocused();
        } else {
          await page.getByTestId('vps.storage.mounts.create.find_dataset').focus();
          await page.keyboard.press('Enter');
          await expect(error).toHaveCount(0);
          await expect(modal).toContainText(child.name);
        }
        expect(queries).toHaveLength(2);
        for (const query of queries) {
          if (current) {
            expect(query.path).toBe('index');
            expect(query.params['dataset[dataset]']).toBe('10');
            expect(query.params['dataset[role]']).toBe('hypervisor');
            expect(query.params['dataset[user]']).toBe(actor.base === '/admin' ? '42' : undefined);
          } else {
            expect(query.path).toBe('find');
            expect(query.params['dataset[name]']).toBe(child.name);
          }
        }
        await expect(page.getByTestId('vps.storage.mounts.create.mountpoint')).toHaveValue('/mnt/synthetic-draft');
        await page.getByTestId('vps.storage.mounts.create.cancel').click();
        await expect(modal).toHaveCount(0);
        expect(writes).toEqual([]);
        expect(errors).toEqual([]);
        await info.attach('lookup-recovery-contract', {
          body: JSON.stringify({ currentPicker: current, queries, samples, fixtureOnly: true, writes, errors }),
          contentType: 'application/json',
        });
      });
    }
