// i18n-ignore-file
import React from 'react';
import { createPortal } from 'react-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { usePageHelpRegistry } from '../../app/pageHelp';
import { PageHeader } from './PageHeader';
vi.mock('./ContextualHelpPanel', () => ({
  ContextualHelpPanel: () => {
    const registry = usePageHelpRegistry();
    const [open, setOpen] = React.useState(false);
    return registry?.heading ? createPortal(<button onClick={() => setOpen(!open)}>help {open ? 'open' : 'closed'}</button>, registry.heading) : null;
  },
}));
import { AppMainContent } from './AppMainContent';
function Page() {
  return <AppMainContent pathname="/app/vps/123" mode="user">
    <PageHeader title="Current page" />
    <div role="alert">Danger remains in page</div>
    <input aria-label="Draft" />
  </AppMainContent>;
}
describe('shared page help boundary', () => {
  it('attaches help to the heading and keeps page drafts and operational warnings mounted', async () => {
    const view = render(<Page />);
    fireEvent.click(await screen.findByText('help closed'));
    fireEvent.change(screen.getByLabelText('Draft'), { target: { value: 'unsaved' } });
    const help = screen.getByText('help open');
    const alert = screen.getByRole('alert');
    expect(help.parentElement?.parentElement).toContainElement(screen.getByRole('heading', { name: 'Current page' }));
    view.rerender(<Page />);
    await waitFor(() => expect(screen.getByText('help open')).toBe(help));
    expect(screen.getByRole('alert')).toBe(alert);
    expect(screen.getByLabelText('Draft')).toHaveValue('unsaved');
  });
  it('keeps both console routes free of contextual help', () => {
    for (const mode of ['user', 'admin'] as const) {
      const view = render(<AppMainContent pathname={`/${mode === 'user' ? 'app' : 'admin'}/vps/123/console`} mode={mode}>
        <PageHeader title="Console" />
      </AppMainContent>);
      expect(screen.queryByText('help closed')).toBeNull();
      view.unmount();
    }
  });
});
