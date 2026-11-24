import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  changeAdminIncidentFilter,
  parseAdminIncidentFilters,
  refreshAdminIncidentFilters,
  type AdminIncidentView,
} from './adminIncidentState';
import type { AdminIncidentPageMeta } from '../../../lib/api/adminIncidentModels';

export function useAdminIncidentUrl(view: AdminIncidentView) {
  const [search, setSearch] = useSearchParams();
  const key = search.toString();
  const parsed = useMemo(() => {
    try {
      return { filters: parseAdminIncidentFilters(new URLSearchParams(key), view), error: undefined };
    } catch (error) {
      return { filters: undefined, error };
    }
  }, [key, view]);
  return {
    search,
    ...parsed,
    change: (name: string, value: string) => setSearch((current) => changeAdminIncidentFilter(current, name, value)),
    apply: (values: Record<string, string>) =>
      setSearch((current) => {
        let next = new URLSearchParams(current);
        for (const [name, value] of Object.entries(values)) next = changeAdminIncidentFilter(next, name, value.trim());
        return next;
      }),
    page: (offset: number) =>
      setSearch((current) => {
        const next = new URLSearchParams(current);
        next.set('offset', String(offset));
        return next;
      }),
    refresh: () => setSearch((current) => refreshAdminIncidentFilters(current)),
    anchor: (meta: AdminIncidentPageMeta) =>
      setSearch(
        (current) => {
          if (current.has('as_of')) return current;
          const next = new URLSearchParams(current);
          next.set('as_of', meta.as_of);
          return next;
        },
        { replace: true }
      ),
  };
}
