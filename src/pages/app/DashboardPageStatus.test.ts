import { describe, expect, it } from 'vitest';

import { DashboardOperationalSummary } from './DashboardPageStatus';

const healthy = {
  t: (key: string) => key,
  outagesLoading: false,
  outagesError: false,
  nodesLoading: false,
  nodesError: false,
  currentOutageCount: 0,
  unknownOutageCount: 0,
  nodeTotalCount: 2,
  nodeDownCount: 0,
  nodeMaintenanceCount: 0,
  nodeUnknownCount: 0,
};

describe('DashboardOperationalSummary', () => {
  it('is quiet for known available nodes and an empty outage feed', () => {
    expect(DashboardOperationalSummary(healthy)).toBeNull();
  });

  it.each(['outagesLoading', 'nodesLoading'] as const)('keeps %s ahead of errors and issues', (field) => {
    expect(
      DashboardOperationalSummary({ ...healthy, [field]: true, nodesError: true, currentOutageCount: 1 })
    ).toMatchObject({
      variant: 'neutral',
      title: 'dashboard.alert.loading.title',
    });
  });

  it.each(['outagesError', 'nodesError'] as const)('keeps %s ahead of issue summaries', (field) => {
    expect(DashboardOperationalSummary({ ...healthy, [field]: true, currentOutageCount: 1 })).toMatchObject({
      variant: 'warn',
      title: 'dashboard.alert.partial.title',
    });
  });

  it.each([
    { currentOutageCount: 1, nodeDownCount: 1, nodeMaintenanceCount: 1, title: 'outage', variant: 'danger' },
    { currentOutageCount: 0, nodeDownCount: 1, nodeMaintenanceCount: 1, title: 'nodes_down', variant: 'danger' },
    { currentOutageCount: 0, nodeDownCount: 0, nodeMaintenanceCount: 1, title: 'maintenance', variant: 'warn' },
  ])('preserves $title severity ahead of unknown data', ({ title, variant, ...counts }) => {
    expect(
      DashboardOperationalSummary({ ...healthy, ...counts, nodeUnknownCount: 1, unknownOutageCount: 1 })
    ).toMatchObject({
      variant,
      title: `dashboard.alert.${title}.title`,
    });
  });

  it.each([{ nodeTotalCount: 0 }, { nodeUnknownCount: 1 }, { unknownOutageCount: 1 }])(
    'keeps successful but incomplete feeds visible: %j',
    (counts) => {
      expect(DashboardOperationalSummary({ ...healthy, ...counts })).toMatchObject({
        variant: 'warn',
        title: 'dashboard.alert.partial.title',
        body: 'dashboard.alert.partial.body',
      });
    }
  );
});
