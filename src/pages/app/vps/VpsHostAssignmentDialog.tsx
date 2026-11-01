import { useI18n } from '../../../app/i18n';
import { ActionButton } from '../../../components/ui/ActionButton';
import { Alert } from '../../../components/ui/Alert';
import { Button } from '../../../components/ui/Button';
import { Modal } from '../../../components/ui/Modal';
import type { HostIpAddress } from '../../../lib/api/networking';
import { hostAddr } from './VpsNetworkModel';
import { VpsConfirmTarget } from './VpsPowerConfirmation';

export function VpsHostAssignmentDialog(props: {
  host: HostIpAddress | null;
  parent: { id: number; name?: string | null } | undefined;
  vpsId: number;
  objectLabel: string;
  eligible: boolean;
  pending: boolean;
  error: string | null;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const { t } = useI18n();
  const interfaceLabel = props.parent?.name || (props.parent ? `#${props.parent.id}` : t('common.na'));
  return <Modal open={!!props.host} testId="vps.network.host_addresses.assign"
    title={props.host ? t('vps.network.host_addresses.assign.title_for_ip', { address: hostAddr(props.host) }) : t('vps.network.host_addresses.assign.title')}
    onClose={props.onClose} footer={<div className="flex items-center justify-end gap-2">
      <Button variant="secondary" testId="vps.network.host_addresses.assign.cancel" onClick={props.onClose} disabled={props.pending}>{t('common.cancel')}</Button>
      <ActionButton testId="vps.network.host_addresses.assign.submit" loading={props.pending} disabled={!props.eligible} onClick={props.onConfirm}>{t('vps.network.host_addresses.action.assign')}</ActionButton>
    </div>}>
    <div className="space-y-4">
      <VpsConfirmTarget vpsId={props.vpsId} objectLabel={props.objectLabel} testId="vps.network.host_addresses.assign.target" />
      <div data-testid="vps.network.host_addresses.assign.interface">
        <div className="mb-1 text-sm font-medium">{t('vps.network.ip_addresses.assign.interface')}</div>{interfaceLabel}
      </div>
      <div className="rounded-md border border-border bg-surface-2 p-3 text-xs text-muted">
        {props.host ? t('vps.network.host_addresses.assign.preview', { address: hostAddr(props.host), interface: interfaceLabel }) : null}
      </div>
      {props.error ? <Alert variant="danger" testId="vps.network.host_addresses.assign.error">{props.error}</Alert> : null}
    </div>
  </Modal>;
}
