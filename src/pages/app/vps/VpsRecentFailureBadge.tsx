import React from 'react';
import { Link } from 'react-router-dom';

import type { TransactionChain } from '../../../lib/api/transactions';
import { formatDateTime } from '../../../lib/format';
import { classifyTransactionChain, operationLabel } from '../../../lib/operationTaxonomy';
import { Badge } from '../../../components/ui/Badge';

import type { VpsListTranslator } from './vpsListSemantics';

export function VpsRecentFailureBadge(props: {
  chain: TransactionChain;
  basePath: string;
  t: VpsListTranslator;
  testId: string;
}) {
  const { chain, t } = props;
  const title = t('vps.list.state.recent_failure_title', {
    operation: operationLabel(classifyTransactionChain(chain), t),
    time: formatDateTime(chain.created_at),
  });

  return (
    <Link
      to={`${props.basePath}/transactions/${chain.id}`}
      title={title}
      data-testid={props.testId}
      className="inline-flex rounded-md"
    >
      <Badge variant="danger" className="underline underline-offset-2">
        {t('vps.list.state.recent_failure', { id: chain.id })}
      </Badge>
    </Link>
  );
}
