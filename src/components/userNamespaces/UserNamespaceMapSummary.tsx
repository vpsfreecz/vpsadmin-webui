import React from 'react';
import type { I18nContextValue } from '../../app/i18n';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Card, CardBody, CardHeader } from '../ui/Card';
import { ChipLink } from '../ui/ChipLink';
import { Input } from '../ui/Input';
import { Alert } from '../ui/Alert';

type HeaderProps = {
  t: I18nContextValue['t'];
  testIdPrefix: string;
  headerTitle: string;
  headerSubtitle: string;
  headerNote?: React.ReactNode;
  backTo: string;
  entryCountDisplay: number | string;
  usedByCount: number | undefined;
  entriesLink: string;
  deleteDisabled: boolean;
  onDelete: () => void;
};

export function UserNamespaceMapHeader(props: HeaderProps) {
  const { t, headerTitle, headerSubtitle, entryCountDisplay, usedByCount, entriesLink, deleteDisabled, onDelete } =
    props;
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div data-document-title-root data-document-title-kind="object">
        <div
          className="text-lg font-semibold text-fg"
          data-testid={`${props.testIdPrefix}.title`}
          data-document-title-heading
        >
          {headerTitle}
        </div>
        <div className="text-sm text-muted" data-testid={`${props.testIdPrefix}.subtitle`}>
          {headerSubtitle}
        </div>
        {props.headerNote ? <div className="mt-1 text-xs text-faint">{props.headerNote}</div> : null}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <ChipLink to={props.backTo} title={t('common.back')}>
          {t('common.back')}
        </ChipLink>

        <Badge variant="neutral">{t('userns.map.entries', { n: entryCountDisplay })}</Badge>

        <ChipLink to={entriesLink} title={t('userns.map.used_by_vps_link')}>
          {t('userns.map.used_by_vps', { n: usedByCount ?? '—' })}
        </ChipLink>

        <Button
          testId={`${props.testIdPrefix}.delete`}
          variant="danger"
          size="sm"
          disabled={deleteDisabled}
          onClick={onDelete}
        >
          {t('common.delete')}
        </Button>
      </div>
    </div>
  );
}

type RenameProps = {
  t: I18nContextValue['t'];
  testIdPrefix: string;
  labelDraft: string;
  setLabelDraft: (value: string) => void;
  labelDirty: boolean;
  renamePending: boolean;
  canInteractWithMap: boolean;
  renameError: string | null;
  onSave: () => void;
};

export function UserNamespaceMapRename(props: RenameProps) {
  const { t, labelDraft, setLabelDraft, labelDirty, renamePending, canInteractWithMap, renameError, onSave } = props;
  return (
    <Card testId={`${props.testIdPrefix}.rename.card`}>
      <CardHeader
        title={t('userns.map.rename.title')}
        subtitle={t('userns.map.rename.body')}
        actions={
          <Button
            testId={`${props.testIdPrefix}.rename.save`}
            variant={labelDirty ? 'primary' : 'secondary'}
            size="sm"
            disabled={!labelDirty || renamePending || !canInteractWithMap}
            onClick={onSave}
          >
            {renamePending ? t('common.saving') : t('common.save')}
          </Button>
        }
      />
      <CardBody>
        <div className="max-w-xl">
          <Input
            testId={`${props.testIdPrefix}.rename.input`}
            value={labelDraft}
            onChange={(e) => setLabelDraft(e.target.value)}
            placeholder={t('userns.map.rename.placeholder')}
          />
        </div>
        {renameError !== null ? (
          <Alert title={t('userns.map.rename.error')} variant="danger" className="mt-3">
            {renameError}
          </Alert>
        ) : null}
      </CardBody>
    </Card>
  );
}
