import React from 'react';
import { useQuery } from '@tanstack/react-query';

import { fetchNews } from '../../lib/api/public';
import { Alert } from '../../components/ui/Alert';
import { Card } from '../../components/ui/Card';
import { NewsMessage } from '../../components/ui/NewsMessage';
import { Spinner } from '../../components/ui/Spinner';
import { formatDateTime } from '../../lib/time';
import { useI18n } from '../../app/i18n';
import { pickLocalizedFieldFrom } from '../../lib/translations';

export function NewsPage() {
  const i18n = useI18n();
  const newsQ = useQuery({
    queryKey: ['news_logs', 'index'],
    queryFn: async () => (await fetchNews()).data,
  });

  return (
    <div className="space-y-6" data-testid="public.news.page">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">{i18n.t('public.news.title')}</h1>
        <p className="text-sm text-muted">{i18n.t('public.news.subtitle')}</p>
      </div>

      {newsQ.isLoading ? (
        <Spinner label={i18n.t('public.news.loading')} />
      ) : newsQ.isError ? (
        <Alert title={i18n.t('public.news.error')} variant="danger" />
      ) : (newsQ.data?.length ?? 0) === 0 ? (
        <Alert title={i18n.t('public.news.empty.title')} variant="info">
          {i18n.t('public.news.empty.body')}
        </Alert>
      ) : (
        <Card className="overflow-hidden">
          <ol className="divide-y divide-border" aria-label={i18n.t('public.news.title')}>
            {newsQ.data?.map((n) => (
              <li key={n.id} className="grid min-w-0 gap-1 px-4 py-2 even:bg-surface-2 sm:grid-cols-[12rem_minmax(0,1fr)] sm:gap-4" data-testid="public.news.item">
                <time dateTime={n.published_at} className="text-sm leading-relaxed text-muted">
                  {formatDateTime(n.published_at)}
                </time>
                <NewsMessage
                  className="min-w-0 [overflow-wrap:anywhere]"
                  html={pickLocalizedFieldFrom(n, ['message', 'body', 'text'], i18n.preferredLanguageCodes) ?? n.message}
                />
              </li>
            ))}
          </ol>
        </Card>
      )}
    </div>
  );
}
