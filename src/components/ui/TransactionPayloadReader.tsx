import { useMemo } from 'react';

import { safeJson } from '../../lib/txFormat';
import { clsx } from './clsx';

function readPayload(text: string): unknown {
  try {
    return JSON.parse(text, (_key, value: unknown) => {
      // Keep oversized numeric identifiers verbatim rather than rounding them.
      if (
        typeof value === 'number' &&
        (!Number.isFinite(value) || (Number.isInteger(value) && !Number.isSafeInteger(value)))
      ) {
        throw new Error('Unsafe JSON number');
      }
      return value;
    });
  } catch {
    return text;
  }
}

function PayloadValue({ value, depth = 0 }: { value: unknown; depth?: number }) {
  if (value !== null && typeof value === 'object' && Object.keys(value).length && depth < 8) {
    return (
      <dl className="space-y-4">
        {Object.entries(value).map(([key, child]) => (
          <div key={key} className="min-w-0">
            <dt className="mb-1 whitespace-pre-wrap break-words text-xs font-semibold text-muted">
              {Array.isArray(value) ? `[${key}]` : key}
            </dt>
            <dd className="min-w-0 border-l border-border pl-3">
              <PayloadValue value={child} depth={depth + 1} />
            </dd>
          </div>
        ))}
      </dl>
    );
  }
  return (
    <pre className="m-0 whitespace-pre-wrap [overflow-wrap:anywhere] font-mono text-sm leading-6">
      {typeof value === 'string' ? value : safeJson(value)}
    </pre>
  );
}

/** Readable values, never executable HTML. Copy actions retain the original payload. */
export function TransactionPayloadReader(props: { text: string; label: string; large?: boolean }) {
  const value = useMemo(() => readPayload(props.text), [props.text]);
  return (
    <div
      role="region"
      aria-label={props.label}
      tabIndex={0}
      className={clsx(
        'mt-2 max-h-scroll-lg min-w-0 max-w-full overflow-auto rounded-md border border-border bg-surface p-4 text-fg focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent',
        props.large && 'min-h-80'
      )}
    >
      <PayloadValue value={value} />
    </div>
  );
}
