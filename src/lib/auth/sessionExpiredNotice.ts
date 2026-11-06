import { normalizeRouterBasename, sanitizeLocalPath, withRouterBasename } from '../routerPaths';

const SESSION_EXPIRED_NOTICE_KEY = 'webui-next:session-expired-notice-at';
const SESSION_EXPIRED_NOTICE_MAX_AGE_MS = 5 * 60 * 1000;

function getSessionStorage(): Storage | null {
  if (typeof window === 'undefined') return null;

  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

export function markSessionExpiredNotice(now = Date.now()): void {
  const storage = getSessionStorage();
  if (!storage) return;

  try {
    storage.setItem(SESSION_EXPIRED_NOTICE_KEY, `${now}\n${window.location.pathname}`);
  } catch {
    // Storage can be disabled in private modes. The redirect still works.
  }
}

export function consumeSessionExpiredNotice(now = Date.now()): { pathname: string | undefined } | null {
  const storage = getSessionStorage();
  if (!storage) return null;

  let raw: string | null = null;
  try {
    raw = storage.getItem(SESSION_EXPIRED_NOTICE_KEY);
    storage.removeItem(SESSION_EXPIRED_NOTICE_KEY);
  } catch {
    return null;
  }

  if (!raw) return null;

  const [timestamp, pathname] = raw.split('\n', 2);
  const markedAt = Number(timestamp);
  if (!Number.isFinite(markedAt)) return null;

  const age = now - markedAt;
  return age >= 0 && age <= SESSION_EXPIRED_NOTICE_MAX_AGE_MS ? { pathname } : null;
}

// Restore a protected page through the usual GET route. Query strings and
// fragments may contain transient UI state and are intentionally omitted.
export function sessionReturnPath(pathname: string | undefined, routerBasename: string): string {
  const fallback = withRouterBasename('/app', routerBasename);
  const base = normalizeRouterBasename(routerBasename);
  const target = new URL(sanitizeLocalPath(pathname, fallback), 'https://local.invalid').pathname;
  const protectedPath = target.startsWith(`${base}/`) ? target.slice(base.length) : '';
  return /^\/(?:app|admin)(?:\/|$)/.test(protectedPath) && !/%(?:2f|5c|25)/i.test(protectedPath) ? target : fallback;
}
