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
    .attach('actual-reconciliation-feedback', { body: JSON.stringify(sample), contentType: 'application/json' });
  expect(sample.ratio).toBeGreaterThanOrEqual(4.5);
  expect(sample.weight).toBeGreaterThanOrEqual(500);
  expect(sample.marker).toBeGreaterThanOrEqual(2);
}
for (const language of ['cs', 'en'] as const)
  for (const theme of ['light', 'dark'] as const)
    test(`@pr-smoke @pr-smoke-mobile reconciliation feedback remains readable ${language} ${theme}`, async ({
      page,
    }, info) => {
      const errors: string[] = [];
      page.on('pageerror', (e) => errors.push(String(e)));
      await page.clock.setFixedTime(new Date('2026-11-11T03:00:00Z'));
      let ownerCount = 0;
      let exactOwnerVisible = false;
      const vps = {
        id: 123,
        hostname: 'owner-reconcile.example',
        object_state: 'active',
        is_running: true,
        enable_network: true,
        cpus: 2,
        memory: 2048,
        swap: 0,
        diskspace: 20480,
        user: { id: 7, login: 'member' },
        node: { id: 3, location: { id: 10, label: 'Praha' } },
      };
      const currentIp = () => ({
        id: 602,
        addr: '198.51.100.62',
        prefix: 32,
        routed: true,
        network: {
          id: 62,
          ip_version: 4,
          role: 'public_access',
          primary_location: { id: 10, label: 'Praha', environment: { id: 3, label: 'Production' } },
        },
        network_interface: { id: 501, name: 'eth0', vps: { id: 123 } },
        vps: { id: 123 },
        user: exactOwnerVisible ? { id: 77, login: 'target' } : { id: 7, login: 'member' },
        charged_environment: exactOwnerVisible
          ? { id: 4, label: 'Target environment' }
          : { id: 3, label: 'Production' },
      });

      await bootstrapVpsAdminWindow(page, { sessionToken: 'TEST', webuiNext: {} });
      await setUiSettingsLocalStorage(page, { language, theme });
      await installHaveApiMock(page, {
        user: { id: 7, login: 'member', level: 90 },
        handlers: {
          'GET vpses': () => ({ vpses: [vps] }),
          'GET vpses/123': () => ({ vps }),
          'GET network_interfaces': () => ({
            network_interfaces: [{ id: 501, name: 'eth0', vps: { id: 123 } }],
          }),
          'GET network_interface_accountings': () => ({ network_interface_accountings: [] }),
          'GET host_ip_addresses': () => ({ host_ip_addresses: [] }),
          'GET ip_address_assignments': () => ({
            ip_address_assignments: [{ id: 9602, ip_address: currentIp(), vps: { id: 123 } }],
          }),
          'GET ip_addresses': () => ({ ip_addresses: [currentIp()] }),
          'GET ip_addresses/602': () => ({ ip_address: currentIp() }),
          'GET environments': () => ({
            environments: [
              { id: 3, label: 'Production' },
              { id: 4, label: 'Target environment' },
            ],
          }),
          'GET transaction_chains': () => ({ transaction_chains: [] }),
          'PUT ip_addresses/602': () => {
            ownerCount += 1;
            return { ip_address: currentIp(), _meta: {} };
          },
        },
      });

      await page.goto('/admin/vps/123/network');
      await page.getByTestId('vps.network.ip_addresses.item.602.owner').click();
      await page.getByTestId('vps.network.ip_addresses.owner.user').fill('77');
      await page.getByTestId('vps.network.ip_addresses.owner.environment').selectOption('4');
      await page.getByTestId('vps.network.ip_addresses.owner.submit').click();
      await expect.poll(() => ownerCount).toBe(1);

      await page.reload();
      const uncertainty = page.getByTestId('vps.network.route_assign.uncertain.602');
      await expect(uncertainty).toBeVisible();
      await expect(page.getByTestId('vps.network.route_assign.uncertain.602.acknowledge')).toBeDisabled();
      await page.getByTestId('vps.network.route_assign.uncertain.602.open_tasks').click();
      await page.getByTestId('tasks.close-button').click();
      await page.getByTestId('vps.network.route_assign.uncertain.602.acknowledge').click();
      await expect(page.getByTestId('vps.network.route_assign.uncertain.602.error')).toBeVisible();
      await expect(uncertainty).toBeVisible();
      await page.getByTestId('tasks.close-button').click();

      await expectReadableFeedback(page.getByTestId('vps.network.route_assign.uncertain.602.error'));
      await uncertainty.screenshot({
        path: info.outputPath('reconciliation-error.png'),
        animations: 'disabled',
        scale: 'css',
      });
      exactOwnerVisible = true;
      await page.getByTestId('vps.network.route_assign.uncertain.602.acknowledge').click();
      await expect(uncertainty).toHaveCount(0);
      expect(ownerCount).toBe(1);
      expect(errors).toEqual([]);
    });
