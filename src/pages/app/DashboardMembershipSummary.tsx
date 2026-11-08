import { Link } from 'react-router-dom';

import { useI18n } from '../../app/i18n';
import { formatDateInTimeZone } from '../../lib/format';
import { formatMoneyLike, safeInt } from '../../lib/paymentsFormat';

export interface DashboardMembership {
  paidUntil?: string | null;
  monthlyPayment?: number | null;
  timeZone: string;
}

export function DashboardMembershipSummary({ membership }: { membership: DashboardMembership }) {
  const { lang, t } = useI18n();

  return (
    <>
      <div data-testid="app.dashboard.kpi.paid-until" className="min-w-0 rounded-md bg-surface-2 px-3 py-2">
        <div className="text-xs font-medium text-muted">{t('dashboard.summary.paid_until')}</div>
        <div className="flex flex-wrap items-baseline gap-x-2">
          <span className="text-sm font-semibold">
            {formatDateInTimeZone(membership.paidUntil, membership.timeZone, lang)}
          </span>
          <Link
            to="/app/payments"
            data-testid="app.dashboard.kpi.payments.open"
            className="inline-flex min-h-6 items-center rounded text-xs text-muted underline underline-offset-2 hover:text-fg focus:outline-none focus:ring-2 focus:ring-focus/35 focus:ring-offset-2 focus:ring-offset-bg [@media(any-pointer:coarse)]:min-h-11"
          >
            {t('dashboard.summary.payment_details')} <span aria-hidden="true" className="ml-1">→</span>
          </Link>
        </div>
      </div>
      <div data-testid="app.dashboard.kpi.monthly-payment" className="min-w-0 rounded-md bg-surface-2 px-3 py-2">
        <div className="text-xs font-medium text-muted">{t('dashboard.summary.monthly_payment')}</div>
        <div className="mt-0.5 text-sm font-semibold">{formatMoneyLike(safeInt(membership.monthlyPayment), lang)}</div>
      </div>
    </>
  );
}
