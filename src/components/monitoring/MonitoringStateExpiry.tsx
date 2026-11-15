import { useI18n } from '../../app/i18n';
import { formatDateTime } from '../../lib/format';

export function MonitoringStateExpiry({ state, until }: { state: string; until: string | null | undefined }) {
  const { t } = useI18n();
  if (until) return formatDateTime(until);
  if (state !== 'acknowledged' && state !== 'ignored') return t('common.na');
  return until === null ? t('monitoring.saved_until.forever') : t('common.unknown');
}
