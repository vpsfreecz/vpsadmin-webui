import React from 'react';

import { useI18n } from '../../../app/i18n';

export function VpsAccessStatusCard(props: { ownerLabel: string }) {
  const { t } = useI18n();

  return (
    <div>
      <h2 className="text-base font-semibold text-fg">{t('vps.access.title')}</h2>
      <p className="mt-1 text-sm text-muted">
        {t('vps.access.status.owner')}: {props.ownerLabel}
      </p>
    </div>
  );
}
