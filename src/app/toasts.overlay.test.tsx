import React, { useState } from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import { ToastsProvider, useToasts } from './toasts';
import { Modal } from '../components/ui/Modal';
vi.mock('./i18n', () => ({ useI18n: () => ({ t: (key: string) => key }) }));
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

test('a background notification does not expire while a modal owns interaction', async () => {
  vi.useFakeTimers();
  function Harness() {
    const [open, setOpen] = useState(true);
    const { pushToast } = useToasts();
    return (
      <Modal open={open} onClose={() => setOpen(false)} title="Editor">
        <button onClick={() => pushToast({ title: 'Background work complete', autoDismissMs: 1000 })}>Notify</button>
        <button onClick={() => setOpen(false)}>Finish editing</button>
      </Modal>
    );
  }
  render(
    <ToastsProvider>
      <Harness />
    </ToastsProvider>
  );
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: 'Notify' }));
  });
  await act(async () => {
    vi.advanceTimersByTime(2000);
  });
  expect(screen.getByText('Background work complete')).toBeInTheDocument();
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: 'Finish editing' }));
  });
  expect(screen.getByText('Background work complete')).toBeInTheDocument();
  await act(async () => {
    vi.advanceTimersByTime(1001);
  });
  expect(screen.queryByText('Background work complete')).toBeNull();
});

test('an urgent error stays visible inside the dialog without covering its actions', async () => {
  function Harness() {
    const { pushToast } = useToasts();
    return (
      <Modal open onClose={() => {}} title="Editor" footer={<button>Save</button>}>
        <button onClick={() => pushToast({ variant: 'danger', title: 'Save failed', autoDismissMs: false })}>
          Fail
        </button>
      </Modal>
    );
  }
  render(
    <ToastsProvider>
      <Harness />
    </ToastsProvider>
  );
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: 'Fail' }));
  });
  const error = screen.getByRole('alert');
  expect(screen.getByRole('dialog')).toContainElement(error);
  expect(screen.getByTestId('toast.modal_viewport')).toContainElement(error);
  fireEvent.click(screen.getByRole('button', { name: 'common.close' }));
  expect(screen.queryByRole('alert')).toBeNull();
  expect(screen.getByRole('button', { name: 'Save' })).toBeVisible();
});
