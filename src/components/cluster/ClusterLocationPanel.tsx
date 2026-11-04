import React from 'react';
import { ChevronDown } from 'lucide-react';

import type { BadgeVariant } from '../../lib/taskStatus';
import { Badge } from '../ui/Badge';
import { clsx } from '../ui/clsx';
import { StackedBar, type StackedBarSegment } from '../ui/StackedBar';

export function ClusterLocationPanel(props: {
  location: string;
  summary: string;
  summaryVariant: BadgeVariant;
  segments?: StackedBarSegment[];
  barAriaLabel?: string;
  children: React.ReactNode;
  testId: string;
  defaultOpen?: boolean;
  className?: string;
}) {
  return (
    <details
      open={props.defaultOpen ?? true}
      className={clsx(
        'group overflow-hidden rounded-lg border border-border bg-surface shadow-card',
        props.className,
      )}
      data-cluster-location={props.location}
      data-cluster-location-layout="panel"
      data-testid={props.testId}
    >
      <summary className="list-none cursor-pointer border-l-4 border-info bg-info-bg px-3 py-3 select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-focus/35">
        <div className="grid gap-2 sm:flex sm:items-center sm:justify-between sm:gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <ChevronDown
              className="h-4 w-4 shrink-0 text-info transition-transform group-open:rotate-180"
              aria-hidden="true"
            />
            <span className="truncate text-base font-semibold text-fg">{props.location}</span>
          </div>
          <div className={clsx(
            'grid min-w-0 w-full items-center gap-3 sm:flex sm:w-auto sm:justify-end',
            props.segments && 'sm:min-w-48',
          )}>
            {props.segments && props.barAriaLabel ? (
              <StackedBar
                ariaLabel={props.barAriaLabel}
                segments={props.segments}
                className="min-w-20 flex-1 sm:max-w-32"
                testId={`${props.testId}.bar`}
              />
            ) : null}
            <Badge
              variant={props.summaryVariant}
              className={clsx('max-w-full whitespace-normal', props.segments && 'sm:whitespace-nowrap')}
              testId={`${props.testId}.summary`}
            >
              {props.summary}
            </Badge>
          </div>
        </div>
      </summary>
      <div className="border-t border-border">{props.children}</div>
    </details>
  );
}
