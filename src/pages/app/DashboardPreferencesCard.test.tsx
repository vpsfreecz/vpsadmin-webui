// i18n-ignore-file
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { DashboardPreferencesCard } from './DashboardPreferencesCard';

const mocks = vi.hoisted(() => ({
  setDashboardSettings: vi.fn(),
}));

vi.mock('../../app/i18n', () => ({
  useI18n: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('./useDashboardSettings', () => ({
  useDashboardSettingsState: () => ({
    dashboardSettings: {
      density: 'compact',
      hiddenWidgets: [],
      collapsedWidgets: [],
      widgetOrder: ['news', 'outages', 'security', 'cluster'],
    },
    setDashboardSettings: mocks.setDashboardSettings,
  }),
}));

describe('DashboardPreferencesCard', () => {
  it('hides the editor until the page opens it and persists density changes', async () => {
    const user = userEvent.setup();
    const { rerender } = render(<DashboardPreferencesCard open={false} />);
    const panel = screen.getByTestId('app.dashboard.preferences.card');
    expect(panel).not.toBeVisible();

    rerender(<DashboardPreferencesCard open />);
    expect(panel).toBeVisible();
    await user.selectOptions(screen.getByTestId('app.dashboard.preferences.density'), 'comfortable');
    expect(mocks.setDashboardSettings).toHaveBeenCalledWith(expect.objectContaining({ density: 'comfortable' }));
  });
});
