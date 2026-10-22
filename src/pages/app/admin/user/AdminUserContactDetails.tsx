import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Mail, ShieldCheck, Users } from 'lucide-react';

import { useAppMode } from '../../../../app/appMode';
import { useAuth } from '../../../../app/auth';
import { useI18n } from '../../../../app/i18n';
import { fetchUserMailRoleRecipients } from '../../../../lib/api/userMail';
import type { User } from '../../../../lib/api/users';
import { computeEffectiveRoleTo, parseEmails } from '../../../../components/user/UserMailPreferencesModel';
import { Alert } from '../../../../components/ui/Alert';
import { Badge } from '../../../../components/ui/Badge';
import { Button } from '../../../../components/ui/Button';
import { clsx } from '../../../../components/ui/clsx';

export function AdminUserContactDetails({ user }: { user: User }) {
  const { t } = useI18n();
  return (
    <>
      {user.address ? (
        <div className="sm:col-span-2">
          <div className="text-xs text-muted">{t('admin.user.field.address')}</div>
          <div className="text-sm whitespace-pre-wrap">{user.address}</div>
        </div>
      ) : null}
      <ContactSummary user={user} />
    </>
  );
}

function ContactSummary({ user }: { user: User }) {
  const { t } = useI18n();
  const auth = useAuth();
  const { basePath } = useAppMode();
  const allowed = auth.status === 'authenticated' && auth.role === 'admin' && basePath === '/admin';
  const query = useQuery({
    queryKey: ['users', user.id, 'mail_role_recipients'],
    queryFn: async () => (await fetchUserMailRoleRecipients(user.id)).data,
    enabled: allowed,
    staleTime: 10_000,
    retry: false,
  });
  if (!allowed) return null;

  return (
    <section
      className="sm:col-span-2 min-w-0 border-t border-border pt-4"
      aria-label={t('admin.user.contacts.title')}
      data-testid="admin.user.contacts"
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          <Mail className="h-4 w-4" aria-hidden="true" />
          {t('admin.user.contacts.title')}
        </h3>
        <Link
          className="text-xs text-accent hover:underline"
          to={`${basePath}/users/${user.id}/mail`}
          data-testid="admin.user.contacts.edit"
        >
          {t('admin.user.contacts.edit')}
        </Link>
      </div>
      {query.isError ? (
        <Alert variant="warn" title={t('admin.user.contacts.error')} testId="admin.user.contacts.error">
          <Button variant="secondary" size="sm" onClick={() => void query.refetch()}>
            {t('common.retry')}
          </Button>
        </Alert>
      ) : query.isPending ? (
        <p className="text-sm text-muted" role="status">
          {t('admin.user.contacts.loading')}
        </p>
      ) : (
        <div className="space-y-3">
          {(['account', 'admin'] as const).map((id) => {
            const role = query.data.find((item) => item.id === id) ?? { id };
            const customized = parseEmails(role.to).length > 0;
            const addresses = computeEffectiveRoleTo({ role, userEmail: user.email ?? '' });
            const Icon = id === 'account' ? Users : ShieldCheck;
            return (
              <div
                key={id}
                data-testid={`admin.user.contacts.${id}`}
                data-customized={String(customized)}
                className={clsx(
                  'min-w-0 rounded-md border p-3',
                  customized ? 'border-warn-border border-l-4 bg-warn-bg' : 'border-border bg-surface-2'
                )}
              >
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                    {t(`admin.user.contacts.${id}`)}
                  </div>
                  <Badge variant={customized ? 'warn' : addresses.length ? 'neutral' : 'danger'}>
                    {t(
                      customized
                        ? 'admin.user.contacts.custom'
                        : addresses.length
                          ? 'admin.user.contacts.primary'
                          : 'admin.user.contacts.missing'
                    )}
                  </Badge>
                </div>
                {addresses.length ? (
                  <ul className="space-y-1 text-sm">
                    {addresses.map((address, index) => (
                      <li key={`${index}:${address}`} className={clsx('break-all', customized && 'font-semibold')}>
                        {address}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted">{t('admin.user.contacts.not_set')}</p>
                )}
              </div>
            );
          })}
        </div>
      )}
      {user.mailer_enabled === false ? (
        <p className="mt-3 text-xs text-warn" data-testid="admin.user.contacts.mail_disabled">
          {t('admin.user.contacts.mail_disabled')}
        </p>
      ) : null}
    </section>
  );
}
