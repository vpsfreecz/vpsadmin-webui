import type { ActionResult } from 'vpsadmin-typescript-client';

/** Application output was unusable after dispatch; the original receipt survives. */
export class ApiOutputError extends Error {
  readonly code = 'INVALID_API_OUTPUT' as const;
  readonly phase = 'post-dispatch' as const;

  constructor(readonly context: string, readonly result: ActionResult<unknown>, cause?: unknown) {
    super(`Invalid ${context} response`, cause === undefined ? undefined : { cause });
    this.name = 'ApiOutputError';
  }
}

/** Narrow an application model without losing metadata, HTTP status or envelope. */
export function narrowApiResult<TData, TMeta, TOutput>(
  result: ActionResult<TData, TMeta>,
  narrow: (data: TData) => TOutput,
  context: string,
): ActionResult<TOutput, TMeta> {
  try {
    return { ...result, data: narrow(result.data) };
  } catch (cause) {
    throw new ApiOutputError(context, result, cause);
  }
}
