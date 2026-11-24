import type { Page } from '@playwright/test';
import { bootstrapVpsAdminWindow } from './bootstrap';
import { defaultHaveApiDescription, installHaveApiMock } from './haveapi';
import { setUiSettingsLocalStorage } from './uiSettings';
import { evaluationFixture, exposureFixture } from '../../src/test/adminIncidentFixtures';

const parameters = (keys: string[]) => Object.fromEntries(keys.map((key) => [key, {}]));
const common = ['offset', 'limit', 'as_of', 'policy_key', 'direction'];
export async function installAdminIncidentFixture(page: Page, language: 'en' | 'cs', level = 90, supported = true) {
  const action = (history: boolean) => ({
    method: 'GET',
    input: {
      parameters: parameters([
        ...common,
        ...(history
          ? ['vps_id', 'user_id', 'scope', 'from', 'to', 'decision', 'action_kind', 'action_state', 'mail_state']
          : ['vps', 'user', 'node', 'status', 'effective_mode', 'stop_enforced', 'sort']),
      ]),
    },
    output: {
      layout: 'object_list',
      parameters: parameters(Object.keys(history ? evaluationFixture() : exposureFixture())),
    },
    meta: {
      global: {
        output: {
          parameters: parameters([
            'total_count',
            'offset',
            'limit',
            'next_offset',
            'as_of',
            'read_at',
            ...(history ? ['from', 'to'] : []),
          ]),
        },
      },
    },
  });
  const description = {
    ...defaultHaveApiDescription(),
    resources:
      supported && level === 90
        ? {
            incident_policy_exposure: { actions: { index: action(false) } },
            incident_policy_evaluation: { actions: { index: action(true) } },
          }
        : {},
  };
  await bootstrapVpsAdminWindow(page, { sessionToken: 'TEST', description });
  await setUiSettingsLocalStorage(page, { language, theme: 'dark' });
  const overviewQueries: Record<string, unknown>[] = [];
  const historyQueries: Record<string, unknown>[] = [];
  const input = (params: Record<string, unknown>, namespace: string) =>
    Object.fromEntries(
      Object.entries(params).flatMap(([key, value]) =>
        key.startsWith(`${namespace}[`) && key.endsWith(']') ? [[key.slice(namespace.length + 1, -1), value]] : []
      )
    );
  let cutoffs = 0;
  const rows = Array.from({ length: 26 }, (_, index) =>
    exposureFixture({
      id: `${index < 2 ? 12 : index + 20}:policy-${index}`,
      vps: { id: index < 2 ? 12 : index + 20, hostname: `synthetic-${index}.example.test` },
      policy_key: `policy-${index}`,
      label: `SYNTHETIC policy ${index + 1}`,
      ...(index === 1 ? { count_7d: 3, warning_remaining: 0, status: 'warning' } : {}),
    })
  );
  const saved = [
    evaluationFixture({
      id: 81,
      policy_key: 'policy-0',
      label: 'SYNTHETIC policy 1',
      decision: 'stop',
      action_kind: 'stop',
      physical_stop_action_id: 95,
      stop_completed_at: '2026-11-24T09:00:00Z',
      mail_state: 'failed',
    }),
    evaluationFixture({
      id: 80,
      policy_key: 'policy-1',
      label: 'SYNTHETIC policy 2',
      decision: 'stop',
      action_kind: 'stop',
      physical_stop_action_id: 95,
      stop_completed_at: '2026-11-24T09:00:00Z',
      mail_state: 'sent',
    }),
    evaluationFixture({
      id: 79,
      label: 'SYNTHETIC retired policy',
      vps_id: null,
      hostname: null,
      user_id: 9,
      user_login: null,
    }),
  ];
  const meta = (params: Record<string, unknown>, total: number, count: number) => {
    const offset = Number(params['offset'] ?? 0),
      limit = Number(params['limit'] ?? 25);
    return {
      offset,
      limit,
      total_count: total,
      next_offset: offset + count < total ? offset + count : null,
      as_of: String(params['as_of'] ?? new Date(Date.UTC(2026, 10, 24, 10, 0, cutoffs++)).toISOString()),
      read_at: '2026-11-24T10:01:00Z',
    };
  };
  await installHaveApiMock(page, {
    description,
    user: { id: 7, login: 'synthetic-admin', level },
    handlers: {
      'GET incident_policy_exposures': (ctx) => {
        const params = input(ctx.params, 'incident_policy_exposure');
        overviewQueries.push(params);
        const all = rows.filter((row) => !params['vps'] || row.vps.id === Number(params['vps']));
        const offset = Number(params['offset'] ?? 0),
          limit = Number(params['limit'] ?? 25);
        const selected = all.slice(offset, offset + limit);
        return { incident_policy_exposures: selected, _meta: meta(params, all.length, selected.length) };
      },
      'GET incident_policy_evaluations': (ctx) => {
        const params = input(ctx.params, 'incident_policy_evaluation');
        historyQueries.push(params);
        const outstanding = params['scope'] === 'outstanding';
        const selected = outstanding
          ? [
              evaluationFixture({
                id: 50,
                evaluated_at: '2026-09-01T10:00:00Z',
                action_state: 'uncertain',
                mail_state: 'uncertain',
              }),
            ]
          : saved;
        return {
          incident_policy_evaluations: selected,
          _meta: {
            ...meta(params, selected.length, selected.length),
            from: outstanding ? null : '2026-10-25T10:00:00Z',
            to: outstanding ? null : '2026-11-24T10:00:00Z',
          },
        };
      },
      'GET incident_reports': () => ({ incident_reports: [] }),
    },
  });
  return { overviewQueries, historyQueries };
}
