import { describe, expect, test, vi } from 'vitest';
import { apiWire } from '../../test/haveapiXhr';
import { applyOutageSystems, createOutageEntity, createOutageWithSystems, OutageScopeReadError } from './outages';

function mockFetchOk(response: unknown) {
  return vi.fn(async () => ({ status: 200, json: async () => ({ status: true, response }) }));
}
function scopeResponse(key: 'entities' | 'handlers', rows: unknown[]) {
  return { [key]: rows, _meta: { total_count: rows.length } };
}

describe('generated outage mutation boundaries', () => {
  test('keeps Cluster scope ID omitted on the wire', async () => {
    apiWire.respond = mockFetchOk({ entity: { id: 1, name: 'Cluster', entity_id: null } });
    await createOutageEntity(7, { name: 'Cluster' });
    expect(JSON.parse(apiWire.requests.at(-1)!.body!)).toEqual({ entity: { name: 'Cluster' } });
  });
  test('requires actual admin handler user identity before any scope writes', async () => {
    apiWire.respond = vi.fn(async (url) => ({
      status: 200,
      json: async () => ({
        status: true,
        response: new URL(url).pathname.endsWith('/entities')
          ? scopeResponse('entities', [])
          : scopeResponse('handlers', [{ id: 2, user_id: 42 }]),
      }),
    }));
    await expect(applyOutageSystems(7, { entities: [], handlers: [] })).rejects.toBeInstanceOf(OutageScopeReadError);
    expect(apiWire.requests.every((request) => request.method === 'GET')).toBe(true);
  });
  test('keeps malformed accepted root creation ambiguous with its original receipt', async () => {
    apiWire.respond = mockFetchOk({ outage: { id: null } });
    const error: unknown = await createOutageWithSystems(
      {
        begins_at: '2026-05-28T10:00:00.000Z',
        duration: 30,
        type: 'planned_outage',
        impact: 'network',
        en_summary: 'Maintenance',
        cs_summary: 'Udrzba',
      },
      { entities: [], handlers: [] }
    ).catch((cause: unknown) => cause);
    expect(error).toMatchObject({
      name: 'OutageCreateIndeterminateError',
      originalError: { name: 'ApiOutputError', result: { data: { id: null }, httpStatus: 200 } },
    });
    expect(apiWire.requests).toHaveLength(1);
  });
  test('does not classify generated input failure as an uncertain root write', async () => {
    const error: unknown = await createOutageWithSystems(
      // @ts-expect-error The negative case also verifies pre-dispatch runtime validation.
      { type: 'planned_outage' },
      { entities: [], handlers: [] }
    ).catch((cause: unknown) => cause);
    expect(error).toMatchObject({ name: 'ClientInputError', phase: 'pre-dispatch' });
    expect(apiWire.requests).toHaveLength(0);
  });
});
