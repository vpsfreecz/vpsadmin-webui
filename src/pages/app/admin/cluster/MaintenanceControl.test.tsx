// i18n-ignore-file
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { HaveApiError } from '../../../../lib/api/apiErrors';
import {
  canManageClusterMaintenance,
  MaintenanceControl,
  parseMaintenanceState,
  reconcileMaintenanceAttempt,
} from './MaintenanceControl';

vi.mock('../../../../app/i18n', () => ({ useI18n: () => ({ t: (key: string) => key }) }));
vi.mock('../../../../app/toasts', () => ({ useToasts: () => ({ pushToast: vi.fn() }) }));

describe('maintenance state', () => {
  it('distinguishes owned and inherited locks', () => {
    expect(parseMaintenanceState('no')).toBe('no');
    expect(parseMaintenanceState('lock')).toBe('lock');
    expect(parseMaintenanceState('master_lock')).toBe('master_lock');
    expect(parseMaintenanceState(' NO ')).toBe('no');
    expect(parseMaintenanceState(' LOCK ')).toBe('lock');
    expect(parseMaintenanceState(' MASTER_LOCK ')).toBe('master_lock');
  });

  it('keeps missing and unrecognized maintenance state unknown', () => {
    for (const value of [undefined, null, '', ' ', 'unexpected', 0, 1, true, false]) {
      expect(parseMaintenanceState(value)).toBeNull();
    }
  });

  it('shows unknown without a lock or unlock action', () => {
    render(
      <QueryClientProvider client={new QueryClient()}>
        <MaintenanceControl
          value={null}
          label="Prague"
          testId="maintenance"
          setMaintenance={vi.fn()}
          onChanged={vi.fn()}
        />
      </QueryClientProvider>
    );
    expect(screen.getByText('common.unknown')).toBeVisible();
    expect(screen.queryByTestId('maintenance.lock')).not.toBeInTheDocument();
    expect(screen.queryByTestId('maintenance.unlock')).not.toBeInTheDocument();
  });

  it.each(['lock', 'unlock'] as const)(
    'blocks an open %s confirmation when current state becomes unknown',
    (action) => {
      const setMaintenance = vi.fn();
      const onChanged = vi.fn();
      const onSettlingChange = vi.fn();
      const onVerificationRequired = vi.fn();
      const readMaintenance = vi.fn();
      const client = new QueryClient();
      const view = (value: unknown) => (
        <QueryClientProvider client={client}>
          <MaintenanceControl
            value={value}
            reason="Existing reason"
            label="Prague"
            testId="maintenance"
            setMaintenance={setMaintenance}
            onChanged={onChanged}
            onSettlingChange={onSettlingChange}
            onVerificationRequired={onVerificationRequired}
            readMaintenance={readMaintenance}
          />
        </QueryClientProvider>
      );
      const { rerender } = render(view(action === 'lock' ? 'no' : 'lock'));
      fireEvent.click(screen.getByTestId(`maintenance.${action}`));
      if (action === 'lock') {
        fireEvent.change(screen.getByTestId('maintenance.reason'), { target: { value: 'Preserved reason draft' } });
      }
      expect(screen.getByTestId(`maintenance.${action}_dialog.confirm`)).toBeEnabled();

      rerender(view(null));

      expect(screen.getByText('common.unknown')).toBeVisible();
      expect(screen.getByText(`admin.cluster.maintenance.dialog.${action}.title`)).toBeVisible();
      const confirm = screen.getByTestId(`maintenance.${action}_dialog.confirm`);
      expect(confirm).toBeDisabled();
      if (action === 'lock') {
        expect(screen.getByTestId('maintenance.reason')).toHaveValue('Preserved reason draft');
      } else {
        expect(screen.getByText('Existing reason')).toBeVisible();
      }
      fireEvent.click(confirm);
      expect(setMaintenance).not.toHaveBeenCalled();
      expect(onChanged).not.toHaveBeenCalled();
      expect(onSettlingChange).not.toHaveBeenCalled();
      expect(onVerificationRequired).not.toHaveBeenCalled();
      expect(readMaintenance).not.toHaveBeenCalled();
      const cancel = screen.getByTestId(`maintenance.${action}_dialog.cancel`);
      expect(cancel).toBeEnabled();
      fireEvent.click(cancel);
      expect(screen.queryByTestId(`maintenance.${action}_dialog`)).not.toBeInTheDocument();
    }
  );

  it('settles ambiguous lock read-backs only from exact state and reason evidence', () => {
    const attempt = {
      lock: true,
      reason: 'Disk replacement',
      previousState: 'no' as const,
    };

    expect(reconcileMaintenanceAttempt(attempt, { value: 'lock', reason: 'Disk replacement' })).toBe('applied');
    expect(reconcileMaintenanceAttempt(attempt, { value: 'no', reason: '' })).toBe('not_applied');
    expect(reconcileMaintenanceAttempt(attempt, { value: 'lock', reason: 'Different work' })).toBe('unknown');
    expect(reconcileMaintenanceAttempt(attempt, { value: 'unexpected', reason: 'Disk replacement' })).toBe('unknown');
    expect(reconcileMaintenanceAttempt({ lock: true, previousState: 'no' }, { value: 'no', reason: null })).toBe(
      'not_applied'
    );
  });

  it('recognizes a removed direct lock even when inherited maintenance becomes visible', () => {
    const attempt = {
      lock: false,
      previousState: 'lock' as const,
      previousReason: 'Disk replacement',
    };

    expect(reconcileMaintenanceAttempt(attempt, { value: 'no', reason: '' })).toBe('applied');
    expect(reconcileMaintenanceAttempt(attempt, { value: 'master_lock', reason: 'Node maintenance' })).toBe('applied');
    expect(reconcileMaintenanceAttempt(attempt, { value: 'lock', reason: 'Disk replacement' })).toBe('not_applied');
    expect(reconcileMaintenanceAttempt(attempt, { value: 'lock', reason: 'Different work' })).toBe('unknown');
  });

  it('exposes maintenance state and mutations only to API admins', () => {
    expect(canManageClusterMaintenance('admin')).toBe(true);
    expect(canManageClusterMaintenance('support')).toBe(false);
    expect(canManageClusterMaintenance('user')).toBe(false);
  });

  it('shows an inherited lock without an unlock action', () => {
    render(
      <QueryClientProvider client={new QueryClient()}>
        <MaintenanceControl
          value="master_lock"
          label="Prague"
          testId="maintenance"
          setMaintenance={vi.fn()}
          onChanged={vi.fn()}
        />
      </QueryClientProvider>
    );
    expect(screen.getByText('admin.cluster.maintenance.state.master_lock')).toBeVisible();
    expect(screen.queryByTestId('maintenance.unlock')).not.toBeInTheDocument();
  });

  it.each([
    ['network error', new TypeError('network connection lost')],
    ['HTTP 503', new HaveApiError({ status: false, message: 'server unavailable' }, 'server unavailable', 503)],
  ])('fails closed after an ambiguous %s when no exact read-back is available', async (_label, error) => {
    const setMaintenance = vi.fn().mockRejectedValue(error);
    render(
      <QueryClientProvider client={new QueryClient()}>
        <MaintenanceControl
          value="no"
          label="Prague"
          testId="maintenance"
          setMaintenance={setMaintenance}
          onChanged={vi.fn()}
        />
      </QueryClientProvider>
    );

    fireEvent.click(screen.getByTestId('maintenance.lock'));
    fireEvent.click(screen.getByTestId('maintenance.lock_dialog.confirm'));

    await waitFor(() => expect(screen.getByTestId('maintenance.verification_required')).toBeVisible());
    expect(screen.getByTestId('maintenance.lock_dialog.confirm')).toBeDisabled();
    expect(screen.getByTestId('maintenance.lock')).toBeDisabled();
    fireEvent.click(screen.getByTestId('maintenance.lock_dialog.confirm'));
    expect(setMaintenance).toHaveBeenCalledTimes(1);
  });
});
