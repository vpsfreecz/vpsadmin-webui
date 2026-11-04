import React from 'react';

import { useI18n } from '../../../app/i18n';
import { Alert } from '../../../components/ui/Alert';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Card, CardBody, CardHeader } from '../../../components/ui/Card';
import { ChipLink } from '../../../components/ui/ChipLink';
import { Spinner } from '../../../components/ui/Spinner';
import { Table } from '../../../components/ui/Table';
import type { VpsMount } from '../../../lib/api/vpsMounts';
import { formatDateTime } from '../../../lib/format';
import { datasetId, datasetLabel, mountStateTone } from './VpsStorageModel';

function MountBadges(props: { mount: VpsMount; canAdmin: boolean }) {
  const { t } = useI18n();
  const enabled = props.mount.enabled;
  const masterEnabled = props.mount.master_enabled;

  return (
    <div className="flex shrink-0 flex-wrap items-center gap-2">
      <Badge variant={enabled == null ? 'neutral' : enabled ? 'ok' : 'warn'}>{enabled == null ? t('common.na') : enabled ? t('common.enabled') : t('common.disabled')}</Badge>
      <Badge variant={mountStateTone(props.mount)}>{String(props.mount.current_state ?? t('common.na'))}</Badge>
      {props.canAdmin ? (
        <Badge variant={masterEnabled ? 'neutral' : 'warn'}>
          {t('vps.storage.mounts.master_short')}: {masterEnabled == null ? t('common.na') : masterEnabled ? t('common.yes') : t('common.no')}
        </Badge>
      ) : null}
    </div>
  );
}

function MountDatasetLink(props: { basePath: string; mount: VpsMount; testId: string }) {
  const ds = datasetLabel(props.mount.dataset);
  const dsId = datasetId(props.mount.dataset);

  if (!dsId) return <>{ds}</>;

  return (
    <ChipLink to={`${props.basePath}/datasets/${dsId}`} className="max-w-full" data-testid={props.testId}>
      <span className="min-w-0 break-all">{ds}</span>
    </ChipLink>
  );
}

export function VpsStorageMountsCard(props: {
  basePath: string;
  canAdmin: boolean;
  canMutate: boolean;
  mounts: VpsMount[];
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
  onEdit: (mount: VpsMount) => void;
  onDelete: (mount: VpsMount) => void;
}) {
  const { t } = useI18n();

  return (
    <Card testId="vps.storage.mounts">
      <CardHeader
        title={t('vps.storage.mounts.title')}
        subtitle={t('vps.storage.mounts.subtitle')}
        actions={
          <Button variant="secondary" size="sm" onClick={props.onRefresh}>
            {t('common.refresh')}
          </Button>
        }
      />

      <CardBody>
        {props.loading ? (
          <div className="py-2">
            <Spinner label={t('common.loading')} />
          </div>
        ) : props.error ? (
          <Alert title={t('vps.storage.mounts.load_error')} variant="danger">
            {props.error}
          </Alert>
        ) : props.mounts.length === 0 ? (
          <div className="py-2 text-sm text-muted">{t('vps.storage.mounts.empty')}</div>
        ) : (
          <>
            <div className="space-y-3 md:hidden">
              {props.mounts.map((mount) => (
                <Card key={mount.id} testId={`vps.storage.mounts.card.${mount.id}`}>
                  <CardBody>
                    <div className="space-y-2">
                      <div className="min-w-0">
                        <div className="break-all text-base font-semibold">{String(mount.mountpoint ?? '—')}</div>
                        <div className="mt-1 text-xs text-muted">
                          <MountDatasetLink basePath={props.basePath} mount={mount} testId={`vps.storage.mounts.card.${mount.id}.dataset`} />
                        </div>
                      </div>
                      <MountBadges mount={mount} canAdmin={props.canAdmin} />
                    </div>

                    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
                      <span>{t('vps.storage.mounts.field.mode', { mode: String(mount.mode ?? '—') })}</span>
                      <span>{t('vps.storage.mounts.field.on_start_fail', { value: String(mount.on_start_fail ?? '—') })}</span>
                      {mount.expiration_date ? <span>{t('vps.storage.mounts.field.expiration', { value: formatDateTime(mount.expiration_date) })}</span> : null}
                    </div>

                    {props.canMutate ? <div className="mt-3 flex items-center justify-end gap-2">
                      <Button variant="secondary" size="sm" testId={`vps.storage.mounts.card.${mount.id}.edit`} onClick={() => props.onEdit(mount)}>
                        {t('common.edit')}
                      </Button>
                      <Button variant="danger" size="sm" testId={`vps.storage.mounts.card.${mount.id}.delete`} onClick={() => props.onDelete(mount)}>
                        {t('common.delete')}
                      </Button>
                    </div> : null}
                  </CardBody>
                </Card>
              ))}
            </div>

            <div className="hidden overflow-x-auto md:block">
              <Table testId="vps.storage.mounts.table" minWidth="md">
                <thead>
                  <tr className="border-b border-border text-left text-xs text-muted">
                    <th className="px-4 py-3">{t('vps.storage.mounts.field.mountpoint')}</th>
                    <th className="px-4 py-3">{t('vps.storage.mounts.field.dataset')}</th>
                    <th className="px-4 py-3">{t('vps.storage.mounts.column.access')}</th>
                    <th className="px-4 py-3">{t('vps.storage.mounts.column.status')}</th>
                    <th className="px-4 py-3">{t('vps.storage.mounts.column.details')}</th>
                    {props.canMutate ? <th className="px-4 py-3"></th> : null}
                  </tr>
                </thead>
                <tbody>
                  {props.mounts.map((mount) => {
                    return (
                      <tr key={mount.id} data-testid={`vps.storage.mounts.row.${mount.id}`} className="border-b border-border/60 last:border-b-0">
                        <td className="px-4 py-3 font-medium">{String(mount.mountpoint ?? '—')}</td>
                        <td className="px-4 py-3">
                          <MountDatasetLink basePath={props.basePath} mount={mount} testId={`vps.storage.mounts.row.${mount.id}.dataset`} />
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-fg">{String(mount.mode ?? '—')}</div>
                        </td>
                        <td className="px-4 py-3">
                          <MountBadges mount={mount} canAdmin={props.canAdmin} />
                        </td>
                        <td className="px-4 py-3 text-xs text-muted">
                          <details data-testid={`vps.storage.mounts.row.${mount.id}.details`}>
                            <summary className="cursor-pointer font-medium text-fg">{t('common.details')}</summary>
                            <div className="mt-2 max-w-sm space-y-1 break-words">
                              <div>{t('vps.storage.mounts.field.on_start_fail', { value: String(mount.on_start_fail ?? '—') })}</div>
                              <div>{t('vps.storage.mounts.field.expiration', { value: formatDateTime(mount.expiration_date) })}</div>
                              <div>{t('vps.storage.mounts.field.updated')}: {formatDateTime(typeof mount['updated_at'] === 'string' ? mount['updated_at'] : undefined)}</div>
                            </div>
                          </details>
                        </td>
                        {props.canMutate ? <td className="px-4 py-3 text-right">
                          <div className="inline-flex items-center gap-2">
                            <Button variant="secondary" size="sm" testId={`vps.storage.mounts.row.${mount.id}.edit`} onClick={() => props.onEdit(mount)}>
                              {t('common.edit')}
                            </Button>
                            <Button variant="danger" size="sm" testId={`vps.storage.mounts.row.${mount.id}.delete`} onClick={() => props.onDelete(mount)}>
                              {t('common.delete')}
                            </Button>
                          </div>
                        </td> : null}
                      </tr>
                    );
                  })}
                </tbody>
              </Table>
            </div>
          </>
        )}
      </CardBody>
    </Card>
  );
}
