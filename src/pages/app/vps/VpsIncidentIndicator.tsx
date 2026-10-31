import { Link } from 'react-router-dom';
import { useI18n } from '../../../app/i18n';
import { Badge } from '../../../components/ui/Badge';
import type { Vps } from '../../../lib/api/vps';
import { hasIncidentSummary } from './vpsIncidentEscalation';

export function VpsIncidentIndicator({ vps, basePath }: { vps: Vps; basePath: string }) {
  const { t } = useI18n();
  if (!hasIncidentSummary(vps)) return null;
  const variant = vps.incident_status === 'stop_threshold' ? 'danger'
    : vps.incident_status === 'warning' || vps.incident_status === 'near_limit' ? 'warn' : 'neutral';
  return (
    <Link to={`${basePath}/vps/${vps.id}#incident-escalation`} className="inline-flex max-w-full" title={t('incidentEscalation.counts', {
      week: vps.incident_count_7d, warning: vps.incident_warning_limit,
      month: vps.incident_count_30d, stop: vps.incident_stop_limit,
    })}>
      <Badge variant={variant} className="whitespace-normal">
        {t('incidentEscalation.indicator', { type: vps.incident_policy_label, count: vps.incident_count_30d, limit: vps.incident_stop_limit })}
        {vps.incident_enforcement_enabled === false ? ` · ${t('incidentEscalation.exempt')}` : ''}
      </Badge>
    </Link>
  );
}
