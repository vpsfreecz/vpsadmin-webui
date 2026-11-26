import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';

import { useAccountTimeZone } from '../../../app/accountTimeZone';
import { useAppMode } from '../../../app/appMode';
import { useI18n } from '../../../app/i18n';
import { useObjectScope } from '../../../app/objectScope';
import { useUiSettings } from '../../../app/uiSettings';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Card, CardBody, CardHeader } from '../../../components/ui/Card';
import { LinkButton } from '../../../components/ui/LinkButton';
import { extractConcernRefs } from '../../../lib/concerns';
import { shortConcernClassName } from '../../../lib/concernLinks';
import { fetchTransactionChains } from '../../../lib/api/transactions';
import { useTierAIntervalMs } from '../../../lib/refreshTiers';
import { chainBadgeFromState, chainProgressLabel, chainProgressPercent } from '../../../lib/taskStatus';

function RecentTasksContent() {
  const { basePath } = useAppMode();
  const scope = useObjectScope();
  const { t, lang } = useI18n();
  const timeZone = useAccountTimeZone();
  const refetchInterval = useTierAIntervalMs();
  const waitingForScope = scope.canSwitchScope && scope.scope === 'mine' && scope.mineUserId === undefined;
  const query = useQuery({
    queryKey: ['transaction_chains', 'list', { limit: 5, className: 'Vps', userId: scope.mineUserId ?? null, scope: scope.scope }],
    queryFn: async () => (await fetchTransactionChains({ limit: 5, className: 'Vps', userId: scope.mineUserId })).data,
    enabled: !waitingForScope,
    refetchInterval,
    retry: false,
  });
  const rows = [...(query.data ?? [])]
    .sort((a, b) => Date.parse(b.created_at ?? '') - Date.parse(a.created_at ?? '') || b.id - a.id)
    .slice(0, 5);

  if (query.isPending) return <p role="status">{t('common.loading')}</p>;
  if (query.isError)
    return (
      <div role="status" className="flex flex-wrap items-center gap-3 text-sm text-danger">
        <span>{t('tasks.error.load_chains')}</span>
        <Button variant="secondary" size="sm" testId="vps.recent_tasks.retry" onClick={() => void query.refetch()}>
          {t('common.retry')}
        </Button>
      </div>
    );
  if (rows.length === 0) return <p className="text-sm text-muted">{t('tasks.empty.no_chains')}</p>;

  return (
    <ul className="divide-y divide-border" data-testid="vps.recent_tasks.rows">
      {rows.map((chain) => {
        const badge = chainBadgeFromState(chain.state, t);
        const percent = chainProgressPercent(chain);
        const progress = chainProgressLabel(chain);
        const refs = extractConcernRefs(chain.concerns, { maxDepth: 3 }).slice(0, 3);
        const created = chain.created_at ? new Date(chain.created_at) : null;
        const createdLabel =
          created && !Number.isNaN(created.getTime())
            ? created.toLocaleString(lang, { timeZone, hour12: lang === 'cs' ? false : undefined })
            : chain.created_at || t('common.na');
        return (
          <li
            key={chain.id}
            className="flex flex-col gap-2 py-2 sm:flex-row sm:items-center sm:justify-between"
            data-testid={`vps.recent_tasks.row.${chain.id}`}
          >
            <div className="min-w-0 flex-1">
              <Link
                className="break-words text-sm font-medium text-link hover:underline [overflow-wrap:anywhere]"
                to={`${basePath}/transactions/${chain.id}`}
              >
                {chain.label || `#${chain.id}`}
              </Link>
              <div className="flex flex-wrap gap-x-3 text-xs text-muted">
                <time dateTime={chain.created_at ?? undefined}>{createdLabel}</time>
                {refs.map((ref) => (
                  <span key={`${ref.class_name}:${ref.row_id}`}>
                    {shortConcernClassName(ref.class_name)} #{ref.row_id}
                  </span>
                ))}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
              {progress ? (
                <span>
                  {progress}
                  {percent === null ? '' : ` · ${percent}%`}
                </span>
              ) : null}
              <Badge variant={badge.variant}>{badge.label}</Badge>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export function VpsRecentTasks() {
  const { basePath } = useAppMode();
  const { t } = useI18n();
  const { settings, setSettings } = useUiSettings();
  const setVisible = (visible: boolean) => setSettings({ ...settings, vpsRecentTasksVisible: visible });
  if (settings.vpsRecentTasksVisible === false)
    return (
      <div className="flex justify-end">
        <Button variant="secondary" size="sm" testId="vps.recent_tasks.show" onClick={() => setVisible(true)}>
          {t('tasks.recent_widget.show')}
        </Button>
      </div>
    );

  return (
    <Card testId="vps.recent_tasks">
      <CardHeader
        title={<h2>{t('tasks.recent_widget.title')}</h2>}
        actions={
          <>
            <LinkButton to={`${basePath}/transactions`} variant="secondary" size="sm" testId="vps.recent_tasks.history">
              {t('tasks.action.view_all')}
            </LinkButton>
            <Button variant="secondary" size="sm" testId="vps.recent_tasks.hide" onClick={() => setVisible(false)}>
              {t('tasks.recent_widget.hide')}
            </Button>
          </>
        }
      />
      <CardBody>
        <RecentTasksContent />
      </CardBody>
    </Card>
  );
}
