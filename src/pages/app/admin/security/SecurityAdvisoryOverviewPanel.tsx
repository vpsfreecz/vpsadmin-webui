import type { ReactNode } from 'react';

import { useI18n } from '../../../../app/i18n';
import { Alert } from '../../../../components/ui/Alert';
import { Card, CardBody, CardHeader } from '../../../../components/ui/Card';
import type { Language } from '../../../../lib/api/languages';
import type { SecurityAdvisory } from '../../../../lib/api/securityAdvisories';
import { formatDateTime } from '../../../../lib/format';
import type { PublishReadinessIssue } from './securityAdvisoryAdminModel';
import { finiteSecurityAdvisoryCount, securityAdvisoryReadinessMessage } from './securityAdvisoryDetailViewModel';

function StatCard(props: { label: ReactNode; value: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-medium text-muted">{props.label}</dt>
      <dd className="mt-1 break-words text-sm font-medium text-fg">{props.value}</dd>
    </div>
  );
}

export function SecurityAdvisoryOverviewPanel(props: {
  advisory: SecurityAdvisory;
  languages: Language[];
  readinessIssues: PublishReadinessIssue[];
  readinessDataReady: boolean;
  readinessError?: unknown;
}) {
  const { t } = useI18n();
  const readinessKnown = props.readinessDataReady && !props.readinessError;

  return (
    <div className="space-y-4">
      <dl className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
        <StatCard
          label={t('admin.security_advisories.table.nodes')}
          value={finiteSecurityAdvisoryCount(props.advisory.affected_node_count)}
        />
        <StatCard
          label={t('admin.security_advisories.table.users')}
          value={finiteSecurityAdvisoryCount(props.advisory.affected_user_count)}
        />
        <StatCard
          label={t('admin.security_advisories.table.vps')}
          value={finiteSecurityAdvisoryCount(props.advisory.affected_vps_count)}
        />
        <StatCard
          label={t('admin.security_advisories.table.published')}
          value={<span>{props.advisory.published_at ? formatDateTime(props.advisory.published_at) : '—'}</span>}
        />
      </dl>

      {props.advisory.state === 'draft' ? (
        <Alert
          variant={!readinessKnown ? 'neutral' : props.readinessIssues.length === 0 ? 'ok' : 'warn'}
          title={
            props.readinessError
              ? t('admin.security_advisories.readiness.data_unavailable')
              : !props.readinessDataReady
                ? t('common.loading')
                : props.readinessIssues.length === 0
                  ? t('admin.security_advisories.readiness.ready')
                  : t('admin.security_advisories.readiness.not_ready')
          }
          testId="admin.security_advisory.readiness"
        >
          {!readinessKnown ? null : props.readinessIssues.length === 0 ? (
            t('admin.security_advisories.readiness.ready_body')
          ) : (
            <ul className="list-disc space-y-1 pl-5">
              {props.readinessIssues.slice(0, 8).map((issue, index) => (
                <li key={`${issue.type}-${index}`}>{securityAdvisoryReadinessMessage(issue, t)}</li>
              ))}
              {props.readinessIssues.length > 8 ? (
                <li>{t('admin.security_advisories.readiness.more', { count: props.readinessIssues.length - 8 })}</li>
              ) : null}
            </ul>
          )}
        </Alert>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        {props.languages.map((language) => {
          const code = String(language.code ?? '')
            .trim()
            .toLowerCase();
          if (!code) return null;
          return (
            <Card key={language.id}>
              <CardHeader title={String(language.label ?? code.toUpperCase())} subtitle={code.toUpperCase()} />
              <CardBody className="space-y-4">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-faint">
                    {t('admin.security_advisories.field.summary')}
                  </div>
                  <p className="mt-1 text-sm text-fg">{String(props.advisory[`${code}_summary`] ?? '—')}</p>
                </div>
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-faint">
                    {t('admin.security_advisories.field.description')}
                  </div>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-muted">
                    {String(props.advisory[`${code}_description`] ?? '—')}
                  </p>
                </div>
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-faint">
                    {t('admin.security_advisories.field.response')}
                  </div>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-muted">
                    {String(props.advisory[`${code}_response`] ?? '—')}
                  </p>
                </div>
              </CardBody>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
