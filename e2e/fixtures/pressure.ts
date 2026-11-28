import type { Page } from '@playwright/test';
import { bootstrapVpsAdminWindow } from './bootstrap';
import { defaultHaveApiDescription, installHaveApiMock } from './haveapi';
import { setUiSettingsLocalStorage } from './uiSettings';
import {
  pressureDescription,
  pressureHistoryFixture,
  pressureReadMeta,
  pressureRowFixture,
} from '../../src/test/pressureFixtures';

/** Isolated intercepted API data; no deployed API or persistent guest is used. */
export async function installPressureFixture(page: Page, language: 'en' | 'cs') {
  const description = { ...defaultHaveApiDescription(), resources: pressureDescription().resources };
  await bootstrapVpsAdminWindow(page, { sessionToken: 'TEST', description });
  await setUiSettingsLocalStorage(page, { language, theme: 'dark' });
  const rootQueries: Record<string, unknown>[] = [];
  const historyQueries: Record<string, unknown>[] = [];
  const pressureMethods: string[] = [];
  const input = (params: Record<string, unknown>, namespace: string) =>
    Object.fromEntries(
      Object.entries(params).flatMap(([key, value]) =>
        key.startsWith(`${namespace}[`) && key.endsWith(']') ? [[key.slice(namespace.length + 1, -1), value]] : []
      )
    );
  const rows = Array.from({ length: 26 }, (_, index) => ({
    ...pressureRowFixture(12 + index, index === 25 ? 8 : 4),
    credit_us: 70_000_125 - index * 1_000_000,
    node: { id: index % 2 ? 6 : 5, domain_name: `node${index % 2 ? 6 : 5}.example.test` },
  }));
  await installHaveApiMock(page, {
    description,
    user: { id: 4, login: 'user4', level: 90, time_zone: 'America/New_York' },
    handlers: {
      'GET vps_evidence': (ctx) => {
        pressureMethods.push(ctx.method);
        const params = input(ctx.params, 'vps_evidence');
        rootQueries.push(params);
        const all = rows.filter(
          (row) =>
            (!params['user'] || row.user.id === Number(params['user'])) &&
            (!params['vps'] || row.vps.id === Number(params['vps'])) &&
            (!params['node'] || row.node.id === Number(params['node'])) &&
            (!params['location'] || Number(params['location']) === 3) &&
            (!params['environment'] || Number(params['environment']) === 1)
        );
        const offset = Number(params['offset'] ?? 0),
          limit = Number(params['limit'] ?? 25);
        const selected = all.slice(offset, offset + limit);
        return {
          vps_evidence: selected,
          _meta: {
            ...pressureReadMeta,
            offset,
            limit,
            total_count: all.length,
            next_offset: offset + selected.length < all.length ? offset + selected.length : null,
          },
        };
      },
      'GET vpses/12': () => ({
        vps: {
          id: 12,
          hostname: 'pressure-12.example.test',
          user: { id: 4, login: 'user4' },
          node: { id: 5 },
          object_state: 'active',
          is_running: true,
          memory: 2048,
          incident_accounting_since: null,
        },
      }),
      'GET vpses/37': () => ({
        vps: {
          id: 37,
          hostname: 'pressure-37.example.test',
          user: { id: 8, login: 'user8' },
          node: { id: 5 },
          object_state: 'active',
          is_running: true,
          memory: 2048,
          incident_accounting_since: null,
        },
      }),
      'GET vpses/12/evidence': (ctx) => {
        pressureMethods.push(ctx.method);
        return { evidence: [{ ...pressureRowFixture(), credit_us: 125 }], _meta: pressureReadMeta };
      },
      'GET vps_pressure_history': (ctx) => {
        pressureMethods.push(ctx.method);
        const params = input(ctx.params, 'vps_pressure_history');
        historyQueries.push(params);
        const result = pressureHistoryFixture(Number(params['days']) === 30 ? 30 : 7);
        return { vps_pressure_history: result.data, _meta: result.meta };
      },
      'GET vpses/37/evidence': (ctx) => {
        pressureMethods.push(ctx.method);
        return { evidence: [pressureRowFixture(37, 8)], _meta: pressureReadMeta };
      },
      'GET ip_addresses': () => ({ ip_addresses: [] }),
      'GET incident_reports': () => ({ incident_reports: [] }),
    },
  });
  return { rootQueries, historyQueries, pressureMethods };
}
