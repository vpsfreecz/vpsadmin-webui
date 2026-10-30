import { expect, test, type Page } from '@playwright/test';
import { bootstrapVpsAdminWindow, installHaveApiMock, setUiSettingsLocalStorage } from '../../fixtures';
import { expectNoDocumentHorizontalOverflow } from '../../helpers/horizontalOverflow';

type Owner = { id: number; login?: string } | null;
async function fixture(page: Page, language: 'cs' | 'en' = 'en') {
  await bootstrapVpsAdminWindow(page);
  await setUiSettingsLocalStorage(page, { language, theme: 'dark' });
  const state = {
    owner: null as Owner, environment: null as { id: number } | null,
    ownerWrites: 0, assignments: [] as Array<{ path: string; payload: unknown }>,
    mismatch: false, staleTarget: false, missingInterface: false, preflightUnavailable: false, receipt: true, reject: false,
  };
  const ip = () => ({ id: 100, addr: '192.0.2.100', prefix: 32, user: state.owner,
    charged_environment: state.environment, network_interface: null,
    network: { id: 3, enabled: true, ip_version: 4, role: 'public_access',
      primary_location: { id: 3, label: 'Praha', environment: { id: 1, label: 'Production' } } } });
  const vps = (id: number) => ({ id, hostname: `fixture-${id}.example.test`,
    user: { id: state.staleTarget ? 8 : 7, login: 'synthetic-member' },
    node: { id: 1, location: { id: 3, environment: { id: 1, label: 'Production' } } } });
  const assign = (path: string, payload: unknown) => {
    state.assignments.push({ path, payload });
    if (state.reject) return { status: 409, contentType: 'application/json', body: JSON.stringify({ status: false, message: 'Address changed', response: null }) };
    return { ip_address: ip(), _meta: state.receipt ? { action_state_id: 701 } : {} };
  };
  await installHaveApiMock(page, { user: { id: 1, login: 'synthetic-admin', level: 99 }, handlers: {
    'GET locations': () => ({ locations: [{ id: 3, label: 'Praha', environment: { id: 1, label: 'Production' } }] }),
    'GET ip_addresses': () => ({ ip_addresses: [ip()] }),
    'GET ip_addresses/100': () => ({ ip_address: ip() }),
    'GET environments': () => ({ environments: [{ id: 1, label: 'Production' }] }),
    'GET host_ip_addresses': () => ({ host_ip_addresses: [] }),
    'GET vpses/123': () => ({ vps: vps(123) }),
    'GET vpses/124': () => ({ vps: vps(124) }),
    'GET network_interfaces': ({ searchParams }) => {
      if (state.preflightUnavailable) return { status: 503, contentType: 'application/json', body: JSON.stringify({ status: false, message: 'Preflight unavailable', response: null }) };
      return { network_interfaces: state.missingInterface ? [] :
        searchParams.get('network_interface[vps]') === '123'
          ? [{ id: 501, name: 'eth0', vps: { id: 123 } }]
          : [502, 503].map((id) => ({ id, name: `eth${id - 502}`, vps: { id: 124 } })) };
    },
    'POST ip_addresses/100/assign': ({ reqJson }) => assign('assign', reqJson),
    'POST ip_addresses/100/assign_with_host_address': ({ reqJson }) => assign('assign_with_host_address', reqJson),
    'PUT ip_addresses/100': () => {
      state.ownerWrites += 1;
      if (!state.mismatch) { state.owner = { id: 7 }; state.environment = { id: 1 }; }
      return { ip_address: { id: 100 }, _meta: {} };
    },
  } });
  return state;
}
async function open(page: Page) {
  await page.goto('/admin/networking/ip-addresses/100?action=assign#route');
  await expect(page.getByTestId('admin.ip.route.dialog')).toBeVisible();
}
async function choose(page: Page, id = '123') {
  await page.getByTestId('admin.ip.route.vps').fill(id);
  await expect(page.getByTestId('admin.ip.route.target')).toContainText(`fixture-${id}`);
}

for (const language of ['cs', 'en'] as const) {
  test(`@pr-smoke @pr-smoke-mobile ${language} assign icon opens VPS first without an ownership write`, async ({ page, isMobile }, info) => {
    const state = await fixture(page, language);
    await page.goto('/admin/networking/ip-addresses');
    const icon = page.getByTestId(`admin.ip_addresses.${isMobile ? 'card' : 'row'}.100.action.route`);
    if (isMobile) await icon.tap(); else await icon.click();
    const dialog = page.getByTestId('admin.ip.route.dialog');
    await expect(dialog).toBeVisible();
    await expect(page.getByTestId('admin.ip.route.vps')).toBeFocused();
    await expect(dialog.getByTestId('admin.ip.owner.user')).toHaveCount(0);
    await expect(dialog.getByTestId('admin.ip.owner.environment')).toHaveCount(0);
    await choose(page);
    await expect(page.getByTestId('admin.ip.route.interface')).toHaveValue('501');
    await expect(page.getByTestId('admin.ip.route.target')).toContainText('synthetic-member');
    await expect(page.getByTestId('admin.ip.route.target')).toContainText('Production');
    await expectNoDocumentHorizontalOverflow(page);
    await dialog.screenshot({ path: info.outputPath(`vps-first-${language}.png`) });
    await page.getByTestId('admin.ip.route.submit').click();
    await expect(dialog).toBeHidden();
    expect(state.ownerWrites).toBe(0);
    expect(state.assignments).toEqual([{ path: 'assign', payload: { ip_address: { network_interface: 501 } } }]);
    await page.reload();
    await expect(page.getByTestId('admin.ip_address.page')).toBeVisible();
    await expect(dialog).toBeHidden();
  });
}

test('@pr-smoke @pr-smoke-mobile changing VPS clears the old interface and retains the combined host action', async ({ page }) => {
  const state = await fixture(page);
  await open(page); await choose(page);
  await expect(page.getByTestId('admin.ip.route.interface')).toHaveValue('501');
  await choose(page, '124');
  await expect(page.getByTestId('admin.ip.route.interface')).toHaveValue('');
  await expect(page.getByTestId('admin.ip.route.submit')).toBeDisabled();
  await page.getByTestId('admin.ip.route.interface').selectOption('503');
  await page.getByTestId('admin.ip.route.dialog').getByRole('checkbox').check();
  await page.getByTestId('admin.ip.route.submit').click();
  await expect(page.getByTestId('admin.ip.route.dialog')).toBeHidden();
  expect(state.assignments).toEqual([{ path: 'assign_with_host_address', payload: { ip_address: { network_interface: 503 } } }]);
});

for (const change of ['owner', 'interface'] as const) {
  test(`@pr-smoke @pr-smoke-mobile fresh ${change} change blocks assignment before any write`, async ({ page }) => {
    const state = await fixture(page);
    await open(page); await choose(page);
    await expect(page.getByTestId('admin.ip.route.submit')).toBeEnabled();
    if (change === 'owner') state.staleTarget = true;
    else state.missingInterface = true;
    await page.getByTestId('admin.ip.route.submit').click();
    await expect(page.getByTestId('admin.ip.route.error')).toContainText('changed');
    expect(state.assignments).toEqual([]);
    expect(state.ownerWrites).toBe(0);
  });
}

test('@pr-smoke @pr-smoke-mobile a foreign-owned address cannot implicitly change owner during assignment', async ({ page }) => {
  const state = await fixture(page); state.owner = { id: 9, login: 'other-member' };
  await open(page); await choose(page);
  await expect(page.getByTestId('admin.ip.route.dialog')).toContainText('another member');
  await expect(page.getByTestId('admin.ip.route.submit')).toBeDisabled();
  expect(state.assignments).toEqual([]);
  expect(state.ownerWrites).toBe(0);
});

test('@pr-smoke @pr-smoke-mobile failed preflight reads are retryable without marking a submitted mutation uncertain', async ({ page }) => {
  const state = await fixture(page);
  await open(page); await choose(page);
  await expect(page.getByTestId('admin.ip.route.submit')).toBeEnabled();
  state.preflightUnavailable = true;
  await page.getByTestId('admin.ip.route.submit').click();
  await expect(page.getByTestId('admin.ip.route.error')).toContainText('Preflight unavailable');
  await expect(page.getByTestId('admin.ip.route.submit')).toBeEnabled();
  await expect(page.getByTestId('admin.ip.owner.uncertain')).toHaveCount(0);
  expect(state.assignments).toHaveLength(0);
  state.preflightUnavailable = false;
  await page.getByTestId('admin.ip.route.submit').click();
  await expect(page.getByTestId('admin.ip.route.dialog')).toBeHidden();
  expect(state.assignments).toHaveLength(1);
});

test('@pr-smoke @pr-smoke-mobile an API rejection keeps VPS context and permits deliberate retry', async ({ page }) => {
  const state = await fixture(page); state.reject = true;
  await open(page); await choose(page);
  await page.getByTestId('admin.ip.route.submit').click();
  await expect(page.getByTestId('admin.ip.route.error')).toContainText('Address changed');
  await expect(page.getByTestId('admin.ip.route.interface')).toHaveValue('501');
  state.reject = false;
  await page.getByTestId('admin.ip.route.submit').click();
  await expect(page.getByTestId('admin.ip.route.dialog')).toBeHidden();
  expect(state.assignments).toHaveLength(2);
});

test('@pr-smoke @pr-smoke-mobile a missing asynchronous receipt blocks replay across reload', async ({ page }) => {
  const state = await fixture(page); state.receipt = false;
  await open(page); await choose(page);
  await page.getByTestId('admin.ip.route.submit').click();
  await expect(page.getByTestId('admin.ip.route.error')).toBeVisible();
  await expect(page.getByTestId('admin.ip.route.submit')).toBeDisabled();
  await page.reload();
  await expect(page.getByTestId('admin.ip.owner.uncertain')).toBeVisible();
  await expect(page.getByTestId('admin.ip.owner.save')).toBeDisabled();
  await expect(page.getByTestId('admin.ip.route.assign.open')).toBeDisabled();
  expect(state.assignments).toHaveLength(1);
});

for (const mismatch of [false, true]) {
  test(`@pr-smoke @pr-smoke-mobile synchronous owner response ${mismatch ? 'with a mismatch remains uncertain' : 'is confirmed by a fresh read'}`, async ({ page }) => {
    const state = await fixture(page); state.mismatch = mismatch;
    await page.goto('/admin/networking/ip-addresses/100');
    await page.getByTestId('admin.ip.owner.user').fill('7');
    await page.getByTestId('admin.ip.owner.environment').selectOption('1');
    await page.getByTestId('admin.ip.owner.save').click();
    if (mismatch) {
      await expect(page.getByTestId('admin.ip.owner.uncertain')).toBeVisible();
      await expect(page.getByTestId('admin.ip.owner.error')).toBeVisible();
      await expect(page.getByTestId('admin.ip.owner.save')).toBeDisabled();
    } else {
      await expect(page.getByTestId('admin.ip.action.user')).toHaveAttribute('href', '/admin/users/7');
      await expect(page.getByTestId('admin.ip.owner.current')).toContainText('#7');
      await expect(page.getByTestId('admin.ip.owner.current')).toContainText('#1');
      await expect(page.getByTestId('admin.ip.owner.error')).toHaveCount(0);
      await expect(page.getByTestId('admin.ip.owner.uncertain')).toHaveCount(0);
    }
    expect(state.ownerWrites).toBe(1);
  });
}
