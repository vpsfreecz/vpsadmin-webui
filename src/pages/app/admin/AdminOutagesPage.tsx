import React, { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useI18n } from '../../../app/i18n';
import { AdminOutageListPage } from './AdminOutageListPage';
import {
  entityLabel,
  formPayload,
  hasErrors,
  initOutageForm,
  outageScopeErrorMessage,
  OutageForm,
  OutageReviewSummary,
  updatePayload,
  validateOutageForm,
  type OutageFormErrors,
} from './AdminOutageForm';
import { useAuth } from '../../../app/auth';
import { useToasts } from '../../../app/toasts';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Alert } from '../../../components/ui/Alert';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Card, CardBody, CardHeader } from '../../../components/ui/Card';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog';
import { ErrorState } from '../../../components/ui/ErrorState';
import { LinkButton } from '../../../components/ui/LinkButton';
import { LoadingState } from '../../../components/ui/LoadingState';
import { Modal } from '../../../components/ui/Modal';
import { Spinner } from '../../../components/ui/Spinner';
import { formatErrorMessage } from '../../../lib/errors';
import { formatDateTime } from '../../../lib/format';
import { parsePositiveInt } from '../../../lib/parse';
import { formatDurationMinutes } from '../../../lib/time';
import { outageBadges } from '../../../lib/outageBadges';
import { pickLocalizedField } from '../../../lib/translations';
import { fetchOutage, fetchOutageUpdates } from '../../../lib/api/public';
import { fetchSecurityAdvisoryOutageLinks } from '../../../lib/api/securityAdvisoryRelations';
import {
  applyOutageSystems,
  createOutageUpdate,
  fetchAllOutageEntities,
  fetchAllOutageHandlers,
  fetchExportOutages,
  fetchUserOutages,
  fetchVpsOutages,
  outageHandlerUserId,
  outageStateTransitionPayload,
  updateOutage,
  type OutageAdminState,
  type OutageUpdatePayload,
} from '../../../lib/api/outages';
import { OutageScopeEditor } from './OutageScopeEditor';
import { OutageAffectedTables } from './OutageAffectedTables';
import { OutageAdvisoriesCard } from './OutageAdvisoriesCard';
import { OutageUpdatesCard } from './OutageUpdatesCard';
import {
  desiredOutageSystems,
  initOutageSystemsForm,
  type OutageSystemsFormState,
} from './outageAdminModel';

export function AdminOutagesPage() {
  const params = useParams();
  const outageId = parsePositiveInt(params['outageId']);
  if (params['outageId']) return <AdminOutageDetailPage outageId={outageId} />;
  return <AdminOutageListPage />;
}

function AdminOutageDetailPage({ outageId }: { outageId: number | undefined }) {
  const { t, preferredLanguageCodes } = useI18n();
  const auth = useAuth();
  const canMutate = auth.role === 'admin';
  const { pushToast } = useToasts();
  const qc = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);
  const [updateOpen, setUpdateOpen] = useState(false);
  const [systemsOpen, setSystemsOpen] = useState(false);
  const [form, setForm] = useState(() => initOutageForm());
  const [systemsForm, setSystemsForm] = useState<OutageSystemsFormState>(() => initOutageSystemsForm([], []));
  const [formErrors, setFormErrors] = useState<OutageFormErrors>({});
  const [stateWarning, setStateWarning] = useState('');
  const [confirmState, setConfirmState] = useState<OutageAdminState | null>(null);
  const [attrsReviewOpen, setAttrsReviewOpen] = useState(false);
  const [updateReviewOpen, setUpdateReviewOpen] = useState(false);
  const [systemsReviewOpen, setSystemsReviewOpen] = useState(false);

  const enabled = Boolean(outageId);
  const outageQ = useQuery({
    queryKey: ['outages', 'show', outageId],
    queryFn: async () => (await fetchOutage(outageId!)).data,
    enabled,
  });
  const entitiesQ = useQuery({
    queryKey: ['outages', outageId, 'entities'],
    queryFn: async () => fetchAllOutageEntities(outageId!),
    enabled,
  });
  const handlersQ = useQuery({
    queryKey: ['outages', outageId, 'handlers'],
    queryFn: async () => fetchAllOutageHandlers(outageId!),
    enabled,
  });
  const updatesQ = useQuery({
    queryKey: ['outages', outageId, 'updates'],
    queryFn: async () => (await fetchOutageUpdates(outageId!)).data,
    enabled,
  });
  const usersQ = useQuery({
    queryKey: ['outages', outageId, 'affected_users'],
    queryFn: async () => (await fetchUserOutages(outageId!)).data,
    enabled,
  });
  const vpsQ = useQuery({
    queryKey: ['outages', outageId, 'affected_vps'],
    queryFn: async () => (await fetchVpsOutages(outageId!)).data,
    enabled,
  });
  const exportsQ = useQuery({
    queryKey: ['outages', outageId, 'affected_exports'],
    queryFn: async () => (await fetchExportOutages(outageId!)).data,
    enabled,
  });
  const advisoriesQ = useQuery({
    queryKey: ['outages', outageId, 'security_advisories'],
    queryFn: async () =>
      (await fetchSecurityAdvisoryOutageLinks({ outageId: outageId!, limit: 100, includes: 'security_advisory' })).data,
    enabled,
  });

  const invalidate = async () => {
    await qc.invalidateQueries({ queryKey: ['outages', outageId] });
    await qc.invalidateQueries({ queryKey: ['admin_outages'] });
  };

  const saveAttrsM = useMutation({
    mutationFn: async () => {
      if (!canMutate) throw new Error('Administrator role required');
      return updateOutage(outageId!, formPayload(form));
    },
    onSuccess: async () => {
      await invalidate();
      pushToast({ variant: 'ok', title: t('admin.outages.toast.saved') });
      setAttrsReviewOpen(false);
      setEditOpen(false);
    },
  });

  const submitAttrs = () => {
    const errors = validateOutageForm(form, t);
    setFormErrors(errors);
    if (hasErrors(errors)) return;
    saveAttrsM.reset();
    setAttrsReviewOpen(true);
  };

  const postUpdateM = useMutation({
    mutationFn: async (payload?: OutageUpdatePayload) => {
      if (!canMutate) throw new Error('Administrator role required');
      return createOutageUpdate(payload ?? updatePayload(form, outageId!, outageQ.data?.state));
    },
    onSuccess: async () => {
      await invalidate();
      await qc.invalidateQueries({ queryKey: ['outages', outageId, 'updates'] });
      pushToast({ variant: 'ok', title: t('admin.outages.toast.update_posted') });
      setUpdateReviewOpen(false);
      setUpdateOpen(false);
      setConfirmState(null);
    },
  });

  const submitUpdate = () => {
    const errors = validateOutageForm(form, t, { requireType: false });
    setFormErrors(errors);
    if (hasErrors(errors)) return;
    postUpdateM.reset();
    setUpdateReviewOpen(true);
  };

  const saveSystemsM = useMutation({
    mutationFn: async () => {
      if (!canMutate) throw new Error('Administrator role required');
      await applyOutageSystems(outageId!, desiredOutageSystems(systemsForm));
    },
    onSuccess: async () => {
      await invalidate();
      await qc.invalidateQueries({ queryKey: ['outages', outageId, 'entities'] });
      await qc.invalidateQueries({ queryKey: ['outages', outageId, 'handlers'] });
      pushToast({ variant: 'ok', title: t('admin.outages.toast.systems_saved') });
      setSystemsReviewOpen(false);
      setSystemsOpen(false);
    },
    onError: async (error) => {
      await invalidate();
      const [entitiesResult, handlersResult] = await Promise.all([entitiesQ.refetch(), handlersQ.refetch()]);
      if (entitiesResult.data && handlersResult.data) {
        setSystemsForm(initOutageSystemsForm(entitiesResult.data, handlersResult.data));
      }
    },
  });

  if (!outageId)
    return <ErrorState title={t('admin.outages.invalid.title')} message={t('admin.outages.invalid.body')} />;
  if (outageQ.isLoading) return <LoadingState />;
  if (outageQ.isError || !outageQ.data)
    return (
      <ErrorState
        title={t('admin.outages.error.detail_title')}
        message={formatErrorMessage(outageQ.error)}
        onRetry={() => outageQ.refetch()}
      />
    );

  const outage = outageQ.data;
  const badges = outageBadges(outage, t);
  const entities = entitiesQ.data ?? [];
  const handlers = handlersQ.data ?? [];
  const summary =
    pickLocalizedField(outage, 'summary', preferredLanguageCodes) ??
    t('public.outage.fallback_title', { id: outage.id });
  const description = pickLocalizedField(outage, 'description', preferredLanguageCodes);

  const openEdit = () => {
    if (!canMutate) return;
    saveAttrsM.reset();
    setForm(initOutageForm(outage));
    setFormErrors({});
    setEditOpen(true);
  };
  const openUpdate = () => {
    if (!canMutate) return;
    postUpdateM.reset();
    setForm({
      ...initOutageForm(outage),
      enSummary: '',
      enDescription: '',
      csSummary: '',
      csDescription: '',
      sendMail: true,
    });
    setFormErrors({});
    setUpdateOpen(true);
  };
  const openSystems = () => {
    if (!canMutate) return;
    saveSystemsM.reset();
    setSystemsForm(initOutageSystemsForm(entities, handlers));
    setSystemsOpen(true);
  };
  const requestStateChange = (st: OutageAdminState) => {
    if (!canMutate) return;
    postUpdateM.reset();
    setStateWarning('');
    if (st === 'announced' && (entities.length === 0 || handlers.length === 0)) {
      setStateWarning(t('admin.outages.change_state.announce_blocked'));
      return;
    }
    setConfirmState(st);
  };

  return (
    <div className="space-y-6" data-testid="admin.outages.detail.page">
      <PageHeader
        title={summary}
        description={`#${outage.id}`}
        actions={
          <>
            <LinkButton to="/admin/outages" variant="secondary">
              {t('admin.outages.back')}
            </LinkButton>
            {canMutate ? (
              <>
                <Button variant="secondary" onClick={openEdit} testId="admin.outages.detail.edit_attrs">
                  {t('admin.outages.action.edit_attrs')}
                </Button>
                <Button variant="secondary" onClick={openSystems} testId="admin.outages.detail.edit_systems">
                  {t('admin.outages.action.edit_systems')}
                </Button>
                <Button onClick={openUpdate} testId="admin.outages.detail.post_update">
                  {t('admin.outages.action.post_update')}
                </Button>
              </>
            ) : null}
          </>
        }
      />
      <div className="flex flex-wrap gap-2">
        <Badge variant={badges.lifecycle.variant}>{badges.lifecycle.label}</Badge>
        {badges.type ? <Badge variant={badges.type.variant}>{badges.type.label}</Badge> : null}
        {badges.impact ? <Badge variant={badges.impact.variant}>{badges.impact.label}</Badge> : null}
      </div>

      {description ? (
        <section className="space-y-2" aria-label={t('admin.outages.section.reason')}>
          <h2 className="text-sm font-semibold">{t('admin.outages.section.reason')}</h2>
          <p className="whitespace-pre-wrap text-sm text-fg">{description}</p>
        </section>
      ) : null}

      {canMutate && outage.state === 'staged' ? (
        <Card>
          <CardHeader title={t('admin.outages.change_state.title')} />
          <CardBody>
            <div className="flex flex-wrap gap-2">
              {(['announced', 'cancelled', 'resolved'] satisfies OutageAdminState[]).map((st) => (
                <Button
                  key={st}
                  variant={st === 'cancelled' ? 'danger' : 'secondary'}
                  onClick={() => requestStateChange(st)}
                  testId={`admin.outages.change_state.${st}`}
                >
                  {t(`admin.outages.change_state.${st}`)}
                </Button>
              ))}
            </div>
            {stateWarning ? (
              <div className="mt-3">
                <Alert variant="warn" title={t('common.validation_error')}>
                  {stateWarning}
                </Alert>
              </div>
            ) : null}
          </CardBody>
        </Card>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title={t('admin.outages.section.info')} />
          <CardBody>
            <dl className="grid gap-3 md:grid-cols-2">
              <div>
                <dt className="text-xs font-semibold text-muted">{t('admin.outages.field.begins_at')}</dt>
                <dd>{formatDateTime(outage.begins_at)}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold text-muted">{t('admin.outages.field.finished_at')}</dt>
                <dd>{outage.finished_at ? formatDateTime(outage.finished_at) : '—'}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold text-muted">{t('admin.outages.field.duration')}</dt>
                <dd>{outage.duration != null ? formatDurationMinutes(outage.duration as any) : '—'}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold text-muted">{t('admin.outages.field.auto_resolve')}</dt>
                <dd>{outage.auto_resolve ? t('common.yes') : t('common.no')}</dd>
              </div>
            </dl>
          </CardBody>
        </Card>
        <Card>
          <CardHeader title={t('admin.outages.section.affected_counts')} />
          <CardBody>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                {t('admin.outages.field.users')}: <span className="font-mono">{outage.affected_user_count ?? '—'}</span>
              </div>
              <div>
                {t('admin.outages.field.direct_vps')}:{' '}
                <span className="font-mono">{outage.affected_direct_vps_count ?? '—'}</span>
              </div>
              <div>
                {t('admin.outages.field.indirect_vps')}:{' '}
                <span className="font-mono">{outage.affected_indirect_vps_count ?? '—'}</span>
              </div>
              <div>
                {t('admin.outages.field.exports')}:{' '}
                <span className="font-mono">{outage.affected_export_count ?? '—'}</span>
              </div>
            </div>
            <div className="mt-3 text-xs text-muted">{t('admin.outages.affected_counts.help')}</div>
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader title={t('admin.outages.section.systems')} />
        <CardBody>
          <section aria-label={t('public.outage_detail.section.affected_systems')}>
            {entitiesQ.error ? (
              <div role="alert" className="mb-3 space-y-2">
                <Alert variant="danger" title={t('public.outage_detail.entities.error')}>
                  {formatErrorMessage(entitiesQ.error)}
                </Alert>
                <Button variant="secondary" onClick={() => void entitiesQ.refetch()}>
                  {t('common.retry')}
                </Button>
              </div>
            ) : entitiesQ.isPending ? (
              <Spinner label={t('common.loading')} />
            ) : null}
            {entities.length ? (
              <div className="flex flex-wrap gap-2">
                {entities.map((entity) => {
                  const label = entityLabel(entity);
                  return entity.name === 'Node' && entity.entity_id ? (
                    <Link key={entity.id} className="inline-flex" to={`/admin/nodes/${entity.entity_id}`}>
                      <Badge variant="neutral">{label}</Badge>
                    </Link>
                  ) : (
                    <Badge key={entity.id} variant="neutral">
                      {label}
                    </Badge>
                  );
                })}
              </div>
            ) : entitiesQ.isSuccess ? (
              <div className="text-sm text-muted">{t('admin.outages.empty.systems')}</div>
            ) : null}
          </section>
          <section className="mt-4 text-sm text-muted" aria-label={t('admin.outages.systems.handlers')}>
            {handlersQ.error ? (
              <div role="alert" className="mb-3 space-y-2">
                <Alert variant="danger" title={t('public.outage_detail.handlers.error')}>
                  {formatErrorMessage(handlersQ.error)}
                </Alert>
                <Button variant="secondary" onClick={() => void handlersQ.refetch()}>
                  {t('common.retry')}
                </Button>
              </div>
            ) : handlersQ.isPending ? (
              <Spinner label={t('common.loading')} />
            ) : null}
            {handlers.length
              ? handlers.map((h) => h.full_name || `#${outageHandlerUserId(h) ?? h.id}`).join(', ')
              : handlersQ.isSuccess
                ? t('admin.outages.empty.handlers')
                : null}
          </section>
        </CardBody>
      </Card>

      <OutageAdvisoriesCard
        links={advisoriesQ.data ?? []}
        loading={advisoriesQ.isPending}
        error={advisoriesQ.error}
        onRetry={() => void advisoriesQ.refetch()}
      />

      <OutageAffectedTables
        usersQ={usersQ}
        vpsQ={vpsQ}
        exportsQ={exportsQ}
        userTotal={outage.affected_user_count ?? undefined}
        vpsTotal={
          outage.affected_direct_vps_count != null || outage.affected_indirect_vps_count != null
            ? (outage.affected_direct_vps_count ?? 0) + (outage.affected_indirect_vps_count ?? 0)
            : undefined
        }
        exportTotal={outage.affected_export_count ?? undefined}
      />

      <OutageUpdatesCard
        updates={updatesQ.data}
        loading={updatesQ.isPending}
        error={updatesQ.error}
        onRetry={() => void updatesQ.refetch()}
        preferredLanguageCodes={preferredLanguageCodes}
      />

      <Modal
        open={editOpen}
        title={t('admin.outages.edit.title')}
        onClose={() => setEditOpen(false)}
        size="lg"
        testId="admin.outages.edit.modal"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setEditOpen(false)} disabled={saveAttrsM.isPending}>
              {t('common.cancel')}
            </Button>
            <Button onClick={submitAttrs} loading={saveAttrsM.isPending} testId="admin.outages.edit.save">
              {t('common.save')}
            </Button>
          </div>
        }
      >
        <Alert title={t('admin.outages.edit.notice.title')} variant="info">
          {t('admin.outages.edit.notice.body')}
        </Alert>
        {hasErrors(formErrors) ? (
          <div className="mt-4">
            <Alert variant="warn" title={t('common.validation_error')}>
              {t('admin.outages.validation.body')}
            </Alert>
          </div>
        ) : null}
        {saveAttrsM.isError ? (
          <div className="mt-4">
            <Alert variant="danger" title={t('common.error')} testId="admin.outages.edit.error">
              {formatErrorMessage(saveAttrsM.error)}
            </Alert>
          </div>
        ) : null}
        <div className="mt-4">
          <OutageForm form={form} setForm={setForm} errors={formErrors} />
        </div>
      </Modal>

      <Modal
        open={updateOpen}
        title={t('admin.outages.update.title')}
        onClose={() => setUpdateOpen(false)}
        size="lg"
        testId="admin.outages.update.modal"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setUpdateOpen(false)} disabled={postUpdateM.isPending}>
              {t('common.cancel')}
            </Button>
            <Button onClick={submitUpdate} loading={postUpdateM.isPending} testId="admin.outages.update.save">
              {t('admin.outages.action.post_update')}
            </Button>
          </div>
        }
      >
        {hasErrors(formErrors) ? (
          <Alert variant="warn" title={t('common.validation_error')}>
            {t('admin.outages.validation.body')}
          </Alert>
        ) : null}
        {postUpdateM.isError ? (
          <div className="mt-4">
            <Alert variant="danger" title={t('common.error')} testId="admin.outages.update.error">
              {formatErrorMessage(postUpdateM.error)}
            </Alert>
          </div>
        ) : null}
        <div className="mt-4">
          <OutageForm form={form} setForm={setForm} errors={formErrors} includeState updateMode />
        </div>
      </Modal>

      <Modal
        open={systemsOpen}
        title={t('admin.outages.systems.title')}
        onClose={() => setSystemsOpen(false)}
        size="lg"
        testId="admin.outages.systems.modal"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setSystemsOpen(false)} disabled={saveSystemsM.isPending}>
              {t('common.cancel')}
            </Button>
            <Button
              onClick={() => {
                saveSystemsM.reset();
                setSystemsReviewOpen(true);
              }}
              loading={saveSystemsM.isPending}
              testId="admin.outages.systems.save"
            >
              {t('admin.outages.action.review')}
            </Button>
          </div>
        }
      >
        {saveSystemsM.isError ? (
          <Alert variant="danger" title={t('common.error')} testId="admin.outages.systems.error">
            {outageScopeErrorMessage(saveSystemsM.error, t)}
          </Alert>
        ) : null}
        <OutageScopeEditor form={systemsForm} setForm={setSystemsForm} />
      </Modal>

      <ConfirmDialog
        open={attrsReviewOpen}
        testId="admin.outages.edit.confirm"
        title={t('admin.outages.edit.confirm_title')}
        description={t('admin.outages.edit.confirm_body')}
        confirmLoading={saveAttrsM.isPending}
        onCancel={() => {
          saveAttrsM.reset();
          setAttrsReviewOpen(false);
        }}
        onConfirm={() => saveAttrsM.mutate()}
      >
        <div className="space-y-3">
          <OutageReviewSummary form={form} />
          {saveAttrsM.isError ? (
            <Alert variant="danger" title={t('common.error')} testId="admin.outages.edit.confirm.error">
              {formatErrorMessage(saveAttrsM.error)}
            </Alert>
          ) : null}
        </div>
      </ConfirmDialog>

      <ConfirmDialog
        open={updateReviewOpen}
        testId="admin.outages.update.confirm"
        title={t('admin.outages.update.confirm_title')}
        description={t('admin.outages.update.confirm_body')}
        confirmLoading={postUpdateM.isPending}
        onCancel={() => {
          postUpdateM.reset();
          setUpdateReviewOpen(false);
        }}
        onConfirm={() => postUpdateM.mutate(undefined)}
      >
        <div className="space-y-3">
          <OutageReviewSummary form={form} showState />
          {postUpdateM.isError ? (
            <Alert variant="danger" title={t('common.error')} testId="admin.outages.update.confirm.error">
              {formatErrorMessage(postUpdateM.error)}
            </Alert>
          ) : null}
        </div>
      </ConfirmDialog>

      <ConfirmDialog
        open={systemsReviewOpen}
        testId="admin.outages.systems.confirm"
        title={t('admin.outages.systems.confirm_title')}
        description={t('admin.outages.systems.confirm_body')}
        confirmLoading={saveSystemsM.isPending}
        onCancel={() => {
          saveSystemsM.reset();
          setSystemsReviewOpen(false);
        }}
        onConfirm={() => saveSystemsM.mutate()}
      >
        <div className="space-y-3">
          <div className="text-sm text-muted">
            {systemsForm.scope.map((item) => item.label).join(', ') || t('admin.outages.systems.none_selected')}
          </div>
          {saveSystemsM.isError ? (
            <Alert variant="danger" title={t('common.error')} testId="admin.outages.systems.confirm.error">
              {outageScopeErrorMessage(saveSystemsM.error, t)}
            </Alert>
          ) : null}
        </div>
      </ConfirmDialog>

      <ConfirmDialog
        open={Boolean(confirmState)}
        testId="admin.outages.change_state.confirm"
        title={t('admin.outages.change_state.confirm_title')}
        description={t('admin.outages.change_state.confirm_body', {
          state: confirmState ? t(`admin.outages.state.${confirmState}`) : '',
        })}
        danger={confirmState === 'cancelled'}
        confirmLoading={postUpdateM.isPending}
        onCancel={() => {
          postUpdateM.reset();
          setConfirmState(null);
        }}
        onConfirm={() => {
          if (!confirmState) return;
          postUpdateM.mutate(outageStateTransitionPayload(outageId, confirmState));
        }}
      >
        {postUpdateM.isError ? (
          <Alert variant="danger" title={t('common.error')} testId="admin.outages.change_state.confirm.error">
            {formatErrorMessage(postUpdateM.error)}
          </Alert>
        ) : null}
      </ConfirmDialog>
    </div>
  );
}

export default AdminOutagesPage;
