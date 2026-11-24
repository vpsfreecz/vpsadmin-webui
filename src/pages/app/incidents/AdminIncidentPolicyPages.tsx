import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAppMode } from '../../../app/appMode';
import { useAuth } from '../../../app/auth';
import { fetchAdminIncidentCapabilities } from '../../../lib/api/adminIncidentCapabilities';
import { fetchAdminIncidentEvaluations, fetchAdminIncidentExposures } from '../../../lib/api/adminIncidents';
import { ForbiddenPage } from '../../ForbiddenPage';
import { AdminIncidentPageView } from './AdminIncidentPageView';
import { useAdminIncidentUrl } from './useAdminIncidentUrl';
import type { AdminIncidentFilters, AdminIncidentView } from './adminIncidentState';

function pageKey(userId: number | undefined, view: AdminIncidentView, filters?: AdminIncidentFilters) {
  return ['admin_incidents', userId, view, filters] as const;
}

function AuthorizedAdminIncidentPage({ view }: { view: AdminIncidentView }) {
  const auth = useAuth();
  const url = useAdminIncidentUrl(view);
  const queryClient = useQueryClient();
  const capabilities = useQuery({
    queryKey: ['admin_incidents', auth.user?.id, 'capabilities'],
    queryFn: fetchAdminIncidentCapabilities,
    staleTime: 60_000,
  });
  const supported = capabilities.data?.data[view] === true;
  const filters = url.filters;
  const anchor = url.anchor;
  const page = useQuery({
    queryKey: pageKey(auth.user?.id, view, filters),
    queryFn: async ({ signal }) => {
      if (!filters) throw new Error('Invalid incident filter');
      return view === 'overview'
        ? ({ view, result: await fetchAdminIncidentExposures(filters, signal) } as const)
        : ({ view, result: await fetchAdminIncidentEvaluations(filters, signal) } as const);
    },
    enabled: supported && Boolean(filters),
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });
  useEffect(() => {
    if (!filters || filters.as_of || !page.data || page.isFetching) return;
    // Seed the canonical URL key before anchoring. The initial server cutoff
    // must not cause a second identical read, including an empty collection.
    queryClient.setQueryData(
      pageKey(auth.user?.id, view, { ...filters, as_of: page.data.result.meta.as_of }),
      page.data,
      { updatedAt: page.dataUpdatedAt }
    );
    anchor(page.data.result.meta);
  }, [auth.user?.id, view, filters, page.data, page.isFetching, page.dataUpdatedAt, queryClient, anchor]);
  const refresh = () => {
    // Discard only the unanchored page cache before navigating. Changing
    // a separate state key first could dispatch the old cutoff again.
    if (filters?.as_of) {
      queryClient.removeQueries({
        queryKey: pageKey(auth.user?.id, view, { ...filters, as_of: undefined, offset: 0 }),
        exact: true,
      });
    } else if (supported && filters) {
      void page.refetch();
    }
    url.refresh();
  };
  const rows =
    view === 'overview'
      ? ({ view, rows: page.data?.view === 'overview' ? page.data.result.data : [] } as const)
      : ({ view, rows: page.data?.view === 'history' ? page.data.result.data : [] } as const);
  // The browser URL can update before React commits new event handlers.
  // Keep controls disabled until they include the echoed cutoff.
  const pending = capabilities.isLoading || (supported && (page.isFetching || Boolean(page.data && !filters?.as_of)));
  return (
    <AdminIncidentPageView
      {...rows}
      meta={page.data?.result.meta}
      search={url.search}
      pending={pending}
      unavailable={capabilities.isSuccess && !supported}
      error={capabilities.error ?? (supported ? page.error : undefined)}
      invalidFilters={Boolean(url.error)}
      onRetry={() => {
        if (capabilities.isError) void capabilities.refetch();
        else void page.refetch();
      }}
      onRefresh={refresh}
      onChange={url.change}
      onApply={url.apply}
      onOffset={url.page}
    />
  );
}

function AdminIncidentPolicyPage({ view }: { view: AdminIncidentView }) {
  const { mode } = useAppMode();
  const auth = useAuth();
  if (mode !== 'admin' || auth.role !== 'admin') return <ForbiddenPage />;
  return <AuthorizedAdminIncidentPage view={view} />;
}

export function AdminIncidentOverviewPage() {
  return <AdminIncidentPolicyPage view="overview" />;
}
export function AdminIncidentHistoryPage() {
  return <AdminIncidentPolicyPage view="history" />;
}
