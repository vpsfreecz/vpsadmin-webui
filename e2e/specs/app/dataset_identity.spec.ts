import { expect, test, type Locator, type Page } from '@playwright/test';
import { bootstrapVpsAdminWindow, installHaveApiMock, setUiSettingsLocalStorage } from '../../fixtures';

const numericName = '2943';
const datasetId = 8675;
const longName =
  'tank/nas/synteticky-dataset-pro-overeni-uplneho-nazvu-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa/data';
const actors = [
  { name: 'member', base: '/app', level: 1, owner: 7 },
  { name: 'admin', base: '/admin', level: 99, owner: 42 },
  { name: 'admin-My', base: '/app', level: 99, owner: 7 },
  { name: 'support-My', base: '/app', level: 21, owner: 7 },
  { name: 'support', base: '/admin', level: 21, owner: 42 },
] as const;

async function textBounds(page: Page, locator: Locator) {
  const geometry = await locator.evaluate((element) => {
    const box = element.getBoundingClientRect();
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
    const rects: { left: number; right: number }[] = [];
    let node: Node | null;
    while ((node = walker.nextNode())) {
      if (!node.textContent?.trim()) continue;
      const range = document.createRange();
      range.selectNodeContents(node);
      rects.push(...Array.from(range.getClientRects(), (r) => ({ left: r.left, right: r.right })));
    }
    return { left: box.left, right: box.right, rects, document: document.documentElement.scrollWidth };
  });
  await test.info().attach('identity-text-bounds', { body: JSON.stringify(geometry), contentType: 'application/json' });
  expect(geometry.rects.length).toBeGreaterThan(0);
  const width = page.viewportSize()!.width;
  expect(geometry.left).toBeGreaterThanOrEqual(0);
  expect(geometry.right).toBeLessThanOrEqual(width + 1);
  expect(geometry.document).toBeLessThanOrEqual(width + 1);
  for (const r of geometry.rects) {
    expect(r.left).toBeGreaterThanOrEqual(geometry.left);
    expect(r.right).toBeLessThanOrEqual(geometry.right);
  }
}

// Settle intercepted background reads before replacing the document. Keep the
// error journal across every transition, including the unload and the next load.
async function openAfterReads(page: Page, path: string) {
  await page.waitForLoadState('networkidle');
  await page.goto(path);
}

for (const actor of actors)
  for (const section of ['nas', 'datasets'] as const)
    for (const language of ['cs', 'en'] as const)
      for (const theme of ['light', 'dark'] as const) {
        test(`@pr-smoke @pr-smoke-mobile Dataset identity ${actor.name} ${section} ${language} ${theme}`, async ({
          page,
        }, info) => {
          const errors: string[] = [],
            reads: string[] = [],
            writes: string[] = [];
          page.on('pageerror', (error) => errors.push(String(error)));
          page.on('request', (request) => {
            if (request.url().includes('/api/') && !['GET', 'HEAD', 'OPTIONS'].includes(request.method()))
              writes.push(request.method() + ' ' + request.url());
          });
          await page.clock.setFixedTime(new Date('2026-11-11T15:00:00Z'));
          await bootstrapVpsAdminWindow(page, {
            sessionToken: 'TEST',
            webuiNext: { uiSettings: { persistence: 'local' } },
          });
          await setUiSettingsLocalStorage(page, { language, theme });
          const dataset = {
            id: datasetId,
            name: numericName,
            user: { id: actor.owner, login: 'synthetic-owner' },
            parent: null,
            vps: null,
            role: 'primary',
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
          const longDataset = { ...dataset, id: 8676, name: longName };
          await installHaveApiMock(page, {
            user: { id: 7, login: 'synthetic-viewer', level: actor.level },
            handlers: {
              'GET datasets': () => ({ datasets: [dataset], _meta: { total_count: 1 } }),
              'GET datasets/8675': () => {
                reads.push('8675');
                return { dataset };
              },
              'GET datasets/8676': () => {
                reads.push('8676');
                return { dataset: longDataset };
              },
              'GET transaction_chains': () => ({ transaction_chains: [] }),
              'GET help_boxes': () => ({ help_boxes: [] }),
              'GET action_states': () => ({ action_states: [] }),
            },
          });
          const normalWidth = info.project.name.startsWith('mobile') ? 390 : 1280;
          await page.setViewportSize({ width: normalWidth, height: 900 });
          const list = `${actor.base}/${actor.base === '/app' ? 'nas' : section}`;
          const detail = `${actor.base}/${section}`;
          const nameLabel = language === 'cs' ? 'Název datasetu: ' : 'Dataset name: ';
          const idLabel = language === 'cs' ? 'Interní ID: #8675' : 'Internal ID: #8675';
          await page.goto(list);
          const row = page.getByTestId(normalWidth < 768 ? 'datasets.card.8675' : 'datasets.row.8675');
          await expect(row).toContainText(idLabel);
          const link = row.getByRole('link', {
            name: normalWidth < 768 ? nameLabel + numericName : numericName,
            exact: true,
          });
          await expect(link).toHaveAttribute('href', `${list}/8675`);
          await row.screenshot({
            path: info.outputPath('identity-list-normal.png'),
            animations: 'disabled',
            scale: 'css',
          });
          await link.focus();
          await page.keyboard.press('Enter');
          await expect(page).toHaveURL(new RegExp(`${list}/8675$`));
          if (detail !== list) await openAfterReads(page, `${detail}/8675`);
          const header = page.getByTestId('dataset.header');
          await expect(header.getByRole('heading', { level: 1 })).toHaveText(nameLabel + numericName);
          await expect(header).toContainText(idLabel);
          expect(reads).toContain('8675');
          await textBounds(page, header.getByRole('heading', { level: 1 }));
          await header.screenshot({
            path: info.outputPath('identity-header-normal.png'),
            animations: 'disabled',
            scale: 'css',
          });
          await page.setViewportSize({ width: 320, height: 900 });
          await textBounds(page, header.getByRole('heading', { level: 1 }));
          await header.screenshot({
            path: info.outputPath('identity-header-320.png'),
            animations: 'disabled',
            scale: 'css',
          });
          const back = header.getByRole('link', {
            name: section === 'nas' ? 'NAS' : language === 'cs' ? 'Datasety' : 'Datasets',
            exact: true,
          });
          await expect(back).toHaveAttribute('href', detail);
          if (detail === list) {
            await back.focus();
            await page.keyboard.press('Enter');
            await expect.poll(() => new URL(page.url()).pathname).toBe(list);
          } else {
            // Member general-dataset lists redirect to VPS; retain the existing alias contract.
            await openAfterReads(page, list);
          }
          const card = page.getByTestId('datasets.card.8675');
          await expect(card).toContainText(idLabel);
          await expect(card.getByRole('link', { name: nameLabel + numericName, exact: true })).toHaveAttribute(
            'href',
            `${list}/8675`
          );
          await card.screenshot({
            path: info.outputPath('identity-list-320.png'),
            animations: 'disabled',
            scale: 'css',
          });
          await openAfterReads(page, `${detail}/8676`);
          const longHeader = page.getByTestId('dataset.header');
          await expect(longHeader.getByRole('heading', { level: 1 })).toHaveText(nameLabel + longName);
          await expect(longHeader).toContainText(language === 'cs' ? 'Interní ID: #8676' : 'Internal ID: #8676');
          for (const width of [320, normalWidth]) {
            await page.setViewportSize({ width, height: 900 });
            await textBounds(page, longHeader.getByRole('heading', { level: 1 }));
          }
          expect(reads).toContain('8676');
          expect(writes).toEqual([]);
          expect(errors).toEqual([]);
          await info.attach('identity-contract', {
            body: JSON.stringify({
              actor,
              section,
              language,
              theme,
              numericName,
              datasetId,
              longName,
              reads,
              writes,
              errors,
              fixtureOnly: true,
            }),
            contentType: 'application/json',
          });
        });
      }
