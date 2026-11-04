// i18n-ignore-file
import React from 'react';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { UserMfaRecoveryCard } from './UserMfaRecoveryCard';

const queryState = vi.hoisted(() => ({
  loading: false,
  failed: false,
  active: 2,
  pending: false,
}));

vi.mock('../../app/i18n', () => ({
  useI18n: () => ({ t: (key: string) => key }),
}));
vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
  useQuery: ({ queryKey }: { queryKey: unknown[] }) => ({
    isLoading: queryState.loading,
    error: queryState.failed ? new Error('Read failed') : null,
    data: queryKey.includes('totp_devices')
      ? Array.from({ length: queryState.active + Number(queryState.pending) }, (_, id) => ({
          id, confirmed: !queryState.pending, enabled: true,
        }))
      : [],
  }),
}));

const user = { id: 1, login: 'member', level: 1, enable_multi_factor_auth: true };

beforeEach(() => Object.assign(queryState, { loading: false, failed: false, active: 2, pending: false }));

describe('UserMfaRecoveryCard', () => {
  it('omits ordinary recovery reassurance only after every read succeeds', () => {
    render(<UserMfaRecoveryCard userId={1} user={user} testIdPrefix="mfa" />);
    expect(screen.queryByTestId('mfa.recovery.card')).not.toBeInTheDocument();
    expect(screen.queryByTestId('mfa.recovery.ready')).not.toBeInTheDocument();
    expect(screen.queryByTestId('mfa.recovery.status')).not.toBeInTheDocument();
  });

  it.each([
    { status: 'disabled', required: false, active: 0, pending: false },
    { status: 'staged', required: false, active: 1, pending: false },
    { status: 'needs_factor', required: true, active: 0, pending: false },
    { status: 'single_path', required: true, active: 1, pending: false },
    { status: 'setup_pending', required: true, active: 0, pending: true },
  ])('keeps the $status explanation and recovery checklist', ({ status, required, active, pending }) => {
    Object.assign(queryState, { active, pending });
    render(<UserMfaRecoveryCard userId={1} user={{ ...user, enable_multi_factor_auth: required }} testIdPrefix="mfa" />);

    expect(screen.getByText(`profile.mfa.recovery.alert.${status}.title`)).toBeVisible();
    expect(screen.getByText(`profile.mfa.recovery.alert.${status}.body`)).toBeVisible();
    expect(screen.getByTestId('mfa.recovery.checklist')).toBeVisible();
  });

  it('keeps loading visible even when settled feeds already suggest two factors', () => {
    queryState.loading = true;
    const { container } = render(<UserMfaRecoveryCard userId={1} user={user} testIdPrefix="mfa" />);

    expect(screen.getByTestId('mfa.recovery.card')).toBeVisible();
    expect(container.querySelector('.animate-spin')).not.toBeNull();
    expect(screen.queryByTestId('mfa.recovery.ready')).not.toBeInTheDocument();
    expect(screen.queryByTestId('mfa.recovery.status')).not.toBeInTheDocument();
  });

  it('keeps read failure visible even when other data suggests two factors', () => {
    queryState.failed = true;
    render(<UserMfaRecoveryCard userId={1} user={user} testIdPrefix="mfa" />);

    expect(screen.getByText('profile.mfa.recovery.load_failed')).toBeVisible();
    expect(screen.getByText('Read failed')).toBeVisible();
    expect(screen.queryByTestId('mfa.recovery.ready')).not.toBeInTheDocument();
    expect(screen.queryByTestId('mfa.recovery.status')).not.toBeInTheDocument();
  });
});
