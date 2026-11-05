import React from 'react';
import type { I18nContextValue } from '../../../app/i18n';
import type { DatasetExpansion } from '../../../lib/api/datasets';

type Props = {
  t: I18nContextValue['t'];
  currentExpansion: Pick<DatasetExpansion, 'enable_notifications' | 'enable_shrink' | 'stop_vps'>;
};

export function DatasetExpansionAdminMetadata({ t, currentExpansion }: Props) {
  return (
    <>
      <div>
        <div className="text-xs text-faint">{t('dataset.expansion.field.notify')}</div>
        <div className="font-medium text-fg">
          {t(
            currentExpansion.enable_notifications === true
              ? 'common.enabled'
              : currentExpansion.enable_notifications === false
                ? 'common.disabled'
                : 'state.unknown'
          )}
        </div>
      </div>
      <div>
        <div className="text-xs text-faint">{t('dataset.expansion.field.auto_shrink')}</div>
        <div className="font-medium text-fg">
          {t(
            currentExpansion.enable_shrink === true
              ? 'common.enabled'
              : currentExpansion.enable_shrink === false
                ? 'common.disabled'
                : 'state.unknown'
          )}
        </div>
      </div>
      <div>
        <div className="text-xs text-faint">{t('dataset.expansion.field.stop_vps')}</div>
        <div className="font-medium text-fg">
          {t(
            currentExpansion.stop_vps === true
              ? 'common.enabled'
              : currentExpansion.stop_vps === false
                ? 'common.disabled'
                : 'state.unknown'
          )}
        </div>
      </div>
    </>
  );
}
