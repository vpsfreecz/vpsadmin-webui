import { useLayoutEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useI18n } from '../../../app/i18n';
import { useAuth } from '../../../app/auth';
import { Select } from '../../../components/ui/Select';
import { INCIDENT_STATUSES } from './vpsIncidentEscalation';

export function VpsIncidentFilters({ available, mode, limit }: { available: boolean; mode: string; limit: number }) {
  const [params, setParams] = useSearchParams();
  // Router navigation is asynchronous: preserve a preceding selection while
  // its location is still pending, then adopt committed Back/Forward changes.
  const latestParams = useRef(params);
  useLayoutEffect(() => { latestParams.current = params; }, [params]);
  const { t } = useI18n();
  const auth = useAuth();
  if (!available || mode !== 'admin' || auth.role !== 'admin') return null;
  function setFilter(key: string, value: string) {
    const next = new URLSearchParams(latestParams.current);
    if (value) next.set(key, value); else next.delete(key);
    next.delete('from_id'); next.set('page', '1');
    next.set('limit', String(limit));
    latestParams.current = next;
    // Match existing filter controls: commit before another control navigates.
    setParams(next, { flushSync: true });
  }
  return (
    <div className="mt-3 grid gap-3 sm:grid-cols-2" data-testid="vps.incident.filters">
      <label className="block text-sm"><span>{t('incidentEscalation.filterStatus')}</span><Select ariaLabel={t('incidentEscalation.filterStatus')} value={params.get('incident_status') ?? ''}
        onChange={e => setFilter('incident_status', e.target.value)} options={[
          { value: '', label: t('common.all') },
          ...INCIDENT_STATUSES.map(value => ({ value, label: t(`incidentEscalation.status.${value}`) })),
        ]} /></label>
      <label className="block text-sm"><span>{t('incidentEscalation.filterEnforcement')}</span><Select ariaLabel={t('incidentEscalation.filterEnforcement')} value={params.get('incident_enforcement_enabled') ?? ''}
        onChange={e => setFilter('incident_enforcement_enabled', e.target.value)} options={[
          { value: '', label: t('common.all') },
          { value: 'false', label: t('incidentEscalation.exempt') },
          { value: 'true', label: t('incidentEscalation.notExempt') },
        ]} /></label>
    </div>
  );
}
