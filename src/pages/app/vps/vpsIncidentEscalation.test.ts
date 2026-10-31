import { describe, expect, it } from 'vitest';
import { hasIncidentSummary, parseIncidentLimit, sameIncidentSettings } from './vpsIncidentEscalation';
import { normalizeVpsListSearchParams, vpsListFilterSignature } from './vpsListSmartFilterHelpers';

it('does not invent zero counts when an older API omits the feature', () => {
  expect(hasIncidentSummary({ id: 1, hostname: 'test' })).toBe(false);
  expect(hasIncidentSummary({ id: 1, hostname: 'test', incident_count_7d: 0, incident_policy: 'oomd' })).toBe(true);
});
it('distinguishes explicit null from absent admin fields during save verification', () => {
  const settings = { incident_policy: 'oomd', incident_warning_limit_override: null, incident_stop_limit_override: null, incident_enforcement_enabled: true };
  expect(sameIncidentSettings({ id: 1, hostname: 'test' }, settings)).toBe(false);
  expect(sameIncidentSettings({ id: 1, hostname: 'test', ...settings }, settings)).toBe(true);
});
it.each([['', null], ['  ', null], ['5', 5], ['0', undefined], ['-1', undefined], ['1.5', undefined], ['abc', undefined]])('parses nullable limit %s', (value, expected) => {
  expect(parseIncidentLimit(String(value))).toBe(expected);
});
describe('Incident list filters', () => {
  it('keeps admin filters and includes them in cursor identity', () => {
    const initial = new URLSearchParams('incident_status=near_limit&incident_enforcement_enabled=false');
    expect(normalizeVpsListSearchParams(initial, 'admin').searchParams.toString()).toBe(initial.toString());
    expect(vpsListFilterSignature(initial)).not.toBe(vpsListFilterSignature(new URLSearchParams()));
  });
  it.each(['app', 'admin'] as const)('removes invalid filters in %s view', mode => {
    const value = normalizeVpsListSearchParams(new URLSearchParams('incident_status=bogus&incident_enforcement_enabled=no&from_id=40'), mode).searchParams;
    expect(value.has('incident_status')).toBe(false);
    expect(value.has('incident_enforcement_enabled')).toBe(false);
    expect(value.has('from_id')).toBe(false);
  });
  it('removes admin overview filters on member routes', () => {
    const value = normalizeVpsListSearchParams(new URLSearchParams('incident_status=warning&incident_enforcement_enabled=false'), 'app').searchParams;
    expect(value.has('incident_status')).toBe(false);
    expect(value.has('incident_enforcement_enabled')).toBe(false);
  });
});

it('requires both common fields and refuses the unreleased narrow interface', () => {
  expect(hasIncidentSummary({ id: 1, hostname: 'test', incident_count_7d: 0 })).toBe(false);
  expect(hasIncidentSummary({ id: 1, hostname: 'test', incident_policy: 'oomd' })).toBe(false);
  expect(hasIncidentSummary({ id: 1, hostname: 'test', oom_incidents_7d: 4 })).toBe(false);
});
it('does not verify selected settings against a different type response', () => {
  const values = { incident_policy: 'test_rule', incident_warning_limit_override: 8, incident_stop_limit_override: 15, incident_enforcement_enabled: true };
  expect(sameIncidentSettings({ id: 1, hostname: 'test', ...values, incident_policy: 'oomd' }, values)).toBe(false);
});
