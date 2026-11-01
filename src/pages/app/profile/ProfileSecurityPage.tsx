import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

import { useAuth } from '../../../app/auth';
import { useI18n } from '../../../app/i18n';

import { DetailShell } from '../../../components/layout/DetailShell';
import { PageHeader } from '../../../components/layout/PageHeader';

import { UserSecurityPanel } from '../../../components/user/UserSecurityPanel';

import { Spinner } from '../../../components/ui/Spinner';

import { ProfileTabs } from './ProfileTabs';

export function ProfileSecurityPage() {
  const auth = useAuth();
  const { t } = useI18n();

  const location = useLocation();
  useEffect(() => {
    if (location.hash !== '#session-length') return;
    const focusSetting = () => {
      const setting = document.getElementById('session-length');
      const input = setting?.querySelector('input');
      if (!setting || !input) return false;
      setting.scrollIntoView({ block: 'center' });
      input.focus({ preventScroll: true });
      return true;
    };
    if (focusSetting()) return;
    // The security panel may still be loading after the route mounts.
    const observer = new MutationObserver(() => {
      if (focusSetting()) observer.disconnect();
    });
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [location.key, location.hash]);
  const userId = auth.user?.id ?? null;

  return (
    <DetailShell
      testId="profile.security.page"
      variant="narrow"
      header={<PageHeader title={t('profile.page.title')} description={t('profile.security.subtitle')} />}
      tabs={<ProfileTabs />}
    >
      {!userId ? (
        <div className="flex items-center justify-center py-12">
          <Spinner />
        </div>
      ) : (
        <div className="space-y-4">
          <UserSecurityPanel
            userId={userId}
            user={auth.user ?? undefined}
            variant="profile"
            testIdPrefix="profile.security"
          />
        </div>
      )}
    </DetailShell>
  );
}
