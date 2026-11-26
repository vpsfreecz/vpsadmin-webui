import { setUiSettingsLocalStorage } from '../../fixtures/uiSettings';
import { expect, test } from '../../fixtures/vpsadmin-window';
import { bootstrapVpsAdminWindow } from '../../fixtures/bootstrap';
import { installHaveApiMock } from '../../fixtures/haveapi';

async function expectNoDocumentHorizontalOverflow(page: import('@playwright/test').Page) {
  const overflow = await page.evaluate(() => ({
    viewportWidth: document.documentElement.clientWidth,
    documentWidth: document.documentElement.scrollWidth,
    offenders: [...document.querySelectorAll<HTMLElement>('body *')]
      .map((element) => {
        const rect = element.getBoundingClientRect();
        return {
          tag: element.tagName.toLowerCase(),
          testId: element.dataset['testid'] ?? null,
          left: Math.round(rect.left),
          right: Math.round(rect.right),
        };
      })
      .filter((element) => element.right > document.documentElement.clientWidth + 1)
      .sort((a, b) => b.right - a.right)
      .slice(0, 10),
  }));

  expect(overflow.documentWidth, JSON.stringify(overflow, null, 2)).toBeLessThanOrEqual(overflow.viewportWidth);
}

async function expectTableScrollContained(
  page: import('@playwright/test').Page,
  testId: string,
  requiresHorizontalScroll = true,
) {
  const metrics = await page.getByTestId(testId).evaluate((card) => {
    const scroller = card.firstElementChild as HTMLElement | null;
    const rect = card.getBoundingClientRect();
    return {
      cardRight: Math.round(rect.right),
      viewportWidth: document.documentElement.clientWidth,
      scrollerClientWidth: scroller?.clientWidth ?? 0,
      scrollerScrollWidth: scroller?.scrollWidth ?? 0,
      scrollerOverflowX: scroller ? getComputedStyle(scroller).overflowX : '',
    };
  });

  expect(metrics.cardRight).toBeLessThanOrEqual(metrics.viewportWidth);
  expect(metrics.scrollerOverflowX).toBe('auto');
  if (requiresHorizontalScroll) {
    expect(metrics.scrollerScrollWidth).toBeGreaterThan(metrics.scrollerClientWidth);
  } else {
    expect(metrics.scrollerScrollWidth).toBeLessThanOrEqual(metrics.scrollerClientWidth + 1);
  }
}

test.describe('Admin / Networking surfaces (smoke)', () => {
  test('@pr-smoke @pr-smoke-mobile @smoke @smoke-mobile host IP list and assignment audit render', async ({ page }) => {
    const hostRequests: URLSearchParams[] = [];
    await installHaveApiMock(page, {
      user: { id: 1, login: 'admin', level: 99 },
      handlers: {
        'GET host_ip_addresses': ({ searchParams }) => {
          hostRequests.push(new URLSearchParams(searchParams));
          const rows = [
            {
              id: 501,
              addr: '203.0.113.10',
              assigned: true,
              reverse_record_value: 'ptr.example.com.',
              ip_address: {
                id: 301,
                ip_addr: '192.0.2.10',
                user: { id: 7, login: 'alice' },
                network_interface: { id: 99, name: 'eth0', vps: { id: 42, hostname: 'vps-42' } },
              },
            },
            { id: 502, addr: '83.167.228.5', assigned: false, user_created: true, ip_address: { id: 302, ip_addr: '83.167.228.5' } },
            { id: 503, addr: '2a01:430:17::10', assigned: false, ip_address: { id: 303, ip_addr: '2a01:430:17::10' } },
          ];
          const addr = searchParams.get('host_ip_address[addr]');
          return { host_ip_addresses: rows.filter((row) => !addr || row.addr === addr) };
        },
        'GET ip_address_assignments': () => ({
          ip_address_assignments: [
            {
              id: 801,
              ip_addr: '192.0.2.10',
              ip_prefix: 32,
              user: { id: 7, login: 'alice' },
              vps: { id: 42, hostname: 'vps-42' },
              from_date: '2026-03-01T10:00:00Z',
              to_date: null,
              reconstructed: false,
            },
          ],
        }),
      },
    });

    await bootstrapVpsAdminWindow(page, { sessionToken: 'test-admin-session' });

    await page.goto('/admin/networking/host-ip-addresses');
    await expect(page.getByTestId('admin.host_ip_addresses.row.501')).toBeVisible();
    await expect(page.getByTestId('admin.host_ip_addresses.row.501.ptr')).toHaveAttribute('aria-label', 'PTR');
    await expect(page.getByTestId('admin.host_ip_addresses.row.501.free')).toHaveAttribute('aria-label', 'Remove');
    await expect(page.getByTestId('admin.host_ip_addresses.row.501.assign')).toHaveCount(0);
    await expect(page.getByTestId('admin.host_ip_addresses.row.501.ptr')).toHaveText('');
    await expect(page.getByTestId('admin.host_ip_addresses.row.502')).toHaveCount(0);
    await expect(page.getByTestId('admin.host_ip_addresses.row.503')).toHaveCount(0);
    // Exercise the supported exact filter through the actual UI control.
    await page.getByTestId('admin.host_ip_addresses.filter.addr').fill('83.167.228.5');
    await expect(page.getByTestId('admin.host_ip_addresses.row.502')).toBeVisible();
    await expect(page).toHaveURL(/addr=83\.167\.228\.5/);
    expect(hostRequests.at(-1)?.get('host_ip_address[addr]')).toBe('83.167.228.5');
    expect(hostRequests.at(-1)?.get('host_ip_address[order]')).toBe('asc');
    expect(hostRequests.at(-1)?.has('host_ip_address[q]')).toBe(false);
    await expect(page.getByTestId('admin.host_ip_addresses.row.501')).toHaveCount(0);
    await expect(page.getByTestId('admin.host_ip_addresses.row.503')).toHaveCount(0);
    await expect(page.getByTestId('admin.host_ip_addresses.row.502.assign')).toHaveAttribute('aria-label', 'Assign');
    await expect(page.getByTestId('admin.host_ip_addresses.row.502.delete')).toHaveAttribute('aria-label', 'Delete');
    await expect(page.getByTestId('admin.host_ip_addresses.row.502.free')).toHaveCount(0);

    await page.setViewportSize({ width: 390, height: 844 });
    await expectNoDocumentHorizontalOverflow(page);
    await expectTableScrollContained(page, 'admin.host_ip_addresses.table', false);

    const proofScreenshot = process.env['E2E_HOST_IP_ACTIONS_PROOF_SCREENSHOT']?.trim();
    if (proofScreenshot) await page.screenshot({ path: proofScreenshot, fullPage: true });

    await page.goto('/admin/networking/ip-address-assignments');
    await expect(page.getByTestId('admin.ip_assignments.row.801')).toBeVisible();
  });

  test('@pr-smoke @pr-smoke-mobile live monitor and traffic users render', async ({ page }) => {
    await installHaveApiMock(page, {
      user: { id: 1, login: 'admin', level: 99 },
      handlers: {
        'GET network_interface_monitors': () => ({
          network_interface_monitors: [
            {
              id: 901,
              network_interface: {
                id: 10,
                name: 'eth0',
                vps: { id: 42, hostname: 'vps-42', user: { id: 7, login: 'alice' }, node: { id: 5, domain_name: 'node5.example' } },
              },
              bytes_in: 1048576,
              bytes_out: 524288,
              packets_in: 400,
              packets_out: 250,
              delta: 10,
              updated_at: '2026-03-02T12:00:00Z',
            },
          ],
        }),
        'GET network_interface_accountings/user_top': () => ({
          network_interface_accountings: [
            { user: { id: 7, login: 'alice' }, bytes: 1572864, bytes_in: 1048576, bytes_out: 524288, packets: 650, packets_in: 400, packets_out: 250, year: 2026, month: 3 },
          ],
        }),
      },
    });

    await bootstrapVpsAdminWindow(page, { sessionToken: 'test-admin-session' });

    await page.goto('/admin/networking/live');
    await expect(page.getByTestId('admin.network_live.row.901')).toBeVisible();

    await page.setViewportSize({ width: 390, height: 844 });
    await expectNoDocumentHorizontalOverflow(page);
    await expectTableScrollContained(page, 'admin.network_live.table');

    await page.goto('/admin/networking/traffic-users');
    await expect(page.getByTestId('admin.network_traffic_users.row.7')).toBeVisible();
    await page.setViewportSize({ width: 320, height: 750 });
    await expectNoDocumentHorizontalOverflow(page);
    await expectTableScrollContained(page, 'admin.network_traffic_users.table');
    const trafficTable = page.getByTestId('admin.network_traffic_users.table').locator('table');
    const headerSpacing = await trafficTable.locator('th').evaluateAll((cells) => cells.map((cell) => {
      const style = getComputedStyle(cell);
      return { left: parseFloat(style.paddingLeft), right: parseFloat(style.paddingRight) };
    }));
    expect(headerSpacing).toHaveLength(5);
    for (const padding of headerSpacing) {
      expect(padding.left).toBeGreaterThanOrEqual(12);
      expect(padding.right).toBeGreaterThanOrEqual(12);
    }
    const scroller = trafficTable.locator('..');
    const scrolled = await scroller.evaluate((element) => {
      element.scrollLeft = element.scrollWidth;
      return { left: element.scrollLeft, width: element.clientWidth, full: element.scrollWidth };
    });
    expect(scrolled.full).toBeGreaterThan(scrolled.width);
    expect(scrolled.left).toBeGreaterThan(0);
  });
});

// Complete technical identifiers must fit their local card or confirmation.
for(const [language,theme]of [['cs','dark'],['en','light']]as const)for(const scene of ['card','delete']){
 test('@pr-smoke @pr-smoke-mobile List identity '+scene+' '+language+' '+theme,async({page})=>{
  const address='2001:0db8:1234:5678:9abc:def0:1234:5678';const writes:string[]=[];
  await bootstrapVpsAdminWindow(page,{webuiNext:{uiSettings:{persistence:'local'}}});await setUiSettingsLocalStorage(page,{language,theme});await page.clock.install({time:new Date('2026-11-10T00:15:00Z')});
  const parent={id:100,addr:address,prefix:128,network:{id:3,enabled:true},network_interface:null};const host={id:601,addr:address,assigned:false,user_created:true,ip_address:parent};
  await installHaveApiMock(page,{user:{id:1,login:'synthetic-admin',level:99},handlers:{'GET locations':()=>({locations:[]}),'GET ip_addresses':()=>({ip_addresses:[parent]}),'GET host_ip_addresses':()=>({host_ip_addresses:[host]})}});
  await page.route('**/api/**',route=>{if(!['GET','HEAD','OPTIONS'].includes(route.request().method())){writes.push(route.request().method());return route.abort()}return route.fallback()});
  await page.setViewportSize({width:320,height:900});await page.goto(scene==='card'?'/admin/networking/ip-addresses?version=6':'/admin/networking/host-ip-addresses?assigned=false');
  if(scene==='delete')await page.getByTestId('admin.host_ip_addresses.row.601.delete').click();
  const target=scene==='card'?page.getByTestId('admin.ip_addresses.card.100').getByRole('link',{name:address+'/128',exact:true}):page.getByRole('dialog').locator('p').filter({hasText:address});await expect(target).toBeVisible();await target.scrollIntoViewIfNeeded();
  if(scene==='card'){await expect(target).toHaveAttribute('href','/admin/networking/ip-addresses/100');await target.focus();await expect(target).toBeFocused()}
  else {const cancel=page.getByTestId('admin.host_ip_addresses.delete_confirm.cancel');await cancel.focus();await expect(cancel).toBeFocused()}
  const bounds=await target.evaluate(el=>{const b=el.getBoundingClientRect(),r=document.createRange();r.selectNodeContents(el);return{x:b.x,y:b.y,width:b.width,height:b.height,scrollWidth:el.scrollWidth,clientWidth:el.clientWidth,fragments:[...r.getClientRects()].map(x=>({left:x.left,right:x.right}))}});
  expect(bounds.scrollWidth).toBeLessThanOrEqual(bounds.clientWidth+1);for(const f of bounds.fragments){expect(f.left).toBeGreaterThanOrEqual(bounds.x-1);expect(f.right).toBeLessThanOrEqual(bounds.x+bounds.width+1)}
  if(scene==='delete'){await page.getByTestId('admin.host_ip_addresses.delete_confirm.cancel').press('Enter');await expect(page.getByRole('dialog')).toHaveCount(0)}expect(writes).toEqual([]);
 });
}

for (const actor of [{ name: 'admin', level: 99 }, { name: 'support', level: 21 }]) {
  for (const [language, theme] of [['cs', 'dark'], ['en', 'light']] as const) {
    test(`@pr-smoke @pr-smoke-mobile Host filter alignment ${actor.name} ${language}`, async ({ page }, testInfo) => {
      const writes: string[] = [];
      const requests: string[] = [];
      const observations: unknown[] = [];
      page.on('request', (request) => {
        if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method())) writes.push(request.method() + ' ' + new URL(request.url()).pathname);
      });
      await bootstrapVpsAdminWindow(page, { webuiNext: { uiSettings: { persistence: 'local' } } });
      await setUiSettingsLocalStorage(page, { language, theme });
      await installHaveApiMock(page, {
        user: { id: 1, login: `synthetic-${actor.name}`, level: actor.level },
        handlers: {
          'GET host_ip_addresses': (ctx) => { requests.push(ctx.url.search); return { host_ip_addresses: [] }; },
        },
      });
      await page.goto('/admin/networking/host-ip-addresses?assigned=false');
      const prefix = 'admin.host_ip_addresses.filter.';
      const input = page.getByTestId(prefix + 'addr');
      await expect(input).toBeVisible();
      for (const width of [page.viewportSize()!.width, 320, 768]) {
        await page.setViewportSize({ width, height: 900 });
        const controls = [];
        for (const name of ['addr', 'user', 'vps', 'assigned', 'clear']) {
          const geometry = await page.getByTestId(prefix + name).evaluate((element) => {
            const control = element.matches('input,select,button') ? element : element.querySelector('input,select,button')!;
            const r = control.getBoundingClientRect();
            return { tag: control.tagName, left: r.left, right: r.right, top: r.top, height: r.height, width: r.width };
          });
          controls.push({ name, ...geometry });
          expect.soft(geometry.height, name + ' height').toBe(44);
          expect.soft(geometry.left, name + ' left').toBeGreaterThanOrEqual(-1);
          expect.soft(geometry.right, name + ' right').toBeLessThanOrEqual(width + 1);
        }
        const first = controls[0]!;
        const textRows = [...new Set(controls.filter((c) => c.tag === 'INPUT').map((c) => c.top))].sort((a, b) => a - b);
        const pitch = textRows.length > 1 ? textRows[1]! - textRows[0]! : 52;
        for (const control of controls) {
          const row = (control.top - first.top) / pitch;
          expect.soft(Math.abs(row - Math.round(row)), control.name + ' row alignment').toBeLessThan(0.02);
          if (width < 640) expect.soft(control.width, control.name + ' mobile width').toBe(first.width);
        }
        const documentWidth = await page.evaluate(() => document.documentElement.scrollWidth);
        expect.soft(documentWidth).toBeLessThanOrEqual(width + 1);
        observations.push({ width, controls, pitch, documentWidth });
        await input.focus();
        await expect(input).toBeFocused();
        if (width !== 768) await page.screenshot({ path: testInfo.outputPath(`filters-${width}.png`), animations: 'disabled', scale: 'css' });
      }
      const address = '2001:0db8:1234:5678:9abc:def0:1234:5678';
      await input.fill(address);
      await expect.poll(() => new URL(page.url()).searchParams.get('addr')).toBe(address);
      expect(new URL(page.url()).searchParams.get('assigned')).toBe('false');
      await page.getByTestId(prefix + 'assigned').selectOption('true');
      await expect.poll(() => new URL(page.url()).searchParams.get('assigned')).toBe('true');
      expect(new URL(page.url()).searchParams.get('addr')).toBe(address);
      await expect.poll(() => requests.some((query) => new URLSearchParams(query).get('host_ip_address[addr]') === address && new URLSearchParams(query).get('host_ip_address[assigned]') === 'true')).toBe(true);
      await page.getByTestId(prefix + 'clear').press('Enter');
      await expect.poll(() => new URL(page.url()).searchParams.get('addr')).toBeNull();
      expect(new URL(page.url()).searchParams.get('assigned')).toBeNull();
      await expect(page.getByTestId(prefix + 'clear')).toHaveCount(0);
      expect(writes).toEqual([]);
      await testInfo.attach('host-filter-alignment-and-query', { body: JSON.stringify({ observations, requests, writes }, null, 2), contentType: 'application/json' });
    });
  }
}
