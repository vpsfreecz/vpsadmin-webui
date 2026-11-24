import React from 'react';
import { ChevronDown } from 'lucide-react';

export function DatasetAdvancedProperties(props: {
  testId: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  open?: boolean;
  onToggle?: React.ReactEventHandler<HTMLDetailsElement>;
  children: React.ReactNode;
}) {
  return (
    <details
      className="group rounded-lg border border-border bg-surface-2"
      data-testid={props.testId}
      open={props.open}
      onToggle={props.onToggle}
    >
      <summary
        className="flex min-h-11 cursor-pointer list-none items-start justify-between gap-3 rounded-lg px-3 py-3 text-sm font-medium text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-inset [&::-webkit-details-marker]:hidden"
        data-testid={`${props.testId}.summary`}
      >
        <span className="min-w-0">
          <span className="block">{props.title}</span>
          {props.description ? <span className="mt-1 block text-xs font-normal text-muted">{props.description}</span> : null}
        </span>
        <ChevronDown className="mt-0.5 h-4 w-4 shrink-0 transition-transform group-open:rotate-180" aria-hidden="true" />
      </summary>
      <div className="space-y-4 border-t border-border px-3 py-4">{props.children}</div>
    </details>
  );
}
