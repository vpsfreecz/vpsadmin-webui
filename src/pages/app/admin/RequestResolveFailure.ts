import { HaveApiError } from '../../../lib/api/apiErrors';

/** A server-reported reason is useful even when it cannot prove rollback. */
export function requestResolveFailure(error: unknown, noIpv4Message: string): string | null {
  if (!(error instanceof HaveApiError) || error.failure !== 'api' || error.envelope.status !== false) return null;
  const message = error.envelope.message?.trim();
  if (!message) return null;
  return /^no ipv4 address available$/i.test(message) ? noIpv4Message : message;
}
