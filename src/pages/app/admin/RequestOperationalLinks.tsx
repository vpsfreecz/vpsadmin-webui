import React from 'react';
import { useI18n } from '../../../app/i18n';
import { LinkButton } from '../../../components/ui/LinkButton';
import { requestOperationalLinks } from './RequestReviewModel';
import type { ReviewableRequest } from './RequestReviewTypes';

export function RequestOperationalLinks(props: {
  request: ReviewableRequest | undefined;
  basePath: string;
  compact?: boolean;
  testIdPrefix: string;
}) {
  const { t } = useI18n();
  const { actionStateId, transactionChainId, transactionId } = requestOperationalLinks(props.request);
  if (!actionStateId && !transactionChainId && !transactionId) return null;

  return (
    <div className="flex flex-wrap gap-2" data-testid={`${props.testIdPrefix}.ops`}>
      {actionStateId ? (
        <LinkButton
          to={`${props.basePath}/action-states/${actionStateId}`}
          variant="secondary"
          size={props.compact ? 'sm' : undefined}
          testId={`${props.testIdPrefix}.ops.action_state`}
        >
          {t('common.action_state')} #{actionStateId}
        </LinkButton>
      ) : null}
      {transactionChainId ? (
        <LinkButton
          to={`${props.basePath}/transactions/${transactionChainId}`}
          variant="secondary"
          size={props.compact ? 'sm' : undefined}
          testId={`${props.testIdPrefix}.ops.chain`}
        >
          {t('common.open_chain')}
        </LinkButton>
      ) : null}
      {transactionId ? (
        <LinkButton
          to={`${props.basePath}/transactions/items/${transactionId}`}
          variant="secondary"
          size={props.compact ? 'sm' : undefined}
          testId={`${props.testIdPrefix}.ops.transaction`}
        >
          {t('common.open_transaction')}
        </LinkButton>
      ) : null}
    </div>
  );
}

