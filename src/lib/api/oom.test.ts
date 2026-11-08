import { beforeEach } from 'vitest';
import { apiWire } from '../../test/haveapiXhr';
import { describe, expect, test, vi } from 'vitest';

import { fetchOomReports, fetchOomReportTasks } from './oom';

function mockFetchOk(response: any) {
  return vi.fn().mockResolvedValue({ ok: true, json: async () => ({ status: true, response }) });
}

function lastFetchCall() {
  const calls = (apiWire.respond as any).mock.calls;
  return calls[calls.length - 1] as [string, RequestInit?];
}

describe('oom API wrappers', () => {
  test('fetchOomReportTasks forwards the supported bounded page and cursor to the report task resource', async () => {
    apiWire.respond = mockFetchOk({ tasks: [{ id: 1001, name: 'last-process', rss: null }] });
    const result = await fetchOomReportTasks(77, { limit: 101, fromId: 1000 });
    const url = new URL(lastFetchCall()[0]);
    expect(url.pathname).toBe('/v7.0/oom_reports/77/tasks');
    expect(url.searchParams.get('task[limit]')).toBe('101');
    expect(url.searchParams.get('task[from_id]')).toBe('1000');
    expect(result.data).toEqual([{ id: 1001, name: 'last-process', rss: null }]);
  });

  test('fetchOomReports forwards only supported filter params', async () => {
    apiWire.respond = mockFetchOk({ oom_reports: [], _meta: { total_count: 0 } }) as any;

    await fetchOomReports({
      limit: 50,
      fromId: 999,
      vpsId: 7,
      userId: 42,
      nodeId: 3,
      locationId: 4,
      environmentId: 5,
      ruleId: 6,
      cgroup: '/user.slice/demo',
      sinceIso: '2026-03-01T00:00:00Z',
      untilIso: '2026-03-02T00:00:00Z',
      includes: 'vps__node,vps__user,oom_report_rule',
    });

    const [url] = lastFetchCall();
    const u = new URL(url);

    expect(u.pathname).toBe('/v7.0/oom_reports');
    expect(u.searchParams.get('oom_report[limit]')).toBe('50');
    expect(u.searchParams.get('oom_report[from_id]')).toBe('999');
    expect(u.searchParams.get('oom_report[q]')).toBeNull();
    expect(u.searchParams.get('oom_report[vps]')).toBe('7');
    expect(u.searchParams.get('oom_report[user]')).toBe('42');
    expect(u.searchParams.get('oom_report[node]')).toBe('3');
    expect(u.searchParams.get('oom_report[location]')).toBe('4');
    expect(u.searchParams.get('oom_report[environment]')).toBe('5');
    expect(u.searchParams.get('oom_report[oom_report_rule]')).toBe('6');
    expect(u.searchParams.get('oom_report[cgroup]')).toBe('/user.slice/demo');
    expect(u.searchParams.get('oom_report[since]')).toBe('2026-03-01T00:00:00Z');
    expect(u.searchParams.get('oom_report[until]')).toBe('2026-03-02T00:00:00Z');
    expect(u.searchParams.get('_meta[includes]')).toBe('vps__node,vps__user,oom_report_rule');
    for (const unsupported of ['q', 'query', 'search', 'text', 'process']) {
      expect(u.searchParams.get(`oom_report[${unsupported}]`)).toBeNull();
    }
  });
});

beforeEach(() => {
  window.vpsAdmin = {
    api: { url: 'https://api.example.test', version: 'v7.0' },
    sessionToken: 'test-token',
    description: { meta: { namespace: '_meta' }, authentication: { token: { http_header: 'X-Auth-Token' } } },
  };
});
