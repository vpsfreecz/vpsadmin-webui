import React from 'react';
import { clsx } from '../ui/clsx';

export function PreferenceSelector(props: {
  label: string;
  options: Array<{ id: string; label: string; title?: string }>;
  selected: string;
  testIdPrefix: string;
  onSelect: (value: string) => void;
}) {
  return (
    <div className="px-2 py-2" role="group" aria-label={props.label}>
      <div className="text-xs text-muted">{props.label}</div>
      <div className={clsx('mt-1 grid gap-2', props.options.length === 2 ? 'grid-cols-2' : 'grid-cols-3')}>
        {props.options.map((option) => (
          <button
            key={option.id}
            type="button"
            data-testid={`${props.testIdPrefix}.${option.id}`}
            title={option.title}
            aria-label={option.title}
            aria-pressed={option.id === props.selected}
            className={clsx(
              segmentedButtonClass(option.id === props.selected),
              props.options.length === 2 && 'min-h-11'
            )}
            onClick={() => props.onSelect(option.id)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function segmentedButtonClass(active: boolean) {
  return clsx(
    'inline-flex min-h-8 w-full min-w-0 items-center justify-center rounded-md border px-2 py-1 text-center text-xs font-medium leading-tight transition-colors',
    'focus:outline-none focus:ring-2 focus:ring-focus/35 focus:ring-offset-2 focus:ring-offset-bg',
    active
      ? 'border-accent bg-accent text-accent-fg hover:bg-accent-hover'
      : 'border-border bg-surface text-fg hover:bg-surface-2'
  );
}
