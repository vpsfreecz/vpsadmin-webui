import { expect, test, type Page } from '@playwright/test';
import {
  bootstrapVpsAdminWindow,
  installHaveApiMock,
  setUiSettingsLocalStorage,
  type HaveApiHandler,
} from '../../fixtures';

function node(id = 5) {
  return {
    id,
    domain_name: `node${id}.example.test`,
    fqdn: `node${id}.example.test`,
    type: 'node',
    hypervisor_type: 'vpsadminos',
    location: { id: 1, label: 'Praha' },
    status: true,
    uptime: 90000,
    cpu_idle: 0,
    cpu_iowait: 1.25,
    loadavg1: 12.3,
    loadavg5: 11.2,
    loadavg15: 10.1,
    total_memory: 131072,
    used_memory: 65536,
    arc_size: 32768,
    arc_hitpercent: 99.5,
    version: '4.2.1',
    kernel: '6.12.95',
    vps_running: 210,
    vps_free: -7,
    maintenance_lock: 'no',
    maintenance_lock_reason: '',
  };
}
async function setup(
  page: Page,
  nodes: ReturnType<typeof node>[],
  handlers: Record<string, HaveApiHandler> = {},
  level = 100
) {
  await setUiSettingsLocalStorage(page, { language: 'cs', theme: 'dark' });
  await bootstrapVpsAdminWindow(page, { sessionToken: 'NODES_TEST' });
  await installHaveApiMock(page, {
    user: { id: 1, login: 'node-test', level },
    handlers: {
      'GET nodes': () => ({
        nodes: nodes.map(({ id, domain_name, fqdn, location }) => ({ id, domain_name, fqdn, location })),
      }),
      'GET nodes/overview_list': () => ({ nodes }),
      'GET nodes/public_status': () => [],
      'GET nodes/5': () => ({ node: nodes[0] }),
      'GET transaction_chains': () => ({ transaction_chains: [] }),
      'OPTIONS nodes/5/set_maintenance': () => ({ input: { parameters: { lock: {}, reason: {} } } }),
      ...handlers,
    },
  });
  await page.goto('/admin/nodes');
}
function row(page: Page, mobile: boolean) {
  return page.getByTestId(`admin.nodes.${mobile ? 'card' : 'row'}.5`);
}
async function open(page: Page, mobile: boolean) {
  const action = row(page, mobile).getByTestId(`admin.nodes.${mobile ? 'card' : 'row'}.5.maintenance`);
  if (mobile) await action.tap();
  else await action.click();
  await expect(page.getByTestId('admin.nodes.maintenance.dialog')).toBeVisible();
}

test('@pr-smoke @pr-smoke-mobile overview supplies private metrics; one tap enables and disables maintenance', async ({
  page,
  isMobile,
}, testInfo) => {
  const nodes = [node(), { ...node(6), type: 'dns_server', domain_name: 'dns.example.test', vps_running: 0 }];
  const writes: unknown[] = [];
  await setup(page, nodes, {
    'POST nodes/5/set_maintenance': async ({ reqJson }) => {
      writes.push(reqJson);
      const input = (reqJson as { node: { lock: boolean; reason?: string } }).node;
      await new Promise((resolve) => setTimeout(resolve, 180));
      nodes[0]!.maintenance_lock = input.lock ? 'lock' : 'no';
      nodes[0]!.maintenance_lock_reason = input.reason ?? '';
      return {};
    },
  });
  const current = row(page, isMobile);
  await expect(current).toContainText('4.2.1');
  await expect(current).toContainText('64 GiB');
  await expect(current).toContainText('32 GiB');
  await expect(current).toContainText('0.0%');
  await expect(current).toContainText('#5');
  await expect(page.getByTestId(`admin.nodes.${isMobile ? 'card' : 'row'}.6`)).toContainText('Dostupný');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  if (process.env['E2E_CAPTURE_SCREENSHOTS'] === '1')
    await page.screenshot({ path: `docs/design/images/nodes-overview-${testInfo.project.name}.png`, fullPage: true, scale: 'css' });
  await open(page, isMobile);
  await page.getByTestId('admin.nodes.maintenance.reason').fill('Výměna disku');
  const confirm = page.getByTestId('admin.nodes.maintenance.dialog.confirm');
  await expect(confirm).toBeEnabled();
  if (process.env['E2E_CAPTURE_SCREENSHOTS'] === '1')
    await page.screenshot({
      path: `docs/design/images/nodes-maintenance-${testInfo.project.name}.png`,
      fullPage: false, scale: 'css',
    });
  await confirm.click();
  await expect(page.getByTestId('admin.nodes.maintenance.dialog')).toHaveCount(0);
  expect(writes).toEqual([{ node: { lock: true, reason: 'Výměna disku' } }]);
  await expect(current).toContainText('Výměna disku');
  await open(page, isMobile);
  await expect(page.getByTestId('admin.nodes.maintenance.reason')).toHaveCount(0);
  await confirm.click();
  await expect(page.getByTestId('admin.nodes.maintenance.dialog')).toHaveCount(0);
  expect(writes).toEqual([{ node: { lock: true, reason: 'Výměna disku' } }, { node: { lock: false } }]);
});

test('inherited maintenance cannot be disabled on the node', async ({ page, isMobile }) => {
  await setup(page, [{ ...node(), maintenance_lock: 'master_lock', maintenance_lock_reason: 'Údržba lokality' }]);
  await open(page, isMobile);
  await expect(page.getByTestId('admin.nodes.maintenance.dialog')).toContainText('zděděná');
  await expect(page.getByTestId('admin.nodes.maintenance.dialog.confirm')).toBeDisabled();
});

test('denied capability cannot submit; no mutation is sent', async ({ page, isMobile }) => {
  let writes = 0;
  await setup(page, [node()], {
    'OPTIONS nodes/5/set_maintenance': () => ({ status: false, message: 'Access denied' }),
    'POST nodes/5/set_maintenance': () => {
      writes++;
      return {};
    },
  });
  await open(page, isMobile);
  await expect(page.getByTestId('admin.nodes.maintenance.dialog')).toContainText('Access denied');
  await expect(page.getByTestId('admin.nodes.maintenance.dialog.confirm')).toBeDisabled();
  expect(writes).toBe(0);
});

test('a concurrently changed lock is not removed', async ({ page, isMobile }) => {
  const target = { ...node(), maintenance_lock: 'lock', maintenance_lock_reason: 'Original work' };
  let writes = 0;
  await setup(page, [target], {
    'POST nodes/5/set_maintenance': () => {
      writes++;
      return {};
    },
  });
  await open(page, isMobile);
  await expect(page.getByTestId('admin.nodes.maintenance.dialog.confirm')).toBeEnabled();
  target.maintenance_lock_reason = 'Different administrator';
  await page.getByTestId('admin.nodes.maintenance.dialog.confirm').click();
  await expect(page.getByTestId('admin.nodes.maintenance.dialog')).toContainText('se údržba změnila');
  expect(writes).toBe(0);
});

test('support role never requests admin overview or exposes maintenance', async ({ page, isMobile }) => {
  let overviewReads = 0;
  await setup(
    page,
    [node()],
    {
      'GET nodes/overview_list': () => {
        overviewReads++;
        return { nodes: [] };
      },
    },
    50
  );
  await expect(row(page, isMobile)).toBeVisible();
  await expect(page.locator('[data-testid$=".5.maintenance"]')).toHaveCount(0);
  expect(overviewReads).toBe(0);
});

test('lost mutation response is reconciled without a second POST', async ({ page, isMobile }) => {
  const target = node();
  let writes = 0;
  await setup(page, [target], {
    'POST nodes/5/set_maintenance': ({ reqJson }) => {
      writes++;
      target.maintenance_lock = 'lock';
      target.maintenance_lock_reason = (reqJson as { node: { reason: string } }).node.reason;
      return {
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({ status: false, message: 'Lost response' }),
      };
    },
  });
  await open(page, isMobile);
  await page.getByTestId('admin.nodes.maintenance.reason').fill('Replace disk');
  await page.getByTestId('admin.nodes.maintenance.dialog.confirm').click();
  await expect(page.getByTestId('admin.nodes.maintenance.dialog')).toHaveCount(0);
  await expect(row(page, isMobile)).toContainText('Replace disk');
  expect(writes).toBe(1);
});

test('an unverified write stays blocked across closing and reopening until read-back succeeds', async ({
  page,
  isMobile,
}) => {
  const target = node();
  let readsFail = false;
  let writes = 0;
  await setup(page, [target], {
    'GET nodes/5': () => (readsFail ? { status: false, message: 'Read unavailable' } : { node: target }),
    'POST nodes/5/set_maintenance': () => {
      writes++;
      if (writes > 1) {
        target.maintenance_lock = 'no';
        return {};
      }
      readsFail = true;
      target.maintenance_lock = 'lock';
      return { status: 503, body: JSON.stringify({ status: false, message: 'Lost response' }) };
    },
  });
  await open(page, isMobile);
  await page.getByTestId('admin.nodes.maintenance.dialog.confirm').click();
  await expect(page.getByTestId('admin.nodes.maintenance.dialog')).toContainText('Výsledek změny údržby');
  await page.getByTestId('admin.nodes.maintenance.dialog.cancel').click();
  readsFail = false;
  await open(page, isMobile);
  await expect(page.getByTestId('admin.nodes.maintenance.dialog.confirm')).toBeDisabled();
  await page
    .getByTestId('admin.nodes.maintenance.dialog')
    .getByRole('button', { name: 'Obnovit', exact: true })
    .click();
  await expect(page.getByTestId('admin.nodes.maintenance.dialog.confirm')).toBeEnabled();
  expect(writes).toBe(1);
  await page.getByTestId('admin.nodes.maintenance.dialog.confirm').click();
  await expect(page.getByTestId('admin.nodes.maintenance.dialog')).toHaveCount(0);
  expect(writes).toBe(2);
});

test('overview failure retains inventory with explicit warning and useful actions', async ({
  page,
  isMobile,
  context,
  browserName,
}) => {
  await setup(page, [node()], { 'GET nodes/overview_list': () => ({ status: false, message: 'Not supported' }) });
  await expect(page.getByText('Podrobné metriky nodů nejsou dostupné.', { exact: false })).toBeVisible();
  await expect(row(page, isMobile)).toContainText('Neznámý stav');
  if (browserName === 'chromium') {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await row(page, isMobile).getByTestId(`admin.nodes.${isMobile ? 'card' : 'row'}.5.copy`).click();
    await expect(row(page, isMobile).getByTestId(`admin.nodes.${isMobile ? 'card' : 'row'}.5.copy`)).toContainText('Zkopírováno');
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('node5.example.test');
  }
  await row(page, isMobile).getByTestId(`admin.nodes.${isMobile ? 'card' : 'row'}.5.vps`).click();
  await expect(page).toHaveURL(/\/admin\/vps\?node=5/);
});
