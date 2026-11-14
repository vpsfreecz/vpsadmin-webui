import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Maximize2, Minimize2, PlugZap, RotateCw, Trash2 } from 'lucide-react';

import { VpsConsoleFrame } from './VpsConsoleFrame';
import { useI18n } from '../../../app/i18n';
import { createConsoleToken, deleteConsoleToken, fetchConsoleToken } from '../../../lib/api/vps';
import { HaveApiError } from '../../../lib/api/haveapi';
import { Alert } from '../../../components/ui/Alert';
import { Button } from '../../../components/ui/Button';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog';
import { CopyButton } from '../../../components/ui/CopyButton';
import { Spinner } from '../../../components/ui/Spinner';
import { clsx } from '../../../components/ui/clsx';
import {
  buildConsoleUrl,
  isConsoleTokenExpired,
  normalizeConsoleToken,
  normalizeRemoteConsoleServer,
} from '../../../lib/consoleToken';
import {
  CONSOLE_CONNECTION_STATE_VARIANT,
  consoleMutationErrorMessage,
  getConsoleConnectionState,
  hasKnownConsoleToken,
  isConsoleSessionStateUncertain,
  markConsoleSessionStateUncertain,
} from './VpsConsoleModel';
import { useVps } from './VpsContext';
import { VpsConfirmTarget } from './VpsPowerConfirmation';

export function VpsConsolePage() {
  const { vps, canMutateVps } = useVps();
  const { t } = useI18n();

  if (!canMutateVps) {
    return (
      <div className="space-y-3" data-testid="vps.console.page">
        <div>
          <h2 className="text-base font-semibold">{t('vps.console.title')}</h2>
          <div className="mt-1 text-sm text-muted">{t('vps.console.subtitle')}</div>
        </div>
        <Alert variant="warn" title={t('gate.blocked.permission.title')} testId="vps.console.read_only">
          {t('gate.blocked.permission.body')}
        </Alert>
      </div>
    );
  }

  return <MutableVpsConsolePage key={vps.id} />;
}

function MutableVpsConsolePage() {
  const { vps, sshCommand, consoleControls } = useVps();
  const { t } = useI18n();
  const qc = useQueryClient();
  const objectLabel = String(vps.hostname ?? '') || `#${vps.id}`;

  const [newSessionConfirmOpen, setNewSessionConfirmOpen] = useState(false);
  const [revokeSessionConfirmOpen, setRevokeSessionConfirmOpen] = useState(false);
  const [focused, setFocused] = useState(false);
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [iframeProblem, setIframeProblem] = useState(false);
  const [frameNonce, setFrameNonce] = useState(0);
  const [manualReconnect, setManualReconnect] = useState(false);
  const [sessionSuspended, setSessionSuspended] = useState(false);

  const tokenQueryKey = ['vps', vps.id, 'consoleToken'] as const;
  const server = normalizeRemoteConsoleServer((vps.node as any)?.location?.remote_console_server);
  const canCreateSession = Boolean(server);

  const createFreshConsoleToken = async () => {
    const normalized = normalizeConsoleToken((await createConsoleToken(vps.id)).data);
    if (!normalized) throw new Error('Console token response did not include a usable token.');
    return normalized;
  };

  const tokenQ = useQuery({
    queryKey: tokenQueryKey,
    queryFn: createFreshConsoleToken,
    // Opening the console starts one session below. Keep background query
    // refreshes disabled so focus/reconnect cannot create another session.
    enabled: false,
    retry: false,
    refetchOnWindowFocus: false,
  });

  const autoStartAttempted = useRef(false);
  const { data: cachedToken, refetch: startSession } = tokenQ;
  useEffect(() => {
    if (!canCreateSession || autoStartAttempted.current) return;
    autoStartAttempted.current = true;
    if (cachedToken?.token && !isConsoleTokenExpired(cachedToken.expiration)) return;
    // Deduplicate StrictMode/in-flight requests and leave errors or a later
    // explicit revoke to the user's retry/new-session controls.
    void startSession({ cancelRefetch: false });
  }, [canCreateSession, cachedToken, startSession]);

  const resetFrameState = () => {
    setFrameNonce((value) => value + 1);
    setIframeLoaded(false);
    setIframeProblem(false);
    setManualReconnect(false);
  };

  const revokeSessionM = useMutation({
    mutationFn: async () => deleteConsoleToken(vps.id),
    onSuccess: () => {
      qc.setQueryData(tokenQueryKey, null);
      setSessionSuspended(true);
      resetFrameState();
    },
  });

  const newSessionM = useMutation({
    mutationFn: async () => {
      // The backend `Create` can return an existing valid token. Invalidate a
      // token only when this client actually knows about one; after a revoke,
      // creating the replacement session needs just the explicit POST.
      const invalidatesKnownSession = hasKnownConsoleToken(qc.getQueryData(tokenQueryKey));

      if (invalidatesKnownSession) {
        try {
          await deleteConsoleToken(vps.id);
        } catch (error) {
          // A transport failure cannot prove that the backend did not revoke
          // the token. Stop and hide the cached console instead of showing a
          // potentially invalid session as connected.
          throw markConsoleSessionStateUncertain(error);
        }
      }

      try {
        return await createFreshConsoleToken();
      } catch (error) {
        throw invalidatesKnownSession ? markConsoleSessionStateUncertain(error) : error;
      }
    },
    onMutate: () => {
      revokeSessionM.reset();
    },
    onSuccess: (data) => {
      qc.setQueryData(tokenQueryKey, data);
      setSessionSuspended(false);
      resetFrameState();
    },
    onError: (error) => {
      if (isConsoleSessionStateUncertain(error)) {
        qc.setQueryData(tokenQueryKey, null);
        setSessionSuspended(true);
        resetFrameState();
      }
    },
  });

  const activeToken = sessionSuspended ? null : (tokenQ.data ?? null);

  const consoleUrl = useMemo(
    () => buildConsoleUrl(server, vps.id, activeToken?.token),
    [activeToken?.token, server, vps.id]
  );

  useEffect(() => {
    setIframeLoaded(false);
    setIframeProblem(false);
  }, [consoleUrl]);

  // Router traffic renews the token on the server. The Create timestamp is
  // only a snapshot: reaching it must never tear down a working terminal.
  // Show is read-only and does not keep an abandoned console alive.
  const validityQ = useQuery({
    queryKey: ['vps', vps.id, 'consoleTokenValidity', activeToken?.token],
    queryFn: async () => {
      const { data } = await fetchConsoleToken(vps.id);
      return { ...data, checkedAt: Date.now() };
    },
    enabled: Boolean(activeToken?.token),
    retry: false,
    refetchInterval: 15_000,
    refetchOnWindowFocus: true,
    gcTime: 0,
  });

  useEffect(() => {
    const current = validityQ.data;
    if (current && current.token === activeToken?.token
      && !isConsoleTokenExpired(current.expiration, current.checkedAt)) {
      // Keep navigation's cached snapshot current without changing the iframe
      // URL or issuing a token mutation when the user returns to this tab.
      qc.setQueryData(['vps', vps.id, 'consoleToken'], { token: current.token, expiration: current.expiration });
    }
  }, [validityQ.data, activeToken?.token, qc, vps.id]);

  useEffect(() => {
    if (!consoleUrl || iframeLoaded) return;
    const timer = window.setTimeout(() => setIframeProblem(true), 12_000);
    return () => window.clearTimeout(timer);
  }, [consoleUrl, frameNonce, iframeLoaded]);

  useEffect(() => {
    if (!manualReconnect) return;
    const timer = window.setTimeout(() => setManualReconnect(false), 1_500);
    return () => window.clearTimeout(timer);
  }, [manualReconnect]);

  const techError = tokenQ.error instanceof HaveApiError ? tokenQ.error : null;

  const validityDenied = validityQ.error instanceof HaveApiError
    && !('failure' in validityQ.error && validityQ.error.failure === 'protocol')
    && validityQ.error.envelope.errors !== 'MALFORMED_HAVEAPI_ENVELOPE'
    && validityQ.error.envelope.errors !== 'INVALID_JSON_RESPONSE'
    && validityQ.error.envelope.status === false
    && [403, 404].includes(validityQ.error.httpStatus ?? 0);
  const tokenExpired = validityDenied || Boolean(validityQ.data && (
    validityQ.data.token !== activeToken?.token
    || isConsoleTokenExpired(validityQ.data.expiration, validityQ.data.checkedAt)
  ));
  const hasActiveLiveToken = Boolean(activeToken?.token && !tokenExpired);
  const hasConsoleUrl = Boolean(consoleUrl && !tokenExpired);
  const sessionActionPending = newSessionM.isPending || revokeSessionM.isPending;
  const disabledNewSession = !canCreateSession || tokenQ.isFetching || sessionActionPending;
  const disabledRevokeSession = !hasActiveLiveToken || sessionActionPending;

  const reconnect = () => {
    setManualReconnect(true);
    setIframeLoaded(false);
    setIframeProblem(false);
    setFrameNonce((value) => value + 1);
  };

  const connectionState = getConsoleConnectionState({
    hasServer: Boolean(server), sessionActionPending, manualReconnect, tokenError: tokenQ.isError,
    sessionSuspended, tokenExpired, tokenFetching: tokenQ.isFetching,
    hasActiveToken: Boolean(activeToken?.token), iframeProblem, iframeLoaded,
  });

  return (
    <div className="space-y-3" data-testid="vps.console.page">
      <div className="space-y-3">
        <div className="grid items-start gap-2 sm:grid-cols-[11rem_minmax(0,1fr)]">
          <div className="flex min-w-0 flex-wrap items-center gap-2 sm:min-h-8">
            <h2 className="text-base font-semibold">{t('vps.console.title')}</h2>
            <div
              title={t('vps.console.lifetime_hint')}
              className="inline-flex items-center gap-2 rounded-md border border-border bg-surface px-2.5 py-1 text-xs font-medium text-fg"
              data-testid="vps.console.connection_state"
            >
              <span className={clsx('h-2.5 w-2.5 rounded-full', CONSOLE_CONNECTION_STATE_VARIANT[connectionState])} aria-hidden="true" />
              <span data-testid="vps.console.frame_status">{t(`vps.console.state.${connectionState}` as any)}</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              testId="vps.console.new_session"
              onClick={() => {
                if (sessionSuspended) {
                  newSessionM.mutate();
                } else if (hasActiveLiveToken) {
                  newSessionM.reset();
                  setNewSessionConfirmOpen(true);
                } else {
                  void tokenQ.refetch();
                }
              }}
              disabled={disabledNewSession}
              title={t('vps.console.new_session.title_hint')}
            >
              <RotateCw className="h-4 w-4" aria-hidden="true" />
              {t('vps.console.new_session.label')}
            </Button>
            {hasConsoleUrl ? (
              <>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={reconnect}
                  testId="vps.console.reconnect"
                  title={t('vps.console.reconnect.title_hint')}
                >
                  <PlugZap className="h-4 w-4" aria-hidden="true" />
                  {t('vps.console.reconnect.label')}
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    revokeSessionM.reset();
                    setRevokeSessionConfirmOpen(true);
                  }}
                  testId="vps.console.revoke_session"
                  title={t('vps.console.revoke_session.title_hint')}
                  disabled={disabledRevokeSession}
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                  {t('vps.console.revoke_session.label')}
                </Button>
                <Button
                  variant={focused ? 'primary' : 'secondary'}
                  size="sm"
                  onClick={() => setFocused((value) => !value)}
                  testId={focused ? 'vps.console.exit_focus' : 'vps.console.focus'}
                  title={focused ? t('vps.console.exit_focus.title_hint') : t('vps.console.focus.title_hint')}
                  ariaLabel={focused ? t('vps.console.exit_focus.label') : t('vps.console.focus.label')}
                >
                  {focused ? (
                    <Minimize2 className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <Maximize2 className="h-4 w-4" aria-hidden="true" />
                  )}
                  {focused ? t('vps.console.exit_focus.label') : t('vps.console.focus.label')}
                </Button>
                {sshCommand ? (
                  <CopyButton
                    text={sshCommand}
                    variant="secondary"
                    size="sm"
                    label={t('vps.console.copy_ssh')}
                    testId="vps.console.copy_ssh"
                  />
                ) : null}
              </>
            ) : null}
          </div>
        </div>

        {consoleControls}
      </div>

      {!server ? (
        <div data-testid="vps.console.server_missing">
          <Alert variant="warn" title={t('vps.console.server_missing.title')}>
            {t('vps.console.server_missing.body')}
          </Alert>
        </div>
      ) : null}

      {sessionSuspended ? (
        <Alert variant="ok" title={t('vps.console.revoked.title')} testId="vps.console.revoked">
          <div className="space-y-3">
            <div>{t('vps.console.revoked.body')}</div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => newSessionM.mutate()}
              disabled={disabledNewSession}
              loading={newSessionM.isPending}
              testId="vps.console.revoked.new_session"
            >
              {t('vps.console.new_session.label')}
            </Button>
          </div>
        </Alert>
      ) : null}

      {newSessionM.isError && !newSessionConfirmOpen ? (
        <Alert variant="danger" title={t('vps.console.new_session.error_title')} testId="vps.console.new_session_error">
          <div className="space-y-1">
            <div>{t('vps.console.new_session.error_body')}</div>
            <div className="font-mono text-xs">{consoleMutationErrorMessage(newSessionM.error)}</div>
          </div>
        </Alert>
      ) : null}

      {revokeSessionM.isError && !revokeSessionConfirmOpen ? (
        <Alert variant="danger" title={t('vps.console.revoke_error.title')} testId="vps.console.revoke_error">
          <div className="space-y-1">
            <div>{t('vps.console.revoke_error.body')}</div>
            <div className="font-mono text-xs">{consoleMutationErrorMessage(revokeSessionM.error)}</div>
          </div>
        </Alert>
      ) : null}

      {tokenQ.isFetching && !activeToken ? (
        <div
          className="flex min-h-48 items-center justify-center rounded-md border border-border bg-code text-sm text-muted"
          data-testid="vps.console.loading"
        >
          <div className="flex items-center gap-2">
            <Spinner /> {t('vps.console.creating')}
          </div>
        </div>
      ) : null}

      {tokenQ.isError ? (
        <div data-testid="vps.console.error">
          <Alert variant="danger" title={t('vps.console.error.title')}>
            <div className="space-y-2">
              <div>{t('vps.console.error.body')}</div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => tokenQ.refetch()}
                  disabled={tokenQ.isFetching}
                  testId="vps.console.retry"
                >
                  {t('common.retry')}
                </Button>
              </div>

              <details className="rounded-md border border-border bg-surface-2 p-3">
                <summary className="cursor-pointer text-sm font-medium">{t('vps.console.technical_details')}</summary>
                <div className="mt-2 space-y-1 text-xs text-muted">
                  {techError?.httpStatus ? (
                    <div>
                      <span className="font-medium">{t('vps.console.tech.http')}</span>: {techError.httpStatus}
                    </div>
                  ) : null}
                  <div>
                    <span className="font-medium">{t('vps.console.tech.message')}</span>:{' '}
                    {String((tokenQ.error as any)?.message ?? tokenQ.error)}
                  </div>
                  {server ? (
                    <div>
                      <span className="font-medium">{t('vps.console.tech.server')}</span>: {server}
                    </div>
                  ) : null}
                </div>
              </details>
            </div>
          </Alert>
        </div>
      ) : null}

      {validityQ.isError && !validityDenied && activeToken ? (
        <Alert variant="warn" title={t('vps.console.validation_error.title')} testId="vps.console.validation_error">
          {t('vps.console.validation_error.body')}
        </Alert>
      ) : null}

      {tokenExpired && consoleUrl ? (
        <div data-testid="vps.console.expired">
          <Alert variant="warn" title={t('vps.console.expired.title')}>
            <div className="space-y-3">
              <div>{t('vps.console.expired.body')}</div>
              <Button
                variant="secondary"
                size="sm"
                testId="vps.console.expired.new_session"
                onClick={() => { void tokenQ.refetch(); }}
                disabled={disabledNewSession}
                loading={tokenQ.isFetching}
              >
                {t('vps.console.new_session.label')}
              </Button>
            </div>
          </Alert>
        </div>
      ) : null}

      {hasConsoleUrl ? (
        <VpsConsoleFrame
          vpsId={vps.id} consoleUrl={consoleUrl!} focused={focused} frameNonce={frameNonce}
          iframeLoaded={iframeLoaded} iframeProblem={iframeProblem} reconnect={reconnect}
          onLoad={() => { setIframeLoaded(true); setIframeProblem(false); }}
        />
      ) : null}

      <ConfirmDialog
        open={newSessionConfirmOpen}
        testId="vps.console.new_session_dialog"
        title={t('vps.console.new_session.confirm_title')}
        description={t('vps.console.new_session.confirm_body')}
        confirmLabel={t('vps.console.new_session.confirm')}
        confirmLoading={newSessionM.isPending}
        cancelDisabled={newSessionM.isPending}
        onCancel={() => {
          if (newSessionM.isPending) return;
          setNewSessionConfirmOpen(false);
        }}
        onConfirm={() => {
          newSessionM.mutate(undefined, {
            onSuccess: () => setNewSessionConfirmOpen(false),
          });
        }}
      >
        <div className="space-y-3">
          <VpsConfirmTarget vpsId={vps.id} objectLabel={objectLabel} testId="vps.console.new_session_dialog.target" />
          {newSessionM.isError ? (
            <Alert variant="danger" title={t('vps.console.new_session.error_title')} testId="vps.console.new_session_dialog.error">
              <div className="space-y-1">
                <div>{t('vps.console.new_session.error_body')}</div>
                <div className="font-mono text-xs">{consoleMutationErrorMessage(newSessionM.error)}</div>
              </div>
            </Alert>
          ) : null}
        </div>
      </ConfirmDialog>

      <ConfirmDialog
        open={revokeSessionConfirmOpen}
        testId="vps.console.revoke_session_dialog"
        title={t('vps.console.revoke_session.confirm_title')}
        description={t('vps.console.revoke_session.confirm_body')}
        confirmLabel={t('vps.console.revoke_session.confirm')}
        confirmVariant="danger"
        confirmLoading={revokeSessionM.isPending}
        cancelDisabled={revokeSessionM.isPending}
        onCancel={() => {
          if (revokeSessionM.isPending) return;
          setRevokeSessionConfirmOpen(false);
        }}
        onConfirm={() => {
          revokeSessionM.mutate(undefined, {
            onSuccess: () => setRevokeSessionConfirmOpen(false),
          });
        }}
      >
        <div className="space-y-3">
          <VpsConfirmTarget vpsId={vps.id} objectLabel={objectLabel} testId="vps.console.revoke_session_dialog.target" />
          {revokeSessionM.isError ? (
            <Alert variant="danger" title={t('vps.console.revoke_error.title')} testId="vps.console.revoke_session_dialog.error">
              <div className="space-y-1">
                <div>{t('vps.console.revoke_error.body')}</div>
                <div className="font-mono text-xs">{consoleMutationErrorMessage(revokeSessionM.error)}</div>
              </div>
            </Alert>
          ) : null}
        </div>
      </ConfirmDialog>
    </div>
  );
}
