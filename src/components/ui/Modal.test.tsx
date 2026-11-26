// i18n-ignore-file
import React, { useLayoutEffect, useRef } from 'react';
import { render, screen } from '@testing-library/react';

import { Modal } from './Modal';

describe('Modal', () => {
  it('gives a titleless dialog an explicit accessible name', () => {
    render(
      <Modal open ariaLabel="Search" onClose={() => undefined} testId="modal">
        Content
      </Modal>
    );

    expect(screen.getByRole('dialog', { name: 'Search' })).toBeInTheDocument();
    expect(screen.getByTestId('modal')).not.toHaveAttribute('aria-labelledby');
  });

  it('keeps the page visible behind an opaque dialog surface', () => {
    render(
      <Modal open title="Edit settings" onClose={() => undefined} testId="modal">
        Content
      </Modal>
    );

    expect(screen.getByTestId('modal')).toHaveClass('bg-overlay-surface');
    expect(screen.getByTestId('modal')).toHaveClass('z-10');
    expect(screen.getByTestId('modal')).toHaveAttribute('aria-modal', 'true');
    expect(document.querySelector('[data-overlay-backdrop="true"]')).toHaveClass(
      'bg-backdrop/45'
    );
  });
});

// Dialog removal precedes passive focus-trap cleanup. A result control can
// receive keyboard focus during the intervening layout phase.
for (const claimResultFocus of [false, true]) {
  it(`restores dialog focus without overriding a result choice: ${claimResultFocus}`, () => {
    function Scene({ open }: { open: boolean }) {
      const result = useRef<HTMLButtonElement>(null);
      useLayoutEffect(() => {
        if (!open && claimResultFocus) result.current?.focus();
      }, [open]);
      return <>
        <button>Open editor</button>
        <button ref={result}>Result action</button>
        <Modal open={open} title="Editor" onClose={() => undefined}>
          <button>Confirm edit</button>
        </Modal>
      </>;
    }
    const view = render(<Scene open={false} />);
    const trigger = screen.getByRole('button', { name: 'Open editor' });
    trigger.focus();
    view.rerender(<Scene open />);
    screen.getByRole('button', { name: 'Confirm edit' }).focus();
    view.rerender(<Scene open={false} />);
    expect(claimResultFocus ? screen.getByRole('button', { name: 'Result action' }) : trigger).toHaveFocus();
  });
}
