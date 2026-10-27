import type { TransactionChain } from '../../../lib/api/transactions';
import { formatDateTime } from '../../../lib/format';
import { resourceId, refLabel } from '../../../lib/resources';
import { safeContentUrl } from '../../../lib/safeUrl';
import { safeJson } from '../../../lib/txFormat';
import { normalizeTransactionChainConcerns } from '../../../lib/concerns';
import { directConcernLink, shortConcernClassName } from '../../../lib/concernLinks';
import { Link } from 'react-router-dom';
import { Card, CardBody, CardHeader } from '../../../components/ui/Card';
import { getChainUserRef, getChainUserSessionRef, type TransactionChainsTranslator } from './transactionChainSemantics';

export function TransactionChainSummary(props: {
  chain: TransactionChain;
  basePath: string;
  t: TransactionChainsTranslator;
  progress: string;
  currentId: number | null;
  failedId: number | null;
}) {
  const { chain, t, basePath } = props;
  const user = getChainUserRef(chain);
  const session = getChainUserSessionRef(chain);
  const userId = resourceId(user);
  const sessionId = resourceId(session);
  const actionId = resourceId(chain['action_state']);
  const stepId = props.failedId ?? props.currentId;
  return (
    <Card testId="transactions.chain.detail.info">
      <CardHeader title={t('transactions.chain.detail.section.info')} />
      <CardBody>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm sm:grid-cols-4">
          <div>
            <dt className="text-xs text-muted">{t('common.created')}</dt>
            <dd className="mt-1">{formatDateTime(chain.created_at)}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted">{t('common.user')}</dt>
            <dd className="mt-1 break-words">
              {userId && basePath === '/admin' ? (
                <Link className="text-link hover:underline" to={`${basePath}/users/${userId}`}>
                  {refLabel(user) ?? `#${userId}`}
                </Link>
              ) : (
                (refLabel(user) ?? t('common.na'))
              )}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted">{t('transactions.chains.advanced.session')}</dt>
            <dd className="mt-1">
              {sessionId ? (
                <Link className="text-link hover:underline" to={`${basePath}/transactions?user_session=${sessionId}`}>
                  #{sessionId}
                </Link>
              ) : (
                t('common.na')
              )}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted">{t('common.progress')}</dt>
            <dd className="mt-1 font-medium">{props.progress}</dd>
          </div>
          <div className="col-span-2 sm:col-span-4">
            <dt className="mb-2 text-xs text-muted">{t('common.concerns')}</dt>
            <dd>
              <ChainConcerns basePath={basePath} concerns={chain.concerns} t={t} />
            </dd>
          </div>
          {stepId ? (
            <div className="col-span-2">
              <dt className="text-xs text-muted">
                {props.failedId ? t('transactions.tx.failed_here') : t('transactions.tx.current_step')}
              </dt>
              <dd className="mt-1">
                <Link
                  className={props.failedId ? 'text-danger hover:underline' : 'text-link hover:underline'}
                  to={`${basePath}/transactions/items/${stepId}`}
                >
                  #{stepId}
                </Link>
              </dd>
            </div>
          ) : null}
          {actionId ? (
            <div>
              <dt className="text-xs text-muted">{t('transactions.chain.detail.section.action_state')}</dt>
              <dd className="mt-1">
                <Link className="text-link hover:underline" to={`${basePath}/action-states/${actionId}`}>
                  {refLabel(chain['action_state']) ?? `#${actionId}`}
                </Link>
              </dd>
            </div>
          ) : null}
        </dl>
        <details className="mt-4 rounded-md border border-border p-2 text-xs text-muted">
          <summary className="cursor-pointer">{t('transactions.chain.detail.technical')}</summary>
          <pre className="mt-2 max-h-scroll-lg max-w-full overflow-auto whitespace-pre-wrap [overflow-wrap:anywhere]">
            {safeJson(chain)}
          </pre>
        </details>
      </CardBody>
    </Card>
  );
}

function ChainConcerns(props: { basePath: string; concerns: unknown; t: TransactionChainsTranslator }) {
  const { basePath, concerns, t } = props;

  const list = normalizeTransactionChainConcerns(concerns);

  if (!list.length) {
    return (
      <div className="text-sm text-muted" data-testid="transactions.chain.detail.concerns.empty">
        {t('common.na')}
      </div>
    );
  }

  return (
    <div className="space-y-2" data-testid="transactions.chain.detail.concerns">
      {list.map((c, idx) => {
        const cls = c.class_name;
        const rowId = c.row_id;
        const label = c.label ?? '';
        const raw =
          c.raw && typeof c.raw === 'object' && !Array.isArray(c.raw) ? (c.raw as Record<string, unknown>) : null;
        const directHref = typeof raw?.['object'] === 'string' ? safeContentUrl(raw['object']) : null;
        const internalHref =
          directConcernLink(basePath, cls, rowId) ??
          (shortConcernClassName(cls) === 'User' && basePath === '/admin' ? `${basePath}/users/${rowId}` : null);
        const text = `${c.class_label ?? shortConcernClassName(cls)} #${rowId}`;

        return (
          <div
            key={`${cls}:${rowId}`}
            className="flex flex-wrap items-center gap-2 text-sm"
            data-testid={`transactions.chain.detail.concern.${idx}`}
          >
            <span className="rounded-md border border-border bg-surface-2 px-2 py-0.5 text-xs text-muted">{text}</span>
            {label ? <span className="text-sm text-muted">{label}</span> : null}

            {internalHref ? (
              <Link
                className="text-xs text-accent hover:underline"
                to={internalHref}
                data-testid={`transactions.chain.detail.concern.${idx}.open`}
              >
                {t('common.open')}
              </Link>
            ) : null}
            {directHref ? (
              <a
                className="text-xs text-accent hover:underline"
                href={directHref}
                target="_blank"
                rel="noreferrer"
                data-testid={`transactions.chain.detail.concern.${idx}.external`}
              >
                {t('transactions.link.open_object')}
              </a>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
