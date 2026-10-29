import { useI18n } from '../../../app/i18n';
import { Alert } from '../../../components/ui/Alert';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog';
import { Input } from '../../../components/ui/Input';
import { VpsConfirmTarget } from './VpsPowerConfirmation';

type Props = {
  open: boolean;
  vpsId: number;
  objectLabel: string;
  pending: boolean;
  allowed: boolean;
  error: string | null;
  onCancel: () => void;
  onConfirm: () => Promise<void>;
  enable: boolean;
  reason: string;
  onReasonChange: (value: string) => void;
};

/** Presentation only: the caller retains permission gates and mutation snapshots. */
export function VpsNetworkToggleDialog(props: Props) {
  const { t } = useI18n();
  const testId = props.enable ? 'vps.network.enable_confirm' : 'vps.network.disable_confirm';
  return (
    <ConfirmDialog
      testId={testId}
      open={props.open}
      title={props.enable ? t('vps.network.enable_dialog.title') : t('vps.network.disable_dialog.title')}
      description={
        props.enable ? t('vps.network.enable_dialog.description') : t('vps.network.disable_dialog.description')
      }
      danger={!props.enable}
      confirmLabel={props.enable ? t('vps.network.enable_button') : t('vps.network.disable_button')}
      confirmLoading={props.pending}
      confirmDisabled={!props.allowed}
      onCancel={props.onCancel}
      onConfirm={props.onConfirm}
    >
      <div className="space-y-3">
        <VpsConfirmTarget vpsId={props.vpsId} objectLabel={props.objectLabel} testId={`${testId}.target`} />
        {props.error ? (
          <Alert variant="danger" testId={`${testId}.error`}>
            {props.error}
          </Alert>
        ) : null}
        {!props.enable ? (
          <div>
            <div className="text-xs font-medium text-muted">{t('vps.network.change_reason.label')}</div>
            <div className="mt-1">
              <Input
                testId="vps.network.disable.reason"
                value={props.reason}
                onChange={(event) => props.onReasonChange(event.target.value)}
                placeholder={t('vps.network.change_reason.placeholder')}
                autoComplete="off"
              />
            </div>
            <div className="mt-1 text-xs text-muted">{t('vps.network.change_reason.help')}</div>
          </div>
        ) : null}
      </div>
    </ConfirmDialog>
  );
}
