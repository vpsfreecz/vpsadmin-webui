import React from 'react';

import { useI18n } from '../../../app/i18n';
import { Button } from '../../../components/ui/Button';
import type { IpAddress } from '../../../lib/api/ipAddresses';

export function UserNetworkAddressActions(props: {
  ip: IpAddress;
  assigned: boolean;
  vpsId: number | null;
  basePath: string;
  onAssign: (ip: IpAddress) => void;
}) {
  const { t } = useI18n();
  if (props.assigned && props.vpsId) {
    return (
      <Button to={`${props.basePath}/vps/${props.vpsId}/network`} variant="secondary" size="sm">
        {t('network.user.action.open_vps')}
      </Button>
    );
  }
  return (
    <Button
      variant="primary"
      size="sm"
      testId={`network.user.ip.${props.ip.id}.assign`}
      disabled={props.ip.network?.enabled === false}
      title={props.ip.network?.enabled === false ? t('admin.cluster.networks.enabled.help') : undefined}
      onClick={() => props.onAssign(props.ip)}
    >
      {t('network.user.action.assign')}
    </Button>
  );
}
