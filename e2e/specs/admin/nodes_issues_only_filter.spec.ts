import { expect, test } from '@playwright/test';
import type { Node__PublicStatusOutput } from 'vpsadmin-typescript-client';

import { bootstrapVpsAdminWindow, installHaveApiMock } from '../../fixtures';

test('@smoke admin nodes: issues-only filter hides healthy nodes', async ({ page }) => {
  await bootstrapVpsAdminWindow(page, { sessionToken: 'TEST' });

  await installHaveApiMock(page, {
    user: { id: 1, login: 'admin', level: 100 },
    handlers: {
      'GET nodes/public_status': () => {
        const nodes: Node__PublicStatusOutput = [
          { name: 'node125.example.test', status: false },
          {
            name: 'node124.example.test',
            status: true,
            maintenance_lock: 'lock',
            maintenance_lock_reason: 'HW upgrade',
          },
          { name: 'node123.example.test', status: true, maintenance_lock: 'no' },
        ];
        return { nodes };
      },
      'GET nodes/overview_list': () => ({ nodes: [] }),
      'GET nodes': () => {
        const nodes = [
          {
            id: 125,
            domain_name: 'node125.example.test',
            fqdn: 'node125.example.test',
            location: { label: 'dc1' },
          },
          {
            id: 124,
            domain_name: 'node124.example.test',
            fqdn: 'node124.example.test',
            location: { label: 'dc1' },
          },
          {
            id: 123,
            domain_name: 'node123.example.test',
            fqdn: 'node123.example.test',
            location: { label: 'dc1' },
          },
        ];

        return { nodes };
      },
    },
  });

  await page.goto('/admin/nodes');

  // All nodes visible initially
  await expect(page.getByTestId('admin.nodes.row.125')).toBeVisible();
  await expect(page.getByTestId('admin.nodes.row.124')).toBeVisible();
  await expect(page.getByTestId('admin.nodes.row.123')).toBeVisible();

  // Toggle issues-only
  await page.getByTestId('admin.nodes.issues_toggle').click();
  await expect(page).toHaveURL(/[?&]issues=1(?:&|$)/);

  // Healthy node should disappear, issue nodes remain
  await expect(page.getByTestId('admin.nodes.row.123')).toHaveCount(0);
  await expect(page.getByTestId('admin.nodes.row.125')).toBeVisible();
  await expect(page.getByTestId('admin.nodes.row.124')).toBeVisible();

  // Clear filters button becomes available
  await expect(page.getByTestId('admin.nodes.filter.clear')).toBeVisible();
});
