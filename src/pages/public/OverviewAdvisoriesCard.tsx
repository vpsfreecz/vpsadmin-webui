import React from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '../../app/i18n';
import { Alert } from '../../components/ui/Alert';
import { Card, CardBody, CardHeader } from '../../components/ui/Card';
import { Spinner } from '../../components/ui/Spinner';
import type { SecurityAdvisory } from '../../lib/api/securityAdvisories';
import { formatDateTime } from '../../lib/time';
import { pickTranslation } from '../../lib/translations';

export function OverviewAdvisoriesCard(props: { advisories?: SecurityAdvisory[]; loading: boolean; error: boolean }) {
  const i18n = useI18n();
  const { advisories = [], loading, error } = props;
  if (!loading && !error && advisories.length === 0) return null;

  return (
    <Card testId="public.advisories.card">
      <CardHeader
        className="px-3 py-3 sm:items-baseline"
        title={i18n.t('public.security_advisories.title')}
        actions={<Link to="/security-advisories" className="text-sm underline">{i18n.t('public.overview.security.all')}</Link>}
      />
      <CardBody className="px-3 py-3">
        {loading ? <Spinner label={i18n.t('public.security_advisories.loading')} /> : error ? (
          <Alert title={i18n.t('public.security_advisories.error')} variant="danger" />
        ) : (
          <div className="divide-y divide-border">
            {advisories.map(advisory => {
              const summary = pickTranslation(advisory, 'summary', i18n.preferredLanguageCodes);
              return (
              <div key={advisory.id} className="space-y-1 py-2 first:pt-0 last:pb-0">
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                  <Link to={`/security-advisories/${advisory.id}`} className="min-w-0 break-words font-medium underline">
                    {advisory.name || i18n.t('public.security_advisories.fallback_title', { id: advisory.id })}
                  </Link>
                  <span className="text-xs text-muted">{formatDateTime(advisory.published_at)}</span>
                </div>
                {summary ? <p className="break-words text-sm text-muted">{summary}</p> : null}
              </div>
              );
            })}
          </div>
        )}
      </CardBody>
    </Card>
  );
}
