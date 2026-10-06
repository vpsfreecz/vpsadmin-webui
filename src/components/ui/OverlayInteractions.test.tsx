import React from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import { Modal } from './Modal';
import { Drawer } from './Drawer';
vi.mock('../../app/i18n', () => ({ useI18n: () => ({ t: (key: string) => key }) }));
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

test('Escape closes only the nested modal and restoring both unlocks scrolling', () => {
  const outer = vi.fn();
  const inner = vi.fn();
  document.body.style.overflow = 'auto';
  const view = render(
    <Drawer open onClose={outer} title="Outer">
      <Modal open onClose={inner} title="Inner">
        <button>Inside</button>
      </Modal>
    </Drawer>
  );
  expect(document.body.style.overflow).toBe('hidden');
  fireEvent.keyDown(screen.getByRole('button', { name: 'Inside' }), { key: 'Escape' });
  expect(inner).toHaveBeenCalledTimes(1);
  expect(outer).not.toHaveBeenCalled();
  view.rerender(
    <Drawer open onClose={outer} title="Outer">
      <Modal open={false} onClose={inner} title="Inner">
        Closed
      </Modal>
    </Drawer>
  );
  expect(document.body.style.overflow).toBe('hidden');
  view.unmount();
  expect(document.body.style.overflow).toBe('auto');
});

test('visible viewport resize moves the dialog while pinch zoom remains native', () => {
  const viewport = Object.assign(new EventTarget(), { height: 400, offsetTop: 50, scale: 1 });
  vi.stubGlobal('visualViewport', viewport);
  render(
    <Modal open onClose={() => {}} title="Editor">
      Content
    </Modal>
  );
  const overlay = screen.getByRole('dialog').parentElement!;
  expect(overlay.style.height).toBe('400px');
  expect(overlay.style.top).toBe('50px');
  act(() => {
    Object.assign(viewport, { height: 300, offsetTop: 100 });
    viewport.dispatchEvent(new Event('resize'));
  });
  expect(overlay.style.height).toBe('300px');
  expect(overlay.style.top).toBe('100px');
  act(() => {
    viewport.scale = 2;
    viewport.dispatchEvent(new Event('resize'));
  });
  expect(overlay.style.height).toBe('');
  expect(overlay.style.top).toBe('');
});
