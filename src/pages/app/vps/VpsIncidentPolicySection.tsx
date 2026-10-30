import { useEffect, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useI18n } from '../../../app/i18n';
import { Alert } from '../../../components/ui/Alert';
import { Badge } from '../../../components/ui/Badge';
import { Card, CardBody, CardHeader } from '../../../components/ui/Card';
import { IncidentPolicyCounts } from '../incidents/IncidentPolicyCounts';
import { incidentPolicyAnchorId } from '../incidents/incidentPolicyLinks';

interface CountRow {
  count: number;
  limit: number | null;
  days: number;
}

/** Presentation props, independent of generated API resource models. */
export interface VpsIncidentPolicySectionProps {
  policyKey: string;
  label: string;
  description?: string | null;
  warning: CountRow;
  shutdown: CountRow;
  configurationValid: boolean;
  status: string | null;
  historyHref: string;
  details?: ReactNode;
  settings?: ReactNode;
}

export function VpsIncidentPolicySection(props: VpsIncidentPolicySectionProps) {
  const { t } = useI18n();
  const location = useLocation();
  const anchorId = incidentPolicyAnchorId(props.policyKey);
  useEffect(() => {
    if (location.hash === `#${encodeURIComponent(anchorId)}`)
      document.getElementById(anchorId)?.scrollIntoView({ block: 'start' });
  }, [anchorId, location.hash]);
  const statusKey = ['clear', 'near_limit', 'warning', 'stop_threshold'].includes(props.status ?? '')
    ? `incidentEscalation.status.${props.status}`
    : undefined;
  const statusVariant =
    props.status === 'stop_threshold'
      ? 'danger'
      : props.status === 'warning' || props.status === 'near_limit'
        ? 'warn'
        : 'neutral';
  return (
    <Card id={anchorId} className="scroll-mt-4" testId={`vps.incidents.policy.${props.policyKey}`}>
      <CardHeader
        compact
        title={<h2 className="break-words">{props.label}</h2>}
        actions={
          <Link className="text-sm underline" to={props.historyHref}>
            {t('incidentEscalation.history')}
          </Link>
        }
      />
      <CardBody compact className="space-y-3">
        {props.description ? <p className="break-words text-sm text-muted">{props.description}</p> : null}
        {!props.configurationValid ? <Alert variant="danger">{t('incidentEscalation.misconfigured')}</Alert> : null}
        <IncidentPolicyCounts
          warning={{ ...props.warning, limit: props.configurationValid ? props.warning.limit : null }}
          stop={{ ...props.shutdown, limit: props.configurationValid ? props.shutdown.limit : null }}
        />
        {props.configurationValid && statusKey ? (
          <Badge variant={statusVariant}>
            {props.status === 'warning' || props.status === 'stop_threshold'
              ? `${props.label}: ${t(statusKey)}`
              : t(statusKey)}
          </Badge>
        ) : null}
        {props.details ? <div className="space-y-2 text-sm">{props.details}</div> : null}
        {props.settings}
      </CardBody>
    </Card>
  );
}
