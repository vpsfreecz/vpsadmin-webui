import React from 'react';

import { useI18n } from '../../app/i18n';
import { Button } from '../ui/Button';
import { LinkButton } from '../ui/LinkButton';

export function UserNamespaceMapActions(props: { to: string; deleteTestId: string; onDelete: () => void }) {
  const { t } = useI18n();

  return (
    <div className="flex items-center gap-2">
      <LinkButton to={props.to} variant="secondary" size="sm">
        {t('common.open')}
      </LinkButton>
      <Button
        variant="secondary"
        className="border-l-2 border-l-danger"
        size="sm"
        testId={props.deleteTestId}
        onClick={props.onDelete}
      >
        {t('common.delete')}
      </Button>
    </div>
  );
}
