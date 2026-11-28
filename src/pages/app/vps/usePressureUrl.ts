import { useEffect, useRef } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { applyPressureFilters } from './pressureState';

/** Keep an applied filter during another event before the router publishes its URL. */
export function usePressureUrl() {
  const [search, setSearch] = useSearchParams();
  const location = useLocation();
  const latest = useRef({ locationKey: location.key, search, browserPath: window.location.pathname });
  if (latest.current.locationKey !== location.key)
    latest.current = { locationKey: location.key, search, browserPath: window.location.pathname };
  useEffect(() => {
    const restore = () => {
      if (window.location.pathname === latest.current.browserPath)
        latest.current.search = new URLSearchParams(window.location.search);
    };
    window.addEventListener('popstate', restore);
    return () => window.removeEventListener('popstate', restore);
  }, []);
  const update = (change: (current: URLSearchParams) => URLSearchParams) => {
    if (window.location.pathname !== latest.current.browserPath) return;
    const next = change(latest.current.search);
    latest.current.search = next;
    setSearch(next);
  };
  return {
    search,
    apply: (values: Record<string, string>) => update((current) => applyPressureFilters(current, values)),
    page: (offset: number) =>
      update((current) => {
        const next = new URLSearchParams(current);
        if (offset === 0) next.delete('offset');
        else next.set('offset', String(offset));
        return next;
      }),
  };
}
