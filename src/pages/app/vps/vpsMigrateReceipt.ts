import type { useI18n } from '../../../app/i18n';
import type { ToastSpec } from '../../../app/toasts';
import type { VpsMigratePayload } from '../../../lib/api/vps';

export function vpsMigrateReceipt(
  t: ReturnType<typeof useI18n>['t'],
  target: string,
  submitted: Readonly<VpsMigratePayload>,
  openTasks: () => void
): ToastSpec {
  // Match the API default and classify only the captured submitted payload.
  const timing =
    submitted.maintenance_window !== false
      ? 'maintenance'
      : typeof submitted.finish_weekday === 'number' && typeof submitted.finish_minutes === 'number'
        ? 'custom'
        : 'immediate';
  const bodyKey =
    timing === 'maintenance'
      ? 'vps.lifecycle.migrate.accepted_maintenance'
      : timing === 'custom'
        ? 'vps.lifecycle.migrate.accepted_custom'
        : 'vps.lifecycle.migrate.accepted_body';

  return {
    variant: 'ok',
    title: t(timing === 'immediate' ? 'vps.lifecycle.migrate.success' : 'vps.lifecycle.migrate.scheduled'),
    body: t(bodyKey, { target }),
    autoDismissMs: false,
    action: { label: t('common.open_tasks'), onClick: openTasks },
  };
}
