import React from 'react';

import { useI18n } from '../../../app/i18n';
import { SmartInputHelp } from '../../../components/ui/SmartInputHelp';

interface OomReportFilterHelpProps {
  open: boolean;
  onClose: () => void;
  isGlobalAdminView: boolean;
  onInsertKey: (key: string) => void;
}

export function OomReportFilterHelp({ open, onClose, isGlobalAdminView, onInsertKey }: OomReportFilterHelpProps) {
  const { t } = useI18n();
  return (
    <SmartInputHelp
      open={open}
      onClose={onClose}
      title={t('oom.smart_help.title')}
      intro={t('oom.smart_help.description')}
      examples={[
        {
          label: t('oom.smart_help.examples.help.label'),
          value: '?',
          description: t('oom.smart_help.examples.help.description'),
        },
        {
          label: t('oom.smart_help.examples.open.label'),
          value: '123',
          description: t('oom.smart_help.examples.open.description'),
        },
        {
          label: t('oom.smart_help.examples.vps.label'),
          value: 'vps:123',
          description: t('oom.smart_help.examples.vps.description'),
        },
        {
          label: t('oom.smart_help.examples.cgroup.label'),
          value: 'cgroup:/user.slice',
          description: t('oom.smart_help.examples.cgroup.description'),
        },
        {
          label: t('oom.smart_help.examples.since.label'),
          value: 'since:2025-01-01',
          description: t('oom.smart_help.examples.since.description'),
        },
      ]}
      keys={[
        { key: 'vps', description: t('oom.smart_help.keys.vps') },
        ...(isGlobalAdminView ? [{ key: 'user', description: t('oom.smart_help.keys.user') }] : []),
        { key: 'node', description: t('oom.smart_help.keys.node') },
        { key: 'location', description: t('oom.smart_help.keys.location') },
        { key: 'environment', description: t('oom.smart_help.keys.environment') },
        { key: 'rule', description: t('oom.smart_help.keys.rule') },
        { key: 'cgroup', description: t('oom.smart_help.keys.cgroup') },
        { key: 'since', description: t('oom.smart_help.keys.since') },
        { key: 'until', description: t('oom.smart_help.keys.until') },
      ]}
      inferences={[t('oom.smart_help.inferences.numeric_open'), t('oom.smart_help.inferences.key_value')]}
      onInsertKey={onInsertKey}
      testId="oom.smart_help"
    />
  );
}
