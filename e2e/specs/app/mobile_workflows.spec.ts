import { expect, test, type Page, type Locator } from '@playwright/test';
import { bootstrapVpsAdminWindow, failEnvelope, installHaveApiMock, setUiSettingsLocalStorage } from '../../fixtures';
import { expectNoDocumentHorizontalOverflow } from '../../helpers/horizontalOverflow';

const vps = {
  id: 123,
  hostname: 'touch.example.test',
  object_state: 'active',
  is_running: true,
  cpus: 2,
  memory: 2048,
  diskspace: 20480,
  user: { id: 7, login: 'owner' },
  node: {
    id: 1,
    domain_name: 'node1.example',
    location: { id: 2, label: 'Praha', environment: { id: 1, label: 'Production' } },
  },
};
async function setup(page: Page, language: 'cs' | 'en') {
  await bootstrapVpsAdminWindow(page);
  await setUiSettingsLocalStorage(page, { language, theme: language === 'cs' ? 'dark' : 'light' });
  return installHaveApiMock(page, {
    user: { id: 1, login: 'touch-admin', level: 100 },
    handlers: {
      'GET vpses': () => ({ vpses: [vps], _meta: { total_count: 1 } }),
      'GET vpses/123': () => ({ vps }),
      'GET users': () => ({ users: [{ id: 8, login: 'alice', full_name: 'Alice Example' }] }),
      'GET nodes': ({ url }) => ({
        nodes: [vps.node, { ...vps.node, id: 2, domain_name: 'node2.example' }].filter(
          (node) => node.id > Number(url.searchParams.get('node[from_id]') ?? url.searchParams.get('from_id') ?? 0)
        ),
      }),
      'GET help_boxes': () => ({ help_boxes: [] }),
    },
  });
}
// Headless browsers do not open the OS keyboard. Explicitly exercise the visual
// viewport resize/scroll contract while keeping the layout viewport unchanged.
async function keyboardViewport(page: Page, height: number, top: number) {
  await page.evaluate(
    ({ height, top }) => {
      const viewport = Object.assign(new EventTarget(), {
        height,
        offsetTop: top,
        offsetLeft: 0,
        width: innerWidth,
        scale: 1,
      });
      Object.defineProperty(window, 'visualViewport', { configurable: true, value: viewport });
    },
    { height, top }
  );
}
async function insideVisibleArea(locator: Locator, top: number, height: number) {
  const box = await locator.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.y).toBeGreaterThanOrEqual(top);
  expect(box!.y + box!.height).toBeLessThanOrEqual(top + height + 1);
}

test.describe('@pr-smoke-mobile Mobile workflow hardening', () => {
  test.describe.configure({ retries: 0 });
  test.beforeEach(async ({ hasTouch }) => {
    test.skip(!hasTouch, 'Touch journeys');
  });
  for (const language of ['cs', 'en'] as const) {
    test(`lookup drafts and first-tap selection survive URL updates (${language})`, async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 700 });
      await setup(page, language);
      await page.goto('/admin/vps?user=7');
      await page
        .getByRole('button', { name: language === 'cs' ? 'Pokročilé filtry' : 'Advanced filters', exact: true })
        .tap();
      const drawer = page.getByTestId('vps.list.advanced_filters');
      await expect(drawer).toBeVisible();
      const user = page.getByTestId('vps.filter.user.lookup');
      await user.fill('ali');
      await expect(user).toHaveValue('ali');
      const alice = page.getByTestId('vps.filter.user.lookup.opt.8');
      await expect(alice).toBeVisible();
      // A press may start a scroll; only completed activation commits selection.
      await alice.dispatchEvent('mousedown');
      await expect(user).toHaveValue('ali');
      await alice.tap();
      await expect(user).toHaveValue('8');
      await expect(page).toHaveURL(/user=8/);
      const node = page.getByTestId('vps.filter.node.lookup');
      await node.fill('node2');
      await page.getByTestId('vps.filter.node.lookup.opt.2').tap();
      await expect(page).toHaveURL(/node=2/);
      await node.fill('node');
      await expect(page.getByTestId('vps.filter.node.lookup.dropdown')).toBeVisible();
      await node.press('Escape');
      await expect(drawer).toBeVisible();
      await node.press('Escape');
      await expect(drawer).toBeHidden();
      await expectNoDocumentHorizontalOverflow(page);
    });

    test(`registration rejection stays editable above a reduced visual viewport (${language})`, async ({
      page,
    }, testInfo) => {
      await page.setViewportSize({ width: 390, height: 844 });
      const mock = await setup(page, language);
      const request = {
        id: 123,
        type: 'registration',
        state: 'awaiting',
        login: 'applicant',
        full_name: 'Example Applicant',
        email: 'test@example.test',
        address: 'Example 1',
        year_of_birth: 1990,
        language: { id: 1, code: language },
        currency: 'EUR',
      };
      mock.addHandler('GET user_request/registrations/123', () => ({ registration: request }));
      mock.addHandler('GET languages', () => ({ languages: [{ id: 1, code: language }] }));
      let calls = 0;
      let release = () => {};
      const gate = new Promise<void>((resolve) => {
        release = resolve;
      });
      mock.addHandler('POST user_request/registrations/123/resolve', async () => {
        calls++;
        await gate;
        return failEnvelope('Synthetic review rejection');
      });
      await page.route('https://nominatim.openstreetmap.org/**', (route) => route.fulfill({ json: [] }));
      await page.goto('/admin/requests/registration/123');
      await keyboardViewport(page, 420, 100);
      const prefix = 'admin.requests.resolve';
      await page.getByTestId(`${prefix}.action.deny`).tap();
      const reason = page.getByTestId(`${prefix}.reason`);
      await reason.fill('A deliberately retained reason');
      expect(await reason.evaluate((el) => parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(16);
      const submit = page.getByTestId(`${prefix}.submit`);
      const cancel = page.getByTestId(`${prefix}.cancel`);
      await insideVisibleArea(submit, 100, 420);
      await insideVisibleArea(cancel, 100, 420);
      await submit.tap();
      try {
        await expect.poll(() => calls).toBe(1);
        await expect(submit).toBeDisabled();
        await expect(cancel).toBeDisabled();
        await reason.press('Escape');
        await expect(page.getByTestId(`${prefix}.modal`)).toBeVisible();
      } finally {
        release();
      }
      await expect(page.getByTestId(`${prefix}.error`)).toContainText('Synthetic review rejection');
      await expect(reason).toHaveValue('A deliberately retained reason');
      await insideVisibleArea(cancel, 100, 420);
      if (process.env['E2E_CAPTURE_SCREENSHOTS'] === '1')
        await page.screenshot({ path: testInfo.outputPath(`registration-${language}.png`) });
      await cancel.tap();
      await expect(page.getByTestId(`${prefix}.modal`)).toBeHidden();
      expect(calls).toBe(1);
      await expectNoDocumentHorizontalOverflow(page);
    });

    test(`migration retains choices after rejection and issues one accepted request (${language})`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: 390, height: 620 });
      const mock = await setup(page, language);
      let calls = 0;
      mock.addHandler('POST vpses/123/migrate', () =>
        ++calls === 1 ? failEnvelope('Synthetic destination rejection') : { _meta: { action_state_id: 510 } }
      );
      mock.addHandler('GET action_states/510', () => ({
        action_state: { id: 510, label: 'Migrate VPS', status: true, finished: false, current: 1, total: 2 },
      }));
      await page.goto('/admin/vps/123/lifecycle/migrate');
      const prefix = 'vps.lifecycle.migrate';
      await page.getByTestId(`${prefix}.node`).tap();
      await page.getByTestId(`${prefix}.node.opt.2`).tap();
      await page.getByTestId(`${prefix}.reason`).fill('Synthetic maintenance');
      await page.getByTestId(`${prefix}.confirm`).tap();
      await page.getByTestId(`${prefix}.submit`).tap();
      await expect(
        page.getByTestId(prefix).getByText('Synthetic destination rejection', { exact: true })
      ).toBeVisible();
      await expect(page.getByTestId(`${prefix}.reason`)).toHaveValue('Synthetic maintenance');
      await expect(page.getByTestId(`${prefix}.selected`)).toContainText('node2.example');
      await page.getByTestId(`${prefix}.submit`).tap();
      await expect.poll(() => calls).toBe(2);
      await expect(page.getByTestId('toast.viewport')).toBeVisible();
      await expectNoDocumentHorizontalOverflow(page);
    });

    test(`incident detail and browser back retain the filtered list (${language})`, async ({ page }) => {
      const mock = await setup(page, language);
      const incident = {
        id: 101,
        subject: 'Synthetic incident ' + 'LongDiagnosticText'.repeat(4),
        codename: 'Accessible-Test',
        vps: { id: 123, hostname: vps.hostname },
        detected_at: '2026-10-06T08:00:00Z',
        vps_action: 'none',
      };
      mock.addHandler('GET incident_reports', () => ({ incident_reports: [incident] }));
      mock.addHandler('GET incident_reports/101', () => ({ incident_report: incident }));
      await page.goto('/admin/incidents?vps=123');
      await page.getByTestId('incidents.list.card.101').getByRole('link', { name: '#101', exact: true }).tap();
      await expect(page.getByTestId('incidents.detail')).toBeVisible();
      await expectNoDocumentHorizontalOverflow(page);
      await page.goBack();
      await expect(page).toHaveURL(/incidents\?vps=123/);
      await expect(page.getByTestId('incidents.list.card.101')).toBeVisible();
    });
  }

  test('landscape cards use available content width and a wide touch screen retains the table', async ({
    page,
  }, testInfo) => {
    await setup(page, 'cs');
    await page.setViewportSize({ width: 844, height: 390 });
    await page.goto('/app/vps');
    await expect(page.getByTestId('vps.card.123')).toBeVisible();
    await expect(page.getByTestId('vps.table')).toBeHidden();
    if (process.env['E2E_CAPTURE_SCREENSHOTS'] === '1')
      await page.screenshot({ path: testInfo.outputPath('landscape-cards.png') });
    await page.getByTestId('vps.card.123.action.restart').tap();
    await page.getByTestId('vps.list.power_confirm.cancel').tap();
    await expectNoDocumentHorizontalOverflow(page);
    await page.setViewportSize({ width: 1440, height: 900 });
    await expect(page.getByTestId('vps.table')).toBeVisible();
    await expect(page.getByTestId('vps.card.123')).toBeHidden();
    if (process.env['E2E_CAPTURE_SCREENSHOTS'] === '1')
      await page.screenshot({ path: testInfo.outputPath('wide-table.png') });
  });

  test('drawer footer follows viewport resize and urgent errors stay inside the dialog', async ({ page }) => {
    await setup(page, 'en');
    await page.goto('/admin/vps');
    const filter = page.getByTestId('vps.smart_filter.input');
    await filter.fill('location:not-a-number');
    await filter.press('Enter');
    await expect(page.getByTestId('toast.viewport')).toBeVisible();
    await keyboardViewport(page, 370, 80);
    await page.getByRole('button', { name: 'Advanced filters', exact: true }).tap();
    const drawer = page.getByTestId('vps.list.advanced_filters');
    const done = drawer.getByRole('button', { name: 'Done', exact: true });
    const urgent = drawer.getByTestId('toast.modal_viewport');
    await expect(urgent).toBeVisible();
    await insideVisibleArea(done, 80, 370);
    const errorBox = await urgent.boundingBox();
    const doneBox = await done.boundingBox();
    expect(errorBox!.y + errorBox!.height).toBeLessThanOrEqual(doneBox!.y);
    await page.evaluate(() => {
      const viewport = window.visualViewport!;
      Object.assign(viewport, { height: 310, offsetTop: 110 });
      viewport.dispatchEvent(new Event('resize'));
      viewport.dispatchEvent(new Event('scroll'));
    });
    await expect(async () => insideVisibleArea(done, 110, 310)).toPass();
    await done.tap();
    await expect(drawer).toBeHidden();
    await expect(page.getByTestId('toast.viewport')).toBeVisible();
  });
});
