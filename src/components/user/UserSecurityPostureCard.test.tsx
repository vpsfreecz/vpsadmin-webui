// i18n-ignore-file
import React from 'react';
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { User } from '../../lib/api/users';

import { UserSecurityPostureCard } from './UserSecurityPostureCard';

vi.mock('../../app/i18n', () => ({
  useI18n: () => ({ t: (key: string) => key }),
}));

const readyUser: User = {
  id: 42,
  login: 'member',
  level: 1,
  enable_basic_auth: false,
  enable_single_sign_on: true,
  enable_oauth2_auth: true,
  enable_multi_factor_auth: true,
  enable_new_login_notification: true,
  preferred_session_length: 1200,
  lockout: false,
  password_reset: false,
};

describe('UserSecurityPostureCard', () => {
  it.each(['profile', 'admin'] as const)('keeps individual controls visible for a ready %s without aggregate reassurance', (variant) => {
    render(<UserSecurityPostureCard user={readyUser} variant={variant} testIdPrefix="security" />);

    expect(screen.getByText('security.posture.title')).toBeVisible();
    expect(screen.queryByTestId('security.posture.summary')).not.toBeInTheDocument();
    expect(screen.queryByText('security.posture.badge.ready')).not.toBeInTheDocument();

    const controls = variant === 'admin'
      ? ['interactive_login', 'mfa', 'new_login_notification', 'session_length', 'lockout', 'password_reset']
      : ['interactive_login', 'mfa', 'new_login_notification', 'session_length'];

    for (const control of controls) {
      const item = within(screen.getByTestId(`security.posture.item.${control}`));
      expect(item.getByText(`security.posture.item.${control}.label`)).toBeVisible();
      expect(item.getByText(`security.posture.item.${control}.ready`)).toBeVisible();
    }

    expect(within(screen.getByTestId('security.posture.item.interactive_login')).getByText('security.posture.value.available')).toBeVisible();
    expect(within(screen.getByTestId('security.posture.item.mfa')).getByText('common.enabled')).toBeVisible();
    expect(within(screen.getByTestId('security.posture.item.new_login_notification')).getByText('common.enabled')).toBeVisible();
    expect(within(screen.getByTestId('security.posture.item.session_length')).getByText('security.settings.session_length.value.minutes')).toBeVisible();
  });

  it('retains recommendations and each affected control warning', () => {
    render(
      <UserSecurityPostureCard
        user={{ ...readyUser, enable_multi_factor_auth: false, enable_new_login_notification: false, preferred_session_length: 0 }}
        variant="profile"
        testIdPrefix="security"
      />
    );

    expect(screen.getByText('security.posture.badge.needs_attention')).toBeVisible();
    expect(screen.getByTestId('security.posture.summary')).toHaveTextContent('security.posture.summary.needs_attention');
    expect(screen.getByText('security.posture.item.mfa.warning')).toBeVisible();
    expect(screen.getByText('security.posture.item.new_login_notification.warning')).toBeVisible();
    expect(screen.getByText('security.posture.item.session_length.warning')).toBeVisible();
  });

  it('retains the limited-access summary and unavailable sign-in warning', () => {
    render(
      <UserSecurityPostureCard
        user={{ ...readyUser, enable_single_sign_on: false, enable_oauth2_auth: false }}
        variant="profile"
        testIdPrefix="security"
      />
    );

    expect(screen.getByText('security.posture.badge.limited')).toBeVisible();
    expect(screen.getByTestId('security.posture.summary')).toHaveTextContent('security.posture.summary.limited');
    expect(screen.getByText('security.posture.value.unavailable')).toBeVisible();
    expect(screen.getByText('security.posture.item.interactive_login.blocked')).toBeVisible();
  });

  it('retains locked-account feedback and password-reset warnings for administrators', () => {
    render(
      <UserSecurityPostureCard
        user={{ ...readyUser, lockout: true, password_reset: true }}
        variant="admin"
        testIdPrefix="security"
      />
    );

    expect(screen.getByText('security.posture.badge.locked')).toBeVisible();
    expect(screen.getByTestId('security.posture.summary')).toHaveTextContent('security.posture.summary.locked');
    expect(screen.getByText('security.posture.value.locked')).toBeVisible();
    expect(screen.getByText('security.posture.item.lockout.warning')).toBeVisible();
    expect(screen.getByText('security.posture.value.required')).toBeVisible();
    expect(screen.getByText('security.posture.item.password_reset.warning')).toBeVisible();
  });
});
