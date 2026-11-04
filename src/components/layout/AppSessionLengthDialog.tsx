import React, { useId, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { updateUser } from '../../lib/api/users';
import { formatErrorMessage } from '../../lib/errors';
import { Alert } from '../ui/Alert';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Modal } from '../ui/Modal';
import { parseSessionMinutes } from '../user/UserSecurityModel';
import type { AppHeaderProps } from './AppHeaderTypes';

export function AppSessionLengthDialog({ t, userId, storedSeconds, onClose }: {
  t: AppHeaderProps['t'];
  userId: number;
  storedSeconds: number | null;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [minutes, setMinutes] = useState(String(Math.round((storedSeconds ?? 1200) / 60)));
  const inputId = useId();
  const parsed = parseSessionMinutes(minutes);
  const save = useMutation({
    mutationFn: (seconds: number) => updateUser(userId, { preferred_session_length: seconds }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['user', 'current'] }),
        queryClient.invalidateQueries({ queryKey: ['users', userId] }),
      ]);
      onClose();
    },
  });

  const change = (value: string) => {
    save.reset();
    setMinutes(value);
  };
  const canSave = parsed.valid && Number.isSafeInteger(parsed.seconds) &&
    parsed.seconds !== (storedSeconds ?? 1200) && !save.isPending;
  const close = () => { if (!save.isPending) onClose(); };
  const title = t('security.settings.session_length.label');

  return (
    <Modal open size="sm" title={title} onClose={close} testId="shell.session-length.dialog">
      <form className="space-y-3" onSubmit={(event) => {
        event.preventDefault();
        if (canSave) save.mutate(parsed.seconds);
      }}>
        <div className="flex flex-wrap gap-2" role="group" aria-label={title}>
          {[20, 40, 0].map(value => (
            <Button key={value} variant="secondary" size="sm" disabled={save.isPending}
              className="min-h-11" aria-pressed={minutes === String(value)}
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
    </Modal>
  );
}
