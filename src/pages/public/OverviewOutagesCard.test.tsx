import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { OverviewOutagesCard } from './OverviewOutagesCard';
import type { PublicOutagesByCategory } from './OverviewModel';

vi.mock('../../app/i18n', () => ({ useI18n: () => ({ t: (key: string) => key }) }));
vi.mock('../../components/outages/CompactOutageSummary', () => ({
  CompactOutageSummary: ({ outage }: { outage: { id: number } }) => <span>outage-{outage.id}</span>,
}));
const empty: PublicOutagesByCategory = { current: [], planned: [], resolved: [], unknown: [] };
function show(groups = empty, opts: { loading?: boolean; error?: boolean; resolved?: boolean } = {}) {
  return render(<MemoryRouter><OverviewOutagesCard groups={groups} loading={false} error={false} {...opts} /></MemoryRouter>);
}
describe('public overview outage priority', () => {
  it('omits the section when no current, planned or unknown outage exists', () => {
    const view = show({ ...empty, resolved: [{ id: 3 }] });
    expect(screen.queryByTestId('public.outages.card')).not.toBeInTheDocument();
    view.unmount();
    show();
    expect(screen.queryByTestId('public.outages.card')).not.toBeInTheDocument();
  });
  it('shows current and planned outages together without resolved rows', () => {
    show({ current: [{ id: 1 }], planned: [{ id: 2 }], resolved: [{ id: 3 }], unknown: [{ id: 4 }] });
    expect(screen.getByText('outage-1')).toBeVisible();
    expect(screen.getByText('outage-2')).toBeVisible();
    expect(screen.getByText('outage-4')).toBeVisible();
    expect(screen.queryByText('outage-3')).not.toBeInTheDocument();
  });
  it('bounds the separate resolved preview to three records', () => {
    show({ ...empty, current: [{ id: 1 }], resolved: [{ id: 2 }, { id: 3 }, { id: 4 }, { id: 5 }] }, { resolved: true });
    expect(screen.getByTestId('public.outages.resolved')).toHaveTextContent('outage-2outage-3outage-4');
    expect(screen.queryByText('outage-1')).not.toBeInTheDocument();
    expect(screen.queryByText('outage-5')).not.toBeInTheDocument();
  });
  it('keeps an explicit failure instead of treating a failed request as an empty list', () => {
    show(empty, { error: true });
    expect(screen.getByTestId('public.outages.card')).toHaveTextContent('public.overview.outages.error');
  });
  it('shows pending state until the public outage request is known', () => {
    show(empty, { loading: true });
    expect(screen.getByTestId('public.outages.card')).toHaveTextContent('public.overview.outages.loading');
  });
});
