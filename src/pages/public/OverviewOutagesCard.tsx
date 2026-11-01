import React from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '../../app/i18n';
import { CompactOutageSummary } from '../../components/outages/CompactOutageSummary';
import { Alert } from '../../components/ui/Alert';
import { Card, CardBody, CardHeader } from '../../components/ui/Card';
import { Spinner } from '../../components/ui/Spinner';
import type { PublicOutagesByCategory } from './OverviewModel';

export function OverviewOutagesCard(props: {
  groups: PublicOutagesByCategory;
  loading: boolean;
  error: boolean;
  resolved?: boolean;
}) {
  const { t } = useI18n();
  const rows = props.resolved ? props.groups.resolved.slice(0, 3) : [
    ...props.groups.current.slice(0, 3),
    ...props.groups.planned.slice(0, 3),
    ...props.groups.unknown.slice(0, 3),
  ];
  if (props.resolved ? rows.length === 0 : !props.loading && !props.error && rows.length === 0) return null;
  return (
    <Card testId={props.resolved ? 'public.outages.resolved' : 'public.outages.card'}>
      <CardHeader
        className="px-3 py-3 sm:items-baseline"
        title={t(props.resolved ? 'public.overview.outages.resolved_title' : 'public.overview.outages.title')}
        actions={<Link to="/outages" className="text-sm underline">{t('public.overview.outages.all')}</Link>}
      />
      <CardBody className="px-3 py-3">
        {props.loading ? <Spinner label={t('public.overview.outages.loading')} /> : props.error ? (
          <Alert title={t('public.overview.outages.error')} variant="danger" />
        ) : (
          <div className="divide-y divide-border overflow-hidden rounded-md border border-border">
            {rows.map(outage => <CompactOutageSummary key={outage.id} outage={outage} to={`/outages/${outage.id}`} />)}
          </div>
        )}
      </CardBody>
    </Card>
  );
}
