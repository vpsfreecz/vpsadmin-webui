import { useAuth } from '../../../app/auth';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useAppMode } from '../../../app/appMode';
import { useI18n } from '../../../app/i18n';
import { Alert } from '../../../components/ui/Alert';
import { Button } from '../../../components/ui/Button';
import { Checkbox } from '../../../components/ui/Checkbox';
import { Select } from '../../../components/ui/Select';
import { Textarea } from '../../../components/ui/Textarea';
import { USER_DATA_FORMATS } from '../../../components/user/UserDataTemplatesModel';
import { fetchVpsUserDataList } from '../../../lib/api/vpsUserData';
import { cursorFromDescendingPage } from '../../../lib/lockIndex';
import { initializationError, type VpsInitializationForm } from './VpsInitializationModel';

export function VpsInitializationFields(props: {
  form: VpsInitializationForm;
  onChange: (patch: Partial<VpsInitializationForm>) => void;
  ownerId?: number;
  disabled?: boolean;
  testId: string;
}) {
  const { t } = useI18n();
  const { role } = useAuth();
  const { mode, basePath } = useAppMode();
  const { form, ownerId, onChange, testId, disabled } = props;
  const saved = form.userDataEnabled && form.userDataSource === 'saved';
  const list = useInfiniteQuery({
    queryKey: ['vps_user_data', 'initialization', ownerId ?? null, role],
    initialPageParam: undefined as number | undefined,
    queryFn: async ({ pageParam }) =>
      (await fetchVpsUserDataList({ user: role === 'admin' ? ownerId : undefined, limit: 50, fromId: pageParam })).data,
    getNextPageParam: (rows, _pages, previousCursor) => {
      const cursor = cursorFromDescendingPage(rows, (row) => row.id);
      return rows.length >= 50 && cursor !== null && (previousCursor === undefined || cursor < previousCursor)
        ? cursor
        : undefined;
    },
    enabled: saved && ownerId !== undefined,
  });
  // Never expose another owner's templates, even from a stale or unfiltered response.
  const rows = (list.data?.pages.flat() ?? []).filter((row) => Number(row.user?.id) === ownerId);
  const selected = form.userDataOwnerId === ownerId ? form.userDataTemplateId : '';
  const error = initializationError(form, ownerId);
  const manageTo = mode === 'admin' && ownerId ? `/admin/users/${ownerId}/user-data` : `${basePath}/profile/user-data`;

  return (
    <div className="space-y-3" data-testid={testId}>
      <Checkbox
        checked={form.userDataEnabled}
        onChange={(checked) => onChange({ userDataEnabled: checked })}
        label={t('vps.initialization.enable')}
        description={t('vps.initialization.help')}
        disabled={disabled}
        testId={`${testId}.enable`}
      />
      {form.userDataEnabled ? (
        <>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-muted">{t('vps.initialization.source')}</span>
            <Select
              value={form.userDataSource}
              disabled={disabled}
              onChange={(event) =>
                onChange({ userDataSource: event.target.value as VpsInitializationForm['userDataSource'] })
              }
              testId={`${testId}.source`}
            >
              <option value="inline">{t('vps.initialization.inline')}</option>
              <option value="saved">{t('vps.initialization.saved')}</option>
            </Select>
          </label>
          {saved ? (
            <>
              {!ownerId ? (
                <Alert variant="neutral">{t('vps.initialization.owner_required')}</Alert>
              ) : (
                <>
                  <label className="block">
                    <span className="mb-1 block text-xs font-semibold text-muted">
                      {t('vps.initialization.template')}
                    </span>
                    <Select
                      value={selected}
                      disabled={disabled || list.isPending || list.isError}
                      onChange={(event) =>
                        onChange({ userDataTemplateId: event.target.value, userDataOwnerId: ownerId })
                      }
                      testId={`${testId}.template`}
                    >
                      <option value="">{t('vps.initialization.choose')}</option>
                      {rows.map((row) => (
                        <option key={row.id} value={row.id}>
                          {row.label} ·{' '}
                          {USER_DATA_FORMATS.includes(row.format as VpsInitializationForm['userDataFormat'])
                            ? t(`user_data.format.${row.format}`)
                            : row.format}
                        </option>
                      ))}
                    </Select>
                  </label>
                  {list.isPending ? (
                    <p role="status" className="text-sm text-muted">
                      {t('common.loading')}
                    </p>
                  ) : null}
                  {list.isError ? (
                    <Alert variant="danger">
                      {t('vps.initialization.load_error')}
                      <Button
                        variant="secondary"
                        onClick={() => void list.refetch()}
                        disabled={disabled || list.isFetching}
                      >
                        {t('common.retry')}
                      </Button>
                    </Alert>
                  ) : !list.isPending && !rows.length ? (
                    <p className="text-sm text-muted">{t('vps.initialization.empty')}</p>
                  ) : null}
                  {list.hasNextPage ? (
                    <Button
                      variant="secondary"
                      testId={`${testId}.more`}
                      disabled={disabled || list.isFetching}
                      onClick={() => void list.fetchNextPage()}
                    >
                      {t('vps.initialization.more')}
                    </Button>
                  ) : null}
                  <Button variant="ghost" href={manageTo} target="_blank" rel="noopener noreferrer">
                    {t('vps.initialization.manage')}
                  </Button>
                </>
              )}
            </>
          ) : (
            <>
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-muted">{t('vps.initialization.format')}</span>
                <Select
                  value={form.userDataFormat}
                  disabled={disabled}
                  onChange={(event) =>
                    onChange({ userDataFormat: event.target.value as VpsInitializationForm['userDataFormat'] })
                  }
                  testId={`${testId}.format`}
                >
                  {USER_DATA_FORMATS.map((format) => (
                    <option key={format} value={format}>
                      {t(`user_data.format.${format}`)}
                    </option>
                  ))}
                </Select>
              </label>
              <Textarea
                label={t('vps.initialization.content')}
                value={form.userDataContent}
                rows={8}
                onChange={(event) => onChange({ userDataContent: event.target.value })}
                disabled={disabled}
                testId={`${testId}.content`}
              />
            </>
          )}
          {error && ownerId ? (
            <p role="status" className="text-sm text-warn">
              {t(error)}
            </p>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
