import { expect, test, type Locator, type Page } from '@playwright/test';

import { bootstrapVpsAdminWindow, installHaveApiMock, setUiSettingsLocalStorage } from '../../fixtures';

async function expectUnclippedDescription(page: Page, trigger: Locator, description: string) {
  const id = await trigger.getAttribute('aria-describedby');
  if (!id) throw new Error('Inventory trigger has no description ID');
  const tooltip = page.locator(`#${id}`);
  await expect(trigger).toHaveAttribute('title', description);
  await expect(trigger).toHaveAccessibleDescription(description);
  await expect(tooltip).toHaveCount(1);
  await expect(tooltip).toHaveAttribute('role', 'tooltip');
  await expect(tooltip).toBeVisible();
  await expect(tooltip).toHaveText(description);
  const geometry = await tooltip.evaluate((node, triggerId) => {
    const box = node.getBoundingClientRect();
    const anchor = document.querySelector(`[aria-describedby="${triggerId}"]`)?.getBoundingClientRect();
    if (!anchor) throw new Error('Inventory description has no trigger');
    const range = document.createRange();
    range.selectNodeContents(node);
    const textBoxes = Array.from(range.getClientRects()).filter((rect) => rect.width > 0 && rect.height > 0);
    const clippingAncestors: string[] = [];
    for (let parent = node.parentElement; parent; parent = parent.parentElement) {
      const style = getComputedStyle(parent);
      const bounds = parent.getBoundingClientRect();
      const left = bounds.left + parent.clientLeft;
      const top = bounds.top + parent.clientTop;
      if ((['hidden', 'clip', 'auto', 'scroll'].includes(style.overflowX)
          && (box.left < left - 1 || box.right > left + parent.clientWidth + 1))
        || (['hidden', 'clip', 'auto', 'scroll'].includes(style.overflowY)
          && (box.top < top - 1 || box.bottom > top + parent.clientHeight + 1))) {
        clippingAncestors.push(parent.tagName);
      }
    }
    return {
      bodyPortal: node.parentElement === document.body,
      position: getComputedStyle(node).position,
      clippingAncestors,
      insideViewport: box.left >= 0 && box.top >= 0 && box.right <= window.innerWidth && box.bottom <= window.innerHeight,
      fullText: textBoxes.length > 0 && textBoxes.every((text) => text.left >= box.left && text.right <= box.right && text.top >= box.top && text.bottom <= box.bottom),
      selfClipped: node.scrollWidth > node.clientWidth + 1 || node.scrollHeight > node.clientHeight + 1,
      anchor: { top: anchor.top, bottom: anchor.bottom },
      popup: { top: box.top, bottom: box.bottom, height: box.height },
      viewport: { width: window.innerWidth, height: window.innerHeight },
    };
  }, id);
  expect(geometry).toMatchObject({ bodyPortal: true, position: 'fixed', clippingAncestors: [], insideViewport: true, fullText: true, selfClipped: false });
  return { tooltip, geometry };
}

for (const language of ['en', 'cs'] as const) {
  test(`@pr-smoke @pr-smoke-mobile network availability retains service context and rejected drafts (${language})`, async ({ page }, testInfo) => {
    await bootstrapVpsAdminWindow(page, { sessionToken: 'TEST' });
    await setUiSettingsLocalStorage(page, { language });
    let enabled = true;
    let rejectNext = true;
    const writes: boolean[] = [];
    const capabilityMethods: string[] = [];
    const network = () => ({
      id: 101, label: 'Retained service', address: '192.0.2.0', prefix: 24,
      ip_version: 4, role: 'public_access', purpose: 'vps', managed: true,
      enabled, split_access: 'no_access', split_prefix: 32, assigned: 3, owned: 5, used: 9, size: 256, taken: 7,
      available_to_users: 0, owned_unassigned: 2,
    });
    await installHaveApiMock(page, {
      user: { id: 1, login: 'admin', level: 100 },
      handlers: {
        'GET locations': () => ({ locations: [] }),
        'GET networks': () => ({ networks: [network()] }),
        'OPTIONS networks/101': (ctx) => {
          expect(ctx.method).toBe('OPTIONS');
          expect(ctx.searchParams.get('method')).toBe('PUT');
          capabilityMethods.push(ctx.searchParams.get('method') ?? '');
          return {
            method: 'PUT', scope: 'network#update',
            input: { namespace: 'network', layout: 'object', parameters: { enabled: { type: 'Boolean' } } },
            output: { namespace: 'network', layout: 'object', parameters: {} },
          };
        },
        'PUT networks/101': (ctx) => {
          const input = ctx.reqJson as { network: { enabled: boolean } };
          expect(typeof input.network.enabled).toBe('boolean');
          writes.push(input.network.enabled);
          if (rejectNext) {
            rejectNext = false;
            return { status: false, message: 'Allocation policy rejected', response: null };
          }
          enabled = input.network.enabled;
          return { network: network() };
        },
      },
    });
    await page.goto('/admin/cluster/networks');
    const row = page.getByTestId('admin.cluster.networks.row.101');
    await expect(row.getByTestId('admin.cluster.networks.row.101.available_to_users')).toHaveText('0');
    await expect(row.getByTestId('admin.cluster.networks.row.101.owned_unassigned')).toHaveText('2');
    await expect(row.getByTestId('admin.cluster.networks.row.101.assigned')).toHaveText('3');
    await expect(row.getByTestId('admin.cluster.networks.row.101.used')).toHaveText('9');
    const countDescription = language === 'en'
      ? "Registered addresses or prefixes with no owner or interface assignment, and not reserved by an operation. Disabled networks contribute zero. Use on a particular VPS also depends on location, network purpose and user limits."
      : "Evidované adresy nebo prefixy bez vlastníka a bez přiřazení k rozhraní, které nejsou rezervované probíhající operací. V zakázané síti je tento počet nulový. Použití na konkrétním VPS závisí také na lokaci, účelu sítě a limitech uživatele.";
    const countLabel = page.locator('[aria-describedby="network-count-available"]');
    const countTooltip = page.locator('#network-count-available');
    const viewport = page.viewportSize();
    if (!viewport) throw new Error('Browser project requires a viewport');
    const tableScroll = page.getByTestId('admin.cluster.networks.table').locator('.overflow-x-auto');
    expect(await tableScroll.evaluate((node) => node.scrollWidth > node.clientWidth)).toBe(true);
    await tableScroll.evaluate((node) => { node.scrollLeft = node.scrollWidth; });
    await expect.poll(() => tableScroll.evaluate((node) => node.scrollLeft)).toBeGreaterThan(0);
    await countLabel.scrollIntoViewIfNeeded();
    await countLabel.focus();
    await expect(countLabel).toBeFocused();
    await expectUnclippedDescription(page, countLabel, countDescription);
    await countLabel.hover();
    await page.mouse.move(0, 0);
    await expect(countTooltip).toBeVisible(); // Pointer departure preserves focus.
    await countLabel.evaluate((node) => (node as HTMLElement).blur());
    await expect(countTooltip).toBeHidden();
    await countLabel.hover();
    await expectUnclippedDescription(page, countLabel, countDescription);
    await countLabel.focus();
    await countLabel.evaluate((node) => (node as HTMLElement).blur());
    await expect(countTooltip).toBeVisible(); // Blur preserves hover.
    await page.mouse.move(0, 0);
    await expect(countTooltip).toBeHidden();
    await countLabel.focus();
    await tableScroll.evaluate((node) => { node.scrollLeft -= 8; });
    await expectUnclippedDescription(page, countLabel, countDescription);
    await page.setViewportSize({ width: viewport.width - 16, height: viewport.height });
    await expectUnclippedDescription(page, countLabel, countDescription);
    await page.setViewportSize(viewport);
    await tableScroll.evaluate((node) => { node.scrollLeft = node.scrollWidth; });
    await countLabel.scrollIntoViewIfNeeded();
    await expectUnclippedDescription(page, countLabel, countDescription);
    await page.screenshot({ path: testInfo.outputPath(`network-counts-${language}.png`), fullPage: true });
    await page.getByTestId('admin.cluster.networks.row.101.edit').click();
    const editor = page.getByTestId('admin.cluster.networks.editor');
    const toggle = page.getByTestId('admin.cluster.networks.editor.enabled').getByRole('checkbox');
    await expect(editor).toContainText('192.0.2.0/24 (#101)');
    await expect(editor.getByTestId('admin.cluster.networks.editor.assigned')).toHaveText('3');
    await expect(editor.locator('[aria-describedby="network-editor-assigned"]')).toContainText(language === 'en' ? 'Assigned' : 'Přiřazené');
    await expect(editor.getByTestId('admin.cluster.networks.editor.owned_total')).toHaveText('5');
    await expect(editor.locator('[aria-describedby="network-editor-owned"]')).toContainText(language === 'en' ? 'Owned total' : 'Vlastněné celkem');
    const editorLabel = editor.locator('[aria-describedby="network-editor-owned"]');
    await editorLabel.focus();
    const editorDescription = language === 'en'
      ? 'All addresses or prefixes owned by users, including those assigned to an interface.'
      : 'Všechny adresy nebo prefixy vlastněné uživateli, včetně těch přiřazených k rozhraní.';
    const { tooltip: editorTooltip } = await expectUnclippedDescription(page, editorLabel, editorDescription);
    const modalLayer = await editor.evaluate((node) => {
      for (let parent = node.parentElement; parent; parent = parent.parentElement) {
        if (getComputedStyle(parent).position === 'fixed') return Number(getComputedStyle(parent).zIndex);
      }
      throw new Error('Editor has no fixed modal layer');
    });
    expect(await editorTooltip.evaluate((node) => Number(getComputedStyle(node).zIndex))).toBeGreaterThan(modalLayer);
    await page.screenshot({ path: testInfo.outputPath(`network-editor-counts-${language}.png`), fullPage: true });
    await expect(toggle).toBeVisible();
    await expect(toggle).toBeChecked();
    expect(capabilityMethods).toEqual(['PUT']);
    await expect(editor).toContainText(language === 'en' ? 'Existing service continues' : 'Stávající provoz pokračuje');
    await toggle.uncheck();
    // Captures show the implemented UI with synthetic API fixtures.
    await page.screenshot({ path: testInfo.outputPath(`network-availability-${language}.png`), fullPage: true });
    await page.getByTestId('admin.cluster.networks.editor.save').click();
    await expect(editor).toContainText('Allocation policy rejected');
    await expect(toggle).not.toBeChecked();
    await page.getByTestId('admin.cluster.networks.editor.save').click();
    await expect(editor).toBeHidden();
    await expect(page.locator('#network-editor-owned')).toHaveCount(0);
    await expect(page.getByTestId('admin.cluster.networks.row.101.enabled')).toHaveText(language === 'en' ? 'Disabled' : 'Zakázáno');
    await page.getByTestId('admin.cluster.networks.row.101.edit').click();
    await toggle.check();
    await page.getByTestId('admin.cluster.networks.editor.save').click();
    await expect(editor).toBeHidden();
    await expect(page.getByTestId('admin.cluster.networks.row.101.enabled')).toHaveText(language === 'en' ? 'Enabled' : 'Povoleno');
    expect(writes).toEqual([false, false, true]);
  });
}

test('@pr-smoke @pr-smoke-mobile older APIs keep unknown state and omit unsupported availability fields', async ({ page }) => {
  await bootstrapVpsAdminWindow(page, { sessionToken: 'TEST' });
  await setUiSettingsLocalStorage(page, { language: 'en' });
  let saved = false;
  const capabilityMethods: string[] = [];
  const network = { id: 101, address: '192.0.2.0', prefix: 24, ip_version: 4, role: 'public_access',
    purpose: 'vps', managed: true, split_access: 'no_access', split_prefix: 32,
    size: 256, used: 9, taken: 7, owned: 5 };
  await installHaveApiMock(page, {
    user: { id: 1, login: 'admin', level: 100 },
    handlers: {
      'GET locations': () => ({ locations: [] }),
      'GET networks': () => ({ networks: [network] }),
      'OPTIONS networks/101': (ctx) => {
        expect(ctx.method).toBe('OPTIONS');
        expect(ctx.searchParams.get('method')).toBe('PUT');
        capabilityMethods.push(ctx.searchParams.get('method') ?? '');
        return {
          method: 'PUT', scope: 'network#update',
          input: { namespace: 'network', layout: 'object', parameters: { managed: { type: 'Boolean' } } },
          output: { namespace: 'network', layout: 'object', parameters: {} },
        };
      },
      'PUT networks/101': (ctx) => {
        expect((ctx.reqJson as { network: object }).network).not.toHaveProperty('enabled');
        saved = true;
        return { network };
      },
    },
  });
  await page.goto('/admin/cluster/networks');
  await expect(page.getByTestId('admin.cluster.networks.row.101.enabled')).not.toHaveText('Disabled');
  await expect(page.getByTestId('admin.cluster.networks.row.101.available_to_users')).toHaveText('—');
  await expect(page.getByTestId('admin.cluster.networks.row.101.owned_unassigned')).toHaveText('—');
  await page.getByTestId('admin.cluster.networks.row.101.edit').click();
  await expect(page.getByTestId('admin.cluster.networks.editor.label')).toBeVisible();
  await expect.poll(() => capabilityMethods).toEqual(['PUT']);
  await expect(page.getByTestId('admin.cluster.networks.editor.enabled')).toHaveCount(0);
  await page.getByTestId('admin.cluster.networks.editor.save').click();
  await expect(page.getByTestId('admin.cluster.networks.editor')).toBeHidden();
  expect(saved).toBe(true);
});

test('@pr-smoke @pr-smoke-mobile disabled detached owned addresses stay visible without assignment', async ({ page }) => {
  await bootstrapVpsAdminWindow(page, { sessionToken: 'TEST' });
  await setUiSettingsLocalStorage(page, { language: 'en' });
  const ip = { id: 102, addr: '192.0.2.10', prefix: 32, user: { id: 7 },
    network: { id: 11, enabled: false, ip_version: 4, role: 'public_access', purpose: 'vps' },
    network_interface: null };
  await installHaveApiMock(page, {
    user: { id: 7, login: 'member', level: 1 },
    handlers: {
      'GET vpses': () => ({ vpses: [] }),
      'GET ip_addresses': () => ({ ip_addresses: [ip] }),
      'GET ip_address_assignments': () => ({ ip_address_assignments: [] }),
      'GET user_cluster_resources': () => ({ user_cluster_resources: [] }),
    },
  });
  await page.goto('/app/networking');
  const visible = page.locator('[data-testid="network.user.ip.row.102"]:visible, [data-testid="network.user.ip.card.102"]:visible');
  await expect(visible).toContainText('192.0.2.10');
  await expect(visible).toContainText('Disabled');
  await expect(visible.getByTestId('network.user.ip.102.assign')).toBeDisabled();
});

for (const language of ['en', 'cs'] as const) {
  test(`@pr-smoke @pr-smoke-mobile admin IP flags preserve disabled assignments and warn only for false (${language})`, async ({ page }, testInfo) => {
    await bootstrapVpsAdminWindow(page, { sessionToken: 'TEST' });
    await setUiSettingsLocalStorage(page, { language });
    const ips = Array.from({ length: 28 }, (_, index) => ({
      id: 101 + index, addr: `192.0.2.${101 + index}`, prefix: 32, routed: true,
      network: { id: 11 + index, address: '192.0.2.0', prefix: 24, role: 'private_access',
        enabled: index === 27 ? false : index === 26 ? undefined : true },
      network_interface: { id: 51 + index, vps: { id: 1, hostname: 'existing-service' } },
    }));
    await installHaveApiMock(page, {
      user: { id: 1, login: 'admin', level: 100 },
      handlers: {
        'GET locations': () => ({ locations: [] }),
        'GET ip_addresses': () => ({ ip_addresses: ips }),
      },
    });
    await page.goto('/admin/ip-addresses?vps=1&limit=25&order=asc');
    const visible = (id: number) => page.locator(`[data-testid="admin.ip_addresses.row.${id}"]:visible, [data-testid="admin.ip_addresses.card.${id}"]:visible`);
    const warning = language === 'en' ? 'Network disabled' : 'Síť zakázána';
    const description = language === 'en'
      ? "This network is disabled for new allocations and assignments. Existing assignments remain usable."
      : "Síť je zakázaná pro nové přidělování a přiřazování adres. Existující přiřazené adresy zůstávají použitelné.";
    const pagination = page.locator('[data-testid="admin.ip_addresses.pagination.desktop"]:visible, [data-testid="admin.ip_addresses.pagination.mobile"]:visible');
    await pagination.locator('[data-testid$=".page.2"]').click();
    await expect(pagination.locator('[data-testid$=".next"]')).toBeDisabled();
    const displayed = page.locator('tr[data-testid^="admin.ip_addresses.row."]:visible, div[data-testid^="admin.ip_addresses.card."]:visible');
    await expect(displayed).toHaveCount(3);
    await expect(displayed.last()).toHaveAttribute('data-testid', /\.128$/);
    const disabled = visible(128);
    await expect(disabled.getByText(warning, { exact: true })).toBeVisible();
    const flag = disabled.locator('[aria-describedby]');
    await expect(flag).toHaveAttribute('data-row-no-nav', 'true');
    await flag.focus();
    await expect(flag).toBeFocused();
    const { tooltip } = await expectUnclippedDescription(page, flag, description);
    await flag.hover();
    await page.mouse.move(0, 0);
    await expect(tooltip).toBeVisible();
    await flag.evaluate((node) => (node as HTMLElement).blur());
    await expect(tooltip).toBeHidden();
    await flag.hover();
    await expectUnclippedDescription(page, flag, description);
    await flag.focus();
    await flag.evaluate((node) => (node as HTMLElement).blur());
    await expect(tooltip).toBeVisible();
    await page.mouse.move(0, 0);
    await expect(tooltip).toBeHidden();
    const listUrl = page.url();
    await flag.click();
    await expect(page).toHaveURL(listUrl);
    await flag.press('Enter');
    await expect(page).toHaveURL(listUrl);
    await flag.press('Space');
    await expect(page).toHaveURL(listUrl);
    await expect(disabled.getByRole('link', { name: '192.0.2.128/32' })).toHaveAttribute('href', '/admin/ip-addresses/128');
    await expect(disabled.locator('[data-testid$=".action.route"]')).toHaveAttribute('href', '/admin/ip-addresses/128#route');
    for (const id of [126, 127]) {
      await expect(visible(id)).toBeVisible();
      await expect(visible(id).getByText(warning, { exact: true })).toHaveCount(0);
    }
    const viewport = page.viewportSize();
    if (!viewport) throw new Error('Browser project requires a viewport');
    await flag.evaluate((node) => node.scrollIntoView({ block: 'center', inline: 'nearest' }));
    await flag.focus();
    const initial = await expectUnclippedDescription(page, flag, description);
    const bottomHeight = Math.max(320, Math.ceil(initial.geometry.anchor.bottom + 24));
    await page.setViewportSize({ width: viewport.width, height: bottomHeight });
    await flag.evaluate((node) => node.scrollIntoView({ block: 'end', inline: 'nearest' }));
    await flag.focus();
    const nearBottom = await expectUnclippedDescription(page, flag, description);
    expect(nearBottom.geometry.anchor.bottom + 8 + nearBottom.geometry.popup.height).toBeGreaterThan(nearBottom.geometry.viewport.height - 12);
    expect(nearBottom.geometry.popup.bottom).toBeLessThanOrEqual(nearBottom.geometry.anchor.top);
    const scrollBefore = await page.evaluate(() => window.scrollY);
    await page.evaluate(() => window.scrollBy(0, 16));
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(scrollBefore);
    await expectUnclippedDescription(page, flag, description);
    await page.setViewportSize({ width: viewport.width - 16, height: bottomHeight + 24 });
    // Filter reflow across a breakpoint can move the final row out of view.
    await flag.scrollIntoViewIfNeeded();
    await expect(flag).toBeInViewport({ ratio: 1 });
    await expect(flag).toBeFocused();
    await expectUnclippedDescription(page, flag, description);
    await page.setViewportSize({ width: viewport.width, height: bottomHeight });
    await flag.scrollIntoViewIfNeeded();
    await expect(flag).toBeInViewport({ ratio: 1 });
    await expect(flag).toBeFocused();
    await expectUnclippedDescription(page, flag, description);
    // Keep the scrolled trigger and its fixed description in the captured viewport.
    await page.screenshot({ path: testInfo.outputPath(`admin-ip-flags-${language}.png`), fullPage: false });
    await expect(flag).toBeFocused();
    await expectUnclippedDescription(page, flag, description);
  });
}
