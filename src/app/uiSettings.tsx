import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

import { getRuntimeConfig } from './config';
import { useAuth } from './auth';
import {
  DEFAULT_SETTINGS,
  HELP_PLACEMENT_STORAGE_KEY,
  loadHelpPlacement,
  type UiHelpPlacement,
  normalizeUiSettings,
  loadUiSettingsFromLocalStorage,
  resetUiSettingsPreferences,
  saveUiSettingsToLocalStorage,
  type UiLanguagePreference,
  type UiSettings,
  type UiTipLifecycleState,
  type UiThemePreference,
} from './uiSettingsModel';

import { HaveApiError, SESSION_EXPIRED_EVENT } from '../lib/api/apiErrors';
import { fetchWebuiUserSetting, saveWebuiUserSetting } from '../lib/api/webuiUserSettings';

export type { UiLanguagePreference, UiSettings, UiThemePreference };

export interface UiSettingsSyncState {
  mode: 'local' | 'server';
  status: 'idle' | 'loading' | 'saving' | 'error';
  lastLoadedAt?: string;
  lastSavedAt?: string;
  lastLoadError?: string;
  lastSaveError?: string;
  error?: string;
}

interface UiSettingsCtx {
  helpPlacement: UiHelpPlacement;
  setHelpPlacement: (placement: UiHelpPlacement) => void;
  settings: UiSettings;
  setSettings: (s: UiSettings) => void;

  // Convenience helpers
  setSidebarCollapsed: (collapsed: boolean) => void;
  setTheme: (theme: UiThemePreference) => void;
  setLanguage: (language: UiLanguagePreference) => void;
  setSidebarTimeZoneTipState: (state: UiTipLifecycleState) => void;
  retryLoad: () => Promise<void>;
  resetPreferences: (opts?: { includeTips?: boolean }) => Promise<void>;

  // For diagnostics and future UI
  sync: UiSettingsSyncState;
}

const UiSettingsContext = createContext<UiSettingsCtx | null>(null);

function nowIso(): string {
  return new Date().toISOString();
}

function safeErrorMessage(err: unknown): string {
  if (err instanceof HaveApiError) return err.message;
  if (err && typeof err === 'object' && 'message' in err) return String(err.message);
  return String(err);
}

function parseServerSettingsValue(value: unknown): UiSettings {
  // Accept either a JSON string (preferred) or an object.
  if (typeof value === 'string') {
    try {
      return normalizeUiSettings(JSON.parse(value));
    } catch {
      return { ...DEFAULT_SETTINGS };
    }
  }

  return normalizeUiSettings(value);
}

/**
 * Provider for UI settings.
 *
 * Persistence:
 * - Always persists to localStorage.
 * - Optionally syncs to the API (HaveAPI) when configured.
 */
export function UiSettingsProvider(props: { children: React.ReactNode; serverSyncEnabled?: boolean }) {
  const auth = useAuth();
  const cfg = getRuntimeConfig();

  const localStorage = typeof window !== 'undefined' ? window.localStorage : undefined;

  const [helpPlacement, setHelpPlacementState] = useState(() => loadHelpPlacement(localStorage));
  const setHelpPlacement = useCallback(
    (placement: UiHelpPlacement) => {
      const next = placement === 'bottom' ? 'bottom' : 'top';
      setHelpPlacementState(next);
      try {
        localStorage?.setItem(HELP_PLACEMENT_STORAGE_KEY, next);
      } catch {
        // Keep the choice usable in memory when browser storage is unavailable.
      }
    },
    [localStorage]
  );

  const [settings, setSettings] = useState<UiSettings>(() => loadUiSettingsFromLocalStorage(localStorage));

  const serverEnabled =
    props.serverSyncEnabled !== false && cfg.uiSettings.persistence === 'server' && cfg.auth.kind !== 'none';
  const serverNamespace = cfg.uiSettings.server.namespace;
  const serverField = cfg.uiSettings.server.field;
  const serverUserKey = auth.status === 'authenticated' ? String(auth.user?.id ?? 'current') : null;

  const [sync, setSync] = useState<UiSettingsSyncState>(() => ({
    mode: serverEnabled ? 'server' : 'local',
    status: 'idle',
  }));

  // Server save bookkeeping (also used to avoid unnecessary writes after server load).
  const saveTimerRef = useRef<number | null>(null);
  const lastSavedJsonRef = useRef<string | null>(null);
  const skipNextServerSaveRef = useRef(false);
  const [loadedServerKey, setLoadedServerKey] = useState<string | null>(null);
  const loadInFlightRef = useRef<Promise<void> | null>(null);
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const loadAbortRef = useRef<AbortController | null>(null);
  const sessionExpiredRef = useRef(false);

  useEffect(() => {
    const expire = () => {
      sessionExpiredRef.current = true;
      loadAbortRef.current?.abort();
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
      setSync((state) => ({ ...state, status: 'idle' }));
    };
    window.addEventListener(SESSION_EXPIRED_EVENT, expire);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, expire);
  }, []);

  // Keep sync.mode in sync when config changes.
  useEffect(() => {
    setSync((s) => ({
      ...s,
      mode: serverEnabled ? 'server' : 'local',
    }));
  }, [serverEnabled]);

  useEffect(() => {
    lastSavedJsonRef.current = null;
    skipNextServerSaveRef.current = false;
    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
  }, [serverUserKey]);

  // Local persistence is always enabled.
  useEffect(() => {
    saveUiSettingsToLocalStorage(localStorage, settings);
  }, [localStorage, settings]);

  const loadFromServer = useCallback(async () => {
    if (!serverEnabled) return;
    if (auth.status !== 'authenticated' || sessionExpiredRef.current) return;
    const loadKey = serverUserKey ?? 'current';
    if (loadInFlightRef.current) return loadInFlightRef.current;

    const localJsonAtLoad = JSON.stringify(normalizeUiSettings(settingsRef.current));
    const controller = new AbortController();
    loadAbortRef.current = controller;
    const p = (async () => {
      setSync((s) => ({ ...s, status: 'loading', error: undefined, lastLoadError: undefined }));
      try {
        const value = await fetchWebuiUserSetting(serverNamespace, serverField, { signal: controller.signal });
        controller.signal.throwIfAborted();

        if (value === undefined) {
          // Loading an absent record is not a user edit. Preserve local choices
          // without migrating them implicitly; edits made during the read still save.
          lastSavedJsonRef.current = localJsonAtLoad;
          setLoadedServerKey(loadKey);
          setSync((s) => ({ ...s, status: 'idle', lastLoadedAt: nowIso(), lastLoadError: undefined }));
          return;
        }

        const fromServer = parseServerSettingsValue(value);
        const json = JSON.stringify(normalizeUiSettings(fromServer));

        // Avoid an immediate write-back caused by the state update.
        skipNextServerSaveRef.current = true;
        lastSavedJsonRef.current = json;

        setSettings(fromServer);
        saveUiSettingsToLocalStorage(localStorage, fromServer);
        setLoadedServerKey(loadKey);
        setSync((s) => ({ ...s, status: 'idle', lastLoadedAt: nowIso(), lastLoadError: undefined }));
      } catch (e) {
        if (controller.signal.aborted) return;
        const message = safeErrorMessage(e);
        setSync((s) => ({
          ...s,
          status: 'error',
          error: message,
          lastLoadError: message,
        }));
        throw e;
      } finally {
        if (loadAbortRef.current === controller) loadAbortRef.current = null;
        loadInFlightRef.current = null;
      }
    })();

    loadInFlightRef.current = p;
    return p;
  }, [auth.status, localStorage, serverEnabled, serverField, serverNamespace, serverUserKey]);

  // Server load (best-effort) after authentication.
  const loadedFromServerRef = useRef<string | null>(null);
  useEffect(() => {
    if (!serverEnabled) return;
    if (auth.status !== 'authenticated') return;
    const loadKey = serverUserKey ?? 'current';
    if (loadedFromServerRef.current === loadKey) return;

    loadedFromServerRef.current = loadKey;
    let cancelled = false;

    loadFromServer().catch(() => {
      if (cancelled) return;
      // loadFromServer already recorded diagnostics.
    });

    return () => {
      cancelled = true;
    };
  }, [auth.status, loadFromServer, serverEnabled, serverUserKey]);

  // Server save (best-effort, debounced) when settings change.
  useEffect(() => {
    if (!serverEnabled) return;
    if (auth.status !== 'authenticated' || sessionExpiredRef.current) return;
    if (!serverUserKey || loadedServerKey !== serverUserKey) return;

    // When we set settings from server, we don't want to immediately write back.
    if (skipNextServerSaveRef.current) {
      skipNextServerSaveRef.current = false;
      return;
    }

    const json = JSON.stringify(normalizeUiSettings(settings));
    if (lastSavedJsonRef.current === json) return;

    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);

    saveTimerRef.current = window.setTimeout(async () => {
      if (sessionExpiredRef.current) return;
      try {
        setSync((s) => ({ ...s, status: 'saving', error: undefined, lastSaveError: undefined }));
        await saveWebuiUserSetting(serverNamespace, serverField, normalizeUiSettings(settings));

        lastSavedJsonRef.current = json;
        setSync((s) => ({ ...s, status: 'idle', lastSavedAt: nowIso(), lastSaveError: undefined }));
      } catch (e) {
        const message = safeErrorMessage(e);
        setSync((s) => ({
          ...s,
          status: 'error',
          error: message,
          lastSaveError: message,
        }));
      }
    }, 500);

    return () => {
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    };
  }, [auth.status, loadedServerKey, serverEnabled, serverField, serverNamespace, serverUserKey, settings]);

  const retryLoad = useCallback(async () => {
    loadedFromServerRef.current = null;
    await loadFromServer();
  }, [loadFromServer]);

  const resetPreferences = useCallback(
    async (opts?: { includeTips?: boolean }) => {
      const next = resetUiSettingsPreferences(settings, opts);
      const json = JSON.stringify(normalizeUiSettings(next));

      if (saveTimerRef.current) {
        window.clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }

      if (serverEnabled && auth.status === 'authenticated') {
        try {
          setSync((s) => ({ ...s, status: 'saving', error: undefined, lastSaveError: undefined }));
          await saveWebuiUserSetting(serverNamespace, serverField, next);

          lastSavedJsonRef.current = json;
          skipNextServerSaveRef.current = true;
          setHelpPlacement('top');
          setSettings(next);
          saveUiSettingsToLocalStorage(localStorage, next);
          setSync((s) => ({ ...s, status: 'idle', lastSavedAt: nowIso(), lastSaveError: undefined }));
          return;
        } catch (e) {
          const message = safeErrorMessage(e);
          setSync((s) => ({
            ...s,
            status: 'error',
            error: message,
            lastSaveError: message,
          }));
          throw e;
        }
      }

      lastSavedJsonRef.current = json;
      skipNextServerSaveRef.current = true;
      setHelpPlacement('top');
      setSettings(next);
      saveUiSettingsToLocalStorage(localStorage, next);
      setSync((s) => ({ ...s, status: 'idle', lastSavedAt: nowIso(), lastSaveError: undefined }));
    },
    [auth.status, localStorage, serverEnabled, serverField, serverNamespace, settings, setHelpPlacement]
  );

  const ctx: UiSettingsCtx = useMemo(
    () => ({
      helpPlacement,
      setHelpPlacement,
      settings,
      setSettings: (s) => {
        // Normalize immediately so we don't store garbage.
        setSettings(normalizeUiSettings(s));
      },
      setSidebarCollapsed: (collapsed) => setSettings((s) => ({ ...s, sidebarCollapsed: collapsed })),
      setTheme: (theme) => setSettings((s) => ({ ...s, theme })),
      setLanguage: (language) => setSettings((s) => ({ ...s, language })),
      setSidebarTimeZoneTipState: (state) =>
        setSettings((s) => ({
          ...s,
          tips: {
            ...s.tips,
            sidebarTimeZone: state,
          },
        })),
      retryLoad,
      resetPreferences,
      sync,
    }),
    [helpPlacement, setHelpPlacement, resetPreferences, retryLoad, settings, sync]
  );

  return <UiSettingsContext.Provider value={ctx}>{props.children}</UiSettingsContext.Provider>;
}

export function useUiSettings(): UiSettingsCtx {
  const ctx = useContext(UiSettingsContext);
  if (!ctx) {
    throw new Error('useUiSettings must be used within UiSettingsProvider');
  }
  return ctx;
}
