import React from 'react';
import { useI18n } from '../../app/i18n';
import type { UserEnvironmentConfig } from '../../lib/api/userEnvironmentConfigs';
import { Select } from '../ui/Select';

export interface EnvConfigDraft {
  inherit: boolean;
  canCreate: boolean;
  canDestroy: boolean;
  lifetimeDays: string;
  maxVps: string;
}

interface FieldProps {
  cfg: UserEnvironmentConfig;
  draft: EnvConfigDraft;
  prefix: string;
  updateDraft: <K extends keyof EnvConfigDraft>(cfg: UserEnvironmentConfig, field: K, value: EnvConfigDraft[K]) => void;
}

export function ModeCell(props2: FieldProps) {
  const { t } = useI18n();
  return (
    <Select
      value={props2.draft.inherit ? 'inherit' : 'custom'}
      onChange={(e) => props2.updateDraft(props2.cfg, 'inherit', e.target.value === 'inherit')}
      testId={`${props2.prefix}.row.${props2.cfg.id}.mode`}
    >
      <option value="inherit">{t('admin.user.env_configs.badge.inherited')}</option>
      <option value="custom">{t('admin.user.env_configs.badge.custom')}</option>
    </Select>
  );
}

export function BoolCell(props2: FieldProps & { field: 'canCreate' | 'canDestroy' }) {
  const { t } = useI18n();
  return (
    <label className="inline-flex min-h-9 items-center gap-2 text-sm [@media(any-pointer:coarse)]:min-h-11">
      <input
        type="checkbox"
        checked={props2.draft[props2.field]}
        disabled={props2.draft.inherit}
        onChange={(e) => props2.updateDraft(props2.cfg, props2.field, e.target.checked)}
        data-testid={`${props2.prefix}.row.${props2.cfg.id}.${props2.field}`}
        className="h-4 w-4 rounded border-border text-accent focus:ring-focus"
      />
      <span>{props2.draft[props2.field] ? t('common.yes') : t('common.no')}</span>
    </label>
  );
}
