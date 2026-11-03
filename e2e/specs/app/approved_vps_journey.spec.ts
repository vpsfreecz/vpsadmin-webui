import { expect, test } from '@playwright/test';

import { bootstrapVpsAdminWindow, installHaveApiMock, jsonFulfill, setUiSettingsLocalStorage } from '../../fixtures';
import { expectNoDocumentHorizontalOverflow } from '../../helpers/horizontalOverflow';
import { clickShellControl } from '../../helpers/shellNavigation';

// One member journey through real UI routes; all API data/writes are synthetic.
for (const language of ['cs', 'en'] as const) {
  test(`@workflow-matrix @pr-smoke @pr-smoke-mobile approved member VPS journey keeps review, progress and result in ${language}`, async ({ page, hasTouch }) => {
    // Includes two asynchronous operations, a rejection/retry and cold route loads.
    test.setTimeout(180_000);
    await bootstrapVpsAdminWindow(page, { sessionToken: 'APPROVED_JOURNEY_FIXTURE' });
    await setUiSettingsLocalStorage(page, { language });
    const vps = {
      id: 123, hostname: 'journey.example', object_state: 'active', is_running: true,
      cpu: 2, memory: 2048, swap: 0, cpu_limit: 100, diskspace: 20480,
      manage_hostname: true, user: { id: 42, login: 'member' },
      node: { id: 1, domain_name: 'node.example', location: { id: 1, label: 'Praha' } },
    };
    const state = { rejectResources: true, resourcesDone: false, keyDone: false, resourceWrites: [] as unknown[], keyWrites: [] as unknown[] };
    await installHaveApiMock(page, {
      user: { id: 42, login: 'member', level: 1 },
      handlers: {
        'GET vpses': () => ({ vpses: [vps], _meta: { total_count: 1 } }),
        'GET vpses/123': () => ({ vps }),
        'GET ip_addresses': () => ({ ip_addresses: [] }),
        'GET transaction_chains': () => ({ transaction_chains: [] }),
        'GET dns_resolvers': () => ({ dns_resolvers: [] }),
        'GET user_namespace_maps': () => ({ user_namespace_maps: [] }),
        'GET users/42/public_keys': () => ({ public_keys: [{ id: 8, label: 'journey-key', fingerprint: 'SHA256:fixture' }] }),
        'GET vpses/123/ssh_host_keys': () => ({ ssh_host_keys: [] }),
        'PUT vpses/123': ctx => {
          state.resourceWrites.push(ctx.json);
          if (state.rejectResources) return jsonFulfill({ status: false, message: 'Fixture resource rejection', response: null }, 422);
          vps.memory = 3072;
          return { vps, _meta: { action_state_id: 902 } };
        },
        'POST vpses/123/deploy_public_key': ctx => {
          state.keyWrites.push(ctx.json);
          return { _meta: { action_state_id: 903 } };
        },
        'GET action_states/902': () => ({ action_state: { id: 902, finished: state.resourcesDone, status: state.resourcesDone ? true : null, current: state.resourcesDone ? 1 : 0, total: 1 } }),
        'GET action_states/903': () => ({ action_state: { id: 903, finished: state.keyDone, status: state.keyDone ? true : null, current: state.keyDone ? 1 : 0, total: 1 } }),
      },
    });

    await page.goto('/app/vps');
    const filter = page.getByTestId('vps.smart_filter.input');
    await filter.fill('hostname:journey.example');
    await filter.press('Enter');
    await expect(page.getByTestId('vps.list.active_filters')).toContainText('journey.example');
    await page.getByRole('link', { name: 'journey.example', exact: true }).click();
    await expect(page.getByTestId('vps.header')).toContainText('journey.example');
    await page.getByTestId('vps.overview.resources_usage.card').getByRole('link').click();
    await expect(page).toHaveURL(/\/app\/vps\/123\/config\?section=resources/);
    const memory = page.getByRole('spinbutton', { name: language === 'cs' ? /^Paměť \(MiB\)/ : /^Memory \(MiB\)/ });
    await memory.fill('3072');
    await page.getByTestId('vps.config.header.save').click();
    const confirmation = page.getByTestId('vps.config.confirm');
    await expect(confirmation).toContainText('journey.example');
    await expect(confirmation).toContainText('3072');
    expect(state.resourceWrites).toEqual([]);
    await page.getByTestId('vps.config.confirm.confirm').click();
    await expect(confirmation).toContainText('Fixture resource rejection');
    await expect(memory).toHaveValue('3072');
    state.rejectResources = false;
    await page.getByTestId('vps.config.confirm.confirm').click();
    await expect(confirmation).toBeHidden();
    expect(state.resourceWrites).toEqual([{ vps: { memory: 3072 } }, { vps: { memory: 3072 } }]);
    await clickShellControl(page, 'tasks.open-button', hasTouch);
    const resourceTask = page.getByTestId('tasks.row.902');
    await expect(resourceTask).toContainText('journey.example');
    await expect(resourceTask).not.toContainText('100%');
    state.resourcesDone = true;
    await expect(resourceTask).toContainText('100%');
    await page.getByTestId('tasks.close-button').click();
    await expect(memory).toHaveValue('3072');

    await page.getByTestId('vps.action.primary_access').click();
    await expect(page).toHaveURL(/\/app\/vps\/123\/access/);
    await expect(page.getByTestId('vps.header')).toContainText('journey.example');
    await page.getByTestId('vps.access.ssh.deploy').click();
    await expect(page.getByTestId('vps.access.ssh.confirm.target')).toContainText('journey.example');
    expect(state.keyWrites).toEqual([]);
    await page.getByTestId('vps.access.ssh.confirm.confirm').click();
    await expect.poll(() => state.keyWrites).toEqual([{ vps: { public_key: 8 } }]);
    const keyProgress = page.getByTestId('modal.action_progress');
    await expect(keyProgress).toContainText('0%');
    await keyProgress.getByTestId('modal.action_progress.open_tasks').click();
    const keyTask = page.getByTestId('tasks.row.903');
    await expect(keyTask).toContainText('journey.example');
    await expect(keyTask).not.toContainText('100%');
    state.keyDone = true;
    await expect(keyTask).toContainText('100%');
    await page.getByTestId('tasks.close-button').click();
    await expect(page.getByTestId('vps.access.page')).toContainText(language === 'cs' ? 'Veřejný klíč nasazen' : 'Public key deployed');
    await page.getByTestId('vps.header').getByRole('link', { name: 'VPS', exact: true }).click();
    await expect(page).toHaveURL(/\/app\/vps(?:\?|$)/);
    await expect(page.getByRole('link', { name: 'journey.example', exact: true })).toBeVisible();
    await expectNoDocumentHorizontalOverflow(page);
  });
}
