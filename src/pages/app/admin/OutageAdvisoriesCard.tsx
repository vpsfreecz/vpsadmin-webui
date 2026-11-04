import React from 'react';
import { Link } from 'react-router-dom';

import { useI18n } from '../../../app/i18n';
import { Alert } from '../../../components/ui/Alert';
import { Button } from '../../../components/ui/Button';
import { Card, CardBody, CardHeader } from '../../../components/ui/Card';
import { Spinner } from '../../../components/ui/Spinner';
import type { SecurityAdvisoryOutageLink } from '../../../lib/api/securityAdvisoryRelations';
import { formatErrorMessage } from '../../../lib/errors';

export function OutageAdvisoriesCard({
  links,
  loading,
  error,
  onRetry,
}: {
  links: SecurityAdvisoryOutageLink[];
  loading: boolean;
  error?: unknown;
  onRetry: () => void;
}) {
  const { t } = useI18n();
  if (!links.length && !loading && !error) return null;

  return (
    <Card testId="admin.outages.advisories">
      <CardHeader title={t('admin.outages.section.security_advisories')} />
      <CardBody>
        {error ? (
          <div role="alert" className="mb-3 space-y-2">
            <Alert variant="danger" title={t('common.error')}>
              {formatErrorMessage(error)}
            </Alert>
            <Button variant="secondary" onClick={onRetry}>
              {t('common.retry')}
            </Button>
          </div>
        ) : loading ? (
          <Spinner label={t('common.loading')} />
        ) : null}
        <div className="flex flex-wrap gap-2">
          {links.map((link) => {
            const advisory = typeof link.security_advisory === 'object' ? link.security_advisory : null;
            const id =
              advisory?.id ??
              link.security_advisory_id ??
              (typeof link.security_advisory === 'number' ? link.security_advisory : null);
            const label = advisory?.label || advisory?.name || (id ? `#${id}` : `#${link.id}`);
            return id ? (
              <Link key={link.id} className="text-link hover:underline" to={`/admin/security-advisories/${id}`}>
                {label}
              </Link>
            ) : (
              <span key={link.id}>{label}</span>
            );
          })}
        </div>
      </CardBody>
    </Card>
  );
}
