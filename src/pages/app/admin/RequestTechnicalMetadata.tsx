import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { useI18n } from '../../../app/i18n';
import type { ChangeRequest, RegistrationRequest } from '../../../lib/api/requests';
import { formatDateTime } from '../../../lib/format';
import { RequestOperationalLinks, requestOperationalLinks } from './RequestReviewActions';
import { requestLinkedUserId, safePositiveInteger } from './RequestReviewModel';

function userLabel(value: unknown): string {
  if (!value) return '—';
  if (typeof value === 'object') {
    const user = value as Record<string, unknown>;
    if (typeof user['login'] === 'string' && user['login']) return user['login'];
    if (typeof user['label'] === 'string' && user['label']) return user['label'];
    if (typeof user['id'] === 'number' || typeof user['id'] === 'string') return `#${user['id']}`;
  }
  return String(value);
}

function stringValue(value: unknown): string {
  if (value == null || value === '') return '—';
  return String(value);
}

export function DetailField(props: { label: React.ReactNode; value: unknown; wide?: boolean; testId?: string }) {
  return (
    <div className={props.wide ? 'md:col-span-2' : undefined} data-testid={props.testId}>
      <dt className="text-xs text-muted">{props.label}</dt>
      <dd className="mt-0.5 whitespace-pre-wrap break-words text-sm">{stringValue(props.value)}</dd>
    </div>
  );
}

export function RequestTechnicalMetadata({ request, basePath }: { request: ChangeRequest | RegistrationRequest; basePath: string }) {
  const { t } = useI18n();
  const requestUserId = requestLinkedUserId(request);
  const historicalUserId = safePositiveInteger(String(request.raw_user_id ?? ''));
  const { actionStateId, transactionChainId, transactionId } = requestOperationalLinks(request);
  const hasOperationalLinks = Boolean(actionStateId || transactionChainId || transactionId);
  return (
    <div data-testid="admin.requests.detail.metadata">
      <details className="group" open>
        <summary
          className="flex cursor-pointer list-none items-center gap-2 py-2 font-semibold"
          data-testid="admin.requests.detail.metadata.toggle"
        >
          <ChevronRight
            className="h-4 w-4 shrink-0 transition-transform group-open:rotate-90"
            aria-hidden
            data-testid="admin.requests.detail.metadata.chevron"
          />
          <span>
            {t('requests.detail.metadata.title')}
            <span className="ml-2 text-sm font-normal text-muted">{t('requests.detail.metadata.subtitle')}</span>
          </span>
        </summary>
        <div className="pt-2">
          <dl className="grid min-w-0 grid-cols-1 gap-x-4 gap-y-3 break-words sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <dt className="text-xs text-muted">{t('common.user')}</dt>
              <dd className="mt-0.5 text-sm" data-testid="admin.requests.detail.metadata.user">
                {requestUserId ? (
                  <Link className="text-accent hover:underline" to={`${basePath}/users/${requestUserId}`}>
                    {userLabel(request.user)}
                  </Link>
                ) : historicalUserId
                  ? `${t('requests.resolve.owner_missing.label')} #${historicalUserId}`
                  : userLabel(request.user)}
              </dd>
            </div>
            <DetailField label={t('requests.detail.admin')} value={userLabel(request.admin)} />
            <DetailField label={t('common.created')} value={formatDateTime(request.created_at)} />
            <DetailField label={t('common.updated')} value={formatDateTime(request.updated_at)} />
            <div>
              <dt className="text-xs text-muted">{t('requests.detail.api_ip')}</dt>
              <dd className="mt-0.5 text-sm">{stringValue(request.api_ip_addr)}</dd>
              {request.api_ip_ptr ? <dd className="text-xs text-muted">{request.api_ip_ptr}</dd> : null}
            </div>
            <div>
              <dt className="text-xs text-muted">{t('requests.detail.client_ip')}</dt>
              <dd className="mt-0.5 text-sm">{stringValue(request.client_ip_addr)}</dd>
              {request.client_ip_ptr ? <dd className="text-xs text-muted">{request.client_ip_ptr}</dd> : null}
            </div>
          </dl>
          {hasOperationalLinks ? (
            <div className="mt-4 border-t border-border pt-4">
              <div className="mb-2 text-xs text-muted">{t('requests.detail.card.operations')}</div>
              <RequestOperationalLinks request={request} basePath={basePath} compact testIdPrefix="admin.requests.detail" />
            </div>
          ) : null}
        </div>
      </details>
    </div>
  );
}
