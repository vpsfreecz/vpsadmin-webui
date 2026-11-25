import { expect, test, type Locator } from '@playwright/test';

import { bootstrapVpsAdminWindow, installHaveApiMock, setUiSettingsLocalStorage } from '../../fixtures';

async function expectTextInsideCells(comparison: Locator) {
  const cells = await comparison.evaluate((table) =>
    Array.from(table.children).flatMap((row) =>
      Array.from(row.children).map((cell) => {
        const box = cell.getBoundingClientRect();
        const textRects = [];
        const walker = document.createTreeWalker(cell, NodeFilter.SHOW_TEXT);
        let node: Node | null;
        while ((node = walker.nextNode())) {
          if (!node.textContent?.trim()) continue;
          const range = document.createRange();
          range.selectNode(node);
          for (const rect of Array.from(range.getClientRects())) {
            if (rect.width && rect.height) {
              textRects.push({ left: rect.left, right: rect.right });
            }
          }
        }
        return {
          text: cell.textContent,
          left: box.left,
          right: box.right,
          width: box.width,
          client: cell.clientWidth,
          scroll: cell.scrollWidth,
          textRects,
        };
      })
    )
  );
  expect(cells.length).toBeGreaterThan(12);
  for (const cell of cells) {
    expect.soft(cell.width, cell.text ?? 'comparison cell').toBeGreaterThan(0);
    expect.soft(cell.scroll, cell.text ?? 'comparison cell').toBeLessThanOrEqual(cell.client + 1);
    for (const rect of cell.textRects) {
      expect.soft(rect.left, cell.text ?? 'cell text').toBeGreaterThanOrEqual(cell.left - 1);
      expect.soft(rect.right, cell.text ?? 'cell text').toBeLessThanOrEqual(cell.right + 1);
    }
  }
}

for (const action of ['template', 'swap'] as const) {
  for (const actor of ['member', 'admin'] as const) {
    for (const [language, theme] of [
      ['cs', 'dark'],
      ['en', 'light'],
    ] as const) {
      test(`@pr-smoke @pr-smoke-mobile Lifecycle long values ${action} ${actor} ${language} ${theme}`, async ({
        page,
      }) => {
        const errors: string[] = [];
        const writes: string[] = [];
        page.on('pageerror', (error) => errors.push(String(error)));
        page.on('request', (request) => {
          if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method())) {
            writes.push(`${request.method()} ${new URL(request.url()).pathname}`);
          }
        });
        await bootstrapVpsAdminWindow(page, {
          sessionToken: 'TEST',
          webuiNext: { uiSettings: { persistence: 'local' } },
        });
        await setUiSettingsLocalStorage(page, { language, theme });
        const owner = { id: actor === 'admin' ? 42 : 7, login: 'fixture-owner' };
        const node = {
          id: 1,
          domain_name: 'node.example.test',
          hypervisor_type: 'vpsadminos',
          location: { id: 2, label: 'Ověřovací lokalita s dlouhým českým názvem' },
        };
        const template = {
          id: 6,
          enabled: true,
          hypervisor_type: 'vpsadminos',
          label: 'Debian GNU/Linux – ověřovací šablona s dlouhým českým názvem',
        };
        const vps = {
          id: 123,
          hostname: 'fixture-vps',
          object_state: 'active',
          is_running: false,
          user: owner,
          node,
          os_template: template,
          dataset: { id: 901, name: 'tank/fixture/123/root' },
          dns_resolver: null,
        };
        const target = {
          ...vps,
          id: 321,
          hostname: 'vps123-playground',
          dataset: { id: 902, name: 'tank/fixture/321/root' },
        };
        await installHaveApiMock(page, {
          user: { id: 7, login: 'fixture-actor', level: actor === 'admin' ? 100 : 1 },
          handlers: {
            'GET vpses/123': () => ({ vps }),
            'GET vpses/321': () => ({ vps: target }),
            'GET vpses': () => ({ vpses: [target] }),
            'GET transaction_chains': () => ({ transaction_chains: [] }),
            'GET vpses/123/statuses': () => ({ statuses: [] }),
            'GET os_templates': () => ({ os_templates: [template] }),
            'GET ip_addresses': () => ({
              ip_addresses: [
                {
                  id: 1,
                  addr: '2001:db8:1234:5678::123',
                  prefix: 128,
                  network: { id: 1, role: 'public' },
                },
              ],
            }),
          },
        });
        await page.goto(`/${actor === 'admin' ? 'admin' : 'app'}/vps/123/lifecycle/${action}`);
        const root = page.getByTestId(`vps.lifecycle.${action}`);
        await expect(root).toBeVisible();
        if (action === 'template') {
          await expect(page.getByTestId('vps.lifecycle.template.os_template').locator('option')).toHaveCount(2);
          await expect(page.getByTestId('vps.lifecycle.template.os_template')).toHaveValue('6');
        } else {
          await page.getByTestId('vps.lifecycle.swap.candidate.321').click();
          await expect(page.getByTestId('vps.lifecycle.swap.preview.target_label')).toContainText('vps123-playground');
        }
        for (const width of [1280, 768, 390, 320]) {
          await page.setViewportSize({ width, height: 1000 });
          const documentWidth = await page.evaluate(() => document.documentElement.scrollWidth);
          expect.soft(documentWidth, `${action} document at${width}`).toBeLessThanOrEqual(width + 1);
          if (action === 'template') {
            const value = page.getByTestId('vps.lifecycle.template.review.payload').locator(':scope > div').last();
            await expect(value).toContainText('enable_os_template_auto_update');
            const size = await value.evaluate((element) => ({
              client: element.clientWidth,
              scroll: element.scrollWidth,
            }));
            expect.soft(size.scroll, `complete template request text at${width}`).toBeLessThanOrEqual(size.client + 1);
            await expect(page.getByTestId('vps.lifecycle.template.os_template')).toHaveValue('6');
          } else {
            const comparison = page.getByTestId('vps.lifecycle.swap.preview.after_table');
            await expect(comparison).toContainText('tank/fixture/123/root');
            await expect(comparison).toContainText('tank/fixture/321/root');
            await expectTextInsideCells(comparison);
            await expect(page.getByTestId('vps.lifecycle.swap.preview.source_ips_after')).toContainText(
              '2001:db8:1234:5678::123/128'
            );
          }
        }
        if (action === 'template') {
          await page.getByTestId('vps.lifecycle.template.submit').click();
          const dialog = page.getByTestId('vps.lifecycle.template.submit.confirm_dialog');
          await expect(dialog).toBeVisible();
          await page.getByTestId('vps.lifecycle.template.submit.confirm_dialog.cancel').click();
          await expect(dialog).toBeHidden();
          await expect(page.getByTestId('vps.lifecycle.template.os_template')).toHaveValue('6');
        }
        expect(errors).toEqual([]);
        expect(writes).toEqual([]);
      });
    }
  }
}
