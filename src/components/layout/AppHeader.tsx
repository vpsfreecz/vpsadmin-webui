import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Activity, Maximize2, Search } from 'lucide-react';

import { readSessionIdleLimitSeconds } from '../../lib/auth/idleSession';
import { useAuth } from '../../app/auth';
import { useAppMode } from '../../app/appMode';
import { useObjectScope } from '../../app/objectScope';
import { clusterSearch, type ClusterSearchHit } from '../../lib/api/clusterSearch';
import {
  clusterResourceHref,
  clusterResourceKey,
  clusterResourceRefLabel,
  enrichUserSearchResults,
  normalizeClusterResource,
  parseClusterId,
} from '../../lib/search/clusterSearchResults';
import {
  searchUserObjects,
  type UserGlobalSearchGroup,
} from '../../lib/search/userGlobalSearch';
import { Badge } from '../ui/Badge';
import { clsx } from '../ui/clsx';
import { useClippedPopover } from '../../lib/hooks/useClippedPopover';
import { useDebouncedValue } from '../../lib/hooks/useDebouncedValue';
import { AppSyncPopover, AppUserMenu } from './AppHeaderMenus';
import { SearchScopeReminder } from './SearchScopeReminder';
import type { AppHeaderProps } from './AppHeaderTypes';

export type { AppHeaderProps } from './AppHeaderTypes';

interface InlineSearchResult {
  key: string;
  primary: string;
  secondary: string;
  href: string;
  id?: number;
  resource?: string;
  attribute?: string;
  group?: UserGlobalSearchGroup;
}

const INLINE_SEARCH_LISTBOX_ID = 'global-search-inline-listbox';
const INLINE_SEARCH_STATUS_ID = 'global-search-inline-status';

function inlineSearchOptionId(index: number): string {
  return `${INLINE_SEARCH_LISTBOX_ID}-option-${index}`;
}

function userSearchGroupLabel(group: UserGlobalSearchGroup, t: AppHeaderProps['t']): string {
  if (group === 'vps') return t('palette.group.vps');
  if (group === 'ips') return t('palette.group.ip_addresses');
  return t('palette.group.dns_zones');
}

function inlineResultsFromClusterSearch(basePath: string, t: AppHeaderProps['t'], hits: ClusterSearchHit[]): InlineSearchResult[] {
  const out: InlineSearchResult[] = [];
  const seen = new Set<string>();

  for (const hit of hits ?? []) {
    const resource = normalizeClusterResource(hit.resource);
    const id = parseClusterId(hit.id);
    if (!resource || id === null) continue;

    const href = clusterResourceHref(basePath, resource, id);
    if (!href) continue;

    const key = clusterResourceKey(resource, id);
    if (seen.has(key)) continue;
    seen.add(key);

    const fallback = clusterResourceRefLabel(t, resource, id);
    const primary = String(hit.value ?? hit.label ?? fallback).trim();
    const attr = String(hit.attribute ?? '').trim();

    out.push({
      key,
      primary: primary || fallback,
      secondary: attr ? `${fallback} · ${attr}` : fallback,
      href,
      id,
      resource,
      attribute: attr || undefined,
    });
  }

  return out;
}

export function AppHeader(props: AppHeaderProps) {
  const {
    t,
    mode,
    canSwitchMode,
    shortcutHint,
    onNavigate,
    onOpenPalette,
    showSyncIndicator,
    syncRef,
    syncOpen,
    setSyncOpen,
    syncStatus,
    syncTitle,
    syncBody,
    syncError,
    onRetrySync,
    tasksFailedCount,
    tasksActiveCount,
    onOpenTasks,
    userMenuRef,
    userMenuOpen,
    setUserMenuOpen,
    authLogin,
    authRole,
    sessionExpiresAt,
    theme,
    language,
    onSetTheme,
    onSetLanguage,
    onGoToOtherMode,
    onGoToProfile,
    onGoToPublicStatus,
    loginLogoutHref,
  } = props;
  const auth = useAuth();
  const { basePath } = useAppMode();
  const scope = useObjectScope();
  const navigate = useNavigate();
  const location = useLocation();
  const [search, setSearch] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<InlineSearchResult[]>([]);
  const [settledSearch, setSettledSearch] = useState('');
  const [selectedSearchResult, setSelectedSearchResult] = useState(0);
  const debouncedSearch = useDebouncedValue(search.trim(), 180);
  const sessionIdleLimitSeconds = readSessionIdleLimitSeconds(auth.user?.preferred_session_length);

  useEffect(() => {
    setSearch('');
    setSearchOpen(false);
    setSearchLoading(false);
    setSearchError(null);
    setSearchResults([]);
    setSettledSearch('');
  }, [location.pathname]);

  const canUseClusterSearch = auth.canUseAdminUi && mode === 'admin';

  useEffect(() => {
    const q = debouncedSearch;
    if (!q || q === '?') {
      setSearchLoading(false);
      setSearchError(null);
      setSearchResults([]);
      setSettledSearch(q);
      return undefined;
    }

    const ac = new AbortController();
    let alive = true;
    setSearchLoading(true);
    setSearchError(null);

    const run = async () => {
      try {
        if (canUseClusterSearch) {
          const res = await clusterSearch({ query: q, signal: ac.signal });
          const results = inlineResultsFromClusterSearch(basePath, t, res.data);
          // Keep secondary user lookups bounded even when the API returns many hits.
          const enrichedResults = await enrichUserSearchResults(results.slice(0, 8), t, ac.signal);
          if (!alive || ac.signal.aborted) return;
          setSearchResults([...enrichedResults, ...results.slice(8)]);
          return;
        }

        const results = await searchUserObjects({
          basePath,
          query: q,
          t,
          scopeUserId: scope.mineUserId,
          isAdmin: auth.role === 'admin',
          expectedUserId: typeof auth.user?.id === 'number' ? auth.user.id : undefined,
          limitPerGroup: 4,
          signal: ac.signal,
        });
        if (!alive || ac.signal.aborted) return;
        setSearchResults(results);
      } catch (e: any) {
        if (e?.name === 'AbortError') return;
        if (!alive || ac.signal.aborted) return;
        setSearchError(String(e?.message ?? e));
        setSearchResults([]);
      } finally {
        if (!alive || ac.signal.aborted) return;
        setSearchLoading(false);
        setSettledSearch(q);
      }
    };

    void run();

    return () => {
      alive = false;
      ac.abort();
    };
  }, [auth.role, auth.user?.id, basePath, canUseClusterSearch, debouncedSearch, mode, scope.mineUserId, t]);

  useEffect(() => {
    setSelectedSearchResult(0);
  }, [debouncedSearch, searchResults.length]);

  const normalizedSearch = search.trim();
  const searchDebouncePending = normalizedSearch !== debouncedSearch;
  const searchRequestPending = normalizedSearch !== settledSearch;
  const searchBusy = Boolean(normalizedSearch)
    && (searchDebouncePending || searchRequestPending || searchLoading);

  const searchStatus = useMemo(() => {
    if (!normalizedSearch) return t('palette.empty.type_to_search');
    if (searchBusy) return t('palette.loading');
    if (searchError) return `${t('palette.error_prefix')}: ${searchError}`;
    if (searchResults.length === 0) return t('palette.empty.no_results');
    return null;
  }, [normalizedSearch, searchBusy, searchError, searchResults.length, t]);

  const searchFormRef = useRef<HTMLFormElement>(null);
  const searchPopupRef = useRef<HTMLDivElement>(null);
  const inlineSearchPopupOpen = searchOpen && Boolean(normalizedSearch);
  const searchPopupStyle = useClippedPopover(inlineSearchPopupOpen, searchFormRef, searchPopupRef);
  const inlineSearchExpanded = inlineSearchPopupOpen
    && !searchBusy
    && !searchError
    && searchResults.length > 0;
  const inlineSearchActiveOptionId =
    inlineSearchExpanded && searchResults[selectedSearchResult]
      ? inlineSearchOptionId(selectedSearchResult)
      : undefined;

  useEffect(() => {
    if (inlineSearchActiveOptionId) {
      document.getElementById(inlineSearchActiveOptionId)?.scrollIntoView({ block: 'nearest' });
    }
  }, [inlineSearchActiveOptionId]);

  const openInlineResult = (result: InlineSearchResult) => {
    navigate(result.href);
    setSearch('');
    setSearchOpen(false);
    onNavigate?.();
  };

  return (
    <div className="space-y-2" data-testid="shell.controls">
      <div className="flex min-w-0 items-center gap-2">
        <form
          ref={searchFormRef}
          className={clsx(
            'relative flex h-11 min-w-0 flex-1 items-center gap-2 rounded-md border border-border bg-overlay-surface px-2 text-sm shadow-card',
            'focus-within:ring-2 focus-within:ring-accent/40',
            'md:h-10'
          )}
          role="search"
          onSubmit={(e) => {
            e.preventDefault();
            if (!inlineSearchExpanded) return;
            const selected = searchResults[selectedSearchResult] ?? searchResults[0];
            if (selected) openInlineResult(selected);
          }}
          onKeyDown={(event) => {
            if (event.key !== 'Escape') return;
            event.preventDefault();
            event.currentTarget.querySelector('input')?.focus();
            setSearchOpen(false);
          }}
          onBlur={(event) => {
            // Keyboard/touch focus may move into the reminder's switch button.
            if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setSearchOpen(false);
          }}
          data-testid="shell.inline-search"
        >
          <Search size={18} className="shrink-0 text-muted" />
          <input
            value={search}
            onFocus={() => setSearchOpen(true)}
            onChange={(e) => {
              setSearch(e.target.value);
              setSearchOpen(true);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                e.preventDefault();
                setSearchOpen(false);
                setSelectedSearchResult(0);
                return;
              }
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSearchOpen(true);
                if (!inlineSearchExpanded) return;
                setSelectedSearchResult((prev) => Math.min(prev + 1, Math.max(0, searchResults.length - 1)));
                return;
              }
              if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSearchOpen(true);
                if (!inlineSearchExpanded) return;
                setSelectedSearchResult((prev) => Math.max(prev - 1, 0));
              }
            }}
            className="min-w-0 flex-1 bg-transparent text-sm text-fg outline-none placeholder:text-muted"
            placeholder={mode === 'admin' ? t('palette.placeholder.admin') : t('palette.placeholder.user')}
            aria-label={t('search.inline.aria')}
            aria-controls={INLINE_SEARCH_LISTBOX_ID}
            aria-expanded={inlineSearchExpanded}
            aria-autocomplete="list"
            aria-activedescendant={inlineSearchActiveOptionId}
            aria-busy={searchBusy || undefined}
            aria-describedby={inlineSearchPopupOpen && !inlineSearchExpanded ? INLINE_SEARCH_STATUS_ID : undefined}
            role="combobox"
            data-testid="shell.inline-search.input"
          />


          {inlineSearchPopupOpen ? (
            <div
              ref={searchPopupRef}
              style={searchPopupStyle}
              className="absolute left-0 top-[calc(100%+0.5rem)] z-50 w-full overflow-y-auto overscroll-contain rounded-md border border-border bg-overlay-surface shadow-panel"
              data-testid="shell.inline-search.results"
              data-overlay="popover"
              data-overlay-surface="overlay"
            >
              {canSwitchMode && mode === 'user' && normalizedSearch !== '?' && !searchBusy && !searchError && searchResults.length === 0 ? (
                <div className="p-2"><SearchScopeReminder t={t} onSwitchMode={onGoToOtherMode} /></div>
              ) : null}
              {inlineSearchExpanded ? (
                <div
                  id={INLINE_SEARCH_LISTBOX_ID}
                  role="listbox"
                  aria-label={t('search.inline.aria')}
                  className="py-1"
                >
                  {searchResults.map((result, index) => {
                    const showGroup = !canUseClusterSearch && result.group && (
                      index === 0 || searchResults[index - 1]?.group !== result.group
                    );
                    return (
                      <React.Fragment key={`${result.key}:${index}`}>
                        {showGroup && result.group ? (
                          <div
                            className="border-t border-border px-3 pb-1 pt-2 text-xs font-semibold uppercase tracking-wide text-muted first:border-t-0"
                            data-testid={`shell.inline-search.group.${result.group}`}
                          >
                            {userSearchGroupLabel(result.group, t)}
                          </div>
                        ) : null}
                        <button
                          type="button"
                          id={inlineSearchOptionId(index)}
                          role="option"
                          aria-selected={index === selectedSearchResult}
                          tabIndex={-1}
                          className={clsx(
                            'flex w-full flex-col items-start px-3 py-2 text-left text-sm',
                            index === selectedSearchResult ? 'bg-surface-2' : 'hover:bg-surface-2'
                          )}
                          onMouseDown={(e) => e.preventDefault()}
                          onMouseEnter={() => setSelectedSearchResult(index)}
                          onClick={() => openInlineResult(result)}
                          data-testid={`shell.inline-search.result.${index}`}
                        >
                          <span className="max-w-full break-words font-medium text-fg">{result.primary}</span>
                          <span className="max-w-full break-words text-xs text-muted">{result.secondary}</span>
                        </button>
                      </React.Fragment>
                    );
                  })}
                </div>
              ) : (
                <div
                  id={INLINE_SEARCH_STATUS_ID}
                  role="status"
                  aria-live="polite"
                  aria-atomic="true"
                  className={clsx('px-3 py-2 text-sm', searchError ? 'text-danger' : 'text-muted')}
                  data-testid="shell.inline-search.status"
                >
                  {searchStatus}
                </div>
              )}
            </div>
          ) : null}
        </form>

        <button
          type="button"
          className="inline-flex h-11 w-11 shrink-0 md:h-10 md:w-10 [@media(any-pointer:coarse)]:min-h-11 [@media(any-pointer:coarse)]:min-w-11 items-center justify-center rounded-md border border-border bg-overlay-surface text-muted hover:bg-surface-2"
          onClick={onOpenPalette}
          aria-label={t('palette.open')}
          aria-haspopup="dialog"
          title={`${t('palette.open')} (${shortcutHint})`}
          data-testid="palette.open"
        ><Maximize2 size={16} aria-hidden="true" /></button>
      </div>
      {canSwitchMode || showSyncIndicator ? <div className="flex flex-wrap items-center gap-2">

        {canSwitchMode ? (
          <Badge
            variant={mode === 'admin' ? 'black' : 'neutral'}
            testId="scope.indicator"
            title={mode === 'admin' ? t('scope.indicator.admin_hint') : t('scope.indicator.my_hint')}
            className="max-w-full"
          >
            <span className="md:hidden">
              {mode === 'admin' ? t('scope.indicator.admin_short') : t('scope.indicator.my_short')}
            </span>
            <span className="hidden md:inline">
              {mode === 'admin' ? t('scope.indicator.admin') : t('scope.indicator.my')}
            </span>
          </Badge>
        ) : null}

        {showSyncIndicator ? (
          <AppSyncPopover
            t={t}
            syncRef={syncRef}
            syncOpen={syncOpen}
            setSyncOpen={setSyncOpen}
            syncStatus={syncStatus}
            syncTitle={syncTitle}
            syncBody={syncBody}
            syncError={syncError}
            onRetrySync={onRetrySync}
          />
        ) : null}

      </div> : null}
      <div className="flex flex-col gap-2">
        <button
          className="flex min-h-11 w-full items-center gap-2 rounded-md bg-surface md:min-h-9 [@media(any-pointer:coarse)]:min-h-11 px-3 text-left text-sm text-muted hover:bg-surface-2 hover:text-fg"
          onClick={onOpenTasks}
          aria-label={t('common.open_tasks')}
          data-testid="tasks.open-button"
        >
          <Activity size={18} className="shrink-0" />
          <span className="flex-1">{t('tasks.title')}</span>
          {tasksFailedCount > 0 ? <Badge variant="danger">{tasksFailedCount}</Badge> : null}
          {tasksActiveCount > 0 ? <Badge variant="warn">{tasksActiveCount}</Badge> : null}
        </button>

        <AppUserMenu
          t={t}
          mode={mode}
          canSwitchMode={canSwitchMode}
          userMenuRef={userMenuRef}
          userMenuOpen={userMenuOpen}
          setUserMenuOpen={setUserMenuOpen}
          authLogin={authLogin}
          authRole={authRole}
          onNavigate={onNavigate}
          sessionExpiresAt={sessionExpiresAt}
          sessionIdleLimitSeconds={sessionIdleLimitSeconds}
          sessionUserId={auth.user?.id}
          theme={theme}
          language={language}
          onSetTheme={onSetTheme}
          onSetLanguage={onSetLanguage}
          onGoToOtherMode={onGoToOtherMode}
          onGoToProfile={onGoToProfile}
          onGoToPublicStatus={onGoToPublicStatus}
          loginLogoutHref={loginLogoutHref}
        />
      </div>
    </div>
  );
}
