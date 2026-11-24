import { fireEvent, render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, expect, it } from 'vitest';
import { adminIncidentMeta } from '../../../test/adminIncidentFixtures';
import { useAdminIncidentUrl } from './useAdminIncidentUrl';

afterEach(cleanup);
function Harness() {
  const url = useAdminIncidentUrl('overview');
  return (
    <>
      <output data-testid="query">{url.search.toString()}</output>
      <button onClick={() => url.apply({ vps: '12', user: '4', policy_key: 'other' })}>Apply</button>
      <button onClick={() => url.page(25)}>Next</button>
      <button onClick={() => url.anchor(adminIncidentMeta)}>Anchor</button>
      <button onClick={url.refresh}>Refresh</button>
    </>
  );
}
const query = () => new URLSearchParams(screen.getByTestId('query').textContent ?? '');
it('applies independent fields atomically, keeps cutoff and pages through URL state', () => {
  render(
    <MemoryRouter initialEntries={['/admin/incidents/overview?as_of=2026-11-24T11%3A00%3A00Z&offset=50']}>
      <Harness />
    </MemoryRouter>
  );
  fireEvent.click(screen.getByText('Apply'));
  expect(Object.fromEntries(query())).toEqual({
    as_of: '2026-11-24T11:00:00Z',
    vps: '12',
    user: '4',
    policy_key: 'other',
  });
  fireEvent.click(screen.getByText('Next'));
  expect(query().get('offset')).toBe('25');
  fireEvent.click(screen.getByText('Anchor'));
  expect(query().get('as_of')).toBe('2026-11-24T11:00:00Z');
  fireEvent.click(screen.getByText('Refresh'));
  expect(query().has('as_of')).toBe(false);
  expect(query().has('offset')).toBe(false);
  expect(query().get('policy_key')).toBe('other');
});
it('anchors a first response without losing other filters', () => {
  render(
    <MemoryRouter initialEntries={['/admin/incidents/overview?policy_key=alpha']}>
      <Harness />
    </MemoryRouter>
  );
  fireEvent.click(screen.getByText('Anchor'));
  expect(query().get('as_of')).toBe(adminIncidentMeta.as_of);
  expect(query().get('policy_key')).toBe('alpha');
});
