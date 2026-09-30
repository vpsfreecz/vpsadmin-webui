import React from 'react';
import { useQuery } from '@tanstack/react-query';

import { useAuth } from '../../../../app/auth';
import { useI18n } from '../../../../app/i18n';
import { ErrorState } from '../../../../components/ui/ErrorState';
import { Spinner } from '../../../../components/ui/Spinner';
import { fetchUserNamespace, fetchUserNamespaceMap } from '../../../../lib/api/userNamespaces';

/** Keep direct personal URLs personal, including for administrators. */
export function ProfileNamespaceOwnerGate(props: {
  kind: 'namespace' | 'map';
  id: number;
  children: React.ReactNode;
}) {
  const auth = useAuth();
  const { t } = useI18n();
  const userId = auth.user?.id;
  const admin = auth.role === 'admin';
  const validId = Number.isInteger(props.id) && props.id > 0;
  const ownerQ = useQuery({
    queryKey: ['profile_namespace_owner', userId, props.kind, props.id],
    enabled: admin && userId !== undefined && validId,
    queryFn: async () => {
      const namespaceId = props.kind === 'namespace'
        ? props.id
        : (await fetchUserNamespaceMap(props.id)).data.user_namespace?.id;
      if (typeof namespaceId !== 'number') return false;
      const namespace = (await fetchUserNamespace(namespaceId)).data;
      return namespace.user?.id === userId;
    },
  });

  if (userId === undefined || (admin && validId && ownerQ.isPending)) return <Spinner />;
  if (ownerQ.isError) return <ErrorState error={ownerQ.error} onRetry={() => void ownerQ.refetch()} />;
  if (!validId || (admin && !ownerQ.data)) {
    return <ErrorState kindOverride="not_found" title={t('error.not_found.title')} body={t('error.not_found.body')} showStatusLink={false} />;
  }
  // The API enforces ownership for non-administrators. Mounting the detail only
  // after the admin check also prevents fetching entries or offering mutations.
  return <>{props.children}</>;
}
