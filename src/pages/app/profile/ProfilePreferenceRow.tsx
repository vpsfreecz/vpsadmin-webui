import React from 'react';

export function ProfilePreferenceRow(props: {
  label: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
}) {
  const labelId = React.useId();
  const descriptionId = React.useId();

  return (
    <div role="group" aria-labelledby={labelId} aria-describedby={props.description ? descriptionId : undefined} className="grid gap-3 rounded-md border border-border bg-surface-2 p-3 sm:grid-cols-[minmax(0,1fr)_minmax(12rem,16rem)] sm:items-start">
      <div id={labelId} className="text-sm font-semibold text-fg">{props.label}</div>
      <div className="min-w-0">
        {props.children}
        {props.description ? (
          <div id={descriptionId} className="mt-1 text-xs leading-5 text-muted">{props.description}</div>
        ) : null}
      </div>
    </div>
  );
}
