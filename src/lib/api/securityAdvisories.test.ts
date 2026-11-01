import { describe, expect, it, vi } from 'vitest';
import { apiWire } from '../../test/haveapiXhr';
import {
  updateSecurityAdvisory,
  publishSecurityAdvisory,
  deleteSecurityAdvisory,
  retractSecurityAdvisory,
  createSecurityAdvisoryCve,
  deleteSecurityAdvisoryCve,
} from './securityAdvisories';
import { requireAdvisoryActions, type AdvisoryAction } from './securityAdvisoryMutations';

const guards = { expected_state: 'published' as const, expected_content_revision: 7 };
const parameter = {
  type: 'String',
  validators: { include: { values: { draft: 'Draft', published: 'Published', retracted: 'Retracted' } } },
};
function metadata(state: unknown = parameter) {
  const action = { input: { parameters: { expected_state: state, expected_content_revision: { type: 'Integer' } } } };
  return {
    meta: { namespace: '_meta' },
    authentication: { token: { http_header: 'X-HaveAPI-Auth-Token' } },
    resources: {
      security_advisory: {
        actions: {
          create: { input: { parameters: {} } },
          update: action,
          publish: action,
          retract: action,
          delete: action,
        },
        resources: { node_status: { actions: { create: action, update: action, delete: action } } },
      },
      security_advisory_cve: { actions: { create: action, update: action, delete: action } },
    },
  };
}
function reply(response: unknown) {
  apiWire.respond = vi.fn(async () => ({
    ok: true,
    json: async () => ({ status: true, response }),
  })) as typeof apiWire.respond;
}
describe('guarded advisory adapter wire contract', () => {
  it('namespaces DELETE bodies and retains exact mutation guards', async () => {
    reply({ security_advisory: {} });
    await deleteSecurityAdvisory(4, guards);
    const request = apiWire.requests.at(-1)!;
    expect(request.method).toBe('DELETE');
    expect(JSON.parse(String(request.body))).toEqual({ security_advisory: guards });
    reply({ security_advisory_cve: {} });
    await deleteSecurityAdvisoryCve(5, guards);
    expect(JSON.parse(String(apiWire.requests.at(-1)!.body))).toEqual({ security_advisory_cve: guards });
  });
  it('sends parent, CVE, retract and publish preconditions with exact payloads', async () => {
    reply({ security_advisory: { id: 4 } });
    await updateSecurityAdvisory(4, { ...guards, published_at: null, en_summary: 'Correction' });
    expect(JSON.parse(String(apiWire.requests.at(-1)!.body))).toEqual({
      security_advisory: { ...guards, published_at: null, en_summary: 'Correction' },
    });
    reply({ security_advisory_cve: { id: 5 } });
    await createSecurityAdvisoryCve({ ...guards, security_advisory: 4, cve_id: 'CVE-2026-1234' });
    expect(JSON.parse(String(apiWire.requests.at(-1)!.body))).toEqual({
      security_advisory_cve: { ...guards, security_advisory: 4, cve_id: 'CVE-2026-1234' },
    });
    reply({ security_advisory: { id: 4 } });
    await retractSecurityAdvisory(4, guards);
    expect(apiWire.requests.at(-1)!.url).toContain('/security_advisories/4/retract');
    await publishSecurityAdvisory(4, { expected_content_revision: 7, send_mail: false });
    expect(JSON.parse(String(apiWire.requests.at(-1)!.body))).toEqual({
      security_advisory: { expected_content_revision: 7, send_mail: false },
    });
  });
  it('accepts real labeled choices and never uses anonymous capability cache', async () => {
    reply(metadata());
    await requireAdvisoryActions([{ resource: 'advisory', action: 'update' }], guards);
    expect(apiWire.requests.at(-1)!.method).toBe('OPTIONS');
  });
  it.each([
    {},
    { type: 'String', validators: { include: { values: { published: null } } } },
    { type: 'String', validators: { include: { values: { draft: 'Draft' } } } },
  ])('refuses malformed or missing selected state before any write', async (state) => {
    reply(metadata(state));
    const before = apiWire.requests.length;
    await expect(requireAdvisoryActions([{ resource: 'advisory', action: 'update' }], guards)).rejects.toThrow(
      'guarded advisory'
    );
    expect(apiWire.requests.slice(before).every((request) => request.method === 'OPTIONS')).toBe(true);
  });
});

const childActions: AdvisoryAction[] = (['cve', 'node_status'] as const).flatMap((resource) =>
  (['create', 'update', 'delete'] as const).map((action) => ({ resource, action }))
);

it.each(childActions)('requires every guarded draft child action: %o', async (target) => {
  for (const invalid of ['missing_action', 'revision', 'state', 'choice'] as const) {
    const description = metadata();
    const actions =
      target.resource === 'cve'
        ? description.resources.security_advisory_cve.actions
        : description.resources.security_advisory.resources.node_status.actions;
    // Build malformed live metadata as unknown JSON, without weakening production types.
    const altered: Record<string, unknown> = { ...actions };
    altered[target.action] =
      invalid === 'missing_action'
        ? undefined
        : {
            input: {
              parameters: {
                expected_content_revision: invalid === 'revision' ? undefined : { type: 'Integer' },
                expected_state:
                  invalid === 'state'
                    ? undefined
                    : invalid === 'choice'
                      ? { type: 'String', validators: { include: { values: { published: 'Published' } } } }
                      : parameter,
              },
            },
          };
    const resources =
      target.resource === 'cve'
        ? { ...description.resources, security_advisory_cve: { actions: altered } }
        : {
            ...description.resources,
            security_advisory: {
              ...description.resources.security_advisory,
              resources: { node_status: { actions: altered } },
            },
          };
    reply({ ...description, resources });
    const before = apiWire.requests.length;
    await expect(
      requireAdvisoryActions([{ resource: 'advisory', action: 'update' }], {
        expected_content_revision: 0,
        expected_state: 'draft',
      })
    ).rejects.toThrow('guarded advisory');
    expect(apiWire.requests.slice(before).every((request) => request.method === 'OPTIONS')).toBe(true);
  }
});

it('accepts array state choices and preflights concrete generated lifecycle descriptions', async () => {
  const root = metadata({ type: 'String', validators: { include: { values: ['draft', 'published', 'retracted'] } } });
  reply(root);
  await requireAdvisoryActions(
    [
      { resource: 'advisory', action: 'retract', id: 4 },
      { resource: 'advisory', action: 'delete', id: 4 },
    ],
    guards
  );
  const last = apiWire.requests.slice(-3);
  expect(last.map((request) => request.method)).toEqual(['OPTIONS', 'OPTIONS', 'OPTIONS']);
  expect(last[1]?.url).toContain('/security_advisories/4/retract?method=POST');
  expect(last[2]?.url).toContain('/security_advisories/4?method=DELETE');
});

it('denies the old backend before any mutation and retains concrete authorization failures', async () => {
  reply({ resources: {} });
  const before = apiWire.requests.length;
  await expect(requireAdvisoryActions([{ resource: 'advisory', action: 'create' }])).rejects.toThrow(
    'guarded advisory'
  );
  expect(apiWire.requests.slice(before).every((request) => request.method === 'OPTIONS')).toBe(true);
  let calls = 0;
  apiWire.respond = vi.fn(async () =>
    ++calls === 1
      ? { ok: true, json: async () => ({ status: true, response: metadata() }) }
      : { ok: false, status: 403, json: async () => ({ status: false, message: 'Denied' }) }
  ) as typeof apiWire.respond;
  await expect(requireAdvisoryActions([{ resource: 'advisory', action: 'delete', id: 4 }], guards)).rejects.toThrow();
  expect(calls).toBe(2);
  expect(apiWire.requests.slice(before).every((request) => request.method === 'OPTIONS')).toBe(true);
});
