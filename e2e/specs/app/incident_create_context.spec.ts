import { expect, test, type Locator } from '@playwright/test';
import { bootstrapVpsAdminWindow, installHaveApiMock } from '../../fixtures';

async function activate(locator: Locator, mobile: boolean) {
  if (mobile) await locator.tap();
  else await locator.click();
}

test('@pr-smoke @pr-smoke-mobile VPS incident list preserves create and return context', async ({ page, isMobile }, testInfo) => {
  await bootstrapVpsAdminWindow(page, { sessionToken: 'CONTEXT_TEST' });
  const listScopes: (string | null)[] = [];
  let creates = 0;
  await installHaveApiMock(page, {
    user: { id: 1, login: 'admin', level: 99 },
    handlers: {
      'GET vpses/123': () => ({ vps: { id: 123, hostname: 'context.example.test', object_state: 'active', user: { id: 10, login: 'alice' }, node: { id: 1, domain_name: 'node.example.test' } } }),
      'GET ip_address_assignments': () => ({ ip_address_assignments: [{ id: 55, ip_addr: '192.0.2.5', ip_prefix: 32 }] }),
      'GET incident_reports': ({ searchParams }) => {
        listScopes.push(searchParams.get('incident_report[vps]'));
        return { incident_reports: [] };
      },
      'POST incident_reports': () => { creates++; return { incident_report: { id: 999 } }; },
    },
  });
  await page.goto('/admin/vps/123');
  await page.getByTestId('vps.actions.menu').selectOption('/admin/incidents?vps=123');
  await expect.poll(() => listScopes).toContain('123');
  const listUrl = page.url();
  await activate(page.getByTestId('incidents.list.new'), isMobile);
  await expect(page.getByTestId('incidents.new.vps')).toHaveValue('123');
  await expect(page.getByTestId('incidents.new.header')).toContainText('context.example.test');
  await expect(page.getByTestId('incidents.new.header')).toContainText('alice');
  await expect(page.getByTestId('incidents.new.assignment').locator('option[value="55"]')).toHaveText('192.0.2.5/32');
  await expect(page.getByTestId('incidents.new.subject')).toHaveValue('');
  await expect(page.getByTestId('incidents.new.text')).toHaveValue('');
  await page.reload();
  await expect(page.getByTestId('incidents.new.vps')).toHaveValue('123');
  await page.screenshot({ path: testInfo.outputPath('prefilled-incident.png'), fullPage: true });
  await activate(page.getByTestId('incidents.new.cancel'), isMobile);
  await expect(page).toHaveURL(listUrl);
  await activate(page.getByTestId('incidents.list.new'), isMobile);
  await activate(page.getByTestId('incidents.new.back'), isMobile);
  await expect(page).toHaveURL(listUrl);
  expect(creates).toBe(0);
  expect(listScopes.every((id) => id === '123')).toBe(true);
});

test('@pr-smoke @pr-smoke-mobile generic and filtered incident lists keep only explicit VPS context', async ({ page, isMobile }) => {
  await bootstrapVpsAdminWindow(page, { sessionToken: 'CONTEXT_TEST' });
  await installHaveApiMock(page, { user: { id: 1, login: 'admin', level: 99 }, handlers: {
    'GET incident_reports': () => ({ incident_reports: [] }),
  } });
  for (const search of ['', '?user=10&codename=abuse', '?vps=123&codename=abuse&ip_addr=192.0.2.5']) {
    await page.goto(`/admin/incidents${search}`);
    await expect(page.getByTestId('incidents.list.new')).toBeVisible();
    const listUrl = page.url();
    await activate(page.getByTestId('incidents.list.new'), isMobile);
    await expect(page.getByTestId('incidents.new.vps')).toHaveValue(search.includes('vps=123') ? '123' : '');
    await expect(page.getByTestId('incidents.new.codename')).toHaveValue('');
    await activate(page.getByTestId('incidents.new.cancel'), isMobile);
    await expect(page).toHaveURL(listUrl);
  }
});

test('@pr-smoke @pr-smoke-mobile changing VPS clears the previous IP assignment before submitting', async ({ page, isMobile }) => {
  await bootstrapVpsAdminWindow(page, { sessionToken: 'CONTEXT_TEST' });
  const payloads: unknown[] = [];
  await installHaveApiMock(page, { user: { id: 1, login: 'admin', level: 99 }, handlers: {
    'GET ip_address_assignments': ({ searchParams }) => ({ ip_address_assignments: searchParams.get('ip_address_assignment[vps]') === '123' ? [{ id: 55, ip_addr: '192.0.2.5' }] : [{ id: 66, ip_addr: '192.0.2.6' }] }),
    'POST incident_reports': ({ json }) => { payloads.push(json); return { incident_report: { id: 999 } }; },
  } });
  await page.goto('/admin/incidents/new?vps=123');
  const assignment = page.getByTestId('incidents.new.assignment');
  await assignment.selectOption('55');
  await page.getByTestId('incidents.new.vps').fill('124');
  await expect(assignment).toHaveValue('');
  await expect(assignment.locator('option[value="66"]')).toHaveCount(1);
  await page.getByTestId('incidents.new.subject').fill('Test context');
  await page.getByTestId('incidents.new.text').fill('Synthetic evidence');
  await activate(page.getByTestId('incidents.new.submit'), isMobile);
  await expect(page).toHaveURL(/\/admin\/vps\/124$/);
  expect(payloads).toHaveLength(1);
  expect(payloads[0]).toMatchObject({ incident_report: { vps: 124 } });
  expect(JSON.stringify(payloads[0])).not.toContain('ip_address_assignment');
});

test('@pr-smoke @pr-smoke-mobile member detail to VPS list to create preserves the owner', async ({ page, isMobile }) => {
  await bootstrapVpsAdminWindow(page, { sessionToken: 'CONTEXT_TEST' });
  await installHaveApiMock(page, { user: { id: 1, login: 'admin', level: 99 }, handlers: {
    'GET users/10': () => ({ user: { id: 10, login: 'alice', full_name: 'Alice Example', level: 1 } }),
    'GET vpses': () => ({ vpses: [], _meta: { total_count: 0 } }),
    'GET locations': () => ({ locations: [] }),
    'GET nodes': () => ({ nodes: [] }),
    'GET os_templates': () => ({ os_templates: [] }),
    'GET default_object_cluster_resources': () => ({ default_object_cluster_resources: [] }),
  } });
  await page.goto('/admin/users/10');
  await activate(page.getByTestId('admin.user.action.vps'), isMobile);
  await expect(page).toHaveURL(/\/admin\/vps\?user=10$/);
  await activate(page.getByTestId('vps.list.create'), isMobile);
  await expect(page).toHaveURL(/\/admin\/vps\/new\?user=10$/);
  await expect(page.getByTestId('vps.create.user')).toHaveValue('10');
});

test('@pr-smoke @pr-smoke-mobile dataset export creation keeps its fixed dataset', async ({ page, isMobile }) => {
  await bootstrapVpsAdminWindow(page, { sessionToken: 'CONTEXT_TEST' });
  await installHaveApiMock(page, { user: { id: 1, login: 'admin', level: 99 }, handlers: {
    'GET datasets/20': () => ({ dataset: { id: 20, name: 'data', full_name: 'tank/alice/data', object_state: 'active', user: { id: 10, login: 'alice' } } }),
  } });
  await page.goto('/admin/datasets/20/exports');
  await activate(page.getByTestId('dataset.exports.create.open'), isMobile);
  await expect(page.getByTestId('dataset.exports.create')).toBeVisible();
  await expect(page.getByTestId('dataset.exports.create')).toContainText('tank/alice/data');
  await expect(page.getByTestId('exports.create.dataset')).toHaveCount(0);
});

test('@pr-smoke @pr-smoke-mobile DNS record creation keeps the zone on the submitted request', async ({ page, isMobile }) => {
  await bootstrapVpsAdminWindow(page, { sessionToken: 'CONTEXT_TEST' });
  const payloads: unknown[] = [];
  await installHaveApiMock(page, { user: { id: 1, login: 'admin', level: 99 }, handlers: {
    'GET dns_zones/10': () => ({ id: 10, name: 'example.test', enabled: true, default_ttl: 600, object_state: 'active' }),
    'GET dns_records': () => ({ dns_records: [] }),
    'GET dns_record_logs': () => ({ dns_record_logs: [] }),
    'POST dns_records': ({ json }) => { payloads.push(json); return { dns_record: { id: 101, dns_zone: 10, name: 'context', type: 'A', content: '192.0.2.5' } }; },
  } });
  await page.goto('/admin/dns/zones/10');
  await activate(page.getByTestId('dns.records.create.open'), isMobile);
  await expect(page.getByTestId('dns.records.create.modal')).toBeVisible();
  await page.getByTestId('dns.records.create.name').fill('context');
  await page.getByTestId('dns.records.create.content').fill('192.0.2.5');
  await activate(page.getByTestId('dns.records.create.submit'), isMobile);
  await expect(page.getByTestId('dns.records.create.modal')).toHaveCount(0);
  expect(payloads).toHaveLength(1);
  expect(payloads[0]).toMatchObject({ dns_record: { dns_zone: 10, name: 'context' } });
});
