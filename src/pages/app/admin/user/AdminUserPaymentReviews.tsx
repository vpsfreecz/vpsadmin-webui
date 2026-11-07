import React from 'react';

import { useI18n } from '../../../../app/i18n';
import { Alert } from '../../../../components/ui/Alert';
import { formatErrorMessage } from '../../../../lib/errors';
import { formatMoneyLike } from '../../../../lib/paymentsFormat';

export interface ManualPaymentReview {
  amount: number;
  monthlyPayment: number;
  months: number;
}

export type PaymentSettingsReview =
  | { kind: 'paid_until'; previous: string; next: string }
  | { kind: 'monthly_payment'; previous: number | null; next: number };

export function AdminUserPaymentSettingsReview({
  settingsReview, settingsReviewStale, settingsReviewError, target,
}: {
  settingsReview: PaymentSettingsReview;
  settingsReviewStale: boolean;
  settingsReviewError: unknown;
  target: string;
}) {
  const { t } = useI18n();
  const paidUntilMovesBackward = settingsReview.kind === 'paid_until'
    && Boolean(settingsReview.previous)
    && Boolean(settingsReview.next)
    && settingsReview.next < settingsReview.previous;
  const paidUntilClears = settingsReview.kind === 'paid_until'
    && Boolean(settingsReview.previous)
    && !settingsReview.next;
  return (
    <div className="space-y-3">
      {settingsReviewStale ? (
        <Alert
          variant="warn"
          title={t('admin.user.payments.review.settings.stale.title')}
          testId="admin.user.payments.settings.review.stale"
        >
          {t('admin.user.payments.review.settings.stale.body')}
        </Alert>
      ) : null}
      {settingsReviewError ? (
        <Alert variant="danger" title={t('common.error')} testId="admin.user.payments.settings.review.error">
          {formatErrorMessage(settingsReviewError)}
        </Alert>
      ) : null}
      {paidUntilMovesBackward ? (
        <Alert
          variant="warn"
          title={t('admin.user.payments.review.settings.backward.title')}
          testId="admin.user.payments.settings.review.backward"
        >
          {t('admin.user.payments.review.settings.backward.body')}
        </Alert>
      ) : null}
      {paidUntilClears ? (
        <Alert
          variant="danger"
          title={t('admin.user.payments.review.settings.clear.title')}
          testId="admin.user.payments.settings.review.clear"
        >
          {t('admin.user.payments.review.settings.clear.body')}
        </Alert>
      ) : null}
      {settingsReview.kind === 'monthly_payment' && settingsReview.next === 0 ? (
        <Alert
          variant="warn"
          title={t('admin.user.payments.review.settings.monthly_payment_zero.title')}
          testId="admin.user.payments.settings.review.monthly_payment_zero"
        >
          {t('admin.user.payments.review.settings.monthly_payment_zero.body')}
        </Alert>
      ) : null}
      <div className="divide-y divide-border rounded-md border border-border bg-surface-2 text-sm">
        <div className="grid gap-1 p-3 sm:grid-cols-[9rem_minmax(0,1fr)]" data-testid="admin.user.payments.settings.review.target">
          <div className="text-xs font-medium uppercase tracking-wide text-muted">{t('admin.user.payments.review.target')}</div>
          <div className="break-words font-medium">{target}</div>
        </div>
        <div className="grid gap-1 p-3 sm:grid-cols-[9rem_minmax(0,1fr)]" data-testid="admin.user.payments.settings.review.change">
          <div className="text-xs font-medium uppercase tracking-wide text-muted">
            {t(settingsReview.kind === 'paid_until'
              ? 'admin.user.payments.settings.field.paid_until'
              : 'admin.user.payments.settings.field.monthly_payment')}
          </div>
          <div className="break-words font-medium tabular-nums">
            {settingsReview.kind === 'paid_until' ? (
              <>{settingsReview.previous || t('common.none')} → {settingsReview.next || t('common.none')}</>
            ) : (
              <>{formatMoneyLike(settingsReview.previous ?? undefined)} → {formatMoneyLike(settingsReview.next)}</>
            )}
          </div>
        </div>
      </div>
      <Alert variant="info" title={t('admin.user.payments.review.impact')}>
        {t(settingsReview.kind === 'paid_until'
          ? 'admin.user.payments.review.settings.paid_until.impact'
          : 'admin.user.payments.review.settings.monthly_payment.impact')}
      </Alert>
    </div>
  );
}

export function AdminUserPaymentManualReview({
  manualPaymentReview, manualPaymentReviewStale, error, target,
}: {
  manualPaymentReview: ManualPaymentReview;
  manualPaymentReviewStale: boolean;
  error: Error | null;
  target: string;
}) {
  const { t } = useI18n();
  return (
    <div className="space-y-3">
      {manualPaymentReviewStale ? (
        <Alert
          variant="warn"
          title={t('admin.user.payments.review.add.stale.title')}
          testId="admin.user.payments.add.review.stale"
        >
          {t('admin.user.payments.review.add.stale.body')}
        </Alert>
      ) : null}
      {error !== null ? (
        <Alert variant="danger" title={t('common.error')} testId="admin.user.payments.add.review.error">
          {formatErrorMessage(error)}
        </Alert>
      ) : null}
      <div className="divide-y divide-border rounded-md border border-border bg-surface-2 text-sm">
        <div className="grid gap-1 p-3 sm:grid-cols-[9rem_minmax(0,1fr)]" data-testid="admin.user.payments.add.review.target">
          <div className="text-xs font-medium uppercase tracking-wide text-muted">{t('admin.user.payments.review.target')}</div>
          <div className="break-words font-medium">{target}</div>
        </div>
        <div className="grid gap-1 p-3 sm:grid-cols-[9rem_minmax(0,1fr)]" data-testid="admin.user.payments.add.review.monthly">
          <div className="text-xs font-medium uppercase tracking-wide text-muted">{t('admin.user.payments.settings.field.monthly_payment')}</div>
          <div className="font-medium tabular-nums">{formatMoneyLike(manualPaymentReview.monthlyPayment)}</div>
        </div>
        <div className="grid gap-1 p-3 sm:grid-cols-[9rem_minmax(0,1fr)]" data-testid="admin.user.payments.add.review.months">
          <div className="text-xs font-medium uppercase tracking-wide text-muted">{t('admin.user.payments.add_payment.field.months')}</div>
          <div className="font-medium tabular-nums">{manualPaymentReview.months}</div>
        </div>
        <div className="grid gap-1 p-3 sm:grid-cols-[9rem_minmax(0,1fr)]" data-testid="admin.user.payments.add.review.amount">
          <div className="text-xs font-medium uppercase tracking-wide text-muted">{t('admin.user.payments.add_payment.field.amount')}</div>
          <div className="font-medium tabular-nums">{formatMoneyLike(manualPaymentReview.amount)}</div>
        </div>
      </div>
      <Alert variant="info" title={t('admin.user.payments.review.impact')}>
        {t('admin.user.payments.review.add.impact')}
      </Alert>
      <Alert variant="warn" title={t('admin.user.payments.review.add.email.title')}>
        {t('admin.user.payments.review.add.email.body')}
      </Alert>
      <p className="text-xs text-muted">{t('admin.user.payments.review.add.queue')}</p>
    </div>
  );
}
