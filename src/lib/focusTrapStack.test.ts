import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { focusActiveTrap, registerFocusTrap } from './focusTrapStack';

const cleanups: Array<() => void> = [];

function dialog(id: string) {
  const container = document.createElement('div');
  container.tabIndex = -1;
  container.innerHTML = '<button>Close</button><button>Continue</button>';
  document.body.append(container);
  cleanups.push(registerFocusTrap({ id, container }));
  return { container, first: container.children[0] as HTMLButtonElement, next: container.children[1] as HTMLButtonElement };
}

beforeEach(() => {
  vi.spyOn(HTMLElement.prototype, 'getClientRects').mockReturnValue([new DOMRect(0, 0, 44, 44)] as unknown as DOMRectList);
});

afterEach(() => {
  cleanups.splice(0).reverse().forEach((cleanup) => cleanup());
  document.body.replaceChildren();
  vi.restoreAllMocks();
});

describe('deferred dialog focus', () => {
  it('focuses the first control when focus is still outside the dialog', () => {
    const { first } = dialog('initial');
    focusActiveTrap();
    expect(document.activeElement).toBe(first);
  });

  it('does not steal an already selected control before keyboard activation', () => {
    const { first, next } = dialog('already-focused');
    next.focus();
    // This is the animation-frame callback after the user has selected a link.
    focusActiveTrap();
    expect(document.activeElement).toBe(next);
    expect(document.activeElement).not.toBe(first);
  });

  it('preserves focus in the top dialog when a parent callback runs later', () => {
    dialog('parent');
    const { next } = dialog('child');
    next.focus();
    focusActiveTrap();
    expect(document.activeElement).toBe(next);
  });

  it('still wraps Tab and redirects focus that escapes the active dialog', () => {
    const { first, next } = dialog('trap');
    next.focus();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true }));
    expect(document.activeElement).toBe(first);
    const outside = document.createElement('button');
    document.body.append(outside);
    outside.focus();
    expect(document.activeElement).toBe(first);
  });
});
