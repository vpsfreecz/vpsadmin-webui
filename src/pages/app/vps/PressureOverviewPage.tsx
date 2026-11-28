import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAppMode } from '../../../app/appMode';
import { useAccountTimeZone } from '../../../app/accountTimeZone';
import { useAuth } from '../../../app/auth';
import { fetchVpsPressureCapabilities } from '../../../lib/api/vpsPressureCapabilities';
import { fetchPressurePage } from '../../../lib/api/vpsPressure';
import { PressurePageView } from './PressurePageView';
import { pressurePagination, readPressureFilters, scopePressureFilters } from './pressureState';
import { usePressureUrl } from './usePressureUrl';

export function PressureOverviewPage() {
  const auth = useAuth();
  const timeZone = useAccountTimeZone();
  const { basePath, mode } = useAppMode();
  const url = usePressureUrl();
  const admin = mode === 'admin' && auth.role === 'admin';
  const capability = useQuery({
    queryKey: ['pressure', 'capabilities', auth.user?.id, auth.role, mode],
    queryFn: fetchVpsPressureCapabilities,
    enabled: auth.status === 'authenticated',
    staleTime: 60_000,
  });
  const caps = capability.data?.data;
  const supported =
    caps?.overview === true &&
    (admin || auth.role !== 'admin' || (caps.filters.includes('user') && Boolean(auth.user?.id)));
  const allowedFilters = (caps?.filters ?? []).filter((key) => key !== 'user' || admin);
  const key = url.search.toString();
  const parsed = useMemo(() => {
    if (!caps || !supported) return {};
    try {
      const filters = readPressureFilters(
        new URLSearchParams(key),
        caps.filters.filter((field) => field !== 'user' || admin)
      );
      return {
        params: {
          ...scopePressureFilters(filters, mode, auth.role, auth.user?.id, caps.filters),
          ...pressurePagination(new URLSearchParams(key)),
        },
      };
    } catch (error) {
      return { error };
    }
  }, [key, caps, supported, admin, mode, auth.role, auth.user?.id]);
  const page = useQuery({
    queryKey: ['pressure', 'overview', auth.user?.id, auth.role, mode, parsed.params],
    queryFn: ({ signal }) => {
      if (!parsed.params) throw new Error('Invalid pressure filters');
      return fetchPressurePage(parsed.params, signal);
    },
    enabled: supported && Boolean(parsed.params),
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });
  const refresh = () => {
    if (capability.isError) void capability.refetch();
    else if (parsed.params && supported) void page.refetch();
  };
  return (
    <PressurePageView
      rows={page.data?.data ?? []}
      meta={page.data?.meta}
      search={url.search}
      choices={{}}
      supportedFilters={allowedFilters}
      basePath={basePath}
      timeZone={timeZone}
      admin={admin}
      pending={capability.isLoading || (supported && page.isFetching)}
      unavailable={capability.isSuccess && !supported}
      dataUnavailable={page.data?.meta.configuration_valid === false}
      invalidFilters={Boolean(parsed.error)}
      error={capability.error ?? page.error}
      onRetry={refresh}
      onRefresh={refresh}
      onApply={url.apply}
      onOffset={url.page}
    />
  );
}
