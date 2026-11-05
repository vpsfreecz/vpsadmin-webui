import React from 'react';
import type { I18nContextValue } from '../../../../app/i18n';
import { Alert } from '../../../../components/ui/Alert';
import { ConfirmDialog } from '../../../../components/ui/ConfirmDialog';
import type { ClusterResourcePackage } from '../../../../lib/api/clusterResourcePackages';

type Props = {
  t: I18nContextValue['t'];
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  pending: boolean;
  deletePkg: ClusterResourcePackage | null;
  impactCount: string;
  error: string | null;
};

export function ResourcePackageDeleteDialog({
  t,
  open,
  onCancel,
  onConfirm,
  pending,
  deletePkg,
  impactCount,
  error,
}: Props) {
  return (
    <ConfirmDialog
      open={open}
      onCancel={onCancel}
      onConfirm={onConfirm}
      danger
      title={t('admin.cluster.resource_packages.delete_confirm.title')}
      description={t('admin.cluster.resource_packages.delete_confirm.description')}
      confirmLabel={t('common.delete')}
      confirmLoading={pending}
      confirmDisabled={!deletePkg}
      testId="admin.cluster.resource_packages.delete_confirm"
    >
      {deletePkg ? (
        <div className="space-y-3">
          <div className="rounded-md border border-border bg-surface-subtle px-3 py-2">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted">
              {t('admin.cluster.resource_packages.delete_confirm.target')}
            </div>
            <div className="mt-1 font-medium text-fg">
              {typeof deletePkg.label === 'string' && deletePkg.label.trim()
                ? deletePkg.label.trim()
                : `#${deletePkg.id}`}
              {typeof deletePkg.label === 'string' && deletePkg.label.trim() ? (
                <span className="ml-2 text-sm font-normal text-muted">#{deletePkg.id}</span>
              ) : null}
            </div>
          </div>
          <div className="text-sm text-muted">
            {t('admin.cluster.resource_packages.delete_confirm.impact', {
              count: impactCount,
            })}
          </div>
          {error !== null ? (
            <Alert
              variant="danger"
              title={t('common.error')}
              testId="admin.cluster.resource_packages.delete_confirm.error"
            >
              {error}
            </Alert>
          ) : null}
        </div>
      ) : null}
    </ConfirmDialog>
  );
}
