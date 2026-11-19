import { expect, it } from 'vitest';
import { incidentStatus, parseIncidentLimit } from './vpsIncidentEscalation';
import { normalizeVpsListSearchParams, vpsListFilterSignature } from './vpsListSmartFilterHelpers';

it.each([
  ['', null],
  ['  ', null],
  ['5', 5],
  ['0', undefined],
  ['-1', undefined],
  ['1.5', undefined],
  ['abc', undefined],
])('parses nullable limit %s', (value, expected) => {
  expect(parseIncidentLimit(String(value))).toBe(expected);
});
it('requires an explicit arbitrary policy for a current status and includes it in cursor identity', () => {
  const selected = new URLSearchParams(
    'user=7&incident_policy=arbitrary&incident_status=warning&incident_enforcement_enabled=false'
  );
  expect(normalizeVpsListSearchParams(selected, 'admin').searchParams.toString()).toBe(selected.toString());
  expect(vpsListFilterSignature(selected)).not.toBe(
    vpsListFilterSignature(new URLSearchParams('user=7&incident_policy=other&incident_status=warning'))
  );
  expect(
    normalizeVpsListSearchParams(new URLSearchParams('incident_status=warning'), 'admin').searchParams.has(
      'incident_status'
    )
  ).toBe(false);
});
it('removes retired unknown status and administrative filters from member routes', () => {
  expect(incidentStatus('unknown')).toBeUndefined();
  const output = normalizeVpsListSearchParams(
    new URLSearchParams('incident_policy=alpha&incident_status=unknown&incident_enforcement_enabled=false'),
    'app'
  ).searchParams;
  expect(output.has('incident_policy')).toBe(false);
  expect(output.has('incident_status')).toBe(false);
  expect(output.has('incident_enforcement_enabled')).toBe(false);
});
