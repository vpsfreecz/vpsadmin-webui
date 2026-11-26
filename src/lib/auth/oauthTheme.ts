import type { UiThemePreference } from '../../app/uiSettingsModel';
import { withSameOriginNextParam } from '../routerPaths';

export type OAuthTheme = 'light' | 'dark' | 'auto';
export const OAUTH_THEME_COOKIE = 'vpsadmin_oauth_theme';

export function parseOAuthTheme(value: unknown): OAuthTheme | undefined {
  return value === 'light' || value === 'dark' || value === 'auto' ? value : undefined;
}

export function toOAuthTheme(theme: UiThemePreference): OAuthTheme {
  return theme === 'light' || theme === 'dark' ? theme : 'auto';
}

export function fromOAuthTheme(theme: OAuthTheme): UiThemePreference {
  return theme === 'auto' ? 'system' : theme;
}

export function buildOAuthLoginUrl(base: string, next: string | undefined, theme: UiThemePreference): string {
  try {
    const url = new URL(next === undefined ? base : withSameOriginNextParam(base, next), window.location.origin);
    url.searchParams.set('theme', toOAuthTheme(theme));
    url.searchParams.set('theme_return', '1');
    return url.toString();
  } catch {
    return base;
  }
}

export interface OAuthThemeHandoff {
  selected: UiThemePreference;
  initiating: UiThemePreference;
}

export function readOAuthTheme(): OAuthThemeHandoff | undefined {
  try {
    const values = document.cookie
      .split(';')
      .map((part) => part.trim())
      .filter((part) => part.startsWith(`${OAUTH_THEME_COOKIE}=`));
    const parts = values.length === 1 ? values[0]?.slice(OAUTH_THEME_COOKIE.length + 1).split('.') : [];
    const selected = parts?.length === 2 ? parseOAuthTheme(parts[0]) : undefined;
    const initiating = parts?.length === 2 ? parseOAuthTheme(parts[1]) : undefined;
    return selected && initiating
      ? { selected: fromOAuthTheme(selected), initiating: fromOAuthTheme(initiating) }
      : undefined;
  } catch {
    return undefined;
  }
}

export function writeOAuthTheme(theme: UiThemePreference, initiating: UiThemePreference): void {
  const valid = (value: unknown) => value === 'light' || value === 'dark' || value === 'system';
  if (!valid(theme) || !valid(initiating)) return;
  try {
    document.cookie = `${OAUTH_THEME_COOKIE}=${toOAuthTheme(theme)}.${toOAuthTheme(initiating)}; Path=/; Max-Age=120; SameSite=Lax${location.protocol === 'https:' ? '; Secure' : ''}`;
  } catch {
    // Cosmetic persistence must not block authentication.
  }
}

export function clearOAuthTheme(): void {
  try {
    document.cookie = `${OAUTH_THEME_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax${location.protocol === 'https:' ? '; Secure' : ''}`;
  } catch {
    // This cookie is cosmetic and expires after two minutes.
  }
}
