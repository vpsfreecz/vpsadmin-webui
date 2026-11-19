import { Link } from 'react-router-dom';
import { useI18n } from '../../../app/i18n';
import { formatDateTime } from '../../../lib/format';
import { Badge } from '../../../components/ui/Badge';
import { IncidentPolicyCounts, type IncidentPolicyCountRow } from './IncidentPolicyCounts';

/** Presentation facts from one saved matched evaluation, never current policy limits. */
export function IncidentPolicySavedSection(props: {
  label: string;
  warning: IncidentPolicyCountRow;
  stop: IncidentPolicyCountRow;
  evaluatedAt?: string | null;
  decision?: string | null;
  currentHref?: string;
  historyHref?: string;
}) {
  const { t } = useI18n();
  return (
    <section className="space-y-2 border-b border-border pb-3 last:border-0 last:pb-0">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="break-words font-semibold">{props.label}</h3>
        {['none', 'warning', 'stop'].includes(props.decision ?? '') ? (
          <Badge variant="neutral">{t(`incidentEscalation.decision.${props.decision}`)}</Badge>
        ) : null}
      </div>
      {props.evaluatedAt ? <p className="text-sm text-muted">{formatDateTime(props.evaluatedAt)}</p> : null}
      <IncidentPolicyCounts warning={props.warning} stop={props.stop} />
      {props.currentHref || props.historyHref ? (
        <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
          {props.currentHref ? (
            <Link className="underline" to={props.currentHref}>
              {t('incidentEscalation.currentPolicy')}
            </Link>
          ) : null}
          {props.historyHref ? (
            <Link className="underline" to={props.historyHref}>
              {t('incidentEscalation.history')}
            </Link>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
