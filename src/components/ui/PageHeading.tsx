import React, { useEffect, useRef } from 'react';
import { usePageHelpRegistry } from '../../app/pageHelp';
import { clsx } from './clsx';

/** The title remains a plain heading; the shared help controller owns its adjacent button. */
export function PageHeading(props: {
  children: React.ReactNode;
  className?: string;
  containerClassName?: string;
  priority?: number;
  visuallyHidden?: boolean;
}) {
  const help = usePageHelpRegistry();
  const hidden = props.visuallyHidden && !help?.available;
  return (
    <div className={clsx(hidden ? 'sr-only' : 'flex min-w-0 max-w-full items-center gap-2', props.containerClassName)}>
      <h1
        className={clsx('min-w-0 [overflow-wrap:anywhere]', hidden ? 'sr-only' : props.className)}
        data-document-title-heading
      >
        {props.children}
      </h1>
      <PageHelpAnchor priority={props.priority} />
    </div>
  );
}

/** Errors without a resource heading can provide a low-priority fallback anchor. */
export function PageHelpAnchor({ priority = 1 }: { priority?: number }) {
  const anchor = useRef<HTMLSpanElement>(null);
  const help = usePageHelpRegistry();
  const register = help?.register;
  useEffect(() => {
    if (anchor.current && register) return register(anchor.current, priority);
    return undefined;
  }, [register, priority]);
  return <span ref={anchor} className="inline-flex shrink-0 empty:hidden" />;
}
