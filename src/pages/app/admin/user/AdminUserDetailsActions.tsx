import { useEffect, useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useAppMode } from '../../../../app/appMode';
import { useAuth } from '../../../../app/auth';
import { useI18n } from '../../../../app/i18n';
import { useToasts } from '../../../../app/toasts';
import { updateUser } from '../../../../lib/api/users';
import { generateSecurePassword } from '../../../../lib/passwordGeneration';
import { Alert } from '../../../../components/ui/Alert';
import { Button } from '../../../../components/ui/Button';
import { CopyButton } from '../../../../components/ui/CopyButton';
import { Input } from '../../../../components/ui/Input';
import { Modal } from '../../../../components/ui/Modal';
import { SwitchRow } from '../../../../components/ui/SwitchRow';

interface DetailsActionsProps {
  userId: number;
  login: string;
  disabled: boolean;
  onEdit: () => void;
}

export function AdminUserDetailsActions(props: DetailsActionsProps) {
  const { t } = useI18n();
  return (
    <div className="flex flex-wrap items-center gap-2">
      <AdminUserPasswordAction {...props} />
      <Button
        variant="secondary"
        size="sm"
        onClick={props.onEdit}
        disabled={props.disabled}
        testId="admin.user.edit.open"
      >
        {t('admin.user.edit.open')}
      </Button>
    </div>
  );
}

function AdminUserPasswordAction(props: DetailsActionsProps) {
  const { t } = useI18n();
  const auth = useAuth();
  const { basePath } = useAppMode();
  const toasts = useToasts();
  const qc = useQueryClient();
  const allowed = auth.status === 'authenticated' && auth.role === 'admin' && basePath === '/admin';
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [repeat, setRepeat] = useState('');
  const [requireChange, setRequireChange] = useState(true);
  const [logoutSessions, setLogoutSessions] = useState(true);
  const [error, setError] = useState(false);
  const [generationError, setGenerationError] = useState(false);
  // Keep the secret out of mutation variables/results and persistent storage.
  const request = useRef<{ password: string; requireChange: boolean; logoutSessions: boolean } | null>(null);
  useEffect(
    () => () => {
      request.current = null;
    },
    []
  );

  const clearDraft = () => {
    setPassword('');
    setRepeat('');
    setRequireChange(true);
    setLogoutSessions(true);
    setError(false);
    setGenerationError(false);
  };

  const passwordM = useMutation({
    retry: false,
    gcTime: 0,
    mutationFn: async () => {
      const snapshot = request.current;
      if (!allowed || props.disabled || !snapshot) throw new Error('Password update unavailable');
      try {
        await updateUser(props.userId, {
          new_password: snapshot.password,
          password_reset: snapshot.requireChange,
          logout_sessions: snapshot.logoutSessions,
        });
      } catch {
        // A backend diagnostic must never reflect a supplied password into UI/cache.
        throw new Error('Password update failed');
      }
    },
    onMutate: () => setError(false),
    onSuccess: async () => {
      clearDraft();
      setOpen(false);
      toasts.pushToast({
        variant: 'ok',
        title: t('security.password.toast.saved.title'),
        body: t('admin.user.password.saved', { login: props.login }),
      });
      await qc.invalidateQueries({ queryKey: ['users', props.userId] });
      await qc.invalidateQueries({ queryKey: ['user', 'current'] });
    },
    onError: () => setError(true),
    onSettled: () => {
      request.current = null;
      passwordM.reset();
    },
  });

  if (!allowed) return null;
  const pending = passwordM.isPending || request.current !== null;
  const valid = password.length >= 8 && password === repeat;
  const close = () => {
    if (pending) return;
    clearDraft();
    setOpen(false);
  };
  const generate = () => {
    try {
      const next = generateSecurePassword({ length: 10 });
      setPassword(next);
      setRepeat(next);
      setRequireChange(true);
      setGenerationError(false);
      setError(false);
    } catch {
      setGenerationError(true);
    }
  };
  const submit = () => {
    if (!valid || pending || props.disabled || !allowed) return;
    request.current = { password, requireChange, logoutSessions };
    passwordM.mutate();
  };

  return (
    <>
      <Button
        variant="secondary"
        size="sm"
        disabled={props.disabled || pending}
        onClick={() => {
          clearDraft();
          setOpen(true);
        }}
        testId="admin.user.password.open"
      >
        {t('admin.user.password.open')}
      </Button>
      <Modal
        open={open}
        onClose={close}
        showCloseButton
        title={t('admin.user.password.title', { login: props.login })}
        testId="admin.user.password.dialog"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={close} disabled={pending} testId="admin.user.password.cancel">
              {t('common.cancel')}
            </Button>
            <Button
              onClick={submit}
              disabled={!valid || pending || props.disabled}
              loading={passwordM.isPending}
              testId="admin.user.password.save"
            >
              {t('admin.user.password.open')}
            </Button>
          </div>
        }
      >
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            submit();
          }}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label={t('admin.user.password.field.password')}
              type="password"
              autoComplete="new-password"
              value={password}
              disabled={pending}
              onChange={(event) => {
                setPassword(event.target.value);
                setError(false);
              }}
              testId="admin.user.password.new"
            />
            <Input
              label={t('admin.user.password.field.repeat')}
              type="password"
              autoComplete="new-password"
              value={repeat}
              disabled={pending}
              onChange={(event) => {
                setRepeat(event.target.value);
                setError(false);
              }}
              testId="admin.user.password.repeat"
            />
          </div>
          {repeat && password !== repeat ? (
            <p className="text-sm text-danger" role="status">
              {t('security.password.validation.mismatch')}
            </p>
          ) : null}
          <p className="text-xs text-muted">{t('admin.user.password.hint')}</p>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={generate} disabled={pending} testId="admin.user.password.generate">
              {t('admin.user.password.generate')}
            </Button>
            {password ? (
              <CopyButton text={password} label={t('security.password.copy')} testId="admin.user.password.copy" />
            ) : null}
          </div>
          <SwitchRow
            checked={requireChange}
            disabled={pending}
            onChange={setRequireChange}
            label={t('security.flags.password_reset.label')}
            description={t('security.flags.password_reset.desc')}
            testId="admin.user.password.require_change"
          />
          <SwitchRow
            checked={logoutSessions}
            disabled={pending}
            onChange={setLogoutSessions}
            label={t('security.password.logout_sessions')}
            description={t('security.password.logout_sessions.hint')}
            testId="admin.user.password.logout_sessions"
          />
          {generationError ? (
            <Alert
              variant="danger"
              title={t('security.password.generated.failed.title')}
              testId="admin.user.password.generate_error"
            >
              {t('security.password.generated.failed.body')}
            </Alert>
          ) : null}
          {error ? (
            <Alert
              variant="danger"
              title={t('security.password.toast.failed.title')}
              testId="admin.user.password.error"
            >
              {t('admin.user.password.failed')}
            </Alert>
          ) : null}
          <button
            type="submit"
            className="sr-only"
            disabled={!valid || pending || props.disabled}
            tabIndex={-1}
            aria-hidden="true"
          />
        </form>
      </Modal>
    </>
  );
}
