import { Link } from 'react-router-dom';
import { useI18n } from '../../../app/i18n';
import { formatDateTime } from '../../../lib/format';

export function DateFact({ label, value }: { label: string; value: string | null }) {
  return value ? (
    <div className="text-xs text-muted">
      {label}: {formatDateTime(value)}
    </div>
  ) : null;
}

export function AdminIncidentCounts({
  count,
  limit,
  remaining,
  days,
}: {
  count: number | null;
  limit: number | null;
  remaining?: number | null;
  days: number;
}) {
  const { t } = useI18n();
  return (
    <span>
      {t('incidentAdmin.countCompact', { count: count ?? t('common.na'), limit: limit ?? t('common.na'), days })}
      {remaining != null ? (
        <span className="text-muted">
          {' '}
          ·{' '}
          {remaining === 0
            ? t('incidentAdmin.thresholdReached')
            : t('incidentAdmin.remainingCompact', { count: remaining })}
        </span>
      ) : null}
    </span>
  );
}

export function Fact({ value, prefix }: { value: string | null; prefix: string }) {
  const { t } = useI18n();
  if (value == null) return <span>{t('common.na')}</span>;
  const key = `${prefix}.${value}`;
  const label = t(key);
  return <span>{label === key ? value : label}</span>;
}

export function ChainLink({ id }: { id: number | null }) {
  const { t } = useI18n();
  return id == null ? null : (
    <Link className="text-accent hover:underline" to={`/admin/transactions/${id}`}>
      {t('incidentAdmin.transaction', { id })}
    </Link>
  );
}

export function OutcomeSummary({
  actionId,
  kind,
  state,
  mail,
  confirmed,
}: {
  actionId: number | null;
  kind: string | null;
  state: string | null;
  mail: string | null;
  confirmed: string | null;
}) {
  const { t } = useI18n();
  return (
    <div className="space-y-1">
      {actionId == null ? (
        <span className="text-muted">{t('incidentAdmin.noAction')}</span>
      ) : (
        <div>
          <Fact value={kind} prefix="incidentAdmin.kind" />:{' '}
          {state === 'completed' && !confirmed ? (
            t('incidentAdmin.completedRequest')
          ) : (
            <Fact value={state} prefix="incidentAdmin.action" />
          )}
        </div>
      )}
      {confirmed ? <div>{t('incidentAdmin.confirmedStopShort')}</div> : null}
      {mail != null ? (
        <div>
          {t('incidentAdmin.mail')}: <Fact value={mail} prefix="incidentAdmin.mail_state" />
        </div>
      ) : null}
    </div>
  );
}
