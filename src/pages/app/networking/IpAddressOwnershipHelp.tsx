import { useI18n } from '../../../app/i18n';

export function IpAddressOwnershipHelp() {
  const { t } = useI18n();
  return (
    <details className="border-t border-border" data-testid="network.user.ownership_help">
      <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-fg">
        {t('network.user.ownership_help.title')}
      </summary>
      <div className="space-y-2 px-4 pb-4 text-sm text-muted">
        <p>{t('network.user.ownership_help.detach')}</p>
        <p>{t('network.user.ownership_help.ownership')}</p>
        <p>{t('network.user.ownership_help.return')}</p>
      </div>
    </details>
  );
}
