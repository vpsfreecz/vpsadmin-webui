import type { AuthContextValue } from '../../../../app/auth';
import { getRuntimeConfig } from '../../../../app/config';
import { selectedRuntimeMode } from '../../../../app/runtimeMode';
import { getBffSessionKey } from '../../../../lib/auth/bffSession';
import { browserSessionStorage, readImpersonationState } from '../../../../lib/auth/impersonation';

function tokenForCurrentAuth(): string | undefined {
  const auth = getRuntimeConfig().auth;
  return auth.kind === 'oauth2' ? auth.accessToken : auth.kind === 'token' ? auth.sessionToken : undefined;
}

/** Keep credentials out of query keys while detecting an in-flight auth switch. */
export function captureNetworkListScope(auth: AuthContextValue, mode: string, filters: string) {
  const cfg = getRuntimeConfig();
  const runtimeMode = selectedRuntimeMode();
  const baseSessionKey = getBffSessionKey();
  const impersonationSessionId = readImpersonationState(browserSessionStorage())?.sessionId ?? null;
  const token = tokenForCurrentAuth();
  const key = [
    cfg.apiBaseUrl, cfg.apiVersion, runtimeMode, mode,
    auth.status, auth.role, auth.user?.id ?? null,
    baseSessionKey ?? null, impersonationSessionId, filters,
  ] as const;

  return {
    key,
    isCurrent: () => {
      const current = getRuntimeConfig();
      return current.apiBaseUrl === cfg.apiBaseUrl &&
        current.apiVersion === cfg.apiVersion &&
        selectedRuntimeMode() === runtimeMode &&
        getBffSessionKey() === baseSessionKey &&
        (readImpersonationState(browserSessionStorage())?.sessionId ?? null) === impersonationSessionId &&
        tokenForCurrentAuth() === token;
    },
  };
}
