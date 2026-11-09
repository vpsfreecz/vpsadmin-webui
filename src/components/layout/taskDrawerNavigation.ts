import type { MouseEvent } from 'react';

import { MAIN_CONTENT_ID } from './MainContentAccessibility';

/** Preserve native modified-link behavior; ordinary navigation closes Tasks. */
export function navigateFromTasks(event: MouseEvent<HTMLAnchorElement>, onNavigate?: () => void) {
  if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  onNavigate?.();
  window.requestAnimationFrame(() => {
    document.getElementById(MAIN_CONTENT_ID)?.focus({ preventScroll: true });
  });
}
