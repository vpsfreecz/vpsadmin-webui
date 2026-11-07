// i18n-ignore-file
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
const state = vi.hoisted(() => ({ helpPlacement: 'top' }));
vi.mock('../../app/uiSettings', () => ({ useUiSettings: () => state }));
vi.mock('./ContextualHelpPanel', () => ({
  ContextualHelpPanel: () => {
    const [open, setOpen] = React.useState(false);
    return <button onClick={() => setOpen(!open)}>help {open ? 'open' : 'closed'}</button>;
  },
}));
import { AppMainContent } from './AppMainContent';
function Page() {
  return (
    <AppMainContent pathname="/app/vps/123" mode="user">
      <div role="alert">Danger remains in page</div>
      <input aria-label="Draft" />
    </AppMainContent>
  );
}
describe('help placement', () => {
  it('moves help in DOM order without remounting help or page state', () => {
    state.helpPlacement = 'top';
    const view = render(<Page />);
    fireEvent.click(screen.getByText('help closed'));
    fireEvent.change(screen.getByLabelText('Draft'), { target: { value: 'unsaved' } });
    const help = screen.getByText('help open');
    const alert = screen.getByRole('alert');
    expect(help.compareDocumentPosition(alert) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    state.helpPlacement = 'bottom';
    view.rerender(<Page />);
    expect(screen.getByText('help open')).toBe(help);
    expect(screen.getByRole('alert')).toBe(alert);
    expect(screen.getByLabelText('Draft')).toHaveValue('unsaved');
    expect(alert.compareDocumentPosition(help) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
  it('keeps console pages free of contextual help in either position', () => {
    for (const helpPlacement of ['top', 'bottom']) {
      state.helpPlacement = helpPlacement;
      const view = render(
        <AppMainContent pathname="/app/vps/123/console" mode="user">
          Console
        </AppMainContent>
      );
      expect(screen.queryByText('help closed')).toBeNull();
      view.unmount();
    }
  });
});
