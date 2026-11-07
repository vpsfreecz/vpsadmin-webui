import React from 'react';

import { Badge } from '../../../components/ui/Badge';

import type { RiskVariant, VpsListTranslator } from './vpsListSemantics';

export function VpsUsageRiskBadges(props: {
  diskRisk: RiskVariant;
  t: VpsListTranslator;
  testIdPrefix: string;
}) {
  const { diskRisk, t } = props;
  return (
    <>
      {diskRisk ? (
        <Badge variant={diskRisk} testId={`${props.testIdPrefix}.disk_high`}>{t('vps.list.state.disk_high')}</Badge>
      ) : null}
    </>
  );
}
