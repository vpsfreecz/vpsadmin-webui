import { useEffect } from 'react';

const locks = new Set<symbol>();
let previousOverflow = '';

/** Nested dialogs must not unlock the page, or leave it locked after closing. */
export function useBodyScrollLock(locked: boolean) {
  useEffect(() => {
    if (!locked) return;
    const id = Symbol('overlay');
    if (locks.size === 0) previousOverflow = document.body.style.overflow;
    locks.add(id);
    document.body.style.overflow = 'hidden';
    return () => {
      locks.delete(id);
      if (locks.size === 0) document.body.style.overflow = previousOverflow;
    };
  }, [locked]);
}
