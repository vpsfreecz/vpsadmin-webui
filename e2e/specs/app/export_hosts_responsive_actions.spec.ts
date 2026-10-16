import { expect, test, type Locator, type Page } from '@playwright/test';

import { bootstrapVpsAdminWindow, installHaveApiMock, setUiSettingsLocalStorage } from '../../fixtures';
import { expectNoDocumentHorizontalOverflow } from '../../helpers/horizontalOverflow';

const exportItem = {
  id: 10,
  dataset: { id: 20, name: 'data', full_name: 'tank/user/data' },
  snapshot: null,
  user: { id: 1, login: 'demo' },
  host_ip_address: { id: 5, addr: '198.51.100.10' },
  path: '/tank/user/data',
  all_vps: false,
  rw: true,
  sync: true,
  subtree_check: false,
  root_squash: false,
  threads: 8,
  enabled: true,
  updated_at: '2026-09-16T08:00:00Z',
  created_at: '2026-09-15T08:00:00Z',
};

const host = {
  id: 11,
  ip_address: { id: 9, addr: '203.0.113.11' },
  rw: true,
  sync: true,
  subtree_check: false,
  root_squash: false,
};

async function hostTableLayout(tableCard: Locator) {
  return tableCard.evaluate((card) => {
    const scroller = card.firstElementChild as HTMLElement;
    const table = scroller.querySelector('table') as HTMLTableElement;
    const rect = scroller.getBoundingClientRect();
    return {
      clientWidth: scroller.clientWidth,
      scrollWidth: scroller.scrollWidth,
      scrollLeft: scroller.scrollLeft,
      left: rect.left,
      right: rect.right,
      tableDisplay: getComputedStyle(table).display,
    };
  });
}

async function expectActionInside(page: Page, action: Locator, tableCard: Locator, minHeight: number) {
  const actionRect = await action.boundingBox();
  const cardRect = await tableCard.boundingBox();
  expect(actionRect).not.toBeNull();
  expect(cardRect).not.toBeNull();
  if (!actionRect || !cardRect) throw new Error('Missing export host action geometry');

  expect(actionRect.x).toBeGreaterThanOrEqual(cardRect.x - 1);
  expect(actionRect.x + actionRect.width).toBeLessThanOrEqual(cardRect.x + cardRect.width + 1);
  expect(actionRect.x + actionRect.width).toBeLessThanOrEqual(await page.evaluate(() => document.documentElement.clientWidth + 1));
  expect(actionRect.height).toBeGreaterThanOrEqual(minHeight);
}

test('@pr-smoke @pr-smoke-mobile export host actions follow the card width without horizontal scrolling', async ({
  page,
}, testInfo) => {
  const mobile = testInfo.project.name.includes('mobile');
  const hostMutations: Array<{ method: string; path: string }> = [];

  if (mobile) await page.setViewportSize({ width: 320, height: 740 });

  await bootstrapVpsAdminWindow(page, { sessionToken: 'TEST' });
  await installHaveApiMock(page, {
    user: { id: 1, login: 'demo', level: 1 },
    handlers: {
      'GET exports/10': () => exportItem,
      'GET exports/10/hosts': () => ({ hosts: [host, { ...host, id: 12, ip_address: { id: 10, addr: '2001:db8:1234:5678:1234:5678:1234:5678' }, rw: false }], _meta: { total_count: 2 } }),
      'GET ip_addresses': () => ({ ip_addresses: [host.ip_address], _meta: { total_count: 1 } }),
    },
  });

  page.on('request', (request) => {
    const url = new URL(request.url());
    if (url.pathname !== '/api/v7.0/exports/10/hosts/11') return;
    if (request.method() === 'GET') return;
    hostMutations.push({ method: request.method(), path: url.pathname });
  });

  await page.goto('/app/exports/10');

  const tableCard = page.getByTestId('exports.detail.hosts.table');
  const row = page.getByTestId('exports.detail.hosts.row.11');
  const edit = page.getByTestId('exports.detail.hosts.row.11.edit');
  const remove = page.getByTestId('exports.detail.hosts.row.11.delete');

  await expect(row).toBeVisible();
  await expect(tableCard.getByRole('table')).toBeVisible();

  async function expectCompactLayout(width: number) {
    await page.setViewportSize({ width, height: 800 });
    await expect.poll(async () => (await hostTableLayout(tableCard)).tableDisplay).toBe('block');
    await row.scrollIntoViewIfNeeded();
    await expectNoDocumentHorizontalOverflow(page);

    const layout = await hostTableLayout(tableCard);
    expect(layout.scrollWidth).toBeLessThanOrEqual(layout.clientWidth + 1);
    expect(layout.scrollLeft).toBe(0);
    await expect(row.getByText('Host address', { exact: true })).toBeVisible();
    await expect(row.getByText('Mode', { exact: true })).toBeVisible();
    await expect(row.getByText('State', { exact: true })).toBeVisible();
    await expect(row.getByText('Actions', { exact: true })).toBeVisible();
    await expectActionInside(page, edit, tableCard, 44);
    await expectActionInside(page, remove, tableCard, 44);
  }

  if (mobile) {
    await expectCompactLayout(320);
    await expectCompactLayout(390);
  } else {
    await page.setViewportSize({ width: 1024, height: 800 });
    await expect.poll(async () => (await hostTableLayout(tableCard)).tableDisplay).toBe('table');
    await expect(tableCard.getByRole('columnheader', { name: 'Host address' })).toBeVisible();
    expect((await edit.boundingBox())?.height).toBe(32);
    expect((await remove.boundingBox())?.height).toBe(32);

    const wideProofScreenshot = process.env['E2E_EXPORT_HOST_WIDE_PROOF_SCREENSHOT']?.trim();
    if (wideProofScreenshot) await page.screenshot({ path: wideProofScreenshot, fullPage: true });

    // Wider viewports keep a full-width table instead of moving hosts to a sidebar.
    for (const width of [1280, 1440, 1920]) {
      await page.setViewportSize({ width, height: 900 });
      await expect.poll(async () => (await hostTableLayout(tableCard)).tableDisplay).toBe('table');
      await expectNoDocumentHorizontalOverflow(page);
      const layout = await hostTableLayout(tableCard);
      expect(layout.scrollWidth).toBeLessThanOrEqual(layout.clientWidth + 1);
      await expectActionInside(page, edit, tableCard, 32);
      await expectActionInside(page, remove, tableCard, 32);
    }
  }

  const compactProofScreenshot = process.env['E2E_EXPORT_HOST_COMPACT_PROOF_SCREENSHOT']?.trim();
  if (compactProofScreenshot) await page.screenshot({ path: compactProofScreenshot, fullPage: true });

  await edit.click();
  await expect(page.getByTestId('exports.detail.host.editor')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('exports.detail.host.editor')).toHaveCount(0);

  await remove.click();
  await expect(page.getByTestId('exports.detail.host.delete.dialog')).toBeVisible();
  await page.getByTestId('exports.detail.host.delete.dialog.cancel').click();
  await expect(page.getByTestId('exports.detail.host.delete.dialog')).toHaveCount(0);
  expect(hostMutations).toEqual([]);
});

for (const scenario of ['selected-hosts', 'all-vps', 'snapshot'] as const) {
  test(`@pr-smoke @pr-smoke-mobile ${scenario} export has full-width hosts and stacked mount examples`, async ({ page }, testInfo) => {
    await bootstrapVpsAdminWindow(page, { sessionToken: 'TEST' });
    await setUiSettingsLocalStorage(page, { language: 'cs', theme: 'dark' });
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: { writeText: async (text: string) => { sessionStorage.setItem('fixture.copied', text); } },
      });
    });
    await installHaveApiMock(page, { user: { id: 1, login: 'demo', level: 1 }, handlers: {
      'GET exports/10': () => ({ ...exportItem, all_vps: scenario === 'all-vps',
        snapshot: scenario === 'snapshot' ? { id: 30, name: 'backup-example' } : null }),
      'GET exports/10/hosts': () => ({ hosts: [host,
        { ...host, id: 12, ip_address: { id: 10, addr: '2001:db8:1234:5678:1234:5678:1234:5678' }, rw: false },
        { ...host, id: 13, ip_address: { id: 11, addr: '203.0.113.13' } }], _meta: { total_count: 3 } }),
    } });
    await page.goto('/app/exports/10');
    await expect(page.getByTestId('exports.detail.hosts.row.13')).toBeVisible();
    const summary = await page.getByTestId('exports.detail.summary').boundingBox();
    const hosts = await page.getByTestId('exports.detail.hosts').boundingBox();
    const instructions = await page.getByTestId('exports.detail.instructions').boundingBox();
    if (!summary || !hosts || !instructions) throw new Error('Missing export sections');
    expect(hosts.y).toBeGreaterThanOrEqual(summary.y + summary.height);
    expect(instructions.y).toBeGreaterThanOrEqual(hosts.y + hosts.height);
    expect(hosts.x).toBeCloseTo(summary.x, 0);
    expect(hosts.width).toBeCloseTo(summary.width, 0);
    expect(instructions.width).toBeCloseTo(summary.width, 0);
    if (scenario === 'all-vps') await expect(page.getByTestId('exports.detail.hosts.add')).toBeDisabled();
    else await expect(page.getByTestId('exports.detail.hosts.add')).toBeEnabled();

    const snippets = scenario === 'snapshot' ? ['command'] : ['command', 'fstab', 'systemd', 'nixos'];
    let previous: { y: number; height: number } | undefined;
    let left: number | undefined;
    let width: number | undefined;
    for (const kind of snippets) {
      const block = page.getByTestId(`exports.detail.instructions.${kind}`);
      const rect = await block.boundingBox();
      if (!rect) throw new Error(`Missing ${kind} block`);
      if (previous) expect(rect.y).toBeGreaterThanOrEqual(previous.y + previous.height);
      if (left !== undefined && width !== undefined) {
        expect(rect.x).toBeCloseTo(left, 0);
        expect(rect.width).toBeCloseTo(width, 0);
      }
      previous = rect;
      left = rect.x;
      width = rect.width;
    }
    for (const kind of snippets) {
      await page.getByTestId(`exports.detail.instructions.${kind}.copy`).click();
      expect(await page.evaluate(() => sessionStorage.getItem('fixture.copied')))
        .toBe(await page.getByTestId(`exports.detail.instructions.${kind}`).textContent());
    }
    if (scenario === 'snapshot') await expect(page.getByTestId('exports.detail.instructions.fstab')).toHaveCount(0);
    await expectNoDocumentHorizontalOverflow(page);
    if (scenario === 'all-vps') {
      await expect(page.getByTestId('exports.detail.instructions.nixos.copy')).toHaveText('Kopírovat');
      await page.evaluate(() => { (document.activeElement as HTMLElement | null)?.blur(); window.scrollTo({ top: 0, behavior: 'instant' }); });
      const screenshot = await page.screenshot({ path: testInfo.outputPath('export-layout.png'), fullPage: true, scale: 'css' });
      await testInfo.attach('Export detail — Czech synthetic fixture', { body: screenshot, contentType: 'image/png' });
    }
  });
}
