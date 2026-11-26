import { expect, test, type Locator } from '@playwright/test';

import { bootstrapVpsAdminWindow, installHaveApiMock, setUiSettingsLocalStorage } from '../../fixtures';

async function expectReadableFeedback(target: Locator) {
  const sample = await target.evaluate((element) => {
    type Color = [number, number, number, number];
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 1;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) throw Error('Canvas unavailable');
    const color = (value: string): Color => {
      context.clearRect(0, 0, 1, 1);
      context.fillStyle = value;
      context.fillRect(0, 0, 1, 1);
      const data = context.getImageData(0, 0, 1, 1).data;
      return [data[0]!, data[1]!, data[2]!, data[3]! / 255];
    };
    const over = (a: Color, b: Color): Color => [
      a[0] * a[3] + b[0] * (1 - a[3]),
      a[1] * a[3] + b[1] * (1 - a[3]),
      a[2] * a[3] + b[2] * (1 - a[3]),
      1,
    ];
    const luminance = (c: Color) =>
      c
        .slice(0, 3)
        .reduce(
          (sum, v, index) =>
            sum +
            (v / 255 <= 0.04045 ? v / 255 / 12.92 : ((v / 255 + 0.055) / 1.055) ** 2.4) *
              [0.2126, 0.7152, 0.0722][index]!,
          0
        );
    const ancestors: Element[] = [];
    let current: Element | null = element;
    while (current) {
      ancestors.unshift(current);
      current = current.parentElement;
    }
    let background: Color = [255, 255, 255, 1];
    for (const ancestor of ancestors) background = over(color(getComputedStyle(ancestor).backgroundColor), background);
    const style = getComputedStyle(element),
      foreground = over(color(style.color), background),
      a = luminance(foreground),
      b = luminance(background);
    return {
      ratio: (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05),
      weight: Number(style.fontWeight),
      marker: parseFloat(style.borderLeftWidth),
      text: element.textContent,
    };
  });
  await test
    .info()
    .attach('actual-storage-validation-feedback', { body: JSON.stringify(sample), contentType: 'application/json' });
  expect(sample.ratio).toBeGreaterThanOrEqual(4.5);
  expect(sample.weight).toBeGreaterThanOrEqual(500);
  expect(sample.marker).toBeGreaterThanOrEqual(2);
}

for (const language of ['cs', 'en'] as const) {
  for (const theme of ['light', 'dark'] as const) {
    test(`@pr-smoke @pr-smoke-mobile storage root actions fit their card ${language} ${theme}`, async ({
      page,
    }, info) => {
      await page.clock.setFixedTime(new Date('2026-11-11T04:00:00Z'));
      await bootstrapVpsAdminWindow(page, { sessionToken: 'TEST' });
      await setUiSettingsLocalStorage(page, { language, theme });
      const owner = { id: 42, login: 'synthetic-owner' };
      const dataset = {
        id: 10,
        name: 'tank/synthetic-storage-with-a-long-name',
        user: owner,
        used: 5120,
        avail: 15360,
        referenced: 4096,
        refquota: 20480,
        quota: 0,
        object_state: 'active',
      };
      const writes: string[] = [];
      page.on('request', (request) => {
        if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method())) {
          writes.push(`${request.method()} ${new URL(request.url()).pathname}`);
        }
      });
      await installHaveApiMock(page, {
        user: { id: 7, login: 'synthetic-administrator', level: 99 },
        handlers: {
          'GET vpses/123': () => ({
            vps: {
              id: 123,
              hostname: 'synthetic-storage.example.test',
              object_state: 'active',
              is_running: true,
              enable_network: true,
              user: owner,
              dataset: { id: 10, name: dataset.name },
              node: { id: 1, domain_name: 'node.example.test', hypervisor_type: 'vpsadminos' },
            },
          }),
          'GET datasets/10': () => ({ dataset }),
          'GET vpses/123/mounts': () => ({ mounts: [] }),
          'GET ip_addresses': () => ({ ip_addresses: [] }),
          'GET transaction_chains': () => ({ transaction_chains: [] }),
        },
      });
      await page.goto('/admin/vps/123/storage');
      const root = page.getByTestId('vps.storage.root_dataset');
      await expect(root).toBeVisible();
      await expect(root.getByTestId('vps.storage.root_dataset.resize')).toBeEnabled();
      await expect(root.getByTestId('vps.storage.root_dataset.create_subdataset')).toHaveAttribute(
        'href',
        '/admin/datasets/10?create=subdataset'
      );
      await expect(root.getByTestId('vps.storage.root_dataset.snapshots')).toHaveAttribute(
        'href',
        '/admin/datasets/10/snapshots'
      );
      await expect(root.getByTestId('vps.storage.root_dataset.downloads')).toHaveAttribute(
        'href',
        '/admin/datasets/10/downloads'
      );
      await expect(root).toContainText(dataset.name);
      for (const width of [320, 768, 1024, 1280]) {
        await page.setViewportSize({ width, height: 1000 });
        await root.evaluate(async (element) => {
          await Promise.all(
            element
              .getAnimations({ subtree: true })
              .filter((animation) => Number.isFinite(Number(animation.effect?.getComputedTiming().endTime)))
              .map((animation) => animation.finished.catch(() => {}))
          );
        });
        const geometry = await root.evaluate((element) => {
          const bounds = element.getBoundingClientRect();
          const identity = element.firstElementChild?.firstElementChild?.getBoundingClientRect();
          const controls = Array.from(element.querySelectorAll('a[href],button'))
            .map((control) => ({
              id: control.getAttribute('data-testid'),
              rect: control.getBoundingClientRect().toJSON(),
            }))
            .filter((control) => control.rect.width > 0 && control.rect.height > 0);
          return { card: bounds.toJSON(), identity: identity?.toJSON(), controls };
        });
        await info.attach('storage-root-geometry', {
          body: JSON.stringify({ width, geometry }),
          contentType: 'application/json',
        });
        expect.soft(geometry.card.left).toBeGreaterThanOrEqual(0);
        expect.soft(geometry.card.right).toBeLessThanOrEqual(width + 1);
        expect(geometry.identity).toBeDefined();
        expect.soft(geometry.identity!.width).toBeGreaterThanOrEqual(Math.min(200, geometry.card.width - 34));
        for (const control of geometry.controls) {
          expect.soft(control.rect.left, control.id ?? 'root action').toBeGreaterThanOrEqual(geometry.card.left - 1);
          expect
            .soft(control.rect.right, control.id ?? 'root action')
            .toBeLessThanOrEqual(Math.min(geometry.card.right, width) + 1);
        }
        if ([320, 768, 1280].includes(width)) {
          await root.screenshot({
            path: info.outputPath(`storage-root-${width}.png`),
            animations: 'disabled',
            scale: 'css',
          });
        }
      }
      await root.getByTestId('vps.storage.root_dataset.resize').click();
      const modal = page.getByTestId('vps.storage.resize.modal');
      const size = modal.getByTestId('vps.storage.resize.size');
      await size.fill('4');
      const validation = modal.getByText(
        language === 'cs'
          ? 'Nová velikost nesmí být menší než aktuálně využité místo.'
          : 'The new size cannot be smaller than the currently used space.',
        { exact: true }
      );
      await expect(validation).toBeVisible();
      await expect(size).toHaveAttribute('aria-invalid', 'true');
      await expect(modal.getByTestId('vps.storage.resize.submit')).toBeDisabled();
      for (const width of [768, 320]) {
        await page.setViewportSize({ width, height: 1000 });
        await expectReadableFeedback(validation);
        await modal.screenshot({
          path: info.outputPath(`storage-validation-${width}.png`),
          animations: 'disabled',
          scale: 'css',
        });
      }
      await size.fill('32');
      await expect(validation).toHaveCount(0);
      await expect(modal.getByTestId('vps.storage.resize.submit')).toBeEnabled();
      await modal.getByTestId('vps.storage.resize.cancel').click();
      expect(writes.filter((write) => !write.includes('/webui_user_settings/'))).toEqual([]);
    });
  }
}
