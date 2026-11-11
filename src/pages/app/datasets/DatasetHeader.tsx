import React from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '../../../app/i18n';
import { ObjectHeader } from '../../../components/ui/ObjectHeader';

/** Reuse each foundation's heading, document title and contextual Help behavior. */
export function DatasetHeader(props: {
  name: string;
  id: number;
  returnPath: string;
  returnLabel: string;
  status: React.ReactNode;
  vpsLink?: { to: string; label: string };
  tabs: React.ReactNode;
}) {
  const { t } = useI18n();
  return (
    <ObjectHeader
      testId="dataset.header"
      titleBefore={
        <>
          <Link className="text-xs text-accent hover:underline sm:text-sm" to={props.returnPath}>
            {props.returnLabel}
          </Link>
          <span aria-hidden="true" className="hidden text-faint sm:inline">
            /
          </span>
        </>
      }
      titlePathLabel={t('dataset.header.path')}
      title={<span aria-current="page">{t('dataset.identity.name', { name: props.name })}</span>}
      titleAfter={<span className="text-xs text-muted">{t('dataset.identity.internal_id', { id: props.id })}</span>}
      badges={
        props.status || props.vpsLink ? (
          <>
            {props.status}
            {props.vpsLink ? (
              <Link
                className="min-w-0 break-words text-accent hover:underline [overflow-wrap:anywhere]"
                to={props.vpsLink.to}
              >
                {props.vpsLink.label}
              </Link>
            ) : null}
          </>
        ) : undefined
      }
      tabs={props.tabs}
    />
  );
}
