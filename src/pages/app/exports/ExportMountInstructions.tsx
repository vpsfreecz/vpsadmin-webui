import { useI18n } from '../../../app/i18n';
import { Alert } from '../../../components/ui/Alert';
import { Card, CardBody, CardHeader } from '../../../components/ui/Card';
import { CopyButton } from '../../../components/ui/CopyButton';
import { snippetFstab, snippetMountCommand, snippetNix, snippetSystemd } from './ExportModel';

export function ExportMountInstructions(props: {
  sourceIsSnapshot: boolean;
  address: string;
  path: string;
  mountPoint: string;
  rw: boolean;
}) {
  const { t } = useI18n();
  const { sourceIsSnapshot, address, path, mountPoint, rw } = props;
  const mountCommand = snippetMountCommand(address, path, mountPoint);
  const fstabLine = snippetFstab(address, path, mountPoint, rw);
  const systemdUnit = snippetSystemd(address, path, mountPoint, rw);
  const nixSnippet = snippetNix(address, path, mountPoint, rw);

  return (
    <Card testId="exports.detail.instructions">
      <CardHeader
        title={t('exports.detail.instructions.title')}
        subtitle={sourceIsSnapshot ? t('exports.detail.instructions.snapshot_subtitle') : t('exports.detail.instructions.dataset_subtitle')}
        actions={<CopyButton text={mountCommand} label={t('exports.instructions.copy_command')} testId="exports.detail.instructions.command.copy" />}
      />
      <CardBody className="space-y-4">
        {sourceIsSnapshot ? (
          <Alert title={t('exports.detail.instructions.temporary.title')} variant="info">
            {t('exports.detail.instructions.temporary.body')}
          </Alert>
        ) : null}

        <div>
          <div className="mb-2 text-xs font-semibold text-muted">{t('exports.instructions.command')}</div>
          <pre data-testid="exports.detail.instructions.command" className="max-w-full overflow-x-auto rounded-md border border-border bg-code p-3 text-xs text-fg">{mountCommand}</pre>
        </div>

        {!sourceIsSnapshot ? (
          <div className="min-w-0 space-y-4">
            <div className="min-w-0">
              <div className="mb-2 flex items-center justify-between gap-2 text-xs font-semibold text-muted">
                <span>{t('exports.instructions.fstab')}</span>
                <CopyButton text={fstabLine} label={t('common.copy')} testId="exports.detail.instructions.fstab.copy" />
              </div>
              <pre data-testid="exports.detail.instructions.fstab" className="max-w-full overflow-x-auto rounded-md border border-border bg-code p-3 text-xs text-fg">{fstabLine}</pre>
            </div>
            <div className="min-w-0">
              <div className="mb-2 flex items-center justify-between gap-2 text-xs font-semibold text-muted">
                <span>{t('exports.instructions.systemd')}</span>
                <CopyButton text={systemdUnit} label={t('common.copy')} testId="exports.detail.instructions.systemd.copy" />
              </div>
              <pre data-testid="exports.detail.instructions.systemd" className="max-h-scroll-lg max-w-full overflow-auto rounded-md border border-border bg-code p-3 text-xs text-fg">{systemdUnit}</pre>
            </div>
            <div className="min-w-0">
              <div className="mb-2 flex items-center justify-between gap-2 text-xs font-semibold text-muted">
                <span>{t('exports.instructions.nixos')}</span>
                <CopyButton text={nixSnippet} label={t('common.copy')} testId="exports.detail.instructions.nixos.copy" />
              </div>
              <pre data-testid="exports.detail.instructions.nixos" className="max-h-scroll-lg max-w-full overflow-auto rounded-md border border-border bg-code p-3 text-xs text-fg">{nixSnippet}</pre>
            </div>
          </div>
        ) : null}
      </CardBody>
    </Card>
  );
}
