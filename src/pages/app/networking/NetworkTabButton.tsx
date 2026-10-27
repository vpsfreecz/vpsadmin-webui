import React from 'react';
import { clsx } from '../../../components/ui/clsx';

export function NetworkTabButton(props: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
  tab: string;
  testId: string;
}) {
  return (
    <button
      id={`network-user-tab-${props.tab}`}
      type="button"
      role="tab"
      aria-selected={props.active}
      aria-controls={`network-user-panel-${props.tab}`}
      tabIndex={props.active ? 0 : -1}
      className={clsx(
        'inline-flex min-h-11 min-w-11 items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition',
        'focus:outline-none focus:ring-2 focus:ring-focus/35 focus:ring-offset-2 focus:ring-offset-bg',
        props.active ? 'bg-surface-2 text-fg ring-1 ring-border' : 'text-muted hover:bg-surface-2 hover:text-fg'
      )}
      onClick={props.onClick}
      data-testid={props.testId}
    >
      {props.children}
    </button>
  );
}
