import React, { useEffect, useId, useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Clock3, Headset, LogOut, Settings, ShieldCheck, WifiOff } from 'lucide-react';

import { updateUser } from '../../lib/api/users';
import { formatErrorMessage } from '../../lib/errors';
import { useClippedPopover } from '../../lib/hooks/useClippedPopover';
import { Alert } from '../ui/Alert';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { clsx } from '../ui/clsx';
import { parseSessionMinutes } from '../user/UserSecurityModel';
import { PreferenceSelector, segmentedButtonClass } from './HeaderPreferenceSelector';
import type { AppHeaderProps } from './AppHeaderTypes';

export function AppSyncPopover(props: Pick<AppHeaderProps,
  't' | 'syncRef' | 'syncOpen' | 'setSyncOpen' | 'syncStatus' | 'syncTitle' | 'syncBody' | 'syncError' | 'onRetrySync'
>) {
  const { t, syncRef, syncOpen, setSyncOpen, syncStatus, syncTitle, syncBody, syncError, onRetrySync } = props;
  return (
    <div className="relative w-full" ref={syncRef}>
      <button
        className={clsx(
          'flex min-h-11 w-full items-center gap-2 rounded-md px-3 text-left text-sm hover:bg-surface-2',
          syncStatus === 'offline' ? 'text-danger' : 'text-warn'
        )}
        onClick={() => setSyncOpen((v) => !v)}
        aria-label={syncStatus === 'offline' ? t('sync.offline.indicator') : t('sync.error.indicator')}
        title={syncStatus === 'offline' ? t('sync.offline.indicator') : t('sync.error.indicator')}
        data-testid="shell.sync-indicator"
      >
        {syncStatus === 'offline' ? <WifiOff size={18} /> : <AlertTriangle size={18} />}
        <span className="min-w-0">{syncTitle}</span>
      </button>
      {syncOpen ? (
        <div
          className="relative z-50 mt-2 w-full rounded-md border border-border bg-overlay-surface p-2 shadow-panel"
          data-testid="shell.sync-panel"
          data-overlay="popover"
          data-overlay-surface="overlay"
        >
          <div className="px-2 py-1">
            <div className="text-sm font-semibold">{syncTitle}</div>
            <p className="mt-1 text-xs text-muted">{syncBody}</p>
            {syncStatus === 'error' && syncError ? (
              <p className="mt-2 text-xs text-muted" data-testid="shell.sync-panel.last-error">
                {t('sync.error.last_error', { message: formatErrorMessage(syncError) })}
              </p>
            ) : null}
            <div className="mt-3 flex gap-2">
              <Button testId="shell.sync-panel.retry" size="sm" variant="primary" onClick={() => {
                onRetrySync();
                setSyncOpen(false);
              }}>
                {t('common.retry')}
              </Button>
              <Button testId="shell.sync-panel.reload" size="sm" variant="secondary" onClick={() => window.location.reload()}>
                {t('common.reload')}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

const headerPopoverClassName = 'absolute left-0 top-[calc(100%+0.5rem)] z-50 w-full overflow-y-auto overscroll-contain rounded-md border border-border bg-overlay-surface p-2 shadow-panel';

export function AppSessionControl(props: Pick<AppHeaderProps, 't' | 'sessionExpiresAt'> & {
  userId: number;
  anchorRef: React.RefObject<HTMLDivElement | null>;
  sessionIdleLimitSeconds: number | null;
  onOpen: () => void;
  className: string;
}) {
  const { t, userId, sessionExpiresAt, sessionIdleLimitSeconds, onOpen, className, anchorRef } = props;
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const popupId = useId();
  const popupStyle = useClippedPopover(open, anchorRef, popupRef, Infinity);
  const storedSeconds = sessionIdleLimitSeconds;
  const queryClient = useQueryClient();
  const [minutes, setMinutes] = useState('');
  const inputId = useId();
  const parsed = parseSessionMinutes(minutes);
  const save = useMutation({
    mutationFn: (seconds: number) => updateUser(userId, { preferred_session_length: seconds }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['user', 'current'] }),
        queryClient.invalidateQueries({ queryKey: ['users', userId] }),
      ]);
      if (popupRef.current?.contains(document.activeElement)) triggerRef.current?.focus();
      setOpen(false);
    },
  });

  const change = (value: string) => {
    save.reset();
    setMinutes(value);
  };
  const canSave = parsed.valid && Number.isSafeInteger(parsed.seconds) &&
    parsed.seconds !== (storedSeconds ?? 1200) && !save.isPending;
  const close = () => {
    if (save.isPending) return;
    triggerRef.current?.focus();
    setOpen(false);
  };
  const title = t('security.settings.session_length.label');

  const pending = save.isPending;
  useEffect(() => {
    if (!open) return;
    const onOutside = (event: PointerEvent) => {
      if (pending || !(event.target instanceof Node) ||
          triggerRef.current?.contains(event.target) || popupRef.current?.contains(event.target)) return;
      setOpen(false);
    };
    const onEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.defaultPrevented) return;
      event.preventDefault();
      if (pending) return;
      setOpen(false);
      triggerRef.current?.focus();
    };
    document.addEventListener('pointerdown', onOutside);
    document.addEventListener('keydown', onEscape);
    return () => {
      document.removeEventListener('pointerdown', onOutside);
      document.removeEventListener('keydown', onEscape);
    };
  }, [open, pending]);

  const sessionRemaining = useSessionRemainingLabel(t, sessionExpiresAt);
  const sessionDisplay = sessionRemaining
    ? { menuLabel: t('auth.session_remaining.menu_label'), value: sessionRemaining }
    : sessionIdleLimitSeconds === 0
      ? { menuLabel: t('auth.session_idle.menu_label'), value: t('security.settings.session_length.preset.never') }
      : null;

  if (!sessionDisplay) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => {
          if (open) {
            close();
            return;
          }
          onOpen();
          change(String(Math.round((storedSeconds ?? 1200) / 60)));
          setOpen(true);
        }}
        className={className}
        ref={triggerRef}
        aria-expanded={open}
        aria-controls={open ? popupId : undefined}
        aria-label={`${sessionDisplay.menuLabel}: ${sessionDisplay.value}`}
        title={`${sessionDisplay.menuLabel}: ${sessionDisplay.value}`}
        data-testid="shell.session-remaining"
      >
        <Clock3 size={18} className="shrink-0" aria-hidden="true" />
        <span>{sessionDisplay.value}</span>
      </button>
      {open ? (
        <div
          id={popupId}
          ref={popupRef}
          style={popupStyle}
          className={headerPopoverClassName}
          data-testid="shell.session-length.popover"
          data-overlay="popover"
          data-overlay-surface="overlay"
        >
          <form aria-label={title} className="space-y-3" onSubmit={(event) => {
            event.preventDefault();
            if (canSave) save.mutate(parsed.seconds);
          }}>
            <div className="flex flex-wrap gap-2" role="group" aria-label={title}>
              {[20, 40, 0].map(value => (
                <Button key={value} variant="secondary" size="sm" disabled={save.isPending}
                  className="min-h-11 px-2" aria-pressed={minutes === String(value)}
                  onClick={() => change(String(value))} testId={`shell.session-length.preset.${value}`}
                >
                  {value === 0 ? t('security.settings.session_length.preset.never')
                    : t('security.settings.session_length.preset.minutes', { m: value })}
                </Button>
              ))}
            </div>
            <div>
              <label className="text-sm font-medium" htmlFor={inputId}>
                {title} ({t('security.settings.session_length.unit')})
              </label>
              <Input inputId={inputId} type="number" min={0} step={1} value={minutes}
                disabled={save.isPending} onChange={event => change(event.target.value)}
                testId="shell.session-length.input" />
            </div>
            {parsed.valid && parsed.seconds === 0 ? (
              <Alert variant="warn">{t('security.posture.item.session_length.warning')}</Alert>
            ) : null}
            {save.isError ? (
              <Alert variant="danger" title={t('security.settings.toast.failed.title')} testId="shell.session-length.error">
                {formatErrorMessage(save.error)}
              </Alert>
            ) : null}
            <div className="flex justify-end gap-2">
              <Button variant="secondary" disabled={save.isPending} onClick={close}>{t('common.cancel')}</Button>
              <Button type="submit" disabled={!canSave} loading={save.isPending} testId="shell.session-length.save">
                {t('common.save')}
              </Button>
            </div>
          </form>
        </div>
      ) : null}
    </>
  );
}

export function AppUserMenu(props: Pick<AppHeaderProps,
  't' | 'mode' | 'canSwitchMode' | 'userMenuRef' | 'userMenuOpen' | 'setUserMenuOpen' | 'authLogin' | 'authRole' |
  'helpPlacement' | 'onSetHelpPlacement' | 'onNavigate' | 'theme' | 'language' | 'onSetTheme' | 'onSetLanguage' | 'onGoToOtherMode' | 'onGoToProfile' | 'onGoToPublicStatus' | 'loginLogoutHref'
>) {
  const {
    t, mode, canSwitchMode, userMenuRef, userMenuOpen, setUserMenuOpen, authLogin, authRole,
    helpPlacement, onSetHelpPlacement, onNavigate, theme, language, onSetTheme, onSetLanguage,
    onGoToOtherMode, onGoToProfile, loginLogoutHref,
  } = props;
  const roleDescriptionId = useId();
  const RoleIcon = authRole === 'admin' ? ShieldCheck : authRole === 'support' ? Headset : null;
  const roleLabel = authRole === 'admin' || authRole === 'support' || authRole === 'user'
    ? t(`admin.users.role.${authRole}`)
    : undefined;
  const preferencesOpen = userMenuOpen;
  const preferencesTriggerRef = useRef<HTMLButtonElement>(null);
  const popupId = useId();
  const preferencesLabel = t('settings.interface.label');

  const preferencesRef = useRef<HTMLDivElement>(null);
  const preferencesStyle = useClippedPopover(preferencesOpen, userMenuRef, preferencesRef, Infinity);
  useEffect(() => {
    if (!userMenuOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.defaultPrevented) return;
      event.preventDefault();
      setUserMenuOpen(false);
      preferencesTriggerRef.current?.focus();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [userMenuOpen, preferencesOpen, setUserMenuOpen]);

  return (
    <div className="relative min-w-0" ref={userMenuRef}>
      <div className="flex min-w-0 gap-1.5">
        <button
          type="button"
          className="flex min-h-11 min-w-0 flex-1 items-center gap-1.5 rounded-md border border-transparent bg-surface px-2 text-left text-sm text-muted hover:bg-surface-2 hover:text-fg md:min-h-9 [@media(any-pointer:coarse)]:min-h-11"
          onClick={() => {
            setUserMenuOpen(false);
            onGoToProfile();
          }}
          aria-label={t('user_menu.account_for', { login: authLogin ?? '—' })}
          title={t('user_menu.account')}
          aria-describedby={roleLabel ? roleDescriptionId : undefined}
          data-testid="shell.user-menu-button"
        >
          <span className="min-w-0 truncate font-medium">{authLogin ?? '—'}</span>
          {RoleIcon ? (
            <span className="shrink-0" title={roleLabel} data-testid="shell.user-role">
              <RoleIcon size={14} aria-hidden="true" />
            </span>
          ) : null}
          {roleLabel ? <span id={roleDescriptionId} className="sr-only">{roleLabel}</span> : null}
        </button>
        <button
          type="button"
          ref={preferencesTriggerRef}
          className="flex min-h-11 w-11 shrink-0 items-center justify-center rounded-md border border-border bg-surface text-muted hover:bg-surface-2 hover:text-fg md:min-h-9 md:w-9 [@media(any-pointer:coarse)]:min-h-11 [@media(any-pointer:coarse)]:w-11"
          onClick={() => setUserMenuOpen(!userMenuOpen)}
          aria-expanded={preferencesOpen}
          aria-controls={preferencesOpen ? popupId : undefined}
          aria-label={preferencesLabel}
          title={preferencesLabel}
          data-testid="shell.interface-preferences-button"
        >
          <Settings size={18} aria-hidden="true" />
        </button>
        <a
          href={loginLogoutHref}
          className="flex min-h-11 w-11 shrink-0 items-center justify-center rounded-md border border-border bg-surface text-muted hover:bg-surface-2 hover:text-fg md:min-h-9 md:w-9 [@media(any-pointer:coarse)]:min-h-11 [@media(any-pointer:coarse)]:w-11"
          aria-label={t('user_menu.logout')}
          title={t('user_menu.logout')}
          data-testid="shell.logout"
        >
          <LogOut size={18} aria-hidden="true" />
        </a>
        {preferencesOpen ? (
          <div
            id={popupId}
            ref={preferencesRef}
            style={preferencesStyle}
            className={clsx(headerPopoverClassName, 'divide-y divide-border')}
            role="region"
            aria-label={preferencesLabel}
            data-testid="shell.interface-preferences"
            data-overlay="popover"
            data-overlay-surface="overlay"
          >
            {canSwitchMode ? (
              <div className="px-2 py-2" role="group" aria-label={t('settings.scope.label')}>
                <div className="text-xs text-muted">{t('settings.scope.label')}</div>
                <div className="mt-1 grid grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] gap-2">
                  <button
                    type="button"
                    data-testid="shell.interface-preferences.scope.mine"
                    aria-pressed={mode === 'user'}
                    className={segmentedButtonClass(mode === 'user')}
                    onClick={() => {
                      if (mode === 'user') return;
                      setUserMenuOpen(false);
                      onGoToOtherMode();
                    }}
                  >
                    {t('settings.scope.mine')}
                  </button>
                  <button
                    type="button"
                    data-testid="shell.interface-preferences.scope.all"
                    aria-pressed={mode === 'admin'}
                    className={segmentedButtonClass(mode === 'admin')}
                    onClick={() => {
                      if (mode === 'admin') return;
                      setUserMenuOpen(false);
                      onGoToOtherMode();
                    }}
                  >
                    {t('settings.scope.all')}
                  </button>
                </div>
                <p className={clsx('mt-2 text-xs', mode === 'admin' ? 'text-warn' : 'text-muted')}>
                  {mode === 'admin' ? t('scope.indicator.admin_hint') : t('scope.indicator.my_hint')}
                </p>
              </div>
            ) : null}
            {onSetHelpPlacement ? (
              <PreferenceSelector
                label={t('settings.help_placement.label')}
                options={[
                  { id: 'top', label: t('settings.help_placement.top') },
                  { id: 'bottom', label: t('settings.help_placement.bottom') },
                ]}
                selected={helpPlacement ?? 'top'}
                testIdPrefix="shell.interface-preferences.help-placement"
                onSelect={(value) => {
                  if (value === 'top' || value === 'bottom') onSetHelpPlacement(value);
                }}
              />
            ) : null}
            <PreferenceSelector
              label={t('settings.theme.label')}
              options={[
                { id: 'system', label: t('settings.theme.system') },
                { id: 'light', label: t('settings.theme.light') },
                { id: 'dark', label: t('settings.theme.dark') },
              ]}
              selected={theme}
              testIdPrefix="shell.interface-preferences.theme"
              onSelect={(value) => onSetTheme(value as AppHeaderProps['theme'])}
            />
            <PreferenceSelector
              label={t('settings.language.label')}
              options={[
                { id: 'system', label: t('settings.language.system') },
                { id: 'en', label: 'EN', title: t('settings.language.en') },
                { id: 'cs', label: 'CS', title: t('settings.language.cs') },
              ]}
              selected={language}
              testIdPrefix="shell.interface-preferences.language"
              onSelect={(value) => onSetLanguage(value as AppHeaderProps['language'])}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}


function formatSessionRemaining(t: AppHeaderProps['t'], expiresAt: number, now: number): string {
  const remainingMs = expiresAt - now;
  if (remainingMs <= 0) return t('auth.session_remaining.expired');
  if (remainingMs < 60_000) return t('auth.session_remaining.less_than_minute');
  const minutesTotal = Math.ceil(remainingMs / 60_000);
  if (minutesTotal < 60) return t('auth.session_remaining.minutes', { minutes: minutesTotal });
  const hours = Math.floor(minutesTotal / 60);
  const minutes = minutesTotal % 60;
  return minutes === 0
    ? t('auth.session_remaining.hours', { hours })
    : t('auth.session_remaining.hours_minutes', { hours, minutes });
}

function useSessionRemainingLabel(t: AppHeaderProps['t'], expiresAt?: number): string | null {
  const [, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!expiresAt) return undefined;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [expiresAt]);
  if (!expiresAt || !Number.isFinite(expiresAt)) return null;
  // A renewed deadline must use the current clock, not the previous timer tick.
  return formatSessionRemaining(t, expiresAt, Date.now());
}
