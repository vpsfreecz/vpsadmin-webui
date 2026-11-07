import React from 'react';

import { useAppMode } from '../../../app/appMode';
import { useI18n } from '../../../app/i18n';
import type { Vps } from '../../../lib/api/vps';
import { objectStateBadge, type BadgeSpec } from '../../../lib/taskStatus';
import { Badge } from '../../../components/ui/Badge';
import { LockBadge } from '../../../components/ui/LockBadge';

import { vpsUsageRisks } from './vpsListSemantics';
import { VpsUsageRiskBadges } from './VpsUsageRiskBadges';
import { useRecentVpsOomReports } from './useRecentVpsOomReports';
import { VpsRecentOomBadge } from './VpsRecentOomBadge';

export function VpsHeaderStateBadges(props: {
  vps: Vps;
  runtime: BadgeSpec;
  creating: boolean;
  busyTransaction: boolean;
  busyLocalLock: boolean;
  activeChainIds: number[];
}) {
  const { t } = useI18n();
  const { basePath } = useAppMode();
  const recentOom = useRecentVpsOomReports({ vpsId: props.vps.id }).get(props.vps.id);
  const objectBadge = objectStateBadge(props.vps.object_state, t);
  const { diskRisk } = vpsUsageRisks(props.vps);

  return (
    <>
      <Badge variant={props.creating ? 'warn' : props.runtime.variant}>
        {props.creating ? t('common.creating') : props.runtime.label}
      </Badge>
      <Badge variant={objectBadge.variant}>{objectBadge.label}</Badge>
      <VpsUsageRiskBadges diskRisk={diskRisk} t={t} testIdPrefix="vps.header" />
      {recentOom ? <VpsRecentOomBadge report={recentOom} basePath={basePath} testId="vps.header.recent_oom" /> : null}
      {props.busyTransaction ? (
        <LockBadge kind="transaction" t={t} chainIds={props.activeChainIds} showDetails />
      ) : props.busyLocalLock ? (
        <LockBadge kind="local" t={t} />
      ) : null}
    </>
  );
}
