import React from 'react';
import type { I18nContextValue } from '../../../../app/i18n';
import { Alert } from '../../../../components/ui/Alert';
import { Button } from '../../../../components/ui/Button';
import { Input } from '../../../../components/ui/Input';
import { Modal } from '../../../../components/ui/Modal';
import { Select } from '../../../../components/ui/Select';
import { Textarea } from '../../../../components/ui/Textarea';
import type { Language } from '../../../../lib/api/languages';

type Props = {
  t: I18nContextValue['t'];
  editorOpen: boolean;
  editorMode: 'create' | 'edit';
  onClose: () => void;
  onSave: () => void;
  savePending: boolean;
  editorValid: boolean;
  editorError: string | null;
  editorPage: string;
  setEditorPage: (value: string) => void;
  editorAction: string;
  setEditorAction: (value: string) => void;
  editorLanguage: string;
  setEditorLanguage: (value: string) => void;
  localizedEdit: boolean;
  languages: Language[];
  editorOrder: string;
  setEditorOrder: (value: string) => void;
  editorOrderParsed: number | null;
  editorContent: string;
  setEditorContent: (value: string) => void;
};

export function AdminHelpBoxEditor(props: Props) {
  const {
    t,
    editorOpen,
    editorMode,
    onClose,
    onSave,
    savePending,
    editorValid,
    editorError,
    editorPage,
    setEditorPage,
    editorAction,
    setEditorAction,
    editorLanguage,
    setEditorLanguage,
    localizedEdit,
    languages,
    editorOrder,
    setEditorOrder,
    editorOrderParsed,
    editorContent,
    setEditorContent,
  } = props;
  return (
    <Modal
      open={editorOpen}
      onClose={onClose}
      title={
        editorMode === 'create' ? t('admin.help_boxes.modal.create.title') : t('admin.help_boxes.modal.edit.title')
      }
      size="lg"
      testId="admin.help_boxes.editor"
      footer={
        <div className="flex items-center justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={savePending}>
            {t('common.cancel')}
          </Button>
          <Button
            variant="primary"
            onClick={onSave}
            loading={savePending}
            disabled={!editorValid}
            testId="admin.help_boxes.editor.save"
          >
            {t('common.save')}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {editorError ? (
          <Alert variant="danger" title={t('common.error')}>
            {editorError}
          </Alert>
        ) : null}

        <div className="text-sm">
          <div className="font-medium">{t('admin.help_boxes.editor.help_title')}</div>
          <p className="mt-1 text-muted">{t('admin.help_boxes.editor.help_body')}</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <div className="text-xs text-faint">{t('admin.help_boxes.field.page')}</div>
            <Input
              value={editorPage}
              onChange={(e) => setEditorPage(e.target.value)}
              testId="admin.help_boxes.editor.page"
            />
            {!editorPage.trim() ? (
              <div className="mt-1 text-xs text-danger">{t('admin.help_boxes.validation.page')}</div>
            ) : null}
          </div>

          <div>
            <div className="text-xs text-faint">{t('admin.help_boxes.field.action')}</div>
            <Input
              value={editorAction}
              onChange={(e) => setEditorAction(e.target.value)}
              testId="admin.help_boxes.editor.action"
            />
            {!editorAction.trim() ? (
              <div className="mt-1 text-xs text-danger">{t('admin.help_boxes.validation.action')}</div>
            ) : null}
          </div>

          <div>
            <div className="text-xs text-faint">{t('admin.help_boxes.field.language')}</div>
            <Select
              value={editorLanguage}
              onChange={(e) => setEditorLanguage(e.target.value)}
              testId="admin.help_boxes.editor.language"
            >
              <option value="" disabled={localizedEdit}>
                {t('common.default')}
              </option>
              {languages.map((l) => (
                <option key={l.id} value={String(l.id)}>
                  {String(l.label ?? l.code ?? l.id)}
                </option>
              ))}
            </Select>
            {localizedEdit ? (
              <div className="mt-1 text-xs text-muted">
                {t('admin.help_boxes.validation.language_clear_unsupported')}
              </div>
            ) : null}
          </div>

          <div>
            <div className="text-xs text-faint">{t('admin.help_boxes.field.order')}</div>
            <Input
              value={editorOrder}
              onChange={(e) => setEditorOrder(e.target.value)}
              testId="admin.help_boxes.editor.order"
            />
            {editorOrderParsed === null ? (
              <div className="mt-1 text-xs text-danger">{t('admin.help_boxes.validation.order')}</div>
            ) : null}
          </div>
        </div>

        <div>
          <div className="text-xs text-faint">{t('admin.help_boxes.field.content')}</div>
          <div className="mt-1">
            <Textarea
              value={editorContent}
              onChange={(e) => setEditorContent(e.target.value)}
              rows={10}
              testId="admin.help_boxes.editor.content"
            />
          </div>
          {!editorContent.trim() ? (
            <div className="mt-1 text-xs text-danger">{t('admin.help_boxes.validation.content')}</div>
          ) : null}
        </div>
      </div>
    </Modal>
  );
}
