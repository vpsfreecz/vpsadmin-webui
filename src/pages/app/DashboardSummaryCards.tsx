import { useI18n } from '../../app/i18n';
import type { ObjectScope } from '../../app/objectScope';
import type { DashboardDensity } from '../../app/dashboardSettingsModel';
import { Card, CardBody } from '../../components/ui/Card';
import { LinkButton } from '../../components/ui/LinkButton';
import { DashboardMembershipSummary, type DashboardMembership } from './DashboardMembershipSummary';

export function formatDashboardNumber(value: unknown, language?: 'cs' | 'en'): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '—';
  return new Intl.NumberFormat(language === 'cs' ? 'cs-CZ' : language).format(value);
}

type SummaryCount = {
  isLoading: boolean;
  isError: boolean;
  totalCount?: number;
};

function summaryCountText(count: SummaryCount, language: 'cs' | 'en') {
  if (count.isLoading) return '…';
  if (count.isError) return '—';
  return formatDashboardNumber(count.totalCount, language);
}

export function DashboardSummaryCards(props: {
  appMode: 'user' | 'admin';
  basePath: string;
  density: DashboardDensity;
  scope: ObjectScope;
  membership: DashboardMembership;
  vps: SummaryCount;
  datasets: SummaryCount;
  dns: SummaryCount;
  adminCounts?: {
    members: SummaryCount;
    unmatchedPayments: SummaryCount;
    awaitingRequests: SummaryCount;
  };
}) {
  const { lang, t, tc } = useI18n();
  const compact = props.density === 'compact';
  const adminCounts = props.scope === 'all' ? props.adminCounts : undefined;
  const columns = props.scope === 'mine' ? 'md:grid-cols-2 xl:grid-cols-4'
    : adminCounts ? 'sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6' : 'md:grid-cols-3';
  const items: { testId: string; label: string; value: string; openTestId?: string; to?: string }[] = [
    {
      testId: 'app.dashboard.kpi.vps',
      label: t('nav.vps'),
      value: summaryCountText(props.vps, lang),
    },
    ...(props.appMode === 'admin'
      ? [{
          testId: 'app.dashboard.kpi.datasets',
          openTestId: 'app.dashboard.kpi.datasets.open',
          label: t('nav.datasets'),
          value: summaryCountText(props.datasets, lang),
          to: `${props.basePath}/datasets`,
        }]
      : []),
    {
      testId: 'app.dashboard.kpi.dns',
      label: props.dns.isLoading || props.dns.isError || props.dns.totalCount == null
        ? t('dashboard.summary.dns.other')
        : tc('dashboard.summary.dns', props.dns.totalCount),
      value: summaryCountText(props.dns, lang),
    },
    ...(adminCounts ? [
      {
        testId: 'app.dashboard.kpi.members',
        label: t('public.overview.stats.members.title'),
        value: summaryCountText(adminCounts.members, lang),
      },
      {
        testId: 'app.dashboard.kpi.unmatched-payments',
        label: t('dashboard.summary.unmatched_payments'),
        value: summaryCountText(adminCounts.unmatchedPayments, lang),
      },
      {
        testId: 'app.dashboard.kpi.awaiting-requests',
        label: t('dashboard.summary.awaiting_requests'),
        value: summaryCountText(adminCounts.awaitingRequests, lang),
      },
    ] : []),
  ];

  return (
    <Card testId="app.dashboard.summary-grid" className="shadow-none">
      <CardBody compact={compact}>
        <h2 className="mb-2 text-xs font-medium text-muted" data-testid="app.dashboard.summary-title">
          {t('dashboard.summary.title')}
        </h2>
        {props.scope === 'all' ? (
          <p className="mb-2 text-xs text-muted" data-testid="app.dashboard.summary-scope">
            {t('dashboard.summary.scope.all')}
          </p>
        ) : null}
        <div className={`grid gap-2 ${columns}`}>
          {items.map((item) => (
            <div
              key={item.testId}
              data-testid={item.testId}
              className="flex items-center justify-between gap-3 rounded-md bg-surface-2 px-3 py-2"
            >
              <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1">
                <div className="text-2xl font-semibold leading-none">{item.value}</div>
                <div className="text-xs font-medium text-muted">{item.label}</div>
              </div>
              {item.to && item.openTestId ? (
                <LinkButton to={item.to} variant="secondary" size="sm" testId={item.openTestId}>
                  {t('common.open')}
                </LinkButton>
              ) : null}
            </div>
          ))}
          {props.scope === 'mine' ? <DashboardMembershipSummary membership={props.membership} /> : null}
        </div>
      </CardBody>
    </Card>
  );
}
