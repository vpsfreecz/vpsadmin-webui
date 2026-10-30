import { describe, expect, it } from 'vitest';
import {
  incidentPolicyAnchorId,
  incidentPolicyCurrentPath,
  incidentPolicyHistoryPath,
  incidentPolicyReferencePaths,
} from './incidentPolicyLinks';

describe('opaque saved policy links', () => {
  it.each(['/app', '/admin'])('uses authenticated destinations in %s', (base) => {
    expect(incidentPolicyCurrentPath(base, 12, 'alpha')).toBe(`${base}/vps/12/incidents#incident-policy-alpha`);
    expect(incidentPolicyHistoryPath(base, 12, 'retired_key')).toBe(`${base}/incidents?vps=12&policy_key=retired_key`);
  });
  it('encodes the whole key without interpreting it as a path or query', () => {
    const key = 'opaque/key & label';
    const history = new URL(incidentPolicyHistoryPath('/app', 12, key), 'https://fixture.invalid');
    expect(history.searchParams.get('policy_key')).toBe(key);
    expect(
      decodeURIComponent(new URL(incidentPolicyCurrentPath('/app', 12, key), 'https://fixture.invalid').hash.slice(1))
    ).toBe(incidentPolicyAnchorId(key));
  });
});

it('links retired keys only to scoped history and omits links without an authorized VPS', () => {
  expect(incidentPolicyReferencePaths('/app', 12, 'alpha', new Set(['alpha']))).toEqual({
    current: '/app/vps/12/incidents#incident-policy-alpha',
    history: '/app/incidents?vps=12&policy_key=alpha',
  });
  expect(incidentPolicyReferencePaths('/admin', 12, 'retired', new Set(['alpha']))).toEqual({
    current: undefined,
    history: '/admin/incidents?vps=12&policy_key=retired',
  });
  for (const id of [null, undefined, 0, -1, NaN])
    expect(incidentPolicyReferencePaths('/app', id, 'alpha', new Set(['alpha']))).toEqual({});
});
