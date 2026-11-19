import { Link } from 'react-router-dom';
import { useI18n } from '../../../app/i18n';
import { Alert } from '../../../components/ui/Alert';

/** Overview warnings come only from the server's proven threshold counts. */
export function VpsIncidentThresholdAlert(props: { warningCount: number; shutdownCount: number; href: string }) {
  const { t } = useI18n();
  const shutdown = props.shutdownCount > 0;
  if (!shutdown && props.warningCount <= 0) return null;
  return (
    <Alert variant={shutdown ? 'danger' : 'warn'} className="lg:col-span-12" testId="vps.incidents.threshold">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span>{t(shutdown ? 'incidentEscalation.status.stop_threshold' : 'incidentEscalation.status.warning')}</span>
        <Link to={props.href} className="underline">
          {t('incidentEscalation.viewIncidents')}
        </Link>
      </div>
    </Alert>
  );
}
