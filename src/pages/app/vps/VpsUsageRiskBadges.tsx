import React from 'react';

import { Badge } from '../../../components/ui/Badge';

import type { RiskVariant, VpsListTranslator } from './vpsListSemantics';

export function VpsUsageRiskBadges(props: {
  memoryRisk: RiskVariant;
  diskRisk: RiskVariant;
  t: VpsListTranslator;
  testIdPrefix: string;
}) {
  const { memoryRisk, diskRisk, t } = props;
  return (
    <>
      {memoryRisk ? (
        <Badge variant={memoryRisk} testId={`${props.testIdPrefix}.ram_high`}>{t('vps.list.state.ram_high')}</Badge>
      ) : null}
      {diskRisk ? (
        <Badge variant={diskRisk} testId={`${props.testIdPrefix}.disk_high`}>{t('vps.list.state.disk_high')}</Badge>
      ) : null}
    </>
  );
}
