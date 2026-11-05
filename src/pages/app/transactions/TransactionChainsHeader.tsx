import React from 'react';
import type { I18nContextValue } from '../../../app/i18n';
import { PageHeader } from '../../../components/layout/PageHeader';
import { LinkButton } from '../../../components/ui/LinkButton';

type Props = {
  t: I18nContextValue['t'];
  basePath: string;
  showItems: boolean;
};

export function TransactionChainsHeader({ t, basePath, showItems }: Props) {
  return (
    <PageHeader
      title={t('transactions.chains.title')}
      testId="transactions.list.header"
      actions={
        showItems ? (
          <LinkButton to={`${basePath}/transactions/items`} variant="secondary" size="sm">
            {t('transactions.items.title')}
          </LinkButton>
        ) : undefined
      }
    />
  );
}
