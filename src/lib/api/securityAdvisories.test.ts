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
import { requireAdvisoryActions } from './securityAdvisoryMutations';

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
        actions: { update: action },
        resources: { node_status: { actions: { create: action, update: action, delete: action } } },
      },
      security_advisory_cve: { actions: { create: action, delete: action } },
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
    reply(null);
    await deleteSecurityAdvisory(4, guards);
    const request = apiWire.requests.at(-1)!;
    expect(request.method).toBe('DELETE');
    expect(JSON.parse(String(request.body))).toEqual({ security_advisory: guards });
    await deleteSecurityAdvisoryCve(5, guards);
    expect(JSON.parse(String(apiWire.requests.at(-1)!.body))).toEqual({ security_advisory_cve: guards });
  });
  it('sends parent, CVE, retract and publish preconditions with exact payloads', async () => {
    reply({ security_advisory: { id: 4 } });
    await updateSecurityAdvisory(4, { ...guards, published_at: null, en_summary: 'Correction' });
    expect(JSON.parse(String(apiWire.requests.at(-1)!.body))).toEqual({
      security_advisory: { ...guards, published_at: null, en_summary: 'Correction' },
    });
    await createSecurityAdvisoryCve({ ...guards, security_advisory: 4, cve_id: 'CVE-2026-1234' });
    expect(JSON.parse(String(apiWire.requests.at(-1)!.body))).toEqual({
      security_advisory_cve: { ...guards, security_advisory: 4, cve_id: 'CVE-2026-1234' },
    });
    await retractSecurityAdvisory(4, guards);
    expect(apiWire.requests.at(-1)!.url).toContain('/security_advisories/4/retract');
    await publishSecurityAdvisory(4, { expected_content_revision: 7, send_mail: false });
    expect(JSON.parse(String(apiWire.requests.at(-1)!.body))).toEqual({
      security_advisory: { expected_content_revision: 7, send_mail: false },
    });
  });
  it('accepts real labeled choices and never uses anonymous capability cache', async () => {
    reply(metadata());
    await requireAdvisoryActions([{ path: '/security_advisories/4', method: 'PUT' }], guards);
    expect(apiWire.requests.at(-1)!.method).toBe('OPTIONS');
  });
  it.each([
    {},
    { type: 'String', validators: { include: { values: { published: null } } } },
    { type: 'String', validators: { include: { values: { draft: 'Draft' } } } },
  ])('refuses malformed or missing selected state before any write', async (state) => {
    reply(metadata(state));
    const before = apiWire.requests.length;
    await expect(requireAdvisoryActions([{ path: '/security_advisories/4', method: 'PUT' }], guards)).rejects.toThrow(
      'guarded advisory'
    );
    expect(apiWire.requests.slice(before).every((request) => request.method === 'OPTIONS')).toBe(true);
  });
});
