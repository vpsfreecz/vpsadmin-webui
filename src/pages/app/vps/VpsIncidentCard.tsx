import { Link } from 'react-router-dom';
import { useAppMode } from '../../../app/appMode';
import { useAuth } from '../../../app/auth';
import { useI18n } from '../../../app/i18n';
import { Card, CardBody, CardHeader } from '../../../components/ui/Card';
import { Alert } from '../../../components/ui/Alert';
import { formatDateTime } from '../../../lib/format';
import type { Vps } from '../../../lib/api/vps';
import { hasIncidentSummary } from './vpsIncidentEscalation';
import { VpsIncidentSettingsForm } from './VpsIncidentSettingsForm';

export function VpsIncidentCard({ vps }: { vps: Vps }) {
  const { t } = useI18n();
  const { mode, basePath } = useAppMode();
  const auth = useAuth();
  if (!hasIncidentSummary(vps)) return null;
  const times = [
    ['lastIncident', vps.incident_last_incident_at],
    ['lastWarning', vps.incident_last_warning_at],
    ['lastStop', vps.incident_last_stop_at],
    ['accountingSince', vps.incident_accounting_since],
  ] as const;
  return (
    <Card id="incident-escalation" testId="vps.incident" className="lg:col-span-12 scroll-mt-4">
      <CardHeader title={t('incidentEscalation.title')} actions={
        <Link className="text-sm underline" to={`${basePath}/incidents?vps=${vps.id}&codename=${encodeURIComponent(vps.incident_policy ?? '')}`}>
          {t('incidentEscalation.history')}
        </Link>
      } />
      <CardBody className="space-y-4">
        <p className="text-sm">{t('incidentEscalation.type')}: {vps.incident_policy_label}</p>
        <p className="text-sm">{t('incidentEscalation.counts', {
          week: vps.incident_count_7d, warning: vps.incident_warning_limit,
          month: vps.incident_count_30d, stop: vps.incident_stop_limit,
        })}</p>
        <p className="text-sm">{t(`incidentEscalation.status.${vps.incident_status ?? 'unknown'}`)}</p>
        <p className="text-sm text-muted">{t(`incidentEscalation.mode.${vps.incident_mode ?? 'unknown'}`)}</p>
        {vps.incident_enforcement_enabled === false ? <Alert variant="info" title={t('incidentEscalation.exempt')}>{vps.incident_mode !== 'observe' ? <p>{t('incidentEscalation.exemptionHelp')}</p> : null}{vps.incident_policy === 'oomd' ? <p>{t('incidentEscalation.memoryProtection')}</p> : null}</Alert> : null}
        <p className="text-sm text-muted">{t('incidentEscalation.sharedScope')}</p>
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          {times.map(([key, value]) => <div key={key}>
            <dt className="text-muted">{t(`incidentEscalation.${key}`)}</dt>
            <dd>{value ? formatDateTime(value) : t('common.none')}</dd>
          </div>)}
        </dl>
        {vps.incident_action_state && vps.incident_action_state !== 'none' ? (
          <Alert variant={vps.incident_action_state === 'pending' ? 'warn' : 'danger'}>
            {t(`incidentEscalation.action.${vps.incident_action_state}`)}
            {vps.incident_action_chain_id ? <Link className="ml-2 underline" to={`${basePath}/transactions/${vps.incident_action_chain_id}`}>
              {t('incidentEscalation.transaction', { id: vps.incident_action_chain_id })}
            </Link> : null}
          </Alert>
        ) : null}
        {vps.incident_stop_enforced && vps.incident_action_state === 'none' ? <p className="text-sm text-muted">{
          vps.incident_next_stop_allowed_at
            ? t('incidentEscalation.nextIncidentAfter', { time: formatDateTime(vps.incident_next_stop_allowed_at) })
            : t('incidentEscalation.nextIncident')
        }</p> : null}
        <p className="text-sm text-muted">{t('incidentEscalation.recovery', { limit: vps.incident_stop_limit })}</p>
        {mode === 'admin' && auth.role === 'admin'
          && vps.incident_warning_limit_override !== undefined && vps.incident_stop_limit_override !== undefined
          ? <VpsIncidentSettingsForm key={`${vps.id}:${vps.incident_policy}`} vps={vps} /> : null}
      </CardBody>
    </Card>
  );
}
