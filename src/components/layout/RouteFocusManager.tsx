import { useLayoutEffect, useRef } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';

import { MAIN_CONTENT_ID } from './MainContentAccessibility';

/**
 * Restores a predictable document starting point after client-side route
 * changes. It lives above every layout so transitions between the public and
 * authenticated shells are handled as well as changes within either shell.
 */
export function RouteFocusManager() {
  const location = useLocation();
  const navigationType = useNavigationType();
  const navigationTypeRef = useRef(navigationType);
  navigationTypeRef.current = navigationType;
  const previousPathnameRef = useRef(location.pathname);
  const locationKeyRef = useRef(location.key);
  locationKeyRef.current = location.key;
  const earlyFocusRef = useRef<{ target: Element; key: string } | null>(null);

  useLayoutEffect(() => {
    // Browser history changes before React commits the destination. A control
    // in a persistent detail header can receive focus during that interval.
    const rememberFocus = (event: FocusEvent) => {
      const target = event.target;
      const key: unknown = window.history.state?.key;
      const main = document.getElementById(MAIN_CONTENT_ID);
      earlyFocusRef.current =
        target instanceof Element && main?.contains(target) && typeof key === 'string' ? { target, key } : null;
    };
    document.addEventListener('focusin', rememberFocus);
    return () => document.removeEventListener('focusin', rememberFocus);
  }, []);

  useLayoutEffect(() => {
    if (previousPathnameRef.current === location.pathname) return undefined;
    previousPathnameRef.current = location.pathname;

    // Do not override destination fragment navigation with the main target.
    if (location.hash) return undefined;

    if (navigationTypeRef.current !== 'POP') {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    }

    // A user or destination control can claim focus before this deferred frame.
    // Preserve that choice rather than moving Enter/Space to the main element.
    const earlyFocus = earlyFocusRef.current;
    let focusClaimed = earlyFocus?.key === locationKeyRef.current && earlyFocus.target === document.activeElement;
    earlyFocusRef.current = null;
    const onFocus = (event: FocusEvent) => {
      const main = document.getElementById(MAIN_CONTENT_ID);
      focusClaimed = event.target instanceof Node && !!main?.contains(event.target);
    };
    document.addEventListener('focusin', onFocus);
    const frame = window.requestAnimationFrame(() => {
      document.removeEventListener('focusin', onFocus);
      if (focusClaimed && document.activeElement !== document.body) return;
      document.getElementById(MAIN_CONTENT_ID)?.focus({ preventScroll: true });
    });

    return () => {
      document.removeEventListener('focusin', onFocus);
      window.cancelAnimationFrame(frame);
    };
  }, [location.hash, location.pathname]);

  return null;
}
