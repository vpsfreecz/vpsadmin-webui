import type { useI18n } from '../../../app/i18n';
import type { ToastSpec } from '../../../app/toasts';

export function vpsMigrateReceipt(t: ReturnType<typeof useI18n>['t'], target: string, openTasks: () => void): ToastSpec {
  return {
    variant: 'ok',
    title: t('vps.lifecycle.migrate.success'),
    body: t('vps.lifecycle.migrate.accepted_body', { target }),
    autoDismissMs: false,
    action: { label: t('common.open_tasks'), onClick: openTasks },
  };
}
