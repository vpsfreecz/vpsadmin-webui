import React from 'react';

import { useI18n } from '../../../app/i18n';
import type { Vps } from '../../../lib/api/vps';
import { objectStateBadge, type BadgeSpec } from '../../../lib/taskStatus';
import { Badge } from '../../../components/ui/Badge';
import { LockBadge } from '../../../components/ui/LockBadge';

import { vpsUsageRisks } from './vpsListSemantics';
import { VpsUsageRiskBadges } from './VpsUsageRiskBadges';

export function VpsHeaderStateBadges(props: {
  vps: Vps;
  runtime: BadgeSpec;
  creating: boolean;
  busyTransaction: boolean;
  busyLocalLock: boolean;
  activeChainIds: number[];
}) {
  const { t } = useI18n();
  const objectBadge = objectStateBadge(props.vps.object_state, t);
  const { memoryRisk, diskRisk } = vpsUsageRisks(props.vps);

  return (
    <>
      <Badge variant={props.creating ? 'warn' : props.runtime.variant}>
        {props.creating ? t('common.creating') : props.runtime.label}
      </Badge>
      <Badge variant={objectBadge.variant}>{objectBadge.label}</Badge>
      <VpsUsageRiskBadges memoryRisk={memoryRisk} diskRisk={diskRisk} t={t} testIdPrefix="vps.header" />
      {props.busyTransaction ? (
        <LockBadge kind="transaction" t={t} chainIds={props.activeChainIds} showDetails />
      ) : props.busyLocalLock ? (
        <LockBadge kind="local" t={t} />
      ) : null}
    </>
  );
}
