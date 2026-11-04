// i18n-ignore-file
import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { UserSecuritySettingsReviewCard } from './UserSecurityReviewCards';
import {
  buildSecuritySettingsReview,
  buildStoredSecuritySettings,
  draftFromStoredSecuritySettings,
} from './UserSecurityModel';

vi.mock('../../app/i18n', () => ({
  useI18n: () => ({ t: (key: string) => key }),
}));

function storedSettings(interactiveLogin = true) {
  return buildStoredSecuritySettings({
    id: 1,
    login: 'member',
    level: 1,
    enable_basic_auth: interactiveLogin,
    enable_token_auth: true,
    enable_single_sign_on: false,
    enable_oauth2_auth: false,
    preferred_session_length: 1200,
  });
}

describe('UserSecuritySettingsReviewCard', () => {
  it('keeps an unchanged form quiet when there is no warning', () => {
    const stored = storedSettings();
    const review = buildSecuritySettingsReview(stored, draftFromStoredSecuritySettings(stored));
    render(<UserSecuritySettingsReviewCard prefix="security" review={review} />);

    expect(screen.queryByTestId('security.settings.review')).not.toBeInTheDocument();
  });

  it('retains an existing sign-in warning even when nothing has changed', () => {
    const stored = storedSettings(false);
    const review = buildSecuritySettingsReview(stored, draftFromStoredSecuritySettings(stored));
    render(<UserSecuritySettingsReviewCard prefix="security" review={review} />);

    expect(review.hasChanges).toBe(false);
    expect(screen.getByTestId('security.settings.review.warning.security.settings.review.warning.no_interactive_login')).toBeVisible();
  });

  it('retains a validation warning without inventing a changed value', () => {
    const stored = storedSettings();
    const review = buildSecuritySettingsReview(stored, { ...draftFromStoredSecuritySettings(stored), sessMin: '' });
    render(<UserSecuritySettingsReviewCard prefix="security" review={review} />);

    expect(review.hasChanges).toBe(false);
    expect(screen.getByTestId('security.settings.review.warning.security.settings.review.validation.session_length_required')).toBeVisible();
  });

  it('shows a changed setting with its effect and immediate-save consequence', () => {
    const stored = storedSettings();
    const review = buildSecuritySettingsReview(stored, { ...draftFromStoredSecuritySettings(stored), basic: false });
    render(<UserSecuritySettingsReviewCard prefix="security" review={review} />);

    expect(screen.getByTestId('security.settings.review.change.basic')).toHaveTextContent('common.enabled');
    expect(screen.getByTestId('security.settings.review.change.basic')).toHaveTextContent('common.disabled');
    expect(screen.getByText(review.changes[0]!.impactKey)).toBeVisible();
    expect(screen.getByText('security.settings.review.queue_note')).toBeVisible();
    expect(screen.getByTestId('security.settings.review.warning.security.settings.review.warning.no_interactive_login')).toBeVisible();
  });
});
