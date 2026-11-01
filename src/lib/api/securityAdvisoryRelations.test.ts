import { expect, it, vi } from 'vitest';
import { apiWire } from '../../test/haveapiXhr';
import {
  createSecurityAdvisoryNodeStatus,
  updateSecurityAdvisoryNodeStatus,
  deleteSecurityAdvisoryNodeStatus,
} from './securityAdvisoryRelations';
it('uses localized notes and namespaced guards for every node mutation', async () => {
  apiWire.respond = vi.fn(async () => ({
    ok: true,
    json: async () => ({ status: true, response: { node_status: { id: 9 } } }),
  })) as typeof apiWire.respond;
  const guards = { expected_content_revision: 3, expected_state: 'draft' as const };
  await createSecurityAdvisoryNodeStatus(4, { ...guards, node: 2, state: 'not_affected', cs_note: 'Ošetřeno' });
  expect(JSON.parse(String(apiWire.requests.at(-1)!.body))).toEqual({
    node_status: { ...guards, node: 2, state: 'not_affected', cs_note: 'Ošetřeno' },
  });
  await updateSecurityAdvisoryNodeStatus(4, 9, { ...guards, en_note: null });
  expect(JSON.parse(String(apiWire.requests.at(-1)!.body))).toEqual({ node_status: { ...guards, en_note: null } });
  apiWire.respond = vi.fn(async () => ({
    ok: true,
    json: async () => ({ status: true, response: { node_status: {} } }),
  })) as typeof apiWire.respond;
  await deleteSecurityAdvisoryNodeStatus(4, 9, guards);
  expect(JSON.parse(String(apiWire.requests.at(-1)!.body))).toEqual({ node_status: guards });
});
