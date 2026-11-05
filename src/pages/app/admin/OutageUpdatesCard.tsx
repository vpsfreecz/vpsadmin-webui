import React from 'react';

import { useI18n } from '../../../app/i18n';
import { Alert } from '../../../components/ui/Alert';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Card, CardBody, CardHeader } from '../../../components/ui/Card';
import { Spinner } from '../../../components/ui/Spinner';
import type { OutageUpdate } from '../../../lib/api/public';
import { formatErrorMessage } from '../../../lib/errors';
import { formatDateTime } from '../../../lib/format';
import { outageUpdateBadges } from '../../../lib/outageBadges';
import { pickLocalizedField } from '../../../lib/translations';

export function OutageUpdatesCard(props: {
  updates?: OutageUpdate[];
  loading: boolean;
  error?: unknown;
  onRetry: () => void;
  preferredLanguageCodes: string[];
}) {
  const { t } = useI18n();

  return (
    <Card testId="admin.outages.updates">
      <CardHeader title={t('admin.outages.section.updates')} />
      <CardBody>
        {props.error ? (
          <div role="alert" className="mb-3 space-y-2">
            <Alert variant="danger" title={t('common.error')}>
              {formatErrorMessage(props.error)}
            </Alert>
            <Button variant="secondary" onClick={props.onRetry}>
              {t('common.retry')}
            </Button>
          </div>
        ) : props.loading ? (
          <Spinner label={t('common.loading')} />
        ) : null}
        {props.updates?.length ? (
          <div className="space-y-3">
            {props.updates.map((update) => {
              const badges = outageUpdateBadges(update, t);
              const summary =
                pickLocalizedField(update, 'summary', props.preferredLanguageCodes) ??
                t('public.outage_detail.updates.update_fallback', { id: update.id });
              return (
                <div key={update.id} className="rounded-md border border-border p-3">
                  <div className="flex flex-wrap gap-2">
                    <Badge variant={badges.lifecycle.variant}>{badges.lifecycle.label}</Badge>
                    {badges.impact ? <Badge variant={badges.impact.variant}>{badges.impact.label}</Badge> : null}
                  </div>
                  <div className="mt-2 text-sm font-medium">{summary}</div>
                  <div className="mt-1 text-xs text-muted">
                    {formatDateTime(update.created_at)} · {update.reporter_name || '—'}
                  </div>
                </div>
              );
            })}
          </div>
        ) : !props.loading && !props.error ? (
          <div className="text-sm text-muted">{t('public.outage_detail.updates.empty')}</div>
        ) : null}
      </CardBody>
    </Card>
  );
}
