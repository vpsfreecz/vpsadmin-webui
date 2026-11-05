import { useI18n } from '../../app/i18n';
import type { ObjectScope } from '../../app/objectScope';
import type { DashboardDensity } from '../../app/dashboardSettingsModel';
import { Card, CardBody } from '../../components/ui/Card';
import { LinkButton } from '../../components/ui/LinkButton';

export function formatDashboardNumber(value: unknown): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '—';
  return new Intl.NumberFormat().format(value);
}

export function DashboardSummaryCards(props: {
  appMode: 'user' | 'admin';
  scope: ObjectScope;
  basePath: string;
  density: DashboardDensity;
  vps: {
    isLoading: boolean;
    isError: boolean;
    totalCount?: number;
  };
  datasets: {
    isLoading: boolean;
    isError: boolean;
    totalCount?: number;
  };
  dns: {
    isLoading: boolean;
    isError: boolean;
    totalCount?: number;
  };
}) {
  const { t } = useI18n();
  const compact = props.density === 'compact';
  const items = [
    {
      testId: 'app.dashboard.kpi.vps',
      openTestId: 'app.dashboard.kpi.vps.open',
      label: t('nav.vps'),
      value: props.vps.isLoading ? '…' : props.vps.isError ? '—' : formatDashboardNumber(props.vps.totalCount),
      to: `${props.basePath}/vps`,
    },
    ...(props.appMode === 'admin'
      ? [{
          testId: 'app.dashboard.kpi.datasets',
          openTestId: 'app.dashboard.kpi.datasets.open',
          label: t('nav.datasets'),
          value: props.datasets.isLoading ? '…' : props.datasets.isError ? '—' : formatDashboardNumber(props.datasets.totalCount),
          to: `${props.basePath}/datasets`,
        }]
      : []),
    {
      testId: 'app.dashboard.kpi.dns',
      openTestId: 'app.dashboard.kpi.dns.open',
      label: t('nav.dns'),
      value: props.dns.isLoading ? '…' : props.dns.isError ? '—' : formatDashboardNumber(props.dns.totalCount),
      to: `${props.basePath}/dns`,
    },
  ];

  return (
    <Card testId="app.dashboard.summary-grid" className="shadow-none">
      <CardBody className={compact ? 'p-2' : 'p-3'}>
        <p className="mb-2 text-xs font-medium text-muted" data-testid="app.dashboard.summary-scope">
          {t(props.scope === 'all' ? 'dashboard.summary.scope.all' : 'dashboard.summary.scope.mine')}
        </p>
        <div className={`grid gap-2 ${props.appMode === 'admin' ? 'md:grid-cols-3' : 'md:grid-cols-2'}`}>
          {items.map((item) => (
            <div
              key={item.testId}
              data-testid={item.testId}
              className="flex items-center justify-between gap-3 rounded-md bg-surface-2 px-3 py-2"
            >
              <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1">
                <div className="text-xs font-medium uppercase text-muted">{item.label}</div>
                <div className="text-2xl font-semibold leading-none">{item.value}</div>
              </div>
              <LinkButton to={item.to} variant="secondary" size="sm" testId={item.openTestId}>
                {t('common.open')}
              </LinkButton>
            </div>
          ))}
        </div>
      </CardBody>
    </Card>
  );
}
