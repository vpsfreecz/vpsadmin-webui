import React from 'react';
import { useI18n } from '../../../../app/i18n';
import { Alert } from '../../../../components/ui/Alert';
import { Button } from '../../../../components/ui/Button';
import { Card, CardBody } from '../../../../components/ui/Card';
import { ConfirmDialog } from '../../../../components/ui/ConfirmDialog';
import { formatErrorMessage } from '../../../../lib/errors';
import type { UserPackageBulkRemoval } from './useUserPackageBulkRemoval';

export function UserPackageBulkActions({ bulk }: { bulk: UserPackageBulkRemoval }) {
  const { t } = useI18n();
  if (!bulk.allowed) return null;
  const result = bulk.currentResult;
  const removed = result?.outcomes.filter((item) => item.status === 'removed').length ?? 0;
  const allRemoved = Boolean(result?.refreshed && result.outcomes.every((item) => item.status === 'removed'));
  return (
    <>
      <Card testId="admin.user.resources.bulk">
        <CardBody className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold">
                {t('admin.user.resources.bulk.selected', { count: bulk.selected.length })}
              </div>
              <div className="text-xs text-muted">{t('admin.user.resources.bulk.scope')}</div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="secondary"
                size="sm"
                testId="admin.user.resources.bulk.all"
                disabled={bulk.disabled || bulk.eligible.length === 0}
                onClick={bulk.selectAll}
              >
                {t('admin.user.resources.bulk.all')}
              </Button>
              <Button
                variant="secondary"
                size="sm"
                testId="admin.user.resources.bulk.clear"
                disabled={bulk.busy || bulk.selected.length === 0}
                onClick={bulk.clear}
              >
                {t('admin.user.resources.bulk.clear')}
              </Button>
              <Button
                variant="danger"
                size="sm"
                testId="admin.user.resources.bulk.remove"
                disabled={bulk.disabled || bulk.selected.length === 0}
                onClick={bulk.openReview}
              >
                {t('admin.user.resources.bulk.remove', { count: bulk.selected.length })}
              </Button>
            </div>
          </div>
          {bulk.busy ? (
            <div role="status" data-testid="admin.user.resources.bulk.progress" className="text-sm text-muted">
              {t('admin.user.resources.bulk.progress', { count: bulk.completed })}
            </div>
          ) : null}
        </CardBody>
      </Card>
      {result ? (
        <Alert
          variant={allRemoved ? 'ok' : 'warn'}
          testId="admin.user.resources.bulk.result"
          title={t(allRemoved ? 'admin.user.resources.bulk.success' : 'admin.user.resources.bulk.partial', {
            count: removed,
            total: result.outcomes.length,
          })}
        >
          <ul className="mt-2 max-h-64 space-y-2 overflow-y-auto">
            {result.outcomes.map((item) => (
              <li key={item.id} data-testid={`admin.user.resources.bulk.result.${item.id}`} className="break-words">
                <span className="font-medium">
                  {t('admin.user.resources.bulk.target', { label: item.label, id: item.id })}
                </span>
                <div>{item.environment}</div>
                <div>{t(`admin.user.resources.bulk.status.${item.status}`)}</div>
                {item.error ? <div>{formatErrorMessage(item.error)}</div> : null}
              </li>
            ))}
          </ul>
          {bulk.unknown ? <p className="mt-3">{t('admin.user.resources.bulk.unknown')}</p> : null}
          {!result.refreshed ? <p className="mt-3">{t('admin.user.resources.bulk.refresh_failed')}</p> : null}
          {bulk.unknown || !result.refreshed ? (
            <Button
              className="mt-3"
              variant="secondary"
              size="sm"
              testId="admin.user.resources.bulk.refresh"
              loading={bulk.busy}
              onClick={() => {
                void bulk.reconcile();
              }}
            >
              {t('admin.user.resources.bulk.refresh')}
            </Button>
          ) : null}
          {bulk.refreshError ? (
            <p className="mt-2 text-danger" role="alert">
              {formatErrorMessage(bulk.refreshError)}
            </p>
          ) : null}
        </Alert>
      ) : null}
      <ConfirmDialog
        open={bulk.currentReview !== null}
        danger
        onCancel={bulk.closeReview}
        onConfirm={bulk.confirm}
        confirmLoading={bulk.busy}
        confirmDisabled={bulk.disabled || !bulk.reviewValid}
        testId="admin.user.resources.bulk.confirm"
        title={t('admin.user.resources.bulk.confirm_title', { count: bulk.currentReview?.targets.length ?? 0 })}
        description={t('admin.user.resources.bulk.confirm_body', { user: bulk.currentReview?.userLabel ?? '' })}
        confirmLabel={t('admin.user.resources.bulk.remove', { count: bulk.currentReview?.targets.length ?? 0 })}
      >
        <ul className="max-h-64 space-y-2 overflow-y-auto">
          {bulk.currentReview?.targets.map((item) => (
            <li key={item.id} className="break-words text-sm">
              <div className="font-medium">
                {t('admin.user.resources.bulk.target', { label: item.label, id: item.id })}
              </div>
              <div className="text-muted">{item.environment}</div>
            </li>
          ))}
        </ul>
        {!bulk.reviewValid ? (
          <p className="mt-3 text-sm text-danger">{t('admin.user.resources.bulk.changed')}</p>
        ) : null}
      </ConfirmDialog>
    </>
  );
}
