import { expect, test } from '@playwright/test';

import { bootstrapVpsAdminWindow, installHaveApiMock } from '../../fixtures';

test('@pr-smoke @pr-smoke-mobile @smoke @smoke-mobile admin ip addresses: empty state clears server-side filters', async ({ page, isMobile }) => {
  const requests: URLSearchParams[] = [];
  await bootstrapVpsAdminWindow(page, { sessionToken: 'TEST' });

  await installHaveApiMock(page, {
    user: { id: 1, login: 'admin', level: 100 },
    handlers: {
      'GET locations': () => ({ locations: [] }),
      'GET ip_addresses': (ctx) => {
        requests.push(new URLSearchParams(ctx.searchParams));
        const addr = ctx.searchParams.get('ip_address[addr]');
        // A filtered response is empty; the unfiltered API returns ascending IDs.
        if (addr) return { ip_addresses: [] };

        const count = 3;
        const startId = 123;
        const ip_addresses = Array.from({ length: count }, (_, i) => {
          const id = startId + i;
          const ip = `192.0.2.${(id % 200) + 1}`;
          return {
            id,
            addr: ip,
            prefix: 32,
            routed: id % 2 === 0,
            user: { id: 1000 + (id % 10), login: `u${id % 10}` },
            vps: { id: 2000 + (id % 10), hostname: `vps${id % 10}` },
            network: { id: 3000, address: '192.0.2.0', prefix: 24 },
            network_interface: { id: 4000, name: 'eth0' },
            created_at: '2025-01-01T00:00:00Z',
          };
        });

        return { ip_addresses };
      },
    },
  });

  await page.goto('/admin/ip-addresses?addr=10.0.0');

  await expect(page.getByTestId('admin.ip_addresses.empty')).toBeVisible();

  expect(requests.at(-1)?.get('ip_address[addr]')).toBe('10.0.0');

  // Clear filters from the empty state.
  await page.getByTestId('admin.ip_addresses.empty.action').click();

  await expect(page.getByTestId(`admin.ip_addresses.${isMobile ? 'card' : 'row'}.125`)).toBeVisible();
  await expect(page).not.toHaveURL(/[?&]addr=/);
  expect(requests.at(-1)?.has('ip_address[addr]')).toBe(false);
  expect(requests.at(-1)?.get('ip_address[order]')).toBe('asc');
  await expect(page.getByTestId('admin.ip_addresses.empty')).toHaveCount(0);
  await expect(page.getByTestId('admin.ip_addresses.partial')).toHaveCount(0);
});
