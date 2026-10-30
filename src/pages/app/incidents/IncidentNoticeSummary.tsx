import { Link } from 'react-router-dom';
import { useAppMode } from '../../../app/appMode';
import { useI18n } from '../../../app/i18n';
import type { IncidentReport } from '../../../lib/api/incidents';
import { incidentPolicyHistoryPath } from './incidentPolicyLinks';

/** Notice outcomes and mail progress are separate server facts, scoped to this reader. */
export function IncidentNoticeSummary({ report }: { report: IncidentReport }) {
  const { basePath } = useAppMode();
  const { t } = useI18n();
  if (report.notice_kind !== 'warning' && report.notice_kind !== 'stop_completed') return null;
  const mailState = ['pending', 'queued', 'sent', 'failed', 'uncertain', 'suppressed'].find(
    (value) => value === report.notice_mail_state
  );
  const trigger = report.trigger_incident_report_id;
  return (
    <div className="space-y-1 break-words text-sm" data-testid="incidents.notice">
      <p className="font-medium">{t(`incidents.notice.${report.notice_kind}`)}</p>
      {report.notice_policy_key || report.notice_policy_label ? (
        <p data-testid="incidents.notice.policy">
          {report.notice_policy_label ?? report.notice_policy_key}
          {report.notice_policy_key && report.notice_policy_label ? (
            <span className="ml-2 font-mono text-xs text-muted">{report.notice_policy_key}</span>
          ) : null}
        </p>
      ) : null}
      {report.notice_policy_key &&
      typeof report.vps?.id === 'number' &&
      Number.isSafeInteger(report.vps.id) &&
      report.vps.id > 0 ? (
        <Link
          data-row-no-nav
          className="block underline"
          to={incidentPolicyHistoryPath(basePath, report.vps.id, report.notice_policy_key)}
        >
          {t('incidentEscalation.history')}
        </Link>
      ) : null}
      <p className="text-muted">
        {t('incidents.notice.mail')}: {mailState ? t(`incidents.notice.mail.${mailState}`) : t('common.na')}
      </p>
      {typeof trigger === 'number' && Number.isSafeInteger(trigger) && trigger > 0 ? (
        <Link data-row-no-nav className="underline" to={`${basePath}/incidents/${trigger}`}>
          {t('incidents.notice.trigger', { id: trigger })}
        </Link>
      ) : null}
    </div>
  );
}
