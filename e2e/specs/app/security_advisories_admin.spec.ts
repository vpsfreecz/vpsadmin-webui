import { setUiSettingsLocalStorage } from '../../fixtures/uiSettings';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { advisoryContractDescription } from '../../helpers/securityAdvisoryContract';
import { expect, test } from '@playwright/test';
import type {
  OutageSecurityAdvisory__CreateOutput,
  SecurityAdvisory__CreateOutput,
  SecurityAdvisory__NodeStatus__IndexOutput,
  SecurityAdvisoryCve__CreateOutput,
  SecurityAdvisoryUpdate__CreateOutput,
} from 'vpsadmin-typescript-client';

import { bootstrapVpsAdminWindow, failEnvelope, installHaveApiMock, jsonFulfill } from '../../fixtures';

const languages = [
  { id: 1, code: 'en', label: 'English' },
  { id: 2, code: 'cs', label: 'Čeština' },
];

test.describe('@smoke Security advisory admin management', () => {
  test('creates a localized draft together with normalized CVE references', async ({ page }) => {
    let advisoryPayload: unknown;
    const cvePayloads: unknown[] = [];
    let createdAdvisory: (SecurityAdvisory__CreateOutput & { id: number; content_revision: number }) | null = null;
    const createdCves: SecurityAdvisoryCve__CreateOutput[] = [];

    await bootstrapVpsAdminWindow(page, { sessionToken: 'TEST' });
    await installHaveApiMock(page, {
      description: advisoryContractDescription(),
      user: { id: 1, login: 'security-admin', level: 90 },
      handlers: {
        'GET languages': () => ({ languages }),
        'GET security_advisories': () => ({ security_advisories: [] }),
        'POST security_advisories': ({ reqJson }) => {
          advisoryPayload = reqJson;
          if (!reqJson || typeof reqJson !== 'object' || !('security_advisory' in reqJson))
            throw new Error('Expected advisory input namespace');
          const input = reqJson.security_advisory;
          if (!input || typeof input !== 'object' || Array.isArray(input))
            throw new Error('Expected advisory input object');
          createdAdvisory = {
            ...input,
            id: 77,
            state: 'draft',
            content_revision: 0,
            created_at: '2026-07-27T10:00:00.000Z',
          };
          return { security_advisory: createdAdvisory };
        },
        'POST security_advisory_cves': ({ reqJson }) => {
          cvePayloads.push(reqJson);
          if (!createdAdvisory || !reqJson || typeof reqJson !== 'object' || !('security_advisory_cve' in reqJson))
            throw new Error('Expected existing advisory and CVE input namespace');
          const input = reqJson.security_advisory_cve;
          if (
            !input ||
            typeof input !== 'object' ||
            Array.isArray(input) ||
            !('security_advisory' in input) ||
            input.security_advisory !== createdAdvisory.id ||
            !('cve_id' in input) ||
            typeof input.cve_id !== 'string' ||
            !('expected_state' in input) ||
            input.expected_state !== 'draft' ||
            !('expected_content_revision' in input) ||
            input.expected_content_revision !== createdAdvisory.content_revision
          )
            throw new Error('Expected CVE input for the stored advisory revision');
          const cve: SecurityAdvisoryCve__CreateOutput = {
            id: 900 + cvePayloads.length,
            security_advisory_id: createdAdvisory.id,
            security_advisory: { id: createdAdvisory.id },
            cve_id: input.cve_id,
          };
          createdCves.push(cve);
          createdAdvisory.content_revision += 1;
          return { security_advisory_cve: cve };
        },

        // The successful create navigates straight to the detail. Keep that
        // route deterministic as well so the assertion cannot race a failed
        // background query.
        'GET security_advisories/77': () => ({ security_advisory: createdAdvisory }),
        'GET security_advisory_cves': () => ({ security_advisory_cves: createdCves }),
        'GET nodes': () => ({ nodes: [] }),
        'GET security_advisories/77/node_statuses': () => ({ node_statuses: [] }),
        'GET security_advisory_updates': () => ({ security_advisory_updates: [] }),
        'GET outage_security_advisories': () => ({ outage_security_advisories: [] }),
      },
    });

    await page.goto('/admin/security-advisories');
    await expect(page.getByTestId('admin.security_advisories.page')).toBeVisible();
    await page.getByTestId('admin.security_advisories.create').click();
    await expect(page.getByTestId('admin.security_advisories.editor')).toBeVisible();

    await page.getByTestId('admin.security_advisories.editor.cves').fill('cve-2026-12345; CVE-2026-23456');
    await page.getByTestId('admin.security_advisories.editor.name').fill('Linux kernel advisory');
    await page.getByTestId('admin.security_advisories.editor.published_at').fill('2026-07-27T12:30');

    await page.getByTestId('admin.security_advisories.editor.en.summary').fill('Kernel vulnerability');
    await page.getByTestId('admin.security_advisories.editor.en.description').fill('Affects supported compute nodes.');
    await page.getByTestId('admin.security_advisories.editor.en.response').fill('Apply the fixed kernel and reboot.');

    await page.getByTestId('admin.security_advisories.editor.language.cs').click();
    await page.getByTestId('admin.security_advisories.editor.cs.summary').fill('Zranitelnost kernelu');
    await page
      .getByTestId('admin.security_advisories.editor.cs.description')
      .fill('Týká se podporovaných výpočetních nodů.');
    await page.getByTestId('admin.security_advisories.editor.cs.response').fill('Nasaď opravený kernel a restartuj.');

    await page.getByTestId('admin.security_advisories.editor.save').click();

    await expect(page).toHaveURL(/\/admin\/security-advisories\/77$/);
    await expect.poll(() => cvePayloads.length).toBe(2);
    expect(advisoryPayload).toEqual({
      security_advisory: expect.objectContaining({
        name: 'Linux kernel advisory',
        published_at: expect.any(String),
        en_summary: 'Kernel vulnerability',
        en_description: 'Affects supported compute nodes.',
        en_response: 'Apply the fixed kernel and reboot.',
        cs_summary: 'Zranitelnost kernelu',
        cs_description: 'Týká se podporovaných výpočetních nodů.',
        cs_response: 'Nasaď opravený kernel a restartuj.',
      }),
    });
    expect(cvePayloads).toEqual([
      {
        security_advisory_cve: {
          security_advisory: 77,
          cve_id: 'CVE-2026-12345',
          expected_state: 'draft',
          expected_content_revision: 0,
        },
      },
      {
        security_advisory_cve: {
          security_advisory: 77,
          cve_id: 'CVE-2026-23456',
          expected_state: 'draft',
          expected_content_revision: 1,
        },
      },
    ]);
  });

  test('gates publishing, manages node assessments, retracts through an update and links an outage', async ({
    page,
  }) => {
    const mutations: Array<{ method: string; path: string; body: unknown }> = [];
    let advisory: SecurityAdvisory__CreateOutput & { id: number; content_revision: number } = {
      id: 77,
      state: 'draft',
      content_revision: 0,
      name: 'Linux kernel advisory',
      published_at: null,
      created_at: '2026-07-27T10:00:00.000Z',
      en_summary: 'Kernel vulnerability',
      en_description: 'Affects supported compute nodes.',
      en_response: 'Apply the fixed kernel and reboot.',
      cs_summary: 'Zranitelnost kernelu',
      cs_description: 'Týká se podporovaných výpočetních nodů.',
      cs_response: 'Nasaď opravený kernel a restartuj.',
      affected_node_count: 2,
      affected_user_count: 4,
      affected_vps_count: 8,
    };
    const cves = [{ id: 901, security_advisory_id: 77, cve_id: 'CVE-2026-12345' }];
    const nodes = [
      { id: 10, active: true, type: 'node', domain_name: 'node10.prg' },
      { id: 20, active: true, type: 'storage', domain_name: 'storage20.prg' },
      { id: 30, active: false, type: 'node', domain_name: 'retired30.prg' },
    ];
    let statuses: SecurityAdvisory__NodeStatus__IndexOutput = [
      {
        id: 501,
        security_advisory: { id: 77 },
        node: nodes[0],
        state: 'unknown',
        vulnerable_until: null,
        mitigated_since: null,
        cs_note: null,
        en_note: null,
      },
      {
        id: 502,
        security_advisory: { id: 77 },
        node: nodes[1],
        state: 'not_affected',
        vulnerable_until: null,
        mitigated_since: null,
        cs_note: null,
        en_note: 'Storage is not affected',
      },
    ];
    let updates: SecurityAdvisoryUpdate__CreateOutput[] = [];
    let outageLinks: OutageSecurityAdvisory__CreateOutput[] = [];

    function updateNodeStatus(assessmentId: 501 | 502, reqJson: unknown) {
      if (!reqJson || typeof reqJson !== 'object' || !('node_status' in reqJson))
        throw new Error('Expected node status input namespace');
      const attrs = reqJson.node_status;
      if (
        !attrs ||
        typeof attrs !== 'object' ||
        Array.isArray(attrs) ||
        advisory.state !== 'draft' ||
        !('expected_content_revision' in attrs) ||
        attrs.expected_content_revision !== advisory.content_revision ||
        !('state' in attrs) ||
        typeof attrs.state !== 'string' ||
        !('vulnerable_until' in attrs) ||
        (attrs.vulnerable_until !== null && typeof attrs.vulnerable_until !== 'string') ||
        !('mitigated_since' in attrs) ||
        (attrs.mitigated_since !== null && typeof attrs.mitigated_since !== 'string') ||
        ('cs_note' in attrs && attrs.cs_note !== null && typeof attrs.cs_note !== 'string') ||
        ('en_note' in attrs && attrs.en_note !== null && typeof attrs.en_note !== 'string')
      )
        throw new Error('Expected node status update at the stored draft revision');
      const current = statuses.find((status) => status.id === assessmentId);
      if (!current) throw new Error(`Expected node assessment ${assessmentId}`);
      const status: SecurityAdvisory__NodeStatus__IndexOutput[number] = {
        ...current,
        state: attrs.state,
        vulnerable_until: attrs.vulnerable_until,
        mitigated_since: attrs.mitigated_since,
      };
      if ('cs_note' in attrs && (attrs.cs_note === null || typeof attrs.cs_note === 'string'))
        status.cs_note = attrs.cs_note;
      if ('en_note' in attrs && (attrs.en_note === null || typeof attrs.en_note === 'string'))
        status.en_note = attrs.en_note;
      statuses = statuses.map((row) => (row.id === assessmentId ? status : row));
      advisory.content_revision += 1;
      return { node_status: status };
    }

    await bootstrapVpsAdminWindow(page, { sessionToken: 'TEST' });
    await installHaveApiMock(page, {
      description: advisoryContractDescription(),
      user: { id: 1, login: 'security-admin', level: 90 },
      handlers: {
        'GET languages': () => ({ languages }),
        'GET security_advisories/77': () => ({ security_advisory: advisory }),
        'GET security_advisory_cves': () => ({ security_advisory_cves: cves }),
        'GET nodes': () => ({ nodes }),
        'GET security_advisories/77/node_statuses': () => ({ node_statuses: statuses }),
        'GET security_advisory_updates': () => ({ security_advisory_updates: updates }),
        'GET outage_security_advisories': () => ({ outage_security_advisories: outageLinks }),

        'PUT security_advisories/77/node_statuses/501': ({ reqJson }) => updateNodeStatus(501, reqJson),
        'PUT security_advisories/77/node_statuses/502': ({ reqJson }) => updateNodeStatus(502, reqJson),
        'POST security_advisories/77/publish': ({ reqJson }) => {
          if (!reqJson || typeof reqJson !== 'object' || !('security_advisory' in reqJson))
            throw new Error('Expected advisory publish input namespace');
          const attrs = reqJson.security_advisory;
          if (
            !attrs ||
            typeof attrs !== 'object' ||
            Array.isArray(attrs) ||
            advisory.state !== 'draft' ||
            !('expected_content_revision' in attrs) ||
            attrs.expected_content_revision !== advisory.content_revision ||
            !('published_at' in attrs) ||
            typeof attrs.published_at !== 'string' ||
            !('send_mail' in attrs) ||
            attrs.send_mail !== true
          )
            throw new Error('Expected publish of the reviewed draft revision');
          advisory = { ...advisory, published_at: attrs.published_at, state: 'published' };
          return { security_advisory: advisory };
        },
        'POST security_advisory_updates': ({ reqJson }) => {
          if (!reqJson || typeof reqJson !== 'object' || !('security_advisory_update' in reqJson))
            throw new Error('Expected advisory update input namespace');
          const attrs = reqJson.security_advisory_update;
          if (
            !attrs ||
            typeof attrs !== 'object' ||
            Array.isArray(attrs) ||
            advisory.state !== 'published' ||
            !('security_advisory' in attrs) ||
            attrs.security_advisory !== advisory.id ||
            !('state' in attrs) ||
            attrs.state !== 'retracted' ||
            !('en_summary' in attrs) ||
            typeof attrs.en_summary !== 'string' ||
            !('cs_summary' in attrs) ||
            typeof attrs.cs_summary !== 'string' ||
            !('en_message' in attrs) ||
            typeof attrs.en_message !== 'string' ||
            !('cs_message' in attrs) ||
            typeof attrs.cs_message !== 'string'
          )
            throw new Error('Expected localized retraction of the published advisory');
          const update: SecurityAdvisoryUpdate__CreateOutput = {
            id: 701,
            security_advisory: { id: advisory.id },
            state: attrs.state,
            en_summary: attrs.en_summary,
            cs_summary: attrs.cs_summary,
            en_message: attrs.en_message,
            cs_message: attrs.cs_message,
            created_at: '2026-07-27T13:00:00.000Z',
            reporter_name: 'security-admin',
          };
          updates = [update, ...updates];
          advisory = { ...advisory, state: 'retracted' };
          return { security_advisory_update: update };
        },
        'POST outage_security_advisories': ({ reqJson }) => {
          if (!reqJson || typeof reqJson !== 'object' || !('outage_security_advisory' in reqJson))
            throw new Error('Expected outage advisory input namespace');
          const attrs = reqJson.outage_security_advisory;
          if (
            !attrs ||
            typeof attrs !== 'object' ||
            Array.isArray(attrs) ||
            !('security_advisory' in attrs) ||
            attrs.security_advisory !== advisory.id ||
            !('outage' in attrs) ||
            typeof attrs.outage !== 'number' ||
            !Number.isSafeInteger(attrs.outage) ||
            attrs.outage <= 0
          )
            throw new Error('Expected an outage link for the current advisory');
          const outage = {
            id: attrs.outage,
            begins_at: '2026-07-27T14:00:00.000Z',
            en_summary: 'Emergency kernel maintenance',
            cs_summary: 'Nouzová údržba kernelu',
          };
          const link: OutageSecurityAdvisory__CreateOutput = {
            id: 801,
            security_advisory_id: advisory.id,
            security_advisory: { id: advisory.id },
            outage_id: attrs.outage,
            outage,
          };
          outageLinks = [link];
          return { outage_security_advisory: link };
        },
      },
    });

    page.on('request', (request) => {
      const url = new URL(request.url());
      if (!url.pathname.startsWith('/api/v7.0/')) return;
      if (!['POST', 'PUT', 'DELETE'].includes(request.method())) return;
      mutations.push({ method: request.method(), path: url.pathname, body: request.postDataJSON() });
    });

    await page.goto('/admin/security-advisories/77');
    await expect(page.getByTestId('admin.security_advisory.detail')).toBeVisible();
    await expect(page.getByTestId('admin.security_advisory.readiness')).toBeVisible();
    await expect(page.getByTestId('admin.security_advisory.publish')).toBeDisabled();
    await expect(page.getByTestId('admin.security_advisory.edit')).toBeVisible();
    await expect(page.getByTestId('admin.security_advisory.post_update')).toHaveCount(0);
    await page.getByTestId('admin.security_advisory.tab.updates').click();
    await expect(page.getByTestId('admin.security_advisory.updates.post_update')).toHaveCount(0);
    await expect(page.getByText('Publish this draft before posting follow-up updates.')).toBeVisible();

    // Resolve an individual assessment first, including the date validation
    // required for a mitigated node.
    await page.getByTestId('admin.security_advisory.tab.nodes').click();
    await expect(page.getByTestId('admin.security_advisories.nodes.row.10')).toBeVisible();
    await page.getByTestId('admin.security_advisories.nodes.row.10.edit').click();
    await page.getByTestId('admin.security_advisories.nodes.editor.state').selectOption('mitigated');
    await page.getByTestId('admin.security_advisories.nodes.editor.vulnerable_until').fill('2026-07-27T11:00');
    await page.getByTestId('admin.security_advisories.nodes.editor.mitigated_since').fill('2026-07-27T12:00');
    await page.getByTestId('admin.security_advisories.nodes.editor.en_note').fill('Fixed kernel installed');
    await page.getByTestId('admin.security_advisories.nodes.editor.save').click();
    await expect(page.getByTestId('admin.security_advisories.nodes.editor')).toHaveCount(0);
    await expect
      .poll(() =>
        mutations
          .filter(
            (mutation) =>
              mutation.method === 'PUT' && mutation.path === '/api/v7.0/security_advisories/77/node_statuses/501'
          )
          .map((mutation) => mutation.body)
      )
      .toEqual([
        {
          node_status: {
            state: 'mitigated',
            vulnerable_until: expect.any(String),
            mitigated_since: expect.any(String),
            en_note: 'Fixed kernel installed',
            expected_state: 'draft',
            expected_content_revision: 0,
          },
        },
      ]);

    // Bulk assessment applies the same explicit result to every active compute
    // and storage node, but skips the inactive node.
    await page.getByTestId('admin.security_advisories.nodes.bulk.open').click();
    await page.getByTestId('admin.security_advisories.nodes.bulk.state').selectOption('not_affected');
    await page.getByTestId('admin.security_advisories.nodes.bulk.apply').click();
    await expect(page.getByTestId('admin.security_advisories.nodes.bulk.confirm')).toBeVisible();
    await page.getByTestId('admin.security_advisories.nodes.bulk.confirm.confirm').click();
    await expect(page.getByTestId('admin.security_advisories.nodes.bulk')).toHaveCount(0);
    await expect.poll(() => statuses.map((status) => status.state)).toEqual(['not_affected', 'not_affected']);
    expect(mutations.some((mutation) => mutation.path.endsWith('/node_statuses/502'))).toBeTruthy();
    expect(mutations.some((mutation) => mutation.path.endsWith('/node_statuses/503'))).toBeFalsy();
    expect(mutations.filter((mutation) => mutation.method === 'PUT').map((mutation) => mutation.body)).toEqual([
      {
        node_status: {
          state: 'mitigated',
          vulnerable_until: expect.any(String),
          mitigated_since: expect.any(String),
          en_note: 'Fixed kernel installed',
          expected_state: 'draft',
          expected_content_revision: 0,
        },
      },
      {
        node_status: {
          state: 'not_affected',
          vulnerable_until: null,
          mitigated_since: null,
          expected_state: 'draft',
          expected_content_revision: 1,
        },
      },
      {
        node_status: {
          state: 'not_affected',
          vulnerable_until: null,
          mitigated_since: null,
          expected_state: 'draft',
          expected_content_revision: 2,
        },
      },
    ]);
    expect(statuses.map((status) => status.en_note)).toEqual(['Fixed kernel installed', 'Storage is not affected']);
    expect(statuses.map((status) => status.cs_note)).toEqual([null, null]);
    expect(advisory.content_revision).toBe(3);

    // Readiness now has a CVE and a resolved status for every relevant node.
    await page.getByTestId('admin.security_advisory.tab.overview').click();
    await expect(page.getByTestId('admin.security_advisory.publish')).toBeEnabled();
    await page.getByTestId('admin.security_advisory.publish').click();
    await expect(page.getByTestId('admin.security_advisory.publish_dialog')).toBeVisible();
    await page.getByTestId('admin.security_advisory.publish_dialog.send_mail').check();
    await page.getByTestId('admin.security_advisory.publish_dialog.confirm').click();
    await expect(page.getByTestId('admin.security_advisory.publish_dialog')).toHaveCount(0);
    await expect(page.getByTestId('admin.security_advisory.post_update')).toBeVisible();
    await expect(page.getByTestId('admin.security_advisory.edit')).toBeVisible();
    await expect(page.getByTestId('admin.security_advisory.publish')).toHaveCount(0);
    expect(
      mutations.find(
        (mutation) => mutation.method === 'POST' && mutation.path === '/api/v7.0/security_advisories/77/publish'
      )?.body
    ).toEqual({
      security_advisory: expect.objectContaining({
        send_mail: true,
        published_at: expect.any(String),
        expected_content_revision: 3,
      }),
    });

    // Retraction is represented by a localized advisory update and requires a
    // second explicit confirmation before the API mutation is sent.
    await page.getByTestId('admin.security_advisory.post_update').click();
    await page.getByTestId('admin.security_advisories.update.editor.state').selectOption('retracted');
    await page.getByTestId('admin.security_advisories.update.editor.en.summary').fill('Advisory retracted');
    await page
      .getByTestId('admin.security_advisories.update.editor.en.message')
      .fill('The report was based on incorrect package metadata.');
    await page.getByTestId('admin.security_advisories.update.editor.language.cs').click();
    await page.getByTestId('admin.security_advisories.update.editor.cs.summary').fill('Upozornění staženo');
    await page
      .getByTestId('admin.security_advisories.update.editor.cs.message')
      .fill('Hlašení vycházelo z chybných metadat balíčku.');
    await page.getByTestId('admin.security_advisories.update.editor.save').click();
    await expect(page.getByTestId('admin.security_advisory.update.confirm')).toBeVisible();
    await page.getByTestId('admin.security_advisory.update.confirm.confirm').click();
    await expect(page.getByTestId('admin.security_advisories.update.editor')).toHaveCount(0);
    await expect.poll(() => advisory.state).toBe('retracted');
    await expect(page.getByTestId('admin.security_advisory.post_update')).toHaveCount(0);
    await page.getByTestId('admin.security_advisory.tab.updates').click();
    await expect(page.getByTestId('admin.security_advisory.updates.post_update')).toHaveCount(0);
    await expect(page.getByText(/This advisory is retracted/)).toBeVisible();
    const postedUpdate = page.getByTestId('admin.security_advisory.update.701');
    await expect(postedUpdate).toBeVisible();
    await expect(page.getByTestId('admin.security_advisory.update.701.edit')).toBeVisible();
    await expect(page.getByTestId('admin.security_advisory.update.701.delete')).toBeVisible();
    expect(
      mutations.find(
        (mutation) => mutation.method === 'POST' && mutation.path === '/api/v7.0/security_advisory_updates'
      )?.body
    ).toEqual({
      security_advisory_update: expect.objectContaining({
        security_advisory: 77,
        state: 'retracted',
        send_mail: false,
        en_summary: 'Advisory retracted',
        cs_summary: 'Upozornění staženo',
      }),
    });

    // Link a related outage from the dedicated tab and verify the nested API
    // payload as well as the refreshed row.
    await page.getByTestId('admin.security_advisory.tab.outages').click();
    const outageInput = page.getByTestId('admin.security_advisory.outages.id');
    await outageInput.fill('321');
    await outageInput.locator('xpath=..').getByRole('button').click();
    await expect(page.getByRole('link', { name: '#321' })).toBeVisible();
    expect(
      mutations.find(
        (mutation) => mutation.method === 'POST' && mutation.path === '/api/v7.0/outage_security_advisories'
      )?.body
    ).toEqual({ outage_security_advisory: { outage: 321, security_advisory: 77 } });
  });

  test('@pr-smoke @pr-smoke-mobile keeps a rejected affected-VPS rebuild in context for retry', async ({ page }) => {
    await bootstrapVpsAdminWindow(page, { sessionToken: 'SECURITY_REBUILD_RETRY' });

    const advisory = {
      id: 77,
      state: 'draft',
      content_revision: 0,
      name: 'Linux kernel advisory',
      published_at: null,
      created_at: '2026-07-27T10:00:00.000Z',
      en_summary: 'Kernel vulnerability',
      en_description: 'Affects supported compute nodes.',
      en_response: 'Apply the fixed kernel and reboot.',
    };
    let rebuildAttempts = 0;

    await installHaveApiMock(page, {
      description: advisoryContractDescription(),
      user: { id: 1, login: 'security-admin', level: 90 },
      handlers: {
        'GET languages': () => ({ languages }),
        'GET security_advisories/77': () => ({ security_advisory: advisory }),
        'GET security_advisory_cves': () => ({ security_advisory_cves: [] }),
        'GET nodes': () => ({ nodes: [] }),
        'GET security_advisories/77/node_statuses': () => ({ node_statuses: [] }),
        'GET security_advisory_updates': () => ({ security_advisory_updates: [] }),
        'GET outage_security_advisories': () => ({ outage_security_advisories: [] }),
        'POST security_advisories/77/rebuild_affected_vps': () => {
          rebuildAttempts += 1;
          if (rebuildAttempts === 1) return failEnvelope('Affected VPS rebuild was rejected');
          return { security_advisory: {} };
        },
      },
    });

    await page.goto('/admin/security-advisories/77');
    await page.getByTestId('admin.security_advisory.rebuild').click();
    await page.getByTestId('admin.security_advisory.rebuild_dialog.confirm').click();

    await expect(page.getByTestId('admin.security_advisory.rebuild_dialog.error')).toContainText(
      'Affected VPS rebuild was rejected'
    );
    await expect(page.getByTestId('admin.security_advisory.rebuild_dialog')).toBeVisible();

    await page.getByTestId('admin.security_advisory.rebuild_dialog.confirm').click();
    await expect(page.getByTestId('admin.security_advisory.rebuild_dialog')).toHaveCount(0);
    expect(rebuildAttempts).toBe(2);
  });

  test('@pr-smoke @pr-smoke-mobile keeps rejected outage link changes in context for retry', async ({ page }) => {
    await bootstrapVpsAdminWindow(page, { sessionToken: 'SECURITY_OUTAGE_RETRY' });

    const advisory = {
      id: 77,
      state: 'draft',
      content_revision: 0,
      name: 'Linux kernel advisory',
      published_at: null,
      created_at: '2026-07-27T10:00:00.000Z',
      en_summary: 'Kernel vulnerability',
      en_description: 'Affects supported compute nodes.',
      en_response: 'Apply the fixed kernel and reboot.',
    };
    let outageLinks: Array<Record<string, unknown>> = [];
    let linkAttempts = 0;
    let unlinkAttempts = 0;

    await installHaveApiMock(page, {
      description: advisoryContractDescription(),
      user: { id: 1, login: 'security-admin', level: 90 },
      handlers: {
        'GET languages': () => ({ languages }),
        'GET security_advisories/77': () => ({ security_advisory: advisory }),
        'GET security_advisory_cves': () => ({ security_advisory_cves: [] }),
        'GET nodes': () => ({ nodes: [] }),
        'GET security_advisories/77/node_statuses': () => ({ node_statuses: [] }),
        'GET security_advisory_updates': () => ({ security_advisory_updates: [] }),
        'GET outage_security_advisories': () => ({ outage_security_advisories: outageLinks }),
        'POST outage_security_advisories': ({ reqJson }) => {
          linkAttempts += 1;
          if (linkAttempts === 1) return failEnvelope('Outage link was rejected');
          const outageId = (reqJson as any)?.outage_security_advisory?.outage;
          const link = {
            id: 801,
            security_advisory_id: 77,
            outage_id: outageId,
            outage: {
              id: outageId,
              begins_at: '2026-07-27T14:00:00.000Z',
              en_summary: 'Emergency kernel maintenance',
            },
          };
          outageLinks = [link];
          return { outage_security_advisory: link };
        },
        'DELETE outage_security_advisories/801': () => {
          unlinkAttempts += 1;
          if (unlinkAttempts === 1) return failEnvelope('Outage unlink was rejected');
          outageLinks = [];
          return { outage_security_advisory: {} };
        },
      },
    });

    await page.goto('/admin/security-advisories/77?tab=outages');
    const outageInput = page.getByTestId('admin.security_advisory.outages.id');
    await outageInput.fill('321');
    await page.getByTestId('admin.security_advisory.outages.link').click();

    await expect(page.getByTestId('admin.security_advisory.outages.link_error')).toContainText(
      'Outage link was rejected'
    );
    await expect(page.getByRole('alert').filter({ hasText: 'Outage link was rejected' })).toHaveCount(1);
    await expect(page.getByText('Outage link was rejected', { exact: true })).toHaveCount(1);
    await expect(outageInput).toHaveValue('321');

    await page.getByTestId('admin.security_advisory.outages.link').click();
    await expect(page.getByTestId('admin.security_advisory.outages.link_error')).toHaveCount(0);
    await expect(outageInput).toHaveValue('');
    await expect(page.getByRole('link', { name: '#321' })).toBeVisible();

    await page.getByTestId('admin.security_advisory.outages.unlink.801').click();
    await page.getByTestId('admin.security_advisory.outages.unlink.confirm').click();

    await expect(page.getByTestId('admin.security_advisory.outages.unlink.error')).toContainText(
      'Outage unlink was rejected'
    );
    await expect(page.getByTestId('admin.security_advisory.outages.unlink')).toBeVisible();

    await page.getByTestId('admin.security_advisory.outages.unlink.confirm').click();
    await expect(page.getByTestId('admin.security_advisory.outages.unlink')).toHaveCount(0);
    await expect(page.getByRole('link', { name: '#321' })).toHaveCount(0);
    expect(linkAttempts).toBe(2);
    expect(unlinkAttempts).toBe(2);
  });

  test('rejects a normal user before any advisory administration is rendered', async ({ page }) => {
    await bootstrapVpsAdminWindow(page, { sessionToken: 'TEST' });
    await installHaveApiMock(page, {
      description: advisoryContractDescription(),
      user: { id: 2, login: 'member', level: 1 },
      handlers: {
        'GET security_advisories': () => ({ security_advisories: [] }),
      },
    });

    await page.goto('/admin/security-advisories/77');

    await expect(page.getByTestId('auth.admin-required')).toBeVisible();
    await expect(page.getByTestId('admin.security_advisory.detail')).toHaveCount(0);
    await expect(page.getByTestId('admin.security_advisories.page')).toHaveCount(0);
  });

  test('hides advisory management from support and rejects direct route access', async ({ page }) => {
    await bootstrapVpsAdminWindow(page, { sessionToken: 'TEST' });
    await installHaveApiMock(page, {
      description: advisoryContractDescription(),
      user: { id: 3, login: 'support-agent', level: 21 },
      handlers: {
        'GET security_advisories': () => ({ security_advisories: [] }),
      },
    });

    await page.goto('/admin');
    await expect(page.getByTestId('nav.sidebar.security-advisories')).toHaveCount(0);
    await expect(page.getByTestId('nav.drawer.security-advisories')).toHaveCount(0);

    await page.goto('/admin/security-advisories/77');

    await expect(page).toHaveURL(/\/admin\/?$/);
    await expect(page.getByTestId('admin.security_advisory.detail')).toHaveCount(0);
    await expect(page.getByTestId('admin.security_advisories.page')).toHaveCount(0);
  });
});

for (const language of ['en', 'cs'] as const) {
  test(`published original corrections and lifecycle ${language}`, async ({ page }, testInfo) => {
    let advisory = {
      id: 88,
      state: 'published',
      content_revision: 5,
      name: 'Synthetic kernel advisory',
      published_at: '2026-10-15T12:34:56Z' as string | null,
      en_summary: 'Kernel security correction',
      en_description: 'Synthetic assessment for preview.',
      en_response: 'Fixed by the reviewed kernel update.',
      cs_summary: 'Bezpečnostní oprava jádra',
      cs_description: 'Testovací hodnocení pro náhled.',
      cs_response: 'Ošetřeno ověřenou aktualizací jádra.',
    };
    let deleted = false;
    const writes: Array<Record<string, unknown>> = [];
    await setUiSettingsLocalStorage(page, { language, theme: 'light' });
    await bootstrapVpsAdminWindow(page, { sessionToken: 'TEST' });
    await installHaveApiMock(page, {
      description: advisoryContractDescription(),
      user: { id: 1, login: 'synthetic-admin', level: 90 },
      handlers: {
        'GET languages': () => ({ languages }),
        'GET security_advisories/88': () => (deleted ? failEnvelope('Not found') : { security_advisory: advisory }),
        'GET security_advisories': () => ({ security_advisories: deleted ? [] : [advisory] }),
        'GET security_advisory_cves': () => ({ security_advisory_cves: [] }),
        'GET nodes': () => ({ nodes: [] }),
        'GET security_advisories/88/node_statuses': () => ({ node_statuses: [] }),
        'GET security_advisory_updates': () => ({ security_advisory_updates: [] }),
        'GET outage_security_advisories': () => ({ outage_security_advisories: [] }),
        'PUT security_advisories/88': ({ reqJson }) => {
          const attrs = (reqJson as { security_advisory: Record<string, unknown> }).security_advisory;
          writes.push(attrs);
          if (
            attrs['expected_content_revision'] !== advisory.content_revision ||
            attrs['expected_state'] !== advisory.state
          )
            return failEnvelope('Concurrent correction');
          advisory = { ...advisory, ...attrs, content_revision: advisory.content_revision + 1 };
          return { security_advisory: advisory };
        },
        'POST security_advisories/88/retract': ({ reqJson }) => {
          const attrs = (reqJson as { security_advisory: Record<string, unknown> }).security_advisory;
          expect(attrs).toEqual({ expected_content_revision: advisory.content_revision, expected_state: 'published' });
          writes.push(attrs);
          advisory = { ...advisory, state: 'retracted', content_revision: advisory.content_revision + 1 };
          return { security_advisory: advisory };
        },
        'DELETE security_advisories/88': ({ reqJson }) => {
          expect(reqJson).toEqual({
            security_advisory: { expected_content_revision: advisory.content_revision, expected_state: 'retracted' },
          });
          deleted = true;
          return { security_advisory: {} };
        },
      },
    });
    await page.goto('/admin/security-advisories/88');
    await expect(page.getByTestId('admin.security_advisory.edit')).toBeVisible();
    await expect(page.getByTestId('admin.security_advisory.publish')).toHaveCount(0);
    await expect(page.getByTestId('admin.security_advisory.readiness')).toHaveCount(0);
    await page.getByTestId('admin.security_advisory.edit').click();
    const editor = page.getByTestId('admin.security_advisories.editor');
    await expect(editor).toBeVisible();
    await expect(page.getByTestId('admin.security_advisories.editor.published_at')).not.toHaveValue('');
    const captureRoot = process.env['ADVISORY_SCREENSHOT_ROOT'];
    if (captureRoot) {
      await mkdir(captureRoot, { recursive: true });
      await page.screenshot({
        path: path.join(captureRoot, `${testInfo.project.name}-${language}-editor.png`),
        fullPage: true,
      });
      await editor.getByRole('button', { name: language === 'cs' ? 'Zrušit' : 'Cancel', exact: true }).click();
      await page.getByTestId('admin.security_advisory.delete').click();
      await expect(page.getByTestId('admin.security_advisory.lifecycle_dialog')).toBeVisible();
      await page.screenshot({
        path: path.join(captureRoot, `${testInfo.project.name}-${language}-delete.png`),
        fullPage: true,
      });
      await page.getByTestId('admin.security_advisory.lifecycle_dialog.cancel').click();
      await page.getByTestId('admin.security_advisory.edit').click();
      await expect(editor).toBeVisible();
    }
    if (process.env['ADVISORY_CAPTURE_ONLY'] === '1') return;
    await page.getByTestId('admin.security_advisories.editor.published_at').fill('');
    await page.getByTestId('admin.security_advisories.editor.save').click();
    await expect(editor).not.toBeVisible();
    expect(writes[0]).toMatchObject({ expected_content_revision: 5, expected_state: 'published', published_at: null });
    await page.getByTestId('admin.security_advisory.retract').click();
    await page.getByTestId('admin.security_advisory.lifecycle_dialog.confirm').click();
    await expect(page.getByTestId('admin.security_advisory.retract')).toHaveCount(0);
    await page.getByTestId('admin.security_advisory.delete').click();
    await expect(page.getByTestId('admin.security_advisory.lifecycle_dialog')).toContainText(
      language === 'cs' ? 'zálohu' : 'backup'
    );
    await page.getByTestId('admin.security_advisory.lifecycle_dialog.confirm').click();
    await expect(page).toHaveURL(/security-advisories$/);
  });
}

test('@o4-readiness keeps unverified publication inputs distinct from confirmed blockers and Ready', async ({
  page,
}, testInfo) => {
  await setUiSettingsLocalStorage(page, { language: 'en', theme: 'light' });
  await bootstrapVpsAdminWindow(page, { sessionToken: 'O4_READINESS' });
  let phase: 'held' | 'failed' | 'blocker' | 'ready' = 'held';
  let releaseNodes: () => void = () => {
    throw new Error('Node hold was not installed');
  };
  const nodeHold = new Promise<void>((resolve) => {
    releaseNodes = resolve;
  });
  const reads = { cves: 0, nodes: 0, statuses: 0 };
  const wire: Array<{ path: string; query: string; phase: string }> = [];
  const writes: string[] = [];
  const node = { id: 10, active: true, type: 'node', domain_name: 'synthetic-node10.test' };
  const advisory = {
    id: 77,
    state: 'draft',
    content_revision: 3,
    name: 'Synthetic readiness advisory',
    published_at: null,
    created_at: '2026-11-04T10:00:00Z',
    en_summary: 'Synthetic kernel assessment',
    en_description: 'Synthetic advisory description.',
    en_response: 'Review the node assessment.',
    cs_summary: 'Testovací hodnocení jádra',
    cs_description: 'Testovací popis upozornění.',
    cs_response: 'Zkontroluj hodnocení nodu.',
    affected_node_count: 1,
    affected_user_count: 2,
    affected_vps_count: 3,
  };
  await installHaveApiMock(page, {
    description: advisoryContractDescription(),
    user: { id: 1, login: 'synthetic-security-admin', level: 90 },
    handlers: {
      'GET languages': () => ({ languages }),
      'GET security_advisories/77': () => ({ security_advisory: advisory }),
      'GET security_advisory_cves': ({ relPath, searchParams }) => {
        reads.cves += 1;
        wire.push({ path: String(relPath), query: searchParams.toString(), phase });
        return { security_advisory_cves: [{ id: 901, security_advisory: { id: 77 }, cve_id: 'CVE-2026-12345' }] };
      },
      'GET nodes': async ({ relPath, searchParams }) => {
        reads.nodes += 1;
        wire.push({ path: String(relPath), query: searchParams.toString(), phase });
        if (phase === 'held') await nodeHold;
        if (phase === 'failed') return jsonFulfill(failEnvelope('Synthetic node inventory unavailable'), 503);
        return { nodes: [node] };
      },
      'GET security_advisories/77/node_statuses': ({ relPath, searchParams }) => {
        reads.statuses += 1;
        wire.push({ path: String(relPath), query: searchParams.toString(), phase });
        return {
          node_statuses: [
            {
              id: 501,
              security_advisory: { id: 77 },
              node,
              state: phase === 'blocker' ? 'unknown' : 'not_affected',
              vulnerable_until: null,
              mitigated_since: null,
            },
          ],
        };
      },
      'GET security_advisory_updates': () => ({ security_advisory_updates: [] }),
      'GET outage_security_advisories': () => ({ outage_security_advisories: [] }),
    },
  });
  page.on('request', (request) => {
    const url = new URL(request.url());
    if (
      ['POST', 'PUT', 'DELETE'].includes(request.method()) &&
      /\/api\/v7\.0\/(security_advisories|security_advisory_cves|security_advisory_updates)(\/|$)/.test(url.pathname)
    )
      writes.push(`${request.method()} ${url.pathname}`);
  });
  await page.goto('/admin/security-advisories/77');
  const readiness = page.getByTestId('admin.security_advisory.readiness');
  const publish = page.getByTestId('admin.security_advisory.publish');
  await expect(readiness).toBeVisible();
  await expect.poll(() => reads).toEqual({ cves: 1, nodes: 1, statuses: 1 });
  await expect(publish).toBeDisabled();
  const pendingText = await readiness.innerText();
  await page.screenshot({ path: testInfo.outputPath('advisory-readiness-pending.png'), fullPage: true, scale: 'css' });

  phase = 'failed';
  releaseNodes();
  await expect.poll(() => reads.nodes).toBe(2);
  await expect(page.getByText('Synthetic node inventory unavailable', { exact: true })).toBeVisible();
  await expect(publish).toBeDisabled();
  const failedText = await readiness.innerText();
  await page.screenshot({
    path: testInfo.outputPath('advisory-readiness-unavailable.png'),
    fullPage: true,
    scale: 'css',
  });

  phase = 'blocker';
  await page.reload();
  await expect(readiness).toContainText('Resolve the status of node synthetic-node10.test');
  await expect(publish).toBeDisabled();
  await page.screenshot({
    path: testInfo.outputPath('advisory-readiness-confirmed-blocker.png'),
    fullPage: true,
    scale: 'css',
  });
  phase = 'ready';
  await page.reload();
  await expect(readiness).toContainText('Ready to publish');
  await expect(publish).toBeEnabled();
  await page.screenshot({ path: testInfo.outputPath('advisory-readiness-verified.png'), fullPage: true, scale: 'css' });
  expect(writes).toEqual([]);
  await testInfo.attach('advisory-readiness-wire-and-observed-states', {
    body: JSON.stringify({ reads, wire, writes, pendingText, failedText }, null, 2),
    contentType: 'application/json',
  });
  expect(pendingText).toContain('Loading');
  expect(pendingText).not.toContain('Ready to publish');
  expect(failedText).toContain('Publication checks could not be loaded');
  expect(failedText).not.toContain('Ready to publish');
});

test('@o4-child-reads keeps a failed list CVE read scoped and opens the real affected tab', async ({
  page,
}, testInfo) => {
  await setUiSettingsLocalStorage(page, { language: 'en', theme: 'light' });
  await bootstrapVpsAdminWindow(page, { sessionToken: 'O4_ADVISORY_CHILD_READS' });
  let rejectCves = true;
  let rejectedCveReads = 0;
  const wire: Array<{ path: string; query: string; rejected: boolean }> = [];
  const writes: string[] = [];
  const advisory = {
    id: 77,
    state: 'published',
    content_revision: 4,
    name: 'Synthetic affected advisory',
    published_at: '2026-11-04T10:00:00Z',
    en_summary: 'Retained summary with a failed CVE read',
    en_description: 'Synthetic description.',
    en_response: 'Review affected VPSes.',
    affected_node_count: 1,
    affected_user_count: 1,
    affected_vps_count: 1,
    cves: [{ id: 901, cve_id: 'CVE-2026-12345' }],
  };
  await installHaveApiMock(page, {
    description: advisoryContractDescription(),
    user: { id: 1, login: 'synthetic-security-admin', level: 90 },
    handlers: {
      'GET languages': () => ({ languages }),
      'GET security_advisories': () => ({
        security_advisories: [advisory, { ...advisory, id: 88, name: 'Usable sibling advisory', cves: [] }],
      }),
      'GET security_advisories/77': () => ({ security_advisory: advisory }),
      'GET security_advisory_cves': ({ relPath, searchParams }) => {
        const id = Number(searchParams.get('security_advisory_cve[security_advisory]'));
        expect([77, 88]).toContain(id);
        const rejected = id === 77 && rejectCves;
        wire.push({ path: String(relPath), query: searchParams.toString(), rejected });
        if (rejected) {
          rejectedCveReads += 1;
          return jsonFulfill(failEnvelope('Synthetic advisory CVE read rejected'), 503);
        }
        return {
          security_advisory_cves: [
            {
              id: id === 77 ? 901 : 902,
              security_advisory: { id },
              cve_id: id === 77 ? 'CVE-2026-12345' : 'CVE-2026-23456',
            },
          ],
        };
      },
      'GET nodes': () => ({ nodes: [] }),
      'GET security_advisories/77/node_statuses': () => ({ node_statuses: [] }),
      'GET security_advisory_updates': () => ({ security_advisory_updates: [] }),
      'GET outage_security_advisories': () => ({ outage_security_advisories: [] }),
      'GET user_security_advisories': ({ relPath, searchParams }) => {
        wire.push({ path: String(relPath), query: searchParams.toString(), rejected: false });
        return {
          user_security_advisories: [
            { id: 301, security_advisory: { id: 77 }, user: { id: 5, login: 'synthetic-member' }, vps_count: 1 },
          ],
        };
      },
      'GET vps_security_advisories': ({ relPath, searchParams }) => {
        wire.push({ path: String(relPath), query: searchParams.toString(), rejected: false });
        return {
          vps_security_advisories: [
            {
              id: 401,
              security_advisory: { id: 77 },
              user: { id: 5, login: 'synthetic-member' },
              vps: { id: 55, hostname: 'synthetic-vps.test' },
              node: { id: 10, domain_name: 'synthetic-node10.test' },
              node_state: 'mitigated',
              vulnerable_until: '2026-11-04T09:00:00Z',
              mitigated_since: null,
            },
          ],
        };
      },
    },
  });
  page.on('request', (request) => {
    const url = new URL(request.url());
    if (
      ['POST', 'PUT', 'DELETE'].includes(request.method()) &&
      /\/api\/v7\.0\/(security_advisories|security_advisory_cves|security_advisory_updates)(\/|$)/.test(url.pathname)
    )
      writes.push(`${request.method()} ${url.pathname}`);
  });
  await page.goto('/admin/security-advisories');
  const failedRow = page.getByTestId('admin.security_advisories.row.77');
  const sibling = page.getByTestId('admin.security_advisories.row.88');
  await expect.poll(() => rejectedCveReads).toBe(2);
  await expect(sibling).toContainText('CVE-2026-23456');
  await expect(sibling.getByRole('link', { name: 'Open', exact: true })).toHaveAttribute(
    'href',
    '/admin/security-advisories/88'
  );
  await expect(failedRow).toContainText('Retained summary with a failed CVE read');
  const failedRowText = await failedRow.innerText();
  const rowRetryVisible = await failedRow.getByRole('button', { name: 'Retry', exact: true }).isVisible();
  await page.screenshot({
    path: testInfo.outputPath('advisory-list-cve-unavailable.png'),
    fullPage: true,
    scale: 'css',
  });
  const siblingReads = wire.filter(
    (read) => new URLSearchParams(read.query).get('security_advisory_cve[security_advisory]') === '88'
  ).length;
  rejectCves = false;
  const retry = failedRow.getByRole('button', { name: 'Retry', exact: true });
  await expect(retry).toBeVisible();
  await retry.click();
  await expect(retry).toHaveCount(0);
  await expect(failedRow.getByText('Loading…', { exact: true })).toHaveCount(0);
  await expect(failedRow).toContainText('CVE-2026-12345');
  expect(
    wire.filter((read) => new URLSearchParams(read.query).get('security_advisory_cve[security_advisory]') === '88')
  ).toHaveLength(siblingReads);
  await failedRow.getByRole('link', { name: 'Synthetic affected advisory', exact: true }).click();
  await page.getByTestId('admin.security_advisory.tab.affected').click();
  await expect(page.getByRole('link', { name: 'synthetic-vps.test', exact: true })).toHaveAttribute(
    'href',
    '/admin/vps/55'
  );
  await expect(page.getByRole('link', { name: 'Open', exact: true })).toHaveAttribute('href', '/admin/users/5');
  await expect(page.getByText('synthetic-node10.test', { exact: true })).toBeVisible();
  await expect(page.getByText('Mitigated', { exact: true })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('advisory-affected-real-tab.png'), fullPage: true, scale: 'css' });
  expect(writes).toEqual([]);
  await testInfo.attach('advisory-child-read-wire-and-observed-row', {
    body: JSON.stringify({ wire, rejectedCveReads, writes, failedRowText, rowRetryVisible }, null, 2),
    contentType: 'application/json',
  });
  expect(failedRowText).toContain('Synthetic advisory CVE read rejected');
  expect(rowRetryVisible, 'The failed row offers its existing query Retry').toBe(true);
});
