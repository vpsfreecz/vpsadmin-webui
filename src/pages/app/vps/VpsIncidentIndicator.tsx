import { Link } from 'react-router-dom';
import { useI18n } from '../../../app/i18n';
import { Badge } from '../../../components/ui/Badge';
import type { Vps } from '../../../lib/api/vps';

export function VpsIncidentIndicator({
  vps,
  basePath,
  contextSearch = '',
}: {
  vps: Vps;
  basePath: string;
  contextSearch?: string;
}) {
  const { t } = useI18n();
  const shutdown = (vps.incident_stop_threshold_count ?? 0) > 0;
  if (!shutdown && (vps.incident_warning_count ?? 0) <= 0) return null;
  return (
    <Link to={`${basePath}/vps/${vps.id}/incidents${contextSearch}`} className="inline-flex max-w-full">
      <Badge variant={shutdown ? 'danger' : 'warn'} className="whitespace-normal">
        {t(shutdown ? 'incidentEscalation.status.stop_threshold' : 'incidentEscalation.status.warning')}
      </Badge>
    </Link>
  );
}
