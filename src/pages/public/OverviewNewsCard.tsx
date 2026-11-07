import React from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '../../app/i18n';
import { Alert } from '../../components/ui/Alert';
import { Card, CardBody, CardHeader } from '../../components/ui/Card';
import { NewsMessage } from '../../components/ui/NewsMessage';
import { Spinner } from '../../components/ui/Spinner';
import type { NewsLog } from '../../lib/api/public';
import { formatDateTime } from '../../lib/time';
import { pickLocalizedFieldFrom } from '../../lib/translations';

export function OverviewNewsCard(props: { news?: NewsLog[]; newsLoading: boolean; newsError: boolean }) {
  const i18n = useI18n();
  return (
    <div data-testid="public.news.card">
      <Card>
        <CardHeader
          className="px-3 py-3 sm:items-baseline"
          title={i18n.t('public.overview.news.title')}
          actions={<Link to="/news" className="text-sm underline">{i18n.t('public.overview.news.all')}</Link>}
        />
        <CardBody className="px-3 py-3">
          {props.newsLoading ? (
            <Spinner label={i18n.t('public.overview.news.loading')} />
          ) : props.newsError ? (
            <Alert title={i18n.t('public.overview.news.error')} variant="danger" />
          ) : (props.news?.length ?? 0) === 0 ? (
            <div className="text-sm text-muted">{i18n.t('public.overview.news.empty')}</div>
          ) : (
            <div className="space-y-3">
              {props.news?.slice(0, 5).map((news) => (
                <div key={news.id} className="space-y-1">
                  <div className="text-xs text-muted">{formatDateTime(news.published_at)}</div>
                  <NewsMessage html={pickLocalizedFieldFrom(news, ['message', 'body', 'text'], i18n.preferredLanguageCodes) ?? news.message} />
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
