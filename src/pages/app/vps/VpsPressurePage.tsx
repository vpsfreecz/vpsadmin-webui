import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { useAppMode } from '../../../app/appMode';
import { useAccountTimeZone } from '../../../app/accountTimeZone';
import { useAuth } from '../../../app/auth';
import { fetchVpsPressureCapabilities } from '../../../lib/api/vpsPressureCapabilities';
import { fetchPressureDetail, fetchPressureHistory } from '../../../lib/api/vpsPressure';
import { ForbiddenPage } from '../../ForbiddenPage';
import { useVps } from './VpsContext';
import { VpsPressureView } from './VpsPressureView';

function AuthorizedVpsPressurePage({ vpsId, ownerKey }: { vpsId: number; ownerKey: string }) {
  const auth = useAuth();
  const timeZone = useAccountTimeZone();
  const { basePath, mode } = useAppMode();
  const [search, setSearch] = useSearchParams();
  const days = search.getAll('days').length === 1 && search.get('days') === '30' ? 30 : 7;
  useEffect(() => {
    if (!search.has('days') || (search.getAll('days').length === 1 && ['7', '30'].includes(search.get('days') ?? '')))
      return;
    const next = new URLSearchParams(search);
    next.delete('days');
    setSearch(next, { replace: true });
  }, [search, setSearch]);
  const capability = useQuery({
    queryKey: ['pressure', 'capabilities', auth.user?.id, auth.role, mode],
    queryFn: fetchVpsPressureCapabilities,
    staleTime: 60_000,
  });
  const current = useQuery({
    queryKey: ['pressure', 'detail', auth.user?.id, auth.role, mode, vpsId, ownerKey],
    queryFn: ({ signal }) => fetchPressureDetail(vpsId, signal),
    enabled: capability.data?.data.detail === true,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });
  const history = useQuery({
    queryKey: ['pressure', 'history', auth.user?.id, auth.role, mode, vpsId, ownerKey, days],
    queryFn: ({ signal }) => fetchPressureHistory(vpsId, days, signal),
    enabled: capability.data?.data.history === true,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });
  return (
    <VpsPressureView
      vpsId={vpsId}
      basePath={basePath}
      timeZone={timeZone}
      admin={mode === 'admin' && auth.role === 'admin'}
      rows={current.data?.data ?? []}
      pending={capability.isLoading || current.isLoading}
      unavailable={capability.isSuccess && !capability.data.data.detail}
      error={capability.error ?? current.error}
      onRetry={() => {
        if (capability.isError) void capability.refetch();
        else void current.refetch();
      }}
      history={{
        rows: history.data?.data ?? [],
        days,
        pending: capability.isLoading || history.isLoading,
        unavailable: capability.isSuccess && (!capability.data.data.history || history.data?.meta.available === false),
        error: capability.error ?? history.error,
        ownerBound: history.data?.meta.ownership_limited === true,
        onRetry: () => {
          if (capability.isError) void capability.refetch();
          else void history.refetch();
        },
        onDaysChange: (value) => {
          const next = new URLSearchParams(search);
          next.set('days', String(value));
          setSearch(next);
        },
      }}
    />
  );
}

export function VpsPressurePage() {
  const { vps } = useVps();
  const { mode } = useAppMode();
  const auth = useAuth();
  if (mode === 'user' && vps.user?.id !== auth.user?.id) return <ForbiddenPage />;
  const ownerKey = `${vps.user?.id ?? '-'}:${vps.incident_accounting_since ?? '-'}`;
  return (
    <AuthorizedVpsPressurePage
      key={`${vps.id}:${mode}:${auth.user?.id}:${ownerKey}`}
      vpsId={vps.id}
      ownerKey={ownerKey}
    />
  );
}
