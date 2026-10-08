import { describe, expect, it } from 'vitest';
import { incidentCreateHref, incidentReturnHref } from './incidentCreateContext';

describe('incident creation context', () => {
  it('carries the VPS separately from list-only filters and preserves the return query', () => {
    const search = new URLSearchParams('vps=123&user=10&codename=abuse&from_id=99');
    const href = incidentCreateHref('/admin', search, 123);
    const createSearch = new URL(href, 'https://example.test').searchParams;
    expect(createSearch.get('vps')).toBe('123');
    expect(createSearch.get('codename')).toBeNull();
    expect(incidentReturnHref('/admin', createSearch)).toBe(`/admin/incidents?${search}`);
  });
  it('does not infer a VPS from an owner or IP filter', () => {
    const href = incidentCreateHref('/admin', new URLSearchParams('user=10&ip=192.0.2.5'));
    expect(new URL(href, 'https://example.test').searchParams.has('vps')).toBe(false);
  });
  it.each(['https://evil.test/admin/incidents', '//evil.test/admin/incidents', '/app/incidents', '/admin/vps/123', '/admin/incidents/new', 'x'.repeat(2049)])('rejects unrelated return paths: %s', (returnTo) => {
    expect(incidentReturnHref('/admin', new URLSearchParams({ vps: '123', returnTo }))).toBe('/admin/incidents?vps=123');
  });
  it.each(['', '0', '-1', '1.5', '1e3', 'wrong'])('does not carry invalid VPS IDs: %s', (vps) => {
    expect(incidentReturnHref('/admin', new URLSearchParams({ vps }))).toBe('/admin/incidents');
  });
});
