import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { AdminIncidentFilters } from './AdminIncidentFilters';

vi.mock('../../../app/i18n', () => ({ useI18n: () => ({ t: (key: string) => key }) }));
afterEach(cleanup);
it('applies the two Resource IDs and policy together rather than issuing sequential stale URL writes', () => {
  const apply = vi.fn(),
    change = vi.fn();
  render(
    <AdminIncidentFilters
      view="overview"
      search={new URLSearchParams('as_of=2026-11-24T10%3A00%3A00Z')}
      pending={false}
      onChange={change}
      onApply={apply}
      onRefresh={vi.fn()}
    />
  );
  fireEvent.change(screen.getByLabelText('incidentAdmin.filter.vps'), { target: { value: '12' } });
  fireEvent.change(screen.getByLabelText('incidentAdmin.filter.user'), { target: { value: '4' } });
  fireEvent.change(screen.getByLabelText('incidentAdmin.filter.policy_key'), { target: { value: 'arbitrary/key' } });
  fireEvent.click(screen.getByText('incidentAdmin.apply'));
  expect(apply).toHaveBeenCalledOnce();
  expect(apply).toHaveBeenCalledWith({ vps: '12', user: '4', node: '', policy_key: 'arbitrary/key' });
  expect(change).not.toHaveBeenCalled();
});
it('outstanding disables period controls and excludes their old URL values from submitted filters', () => {
  const apply = vi.fn();
  render(
    <AdminIncidentFilters
      view="history"
      search={new URLSearchParams('scope=outstanding&from=old&to=old')}
      pending={false}
      onChange={vi.fn()}
      onApply={apply}
      onRefresh={vi.fn()}
    />
  );
  expect(screen.queryByLabelText('incidentAdmin.filter.sort')).toBeNull();
  expect(screen.getByLabelText('incidentAdmin.filter.direction').tagName).toBe('SELECT');
  expect((screen.getByLabelText('incidentAdmin.filter.from') as HTMLInputElement).disabled).toBe(true);
  fireEvent.click(screen.getByText('incidentAdmin.apply'));
  expect(apply.mock.calls[0]?.[0]).not.toHaveProperty('from');
  expect(apply.mock.calls[0]?.[0]).not.toHaveProperty('to');
});

it('closes secondary filters by default but keeps their values enabled for Apply', () => {
  const apply = vi.fn();
  render(
    <AdminIncidentFilters
      view="overview"
      search={new URLSearchParams()}
      pending={false}
      onChange={vi.fn()}
      onApply={apply}
      onRefresh={vi.fn()}
    />
  );
  const details = screen.getByTestId('incidents.admin.moreFilters') as HTMLDetailsElement;
  expect(details.open).toBe(false);
  expect((screen.getByLabelText('incidentAdmin.filter.vps') as HTMLInputElement).disabled).toBe(false);
  fireEvent.change(screen.getByLabelText('incidentAdmin.filter.vps'), { target: { value: '12' } });
  fireEvent.click(screen.getByText('incidentAdmin.apply'));
  expect(apply).toHaveBeenCalledWith({ policy_key: '', vps: '12', user: '', node: '' });
});
it('opens active secondary filters from the URL, including explicit false and direction', () => {
  const change = vi.fn();
  render(
    <AdminIncidentFilters
      view="overview"
      search={new URLSearchParams('stop_enforced=false&user=4&direction=asc')}
      pending={false}
      onChange={change}
      onApply={vi.fn()}
      onRefresh={vi.fn()}
    />
  );
  expect((screen.getByTestId('incidents.admin.moreFilters') as HTMLDetailsElement).open).toBe(true);
  expect((screen.getByLabelText('incidentAdmin.filter.stop_enforced') as HTMLSelectElement).value).toBe('false');
  expect((screen.getByLabelText('incidentAdmin.filter.user') as HTMLInputElement).value).toBe('4');
  fireEvent.change(screen.getByLabelText('incidentAdmin.filter.stop_enforced'), { target: { value: 'true' } });
  expect(change).toHaveBeenCalledWith('stop_enforced', 'true');
});
