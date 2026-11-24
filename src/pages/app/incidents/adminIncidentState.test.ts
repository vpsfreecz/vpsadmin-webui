import { describe, expect, it } from 'vitest';
import {
  changeAdminIncidentFilter,
  parseAdminIncidentFilters,
  refreshAdminIncidentFilters,
} from './adminIncidentState';

describe('admin incident URL contract', () => {
  it('defaults to all current matches across policies with server severity ordering', () => {
    expect(parseAdminIncidentFilters(new URLSearchParams(), 'overview')).toMatchObject({
      offset: 0,
      limit: 25,
      sort: 'severity',
      direction: 'desc',
    });
    expect(parseAdminIncidentFilters(new URLSearchParams(), 'overview').policy_key).toBeUndefined();
    expect(parseAdminIncidentFilters(new URLSearchParams(), 'overview').status).toBeUndefined();
  });
  it('keeps the cutoff across changed filters and resets only endpoint offset', () => {
    const source = new URLSearchParams('as_of=2026-11-24T12%3A00%3A00Z&offset=25&policy_key=alpha');
    const next = changeAdminIncidentFilter(source, 'user', '4');
    expect(parseAdminIncidentFilters(next, 'overview')).toMatchObject({
      user: 4,
      offset: 0,
      policy_key: 'alpha',
      as_of: '2026-11-24T12:00:00Z',
    });
    expect(source.get('offset')).toBe('25');
    expect(refreshAdminIncidentFilters(next).has('as_of')).toBe(false);
    expect(refreshAdminIncidentFilters(next).get('policy_key')).toBe('alpha');
  });
  it('uses normal exposure Resource IDs and preserves history original-owner IDs', () => {
    expect(
      parseAdminIncidentFilters(new URLSearchParams('vps=12&user=4&node=5&stop_enforced=false'), 'overview')
    ).toMatchObject({ vps: 12, user: 4, node: 5, stop_enforced: false });
    expect(parseAdminIncidentFilters(new URLSearchParams('vps_id=12&user_id=9'), 'history')).toMatchObject({
      vps_id: 12,
      user_id: 9,
      scope: 'violations',
    });
  });
  it('history uses server evaluation ordering and sends only its direction input', () => {
    const filters = parseAdminIncidentFilters(new URLSearchParams('sort=evaluated_at&direction=asc'), 'history');
    expect(filters.direction).toBe('asc');
    expect(filters).not.toHaveProperty('sort');
    expect(parseAdminIncidentFilters(new URLSearchParams(), 'history').direction).toBe('desc');
  });
  it('outstanding has no lower date bound and permits retired policy keys', () => {
    const sp = new URLSearchParams('scope=outstanding&policy_key=retired&from=bad&to=bad');
    expect(parseAdminIncidentFilters(sp, 'history')).toMatchObject({
      scope: 'outstanding',
      policy_key: 'retired',
      from: undefined,
      to: undefined,
    });
    expect(changeAdminIncidentFilter(sp, 'scope', 'outstanding').has('from')).toBe(false);
  });
  it.each(['offset=-1', 'limit=101', 'vps=1x', 'user=0', 'direction=sideways', 'status=made_up', 'as_of=yesterday'])(
    'rejects malformed overview query %s',
    (query) => {
      expect(() => parseAdminIncidentFilters(new URLSearchParams(query), 'overview')).toThrow();
    }
  );
  it('sort changes discard a stale direction and never sort a browser page', () => {
    const next = changeAdminIncidentFilter(
      new URLSearchParams('direction=desc&offset=50'),
      'sort',
      'warning_remaining'
    );
    expect(parseAdminIncidentFilters(next, 'overview')).toMatchObject({
      sort: 'warning_remaining',
      direction: 'asc',
      offset: 0,
    });
  });
});

it.each(['action_state=running', 'action_state=cancelled', 'mail_state=completed'])(
  'rejects undeclared history state %s',
  (query) => {
    expect(() => parseAdminIncidentFilters(new URLSearchParams(query), 'history')).toThrow();
  }
);
