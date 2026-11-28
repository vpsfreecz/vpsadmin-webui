import { Link } from 'react-router-dom';
import { useI18n } from '../../../app/i18n';
import { Alert } from '../../../components/ui/Alert';
import { ErrorState } from '../../../components/ui/ErrorState';
import { LoadingState } from '../../../components/ui/LoadingState';
import type { PressureHistoryDay, VpsPressureRow } from '../../../lib/api/vpsPressureModels';
import { PressureRows } from './PressureRows';
import { PressureHistoryRows } from './PressureHistoryRows';

export function VpsPressureView({
  vpsId,
  basePath,
  admin,
  timeZone = 'UTC',
  rows,
  pending,
  unavailable,
  error,
  onRetry,
  history,
}: {
  vpsId: number;
  basePath: string;
  admin: boolean;
  timeZone?: string;
  rows: VpsPressureRow[];
  pending: boolean;
  unavailable: boolean;
  error?: unknown;
  onRetry: () => void;
  history: {
    rows: PressureHistoryDay[];
    days: 7 | 30;
    pending: boolean;
    unavailable: boolean;
    error?: unknown;
    ownerBound: boolean;
    onDaysChange: (days: 7 | 30) => void;
    onRetry: () => void;
  };
}) {
  const { t } = useI18n();
  return (
    <div className="space-y-6" data-testid="pressure.detail">
      <section className="space-y-3" aria-labelledby="pressure-current-heading">
        <h2 id="pressure-current-heading" className="text-lg font-semibold">
          {t('pressure.title')}
        </h2>
        {error ? (
          <ErrorState title={t('pressure.loadError')} error={error} onRetry={onRetry} />
        ) : unavailable ? (
          <Alert variant="info">{t('pressure.unavailable')}</Alert>
        ) : pending ? (
          <LoadingState />
        ) : rows.length === 0 ? (
          <Alert variant="info">{t('pressure.noObservations')}</Alert>
        ) : (
          <PressureRows rows={rows} basePath={basePath} admin={admin} timeZone={timeZone} detail />
        )}
      </section>
      {history.error ? (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">{t('pressure.history')}</h2>
          <ErrorState title={t('pressure.loadError')} error={history.error} onRetry={history.onRetry} />
        </section>
      ) : history.unavailable ? (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">{t('pressure.history')}</h2>
          <Alert variant="info">{t('pressure.historyUnavailable')}</Alert>
        </section>
      ) : history.pending ? (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">{t('pressure.history')}</h2>
          <LoadingState />
        </section>
      ) : (
        <PressureHistoryRows {...history} timeZone={timeZone} />
      )}
      <Link className="text-accent hover:underline" to={`${basePath}/incidents?vps=${vpsId}`}>
        {t('incidentEscalation.history')}
      </Link>
    </div>
  );
}
