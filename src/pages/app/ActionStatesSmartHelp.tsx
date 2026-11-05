import React from 'react';
import type { I18nContextValue } from '../../app/i18n';
import { SmartInputHelp } from '../../components/ui/SmartInputHelp';

type Props = {
  t: I18nContextValue['t'];
  open: boolean;
  onClose: () => void;
  onInsertKey: (key: string) => void;
  onOpenAdvanced: () => void;
  onOpenTasks: () => void;
};

export function ActionStatesSmartHelp({ t, open, onClose, onInsertKey, onOpenAdvanced, onOpenTasks }: Props) {
  return (
    <SmartInputHelp
      open={open}
      onClose={onClose}
      title={t('filters.help.title')}
      intro={t('action_states.smart_help.intro')}
      examples={[
        { example: '?', description: t('action_states.smart_help.examples.help') },
        { example: '123', description: t('action_states.smart_help.examples.open_id') },
        { example: 'errors', description: t('action_states.smart_help.examples.errors') },
        { example: 'backup', description: t('action_states.smart_help.examples.search') },
        { example: 'order:oldest', description: t('action_states.smart_help.examples.order') },
        { example: 'visibility:system', description: t('action_states.smart_help.examples.visibility') },
      ]}
      topKeys={[
        { key: 'q', description: t('action_states.smart_help.keys.q'), example: 'q:backup' },
        { key: 'errors', description: t('action_states.smart_help.keys.errors'), example: 'errors' },
        { key: 'id', description: t('action_states.smart_help.keys.id'), example: 'id:123' },
        { key: 'order', description: t('action_states.smart_help.keys.order'), example: 'order:oldest' },
        {
          key: 'visibility',
          description: t('action_states.smart_help.keys.visibility'),
          example: 'visibility:user',
        },
      ]}
      inference={[
        t('action_states.smart_help.inference.enter_applies'),
        t('action_states.smart_help.inference.number_opens'),
        t('action_states.smart_help.inference.key_value'),
      ]}
      onInsertKey={onInsertKey}
      actions={[
        {
          label: t('filters.help.open_advanced'),
          onClick: onOpenAdvanced,
        },
        {
          label: t('common.open_tasks'),
          onClick: onOpenTasks,
        },
      ]}
      testId="action_states.smart_help"
      keyRowTestIdPrefix="action_states.smart_help.key"
    />
  );
}
