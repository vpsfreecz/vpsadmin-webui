import { Link } from 'react-router-dom';
import { useI18n } from '../../../app/i18n';
import { useAccountTimeZone } from '../../../app/accountTimeZone';
import type { OomReport } from '../../../lib/api/oom';
import { formatDateTimeInTimeZone } from '../../../lib/format';
import { Badge } from '../../../components/ui/Badge';

export function VpsRecentOomBadge(props: { report: OomReport; basePath: string; testId: string }) {
  const { t, lang } = useI18n();
  const timeZone = useAccountTimeZone();
  const time = formatDateTimeInTimeZone(props.report.created_at, timeZone, lang);
  return (
    <Link
      to={`${props.basePath}/oom-reports/${props.report.id}`}
      data-testid={props.testId}
      title={t('vps.list.state.recent_oom_title', { id: props.report.id, time })}
      className="inline-flex max-w-full rounded-md"
    >
      <Badge variant="warn" className="underline underline-offset-2">
        {t('vps.list.state.recent_oom', { time })}
      </Badge>
    </Link>
  );
}
