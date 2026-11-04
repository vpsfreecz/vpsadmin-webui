import React, { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAccountTimeZone } from '../../../../app/accountTimeZone';
import { useI18n } from '../../../../app/i18n';
import { useToasts } from '../../../../app/toasts';

import { useChrome } from '../../../../components/layout/ChromeContext';

import { Alert } from '../../../../components/ui/Alert';
import { Badge } from '../../../../components/ui/Badge';
import { Button } from '../../../../components/ui/Button';
import { Card, CardBody, CardHeader } from '../../../../components/ui/Card';
import { ConfirmDialog } from '../../../../components/ui/ConfirmDialog';
import { ErrorState } from '../../../../components/ui/ErrorState';
import { Input } from '../../../../components/ui/Input';
import { LoadingState } from '../../../../components/ui/LoadingState';

import { createUserPayment } from '../../../../lib/api/payments';
import { fetchUserAccount, updateUserAccount } from '../../../../lib/api/userAccounts';
import { getMetaActionStateId } from '../../../../lib/api/haveapi';
import { objectRef } from '../../../../lib/objectRef';
import type { ObjectRef } from '../../../../lib/objectRef';

import { formatDateInTimeZone } from '../../../../lib/format';
import { getPaidUntilStatus, paidUntilBadgeVariant, paidUntilStatusLabelKey } from '../../../../lib/paymentsBadges';
import { formatMoneyLike, safeInt } from '../../../../lib/paymentsFormat';

import { paidUntilSubtitleToken } from '../../payments/PaymentsModel';

import { AdminUserPaymentHistory } from './AdminUserPaymentHistory';
import { AdminUserPaymentInstructions } from './AdminUserPaymentInstructions';
import {
  AdminUserPaymentManualReview,
  AdminUserPaymentSettingsReview,
  type ManualPaymentReview,
  type PaymentSettingsReview,
} from './AdminUserPaymentReviews';
import { useAdminUserContext } from './AdminUserLayout';

function isoToDateInput(value: unknown): string {
  if (typeof value !== 'string' || !value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) {
    const trimmed = value.trim();
    return /^\d{4}-\d{2}-\d{2}/.test(trimmed) ? trimmed.slice(0, 10) : '';
  }
  return d.toISOString().slice(0, 10);
}

function parsePositiveWholeAmount(value: string): number | null {
  const normalized = value.trim();
  if (!/^\d+$/.test(normalized)) return null;
  const amount = Number(normalized);
  return Number.isSafeInteger(amount) && amount > 0 ? amount : null;
}

function parseNonNegativeWholeAmount(value: string): number | null {
  const normalized = value.trim();
  if (!/^\d+$/.test(normalized)) return null;
  const amount = Number(normalized);
  return Number.isSafeInteger(amount) && amount >= 0 ? amount : null;
}

export function AdminUserPaymentsPage() {
  const accountTimeZone = useAccountTimeZone();
  const { t, tc } = useI18n();
  const toasts = useToasts();
  const qc = useQueryClient();
  const chrome = useChrome();

  const { userId, user, refetch } = useAdminUserContext();
  const paymentTarget = user.login ? `${user.login} (#${userId})` : `#${userId}`;


  const accountQ = useQuery({
    queryKey: ['user_accounts', userId],
    queryFn: async () => (await fetchUserAccount(userId)).data,
    staleTime: 30_000,
    refetchOnWindowFocus: 'always',
  });
  const accountInitialError = accountQ.isError && accountQ.data === undefined;
  const accountDataStale = accountQ.isError && accountQ.data !== undefined;
  const accountReviewBlocked = accountQ.isFetching || accountQ.isError;

  const monthlyPayment = safeInt(accountQ.data?.monthly_payment ?? user.monthly_payment);
  const paidUntil = (accountQ.data?.paid_until ?? user.paid_until) as unknown;

  const now = new Date();
  const status = getPaidUntilStatus(paidUntil, now);

  const paidUntilSubtitle = (() => {
    const token = paidUntilSubtitleToken(status);
    return token.kind === 'plural' ? tc(token.key, token.count) : t(token.key);
  })();

  const [quickPaidUntil, setQuickPaidUntil] = useState('');
  const [quickMonthlyPayment, setQuickMonthlyPayment] = useState('');
  const [quickAmount, setQuickAmount] = useState('');
  const [settingsReview, setSettingsReview] = useState<PaymentSettingsReview | null>(null);
  const [manualPaymentReview, setManualPaymentReview] = useState<ManualPaymentReview | null>(null);
  const settingsInFlightRef = useRef(false);
  const manualPaymentInFlightRef = useRef(false);

  useEffect(() => {
    setQuickPaidUntil(isoToDateInput(paidUntil));
  }, [paidUntil]);

  useEffect(() => {
    setQuickMonthlyPayment(monthlyPayment !== undefined ? String(monthlyPayment) : '');
  }, [monthlyPayment]);

  const monthlyPaymentParsed = parseNonNegativeWholeAmount(quickMonthlyPayment);
  const amountParsed = parsePositiveWholeAmount(quickAmount);
  const activeMonthlyPayment = typeof monthlyPayment === 'number' && monthlyPayment > 0
    ? monthlyPayment
    : null;
  const manualPaymentMonths = amountParsed !== null
    && activeMonthlyPayment !== null
    && amountParsed % activeMonthlyPayment === 0
    ? amountParsed / activeMonthlyPayment
    : null;
  const currentPaidUntilInput = isoToDateInput(paidUntil);
  const paidUntilChanged = quickPaidUntil !== currentPaidUntilInput;
  const monthlyPaymentInvalid = quickMonthlyPayment.trim() !== '' && monthlyPaymentParsed === null;
  const monthlyPaymentChanged = monthlyPaymentParsed !== null && monthlyPaymentParsed !== monthlyPayment;

  const paidUntilM = useMutation({
    mutationFn: async (nextPaidUntil: string | null) => {
      await updateUserAccount(userId, {
        paid_until: nextPaidUntil,
      });
    },
    onSettled: () => {
      settingsInFlightRef.current = false;
    },
    onSuccess: () => {
      toasts.pushToast({ variant: 'ok', title: t('admin.user.payments.settings.toast.paid_until_saved') });
      setSettingsReview(null);
      void qc.invalidateQueries({ queryKey: ['user_payments', 'account_history', { userId }] });
      void qc.invalidateQueries({ queryKey: ['user_accounts', userId] });
      void qc.invalidateQueries({ queryKey: ['finance'] });
      void qc.invalidateQueries({ queryKey: ['payment_stats', 'estimate_income'] });
      refetch();
    },
  });

  const monthlyPaymentM = useMutation({
    mutationFn: async (nextMonthlyPayment: number) => {
      if (!Number.isSafeInteger(nextMonthlyPayment) || nextMonthlyPayment < 0) {
        throw new Error(t('admin.user.payments.settings.validation.monthly_payment'));
      }
      await updateUserAccount(userId, {
        monthly_payment: nextMonthlyPayment,
      });
    },
    onSettled: () => {
      settingsInFlightRef.current = false;
    },
    onSuccess: () => {
      toasts.pushToast({ variant: 'ok', title: t('admin.user.payments.settings.toast.monthly_saved') });
      setSettingsReview(null);
      void qc.invalidateQueries({ queryKey: ['user_accounts', userId] });
      void qc.invalidateQueries({ queryKey: ['finance'] });
      void qc.invalidateQueries({ queryKey: ['payment_stats', 'estimate_income'] });
      refetch();
    },
  });

  const addM = useMutation({
    mutationFn: async (amount: number) => {
      if (!Number.isSafeInteger(amount) || amount <= 0) {
        throw new Error(t('admin.user.payments.add_payment.validation.amount'));
      }

      const res = await createUserPayment({ user: userId, amount });

      const asId = getMetaActionStateId(res.meta);
      if (asId) {
        chrome.trackActionState(asId, {
          actionLabelKey: 'action.user_payment.create.label',
          objectLabel: user.login,
          object: objectRef('User', userId),
        });
      }
    },
    onMutate: () => {
      const ref = objectRef('User', userId);
      chrome.acquireLocalLock(ref);
      return { lockRef: ref };
    },
    onSettled: (_data, _err, _vars, ctx: { lockRef?: ObjectRef } | undefined) => {
      manualPaymentInFlightRef.current = false;
      if (ctx?.lockRef) chrome.releaseLocalLock(ctx.lockRef);
    },
    onSuccess: () => {
      toasts.pushToast({ variant: 'ok', title: t('admin.user.payments.add_payment.toast.created') });
      setQuickAmount('');
      setManualPaymentReview(null);
      void qc.invalidateQueries({ queryKey: ['user_payments'] });
      void qc.invalidateQueries({ queryKey: ['user_accounts', userId] });
      void qc.invalidateQueries({ queryKey: ['finance'] });
      void qc.invalidateQueries({ queryKey: ['payment_stats', 'estimate_income'] });
      refetch();
    },
  });

  const submitPaidUntil = (e: React.FormEvent) => {
    e.preventDefault();
    if (accountReviewBlocked) return;
    if (!paidUntilChanged) {
      toasts.pushToast({ variant: 'neutral', title: t('admin.user.payments.settings.validation.no_changes') });
      return;
    }
    paidUntilM.reset();
    setSettingsReview({
      kind: 'paid_until',
      previous: currentPaidUntilInput,
      next: quickPaidUntil,
    });
  };

  const submitMonthlyPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (accountReviewBlocked) return;
    if (!monthlyPaymentChanged) {
      toasts.pushToast({ variant: 'neutral', title: t('admin.user.payments.settings.validation.no_changes') });
      return;
    }
    if (monthlyPaymentParsed !== null) {
      monthlyPaymentM.reset();
      setSettingsReview({
        kind: 'monthly_payment',
        previous: monthlyPayment ?? null,
        next: monthlyPaymentParsed,
      });
    }
  };

  const submitAddPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (accountReviewBlocked) return;
    if (amountParsed === null || manualPaymentMonths === null || activeMonthlyPayment === null) return;
    addM.reset();
    setManualPaymentReview({
      amount: amountParsed,
      monthlyPayment: activeMonthlyPayment,
      months: manualPaymentMonths,
    });
  };

  const settingsMutationPending = paidUntilM.isPending || monthlyPaymentM.isPending;
  const settingsReviewError = settingsReview?.kind === 'paid_until' ? paidUntilM.error : monthlyPaymentM.error;
  const settingsReviewStale = settingsReview !== null && (
    settingsReview.kind === 'paid_until'
      ? settingsReview.previous !== currentPaidUntilInput
      : settingsReview.previous !== (monthlyPayment ?? null)
  );
  const manualPaymentReviewStale = manualPaymentReview !== null
    && manualPaymentReview.monthlyPayment !== activeMonthlyPayment;
  return (
    <div className="space-y-4">
      <Card testId="admin.user.payments.quick.card">
        <CardHeader title={t('admin.user.payments.quick.title')} subtitle={t('admin.user.payments.quick.subtitle')} />
        <CardBody>
          {accountInitialError ? (
            <ErrorState
              testId="admin.user.payments.settings.error"
              title={t('admin.user.payments.settings.load_error.title')}
              error={accountQ.error}
              showDetails
            />
          ) : null}

          {accountDataStale ? (
            <Alert
              variant="warn"
              title={t('admin.user.payments.settings.stale.title')}
              description={t('admin.user.payments.settings.stale.body')}
              testId="admin.user.payments.settings.stale"
            />
          ) : null}

          {!accountInitialError ? (
          <div className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(18rem,1fr)]">
            <div className="space-y-4 rounded-lg border border-border bg-surface-2 p-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold">{t('admin.user.payments.settings.title')}</div>
                  <div className="mt-1 text-xs text-muted">{t('admin.user.payments.settings.description')}</div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-muted">{t('payments.my.stat.payment_id')}</div>
                  <div className="text-lg font-semibold tabular-nums text-fg">{userId}</div>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <form className="space-y-2" onSubmit={submitPaidUntil} data-testid="admin.user.payments.paid_until.form">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="text-xs font-semibold text-muted">{t('admin.user.payments.settings.field.paid_until')}</div>
                    <Badge variant={paidUntilBadgeVariant(status.status)}>{t(paidUntilStatusLabelKey(status.status))}</Badge>
                  </div>
                  <Input
                    testId="admin.user.payments.settings.paid_until"
                    type="date"
                    value={quickPaidUntil}
                    onChange={(e) => setQuickPaidUntil(e.target.value)}
                    disabled={accountReviewBlocked || settingsMutationPending}
                  />
                  <div className="text-xs text-muted">{paidUntilSubtitle}</div>
                  <Button
                    type="submit"
                    variant="secondary"
                    size="sm"
                    loading={paidUntilM.isPending}
                    disabled={accountReviewBlocked || settingsMutationPending || !paidUntilChanged}
                    testId="admin.user.payments.settings.paid_until.save"
                  >
                    {t('admin.user.payments.settings.save_paid_until')}
                  </Button>
                </form>

                <form className="space-y-2" onSubmit={submitMonthlyPayment} data-testid="admin.user.payments.monthly.form">
                  <Input
                    label={t('admin.user.payments.settings.field.monthly_payment')}
                    testId="admin.user.payments.settings.monthly_payment"
                    type="number"
                    inputMode="numeric"
                    min={0}
                    value={quickMonthlyPayment}
                    onChange={(e) => setQuickMonthlyPayment(e.target.value)}
                    ariaInvalid={monthlyPaymentInvalid}
                    disabled={accountReviewBlocked || settingsMutationPending}
                  />
                  {monthlyPaymentInvalid ? (
                    <div className="text-xs text-danger" role="alert" data-testid="admin.user.payments.settings.monthly.validation">
                      {t('admin.user.payments.settings.validation.monthly_payment')}
                    </div>
                  ) : (
                    <div className="text-xs text-muted">{t('admin.user.payments.settings.hint.monthly_payment')}</div>
                  )}
                  <Button
                    type="submit"
                    variant="secondary"
                    size="sm"
                    loading={monthlyPaymentM.isPending}
                    disabled={accountReviewBlocked || settingsMutationPending || !monthlyPaymentChanged}
                    testId="admin.user.payments.settings.monthly.save"
                  >
                    {t('common.save')}
                  </Button>
                </form>
              </div>
            </div>

            <form className="space-y-3 rounded-lg border border-border bg-surface-2 p-3" onSubmit={submitAddPayment} data-testid="admin.user.payments.add.form">
              <div>
                <div className="text-sm font-semibold">{t('admin.user.payments.add_payment.title')}</div>
                <div className="mt-1 text-xs text-muted">{t('admin.user.payments.add_payment.description')}</div>
              </div>
              <Input
                label={t('admin.user.payments.add_payment.field.amount')}
                testId="admin.user.payments.add.amount_input"
                type="number"
                inputMode="numeric"
                min={1}
                value={quickAmount}
                onChange={(e) => setQuickAmount(e.target.value)}
                placeholder={monthlyPayment !== undefined ? String(monthlyPayment) : undefined}
                disabled={addM.isPending || monthlyPaymentM.isPending || accountReviewBlocked}
              />
              {activeMonthlyPayment === null ? (
                <div className="text-xs text-danger" data-testid="admin.user.payments.add.validation">
                  {t('admin.user.payments.add_payment.validation.no_monthly_payment')}
                </div>
              ) : quickAmount.trim() && amountParsed === null ? (
                <div className="text-xs text-danger" data-testid="admin.user.payments.add.validation">
                  {t('admin.user.payments.add_payment.validation.amount')}
                </div>
              ) : amountParsed !== null && manualPaymentMonths === null ? (
                <div className="text-xs text-danger" data-testid="admin.user.payments.add.validation">
                  {t('admin.user.payments.add_payment.validation.multiple', { monthly: formatMoneyLike(activeMonthlyPayment) })}
                </div>
              ) : activeMonthlyPayment !== null ? (
                <div className="text-xs text-muted" data-testid="admin.user.payments.add.hint">
                  {t('admin.user.payments.add_payment.hint.multiple', { monthly: formatMoneyLike(activeMonthlyPayment) })}
                </div>
              ) : null}
              <Button
                type="submit"
                variant="primary"
                size="sm"
                disabled={manualPaymentMonths === null || addM.isPending || monthlyPaymentM.isPending || accountReviewBlocked}
                testId="admin.user.payments.add.save"
              >
                {t('admin.user.payments.add_payment')}
              </Button>
            </form>
          </div>
          ) : null}
        </CardBody>
      </Card>

      <ConfirmDialog
        open={settingsReview !== null}
        title={t('admin.user.payments.review.settings.title')}
        description={t('admin.user.payments.review.settings.subtitle')}
        confirmLabel={t('common.save')}
        confirmLoading={settingsMutationPending}
        confirmDisabled={accountReviewBlocked || settingsReviewStale}
        cancelDisabled={settingsMutationPending}
        onCancel={() => {
          if (!settingsMutationPending) {
            paidUntilM.reset();
            monthlyPaymentM.reset();
            setSettingsReview(null);
          }
        }}
        onConfirm={() => {
          if (settingsReview === null || settingsReviewStale || accountReviewBlocked || settingsInFlightRef.current) return;
          settingsInFlightRef.current = true;
          if (settingsReview.kind === 'paid_until') {
            paidUntilM.mutate(settingsReview.next || null);
          } else {
            monthlyPaymentM.mutate(settingsReview.next);
          }
        }}
        testId="admin.user.payments.settings.review"
      >
        {settingsReview ? (
          <AdminUserPaymentSettingsReview
            settingsReview={settingsReview}
            settingsReviewStale={settingsReviewStale}
            settingsReviewError={settingsReviewError}
            target={paymentTarget}
          />
        ) : null}
      </ConfirmDialog>

      <ConfirmDialog
        open={manualPaymentReview !== null}
        title={t('admin.user.payments.review.add.title')}
        description={t('admin.user.payments.review.add.subtitle')}
        confirmLabel={t('admin.user.payments.add_payment')}
        confirmLoading={addM.isPending}
        confirmDisabled={accountReviewBlocked || manualPaymentReviewStale}
        cancelDisabled={addM.isPending}
        onCancel={() => {
          if (!addM.isPending) {
            addM.reset();
            setManualPaymentReview(null);
          }
        }}
        onConfirm={() => {
          if (manualPaymentReview === null || manualPaymentReviewStale || accountReviewBlocked || manualPaymentInFlightRef.current) return;
          manualPaymentInFlightRef.current = true;
          addM.mutate(manualPaymentReview.amount);
        }}
        testId="admin.user.payments.add.review"
      >
        {manualPaymentReview !== null ? (
          <AdminUserPaymentManualReview
            manualPaymentReview={manualPaymentReview}
            manualPaymentReviewStale={manualPaymentReviewStale}
            error={addM.isError ? addM.error : null}
            target={paymentTarget}
          />
        ) : null}
      </ConfirmDialog>

      <AdminUserPaymentInstructions userId={userId} />
      <AdminUserPaymentHistory userId={userId} />
    </div>
  );
}
