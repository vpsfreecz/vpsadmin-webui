import React from 'react';

import { useAuth } from '../../../../app/auth';
import { useI18n } from '../../../../app/i18n';

import { Alert } from '../../../../components/ui/Alert';
import { UserDataTemplatesPanel } from '../../../../components/user/UserDataTemplatesPanel';

import { useAdminUserContext } from './AdminUserLayout';

export function AdminUserUserDataPage() {
  const { t } = useI18n();
  const auth = useAuth();
  const { user, userId } = useAdminUserContext();
  const canManageSelectedUser = auth.role === 'admin' || auth.user?.id === userId;

  return (
    <div className="space-y-2" data-testid="admin.user.user_data">
      <div className="text-sm text-muted">{t('user_data.admin.user_scoped_hint', { login: user.login })}</div>

      {canManageSelectedUser ? (
        <UserDataTemplatesPanel testIdPrefix="admin.user.user_data" userIdForAdmin={userId} createForUserId={userId} />
      ) : (
        <Alert variant="neutral" title={t('gate.blocked.permission.title')} testId="admin.user.user_data.forbidden">
          {t('gate.blocked.permission.body')}
        </Alert>
      )}
    </div>
  );
}
