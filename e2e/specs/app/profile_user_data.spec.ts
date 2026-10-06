import { expect, test } from '@playwright/test';

import { bootstrapVpsAdminWindow } from '../../fixtures/bootstrap';
import { installHaveApiMock } from '../../fixtures/haveapi';

function nowIso() {
  return new Date('2026-02-18T10:00:00Z').toISOString();
}

test.describe('Profile: user data templates', () => {
  test('@pr-smoke @pr-smoke-mobile @smoke @smoke-mobile list, create, edit, deploy and delete', async ({ page }) => {
    test.setTimeout(90_000);

    const t0 = nowIso();
    let deploymentFinished = false;
    let terminalReads = 0;

    await bootstrapVpsAdminWindow(page, { sessionToken: 'TEST_SESSION' });

    // In-memory templates for the mock.
    let templates = [
      {
        id: 101,
        label: 'Base cloud-init',
        format: 'cloudinit_config',
        content: '#cloud-config\npackages:\n  - curl\n',
        created_at: t0,
        updated_at: t0,
      },
    ];

    await installHaveApiMock(page, {
      authorize: {
        user: { id: 1, login: 'e2e', level: 1 },
      },
      handlers: {
        'GET vps_user_data': async ({ params }) => {
          const q = (params['vps_user_data[q]'] ?? '').toString().trim().toLowerCase();
          const format = (params['vps_user_data[format]'] ?? '').toString().trim();

          let out = [...templates].sort((a, b) => b.id - a.id);

          if (q) {
            out = out.filter((x) => x.label.toLowerCase().includes(q) || `#${x.id}`.includes(q));
          }

          if (format) {
            out = out.filter((x) => x.format === format);
          }

          return out;
        },

        'POST vps_user_data': async ({ reqJson }) => {
          const payload = (reqJson as { vps_user_data?: { label?: string; format?: string; content?: string } })?.vps_user_data ?? {};

          const nextId = Math.max(...templates.map((x) => x.id)) + 1;
          const tpl = {
            id: nextId,
            label: payload.label ?? 'Unnamed',
            format: payload.format ?? 'cloudinit_config',
            content: payload.content ?? '',
            created_at: t0,
            updated_at: t0,
          };

          templates = [tpl, ...templates];
          return tpl;
        },

        'PUT vps_user_data/102': async ({ reqJson }) => {
          const payload = (reqJson as { vps_user_data?: { label?: string; format?: string; content?: string } })?.vps_user_data ?? {};
          templates = templates.map((x) =>
            x.id === 102
              ? {
                  ...x,
                  label: payload.label ?? x.label,
                  format: payload.format ?? x.format,
                  content: payload.content ?? x.content,
                  updated_at: t0,
                }
              : x
          );

          return templates.find((x) => x.id === 102);
        },

        'DELETE vps_user_data/102': async () => {
          templates = templates.filter((x) => x.id !== 102);
          return null;
        },

        'POST vps_user_data/102/deploy': async () => {
          return { _meta: { action_state_id: 999 } };
        },

        'GET action_states/999': async () => {
          if (deploymentFinished) terminalReads += 1;
          return { action_state: {
            id: 999,
            label: 'Deploy user data',
            status: true,
            finished: deploymentFinished,
            can_cancel: false,
            current: 1,
            total: 1,
            progress: 1,
            created_at: t0,
            updated_at: t0,
          } };
        },
      },
    });

    await page.goto('/app/profile/user-data');

    await expect(page.getByTestId('profile.user_data.panel')).toBeVisible({ timeout: 30_000 });
    await expect(page).toHaveURL(/\/app\/profile\/user-data\?limit=50&page=1$/);

    // Initial list
    await expect(page.locator('[data-testid="profile.user_data.row.101"]:visible')).toBeVisible();

    // Create
    await page.getByTestId('profile.user_data.create').click();
    await expect(page.getByTestId('profile.user_data.editor.drawer')).toBeVisible();

    await page.getByTestId('profile.user_data.editor.label').fill('Provision nginx');
    await page.getByTestId('profile.user_data.editor.format').selectOption('script');
    await page.getByTestId('profile.user_data.editor.content').fill('#!/bin/sh\necho hello\n');

    const createButton = page.getByTestId('profile.user_data.editor.create');
    await expect(createButton).toBeEnabled();
    await createButton.click();

    // The new template should get id 102 from the mock.
    await expect(page.locator('[data-testid="profile.user_data.row.102"]:visible')).toBeVisible();

    // Edit
    await page.locator('[data-testid="profile.user_data.row.102.edit"]:visible').click();
    await expect(page.getByTestId('profile.user_data.editor.drawer')).toBeVisible();

    await page.getByTestId('profile.user_data.editor.label').fill('Provision nginx (v2)');
    await page.getByTestId('profile.user_data.editor.save').click();

    await expect(page.getByText('Provision nginx (v2)')).toBeVisible();

    // Deploy (use direct id entry to avoid VPS list mocks)
    await page.locator('[data-testid="profile.user_data.row.102.deploy"]:visible').click();
    await expect(page.getByTestId('profile.user_data.deploy.drawer')).toBeVisible();

    await page.getByTestId('profile.user_data.deploy.vps').fill('#500');
    await page.getByTestId('profile.user_data.deploy.submit').click();

    await expect(page.getByText('Deployment started')).toBeVisible();
    await expect(page.getByTestId('modal.action_progress')).toBeVisible();
    deploymentFinished = true;
    await expect.poll(() => terminalReads).toBeGreaterThan(0);
    await expect(page.getByTestId('modal.action_progress')).toHaveCount(0);

    // Delete
    await page.locator('[data-testid="profile.user_data.row.102.delete"]:visible').click();
    await expect(page.getByTestId('profile.user_data.delete.confirm')).toBeVisible();
    await page.getByTestId('profile.user_data.delete.confirm.confirm').click();

    await expect(page.getByTestId('profile.user_data.row.102')).toHaveCount(0);
  });

  test('@pr-smoke @pr-smoke-mobile failed deletion stays in context and can be retried', async ({ page }) => {
    let deleteAttempts = 0;
    let templates = [
      {
        id: 101,
        label: 'Base cloud-init',
        format: 'cloudinit_config',
        content: '#cloud-config\n',
        created_at: nowIso(),
        updated_at: nowIso(),
      },
    ];

    await bootstrapVpsAdminWindow(page, { sessionToken: 'TEST_SESSION' });
    await installHaveApiMock(page, {
      authorize: {
        user: { id: 1, login: 'e2e', level: 1 },
      },
      handlers: {
        'GET vps_user_data': () => templates,
        'DELETE vps_user_data/101': () => {
          deleteAttempts += 1;
          if (deleteAttempts === 1) {
            return {
              status: 409,
              contentType: 'application/json',
              body: JSON.stringify({ status: false, message: 'Template is still assigned' }),
            };
          }

          templates = [];
          return null;
        },
      },
    });

    await page.goto('/app/profile/user-data');
    await page.locator('[data-testid="profile.user_data.row.101.delete"]:visible').click();

    const dialog = page.getByTestId('profile.user_data.delete.confirm');
    await expect(dialog).toBeVisible();
    await dialog.getByTestId('profile.user_data.delete.confirm.confirm').click();

    const error = dialog.getByTestId('profile.user_data.delete.confirm.error');
    await expect(error).toBeVisible();
    await expect(error).toContainText('Template is still assigned');
    await expect(dialog).toBeVisible();
    await expect(page.locator('[data-testid="profile.user_data.row.101"]:visible')).toBeVisible();

    await dialog.getByTestId('profile.user_data.delete.confirm.confirm').click();

    await expect(dialog).toBeHidden();
    await expect(page.getByTestId('profile.user_data.row.101')).toHaveCount(0);
    expect(deleteAttempts).toBe(2);
  });

  for (const failure of ['missing action-state', 'transport loss'] as const) {
    test(`@pr-smoke @pr-smoke-mobile @smoke @smoke-mobile deploy fails closed after ${failure} and does not repeat through reload`, async ({ page }) => {
      test.setTimeout(90_000);
      await bootstrapVpsAdminWindow(page, { sessionToken: 'TEST_SESSION' });

      let deployRequests = 0;
      await installHaveApiMock(page, {
        authorize: {
          user: { id: 1, login: 'e2e', level: 1 },
          },
        handlers: {
          'GET vps_user_data': () => ({
            vps_user_data: [
              {
                id: 101,
                label: 'Base cloud-init',
                format: 'cloudinit_config',
                content: '#cloud-config\n',
                created_at: nowIso(),
                updated_at: nowIso(),
              },
            ],
          }),
          'POST vps_user_data/101/deploy': () => {
            deployRequests += 1;
            return { _meta: {} };
          },
        },
      });

      if (failure === 'transport loss') {
        await page.route('**/api/v7.0/vps_user_data/101/deploy', async (route) => {
          deployRequests += 1;
          await route.abort('connectionreset');
        });
      }

      const openAndSubmit = async () => {
        await page.locator('[data-testid="profile.user_data.row.101.deploy"]:visible').click();
        await expect(page.getByTestId('profile.user_data.deploy.drawer')).toBeVisible();
        await page.getByTestId('profile.user_data.deploy.vps').fill('#500');
        await page.getByTestId('profile.user_data.deploy.submit').click();
      };

      await page.goto('/app/profile/user-data');
      await openAndSubmit();
      await expect(
        page
          .getByTestId('profile.user_data.deploy.drawer')
          .getByText(
            failure === 'missing action-state'
              ? /missing action_state_id/i
              : /failed to fetch|network|connection/i
          )
      ).toBeVisible();
      expect(deployRequests).toBe(1);

      // Retrying from the still-open drawer must be stopped by the durable guard.
      await page.getByTestId('profile.user_data.deploy.submit').click();
      await expect(
        page.getByTestId('profile.user_data.deploy.drawer').getByText(/previous operation still has an uncertain outcome/i)
      ).toBeVisible();
      expect(deployRequests).toBe(1);

      await page.reload();
      await expect(page.locator('[data-testid="profile.user_data.row.101"]:visible')).toBeVisible();
      await openAndSubmit();
      await expect(
        page.getByTestId('profile.user_data.deploy.drawer').getByText(/previous operation still has an uncertain outcome/i)
      ).toBeVisible();
      expect(deployRequests).toBe(1);
    });
  }
});
