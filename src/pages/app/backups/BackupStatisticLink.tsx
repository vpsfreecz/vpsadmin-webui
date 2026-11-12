import React from 'react';
import { Link } from 'react-router-dom';

/** Only statistics with a complete, matching destination are interactive. */
export function BackupStatisticLink(props: { to?: string; testId: string; children: React.ReactNode }) {
  if (!props.to) return <>{props.children}</>;
  return (
    <Link
      to={props.to}
      data-testid={props.testId}
      className="block min-w-0 rounded-lg text-fg focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
    >
      {props.children}
    </Link>
  );
}
