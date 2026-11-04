import React from 'react';
import { Monitor, Moon, Sun } from 'lucide-react';

import type { UiThemePreference } from '../../app/uiSettings';
import { clsx } from '../ui/clsx';

const themes = [
  { value: 'system', icon: Monitor },
  { value: 'light', icon: Sun },
  { value: 'dark', icon: Moon },
] as const;

export function PublicThemeSwitcher(props: {
  preference: UiThemePreference;
  onSetTheme: (theme: UiThemePreference) => void;
  t: (key: string) => string;
  testId: string;
}) {
  return (
    <div role="group" aria-label={props.t('settings.theme.label')}
      className="grid grid-cols-3 gap-1 rounded-lg border border-border bg-overlay-surface p-1 shadow-card"
      data-testid={props.testId}>
      {themes.map(({ value, icon: Icon }) => (
        <button key={value} type="button" title={props.t(`settings.theme.${value}`)}
          aria-label={props.t(`settings.theme.${value}`)} aria-pressed={props.preference === value}
          data-testid={`${props.testId}.${value}`} onClick={() => props.onSetTheme(value)}
          className={clsx(
            'inline-flex min-h-8 min-w-8 items-center justify-center gap-1 rounded-md px-2 py-1 text-xs font-semibold transition-colors',
            'focus:outline-none focus:ring-2 focus:ring-focus/35 focus:ring-offset-2 focus:ring-offset-bg',
            '[@media(any-pointer:coarse)]:min-h-11 [@media(any-pointer:coarse)]:min-w-11',
            props.preference === value ? 'bg-accent text-accent-fg hover:bg-accent-hover' : 'text-muted hover:bg-surface-2 hover:text-fg'
          )}>
          <Icon size={16} aria-hidden="true" />
        </button>
      ))}
    </div>
  );
}
