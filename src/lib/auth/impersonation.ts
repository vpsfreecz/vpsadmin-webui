import { selectedRuntimeMode } from '../../app/runtimeMode';

export const IMPERSONATION_STORAGE_KEY = 'vpsadmin.ui.impersonation';

let validatedBffSessionKey: string | null = null;
let acceptedBffImpersonation: ImpersonationState | null = null;

export function browserSessionStorage(): Storage | undefined {
  if (typeof window === 'undefined') return undefined;
  try { return window.sessionStorage; } catch { return undefined; }
}

/**
 * Context switch (admin impersonation) state.
 *
 * Stored in sessionStorage so it does not survive browser restarts.
 */
export interface ImpersonationState {
  kind: 'impersonation';

  /** Token session id that was created for the impersonated user. */
  sessionId: number;

  /** Full token that authenticates the impersonated session. */
  sessionToken: string;

  /** Noncredential BFF base-session fingerprint; required in BFF mode. */
  bffSessionKey?: string;

  /** Target user identity for display + safety checks. */
  targetUserId: number;
  targetLogin?: string;

  /** Operator-provided reason (audited by being part of the session label). */
  reason?: string;

  /** Timestamp (ms) when the switch happened. */
  startedAt: number;

  /**
   * Where to return when the operator ends impersonation.
   * Must be a path relative to the router basename, e.g. "/admin/users/123".
   */
  returnPath?: string;

  /** Which app mode the operator was in when the switch was initiated. */
  returnMode?: 'admin' | 'user';
}

function looksLikeState(v: any): v is ImpersonationState {
  if (!v || typeof v !== 'object') return false;
  if (v.kind !== 'impersonation') return false;

  if (typeof v.sessionId !== 'number' || !Number.isFinite(v.sessionId) || v.sessionId <= 0) return false;
  if (typeof v.sessionToken !== 'string' || v.sessionToken.trim().length < 10) return false;
  if (v.bffSessionKey !== undefined &&
      (typeof v.bffSessionKey !== 'string' || !/^[a-f0-9]{64}$/.test(v.bffSessionKey))) return false;
  if (typeof v.targetUserId !== 'number' || !Number.isFinite(v.targetUserId) || v.targetUserId <= 0) return false;
  if (typeof v.startedAt !== 'number' || !Number.isFinite(v.startedAt) || v.startedAt <= 0) return false;

  // Optional fields: keep loose validation.
  if (v.targetLogin !== undefined && typeof v.targetLogin !== 'string') return false;
  if (v.reason !== undefined && typeof v.reason !== 'string') return false;
  if (v.returnPath !== undefined && typeof v.returnPath !== 'string') return false;
  if (v.returnMode !== undefined && v.returnMode !== 'admin' && v.returnMode !== 'user') return false;

  return true;
}

function readStoredImpersonationState(storage?: Storage | null): ImpersonationState | null {
  if (!storage) return null;

  try {
    const raw = storage.getItem(IMPERSONATION_STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw);

    if (!looksLikeState(parsed)) return null;

    return parsed;
  } catch {
    return null;
  }
}

export function getValidatedBffSessionKey(): string | null {
  return validatedBffSessionKey;
}

/** A new login or anonymous BFF result invalidates the previous operator's token. */
export function bindBffImpersonationToSession(key: string | null, storage?: Storage | null): void {
  validatedBffSessionKey = key;
  acceptedBffImpersonation = null;
  const stored = readStoredImpersonationState(storage);
  let storedRaw: string | null = null;
  try { storedRaw = storage?.getItem(IMPERSONATION_STORAGE_KEY) ?? null; } catch { /* no storage */ }
  if (storedRaw && (!stored || !key || stored.bffSessionKey !== key)) clearImpersonationState(storage);
  else if (key && stored) acceptedBffImpersonation = stored;
}

export function readImpersonationState(storage?: Storage | null): ImpersonationState | null {
  const stored = readStoredImpersonationState(storage);
  if (selectedRuntimeMode() === 'legacy') return stored;
  return validatedBffSessionKey && stored?.bffSessionKey === validatedBffSessionKey &&
    stored.sessionId === acceptedBffImpersonation?.sessionId &&
    stored.sessionToken === acceptedBffImpersonation?.sessionToken &&
    stored.startedAt === acceptedBffImpersonation?.startedAt ? stored : null;
}

export function writeImpersonationState(state: ImpersonationState, storage?: Storage | null) {
  const requiredBff = selectedRuntimeMode() === 'bff';
  if (requiredBff && (!validatedBffSessionKey ||
      state.bffSessionKey !== validatedBffSessionKey)) {
    throw new Error('BFF impersonation requires a matching base session');
  }
  if (!storage) {
    if (requiredBff) throw new Error('BFF impersonation storage is unavailable');
    return;
  }
  try {
    storage.setItem(IMPERSONATION_STORAGE_KEY, JSON.stringify(state));
  } catch {
    if (requiredBff) throw new Error('BFF impersonation storage is unavailable');
    // Standalone deployments retain their prior best-effort behavior.
  }
}

export function clearImpersonationState(storage?: Storage | null) {
  if (selectedRuntimeMode() === 'bff') acceptedBffImpersonation = null;
  if (!storage) return;
  try {
    storage.removeItem(IMPERSONATION_STORAGE_KEY);
  } catch {
    // ignore
  }
}

export function isImpersonating(storage?: Storage | null): boolean {
  return readImpersonationState(storage) !== null;
}
