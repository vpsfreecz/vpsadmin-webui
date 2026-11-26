import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { afterEach, describe, expect, it } from 'vitest';
import { buildOAuthLoginUrl, clearOAuthTheme, readOAuthTheme, writeOAuthTheme } from './oauthTheme';

afterEach(clearOAuthTheme);

describe('OAuth theme handoff', () => {
  it.each(['system', 'light', 'dark'] as const)('carries the %s preference on direct and retry links', (theme) => {
    const url = new URL(buildOAuthLoginUrl('/oauth/login?existing=1', '/app/vps/42', theme));
    expect(url.searchParams.get('theme')).toBe(theme === 'system' ? 'auto' : theme);
    expect(url.searchParams.get('theme_return')).toBe('1');
    expect(url.searchParams.get('next')).toBe('/app/vps/42');
    expect(url.searchParams.get('existing')).toBe('1');
    expect(new URL(buildOAuthLoginUrl(url.toString(), undefined, theme)).searchParams.get('next')).toBe('/app/vps/42');
  });

  it('preserves selected and initiating preferences until explicitly consumed', () => {
    writeOAuthTheme('system', 'dark');
    expect(readOAuthTheme()).toEqual({ selected: 'system', initiating: 'dark' });
    expect(readOAuthTheme()).toEqual({ selected: 'system', initiating: 'dark' });
    clearOAuthTheme();
    expect(readOAuthTheme()).toBeUndefined();
  });

  it.each(['dark', 'dark.auto.extra', 'system.dark', 'dark.unknown', '<script>.auto'])('ignores malformed payload %s', (value) => {
    document.cookie = `vpsadmin_oauth_theme=${value}; Path=/`;
    expect(readOAuthTheme()).toBeUndefined();
    clearOAuthTheme();
    expect(document.cookie).not.toContain('vpsadmin_oauth_theme=');
  });

  it('ignores expired payloads', () => {
    document.cookie = 'vpsadmin_oauth_theme=dark.light; Path=/; Max-Age=0';
    expect(readOAuthTheme()).toBeUndefined();
  });

  it('applies the return before paint with denied localStorage and keeps the handoff for React', () => {
    const source = readFileSync('index.html', 'utf8');
    const script = source.match(/<script>([\s\S]*?)<\/script>/)?.[1];
    const html = { setAttribute: (_name: string, value: string) => { attributes.theme = value; }, removeAttribute: () => {}, style: {} as Record<string, string>, lang: '' };
    const attributes = { theme: '' };
    const fakeDocument = { documentElement: html, cookie: 'vpsadmin_oauth_theme=dark.light' };
    const fakeWindow = Object.defineProperty({}, 'localStorage', { get() { throw new Error('denied'); } });
    runInNewContext(script!, { document: fakeDocument, window: fakeWindow, navigator: { languages: ['cs'] }, location: { pathname: '/app' } });
    expect(attributes.theme).toBe('dark');
    expect(html.lang).toBe('cs');
    expect(fakeDocument.cookie).toBe('vpsadmin_oauth_theme=dark.light');
  });
});
