import React, { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useI18n } from '../../../app/i18n';
import { useAuth } from '../../../app/auth';
import { useToasts } from '../../../app/toasts';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Alert } from '../../../components/ui/Alert';
import { Button } from '../../../components/ui/Button';
import { Card, CardBody } from '../../../components/ui/Card';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog';
import { ErrorState } from '../../../components/ui/ErrorState';
import { KeysetPagination } from '../../../components/ui/KeysetPagination';
import { LoadingState } from '../../../components/ui/LoadingState';
import { Modal } from '../../../components/ui/Modal';
import { Select } from '../../../components/ui/Select';
import { formatErrorMessage } from '../../../lib/errors';
import { useKeysetPagination } from '../../../lib/hooks/useKeysetPagination';
import { parsePositiveInt } from '../../../lib/parse';
import { outageTypeLabel } from '../../../lib/apiValues';
import {
  createOutageWithSystems,
  fetchAdminOutages,
  OutageCreateIndeterminateError,
  OutageCreateWithSystemsError,
} from '../../../lib/api/outages';
import { OutageScopeEditor } from './OutageScopeEditor';
import { OutageListSection } from './OutageListSection';
import { OutageCreateIndeterminateAlert } from './OutageCreateIndeterminateAlert';
import {
  desiredOutageSystems,
  groupOutages,
  initOutageSystemsForm,
  type OutageSystemsFormState,
} from './outageAdminModel';
import {
  FieldLabel,
  OUTAGE_TYPES,
  STATES,
  formPayload,
  hasErrors,
  initOutageForm,
  outageScopeErrorMessage,
  OutageForm,
  OutageReviewSummary,
  validateOutageForm,
  type OutageFormErrors,
} from './AdminOutageForm';

export function AdminOutageListPage() {
  const { t } = useI18n();
  const auth = useAuth();
  const canMutate = auth.role === 'admin';
  const { pushToast } = useToasts();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [state, setState] = useState(searchParams.get('state') ?? '');
  const [type, setType] = useState(searchParams.get('type') ?? '');
  const vpsFilter = useMemo(() => parsePositiveInt(searchParams.get('vps')), [searchParams]);
  const [newOpen, setNewOpen] = useState(false);
  const [form, setForm] = useState(() => initOutageForm());
  const [systemsForm, setSystemsForm] = useState<OutageSystemsFormState>(() => initOutageSystemsForm([], []));
  const [formErrors, setFormErrors] = useState<OutageFormErrors>({});
  const [createReviewOpen, setCreateReviewOpen] = useState(false);
  const [createOutcomeUnknown, setCreateOutcomeUnknown] = useState(false);
  const [verifyingCreate, setVerifyingCreate] = useState(false);

  const pagination = useKeysetPagination({
    id: 'admin.outages',
    filterKey: JSON.stringify({ state, type, vps: vpsFilter }),
    searchParams,
    setSearchParams,
    defaultLimit: 25,
  });

  const outagesQ = useQuery({
    queryKey: [
      'admin_outages',
      'index',
      { state, type, vps: vpsFilter, limit: pagination.limit, fromId: pagination.fromId },
    ],
    queryFn: async () =>
      (
        await fetchAdminOutages({
          state: state || undefined,
          type: type || undefined,
          vps: vpsFilter,
          limit: pagination.limit,
          fromId: pagination.fromId,
        })
      ).data,
  });

  const createM = useMutation({
    mutationFn: async () => {
      if (!canMutate) throw new Error('Administrator role required');
      return createOutageWithSystems(formPayload(form), desiredOutageSystems(systemsForm));
    },
    onSuccess: async (res) => {
      await qc.invalidateQueries({ queryKey: ['admin_outages'] });
      pushToast({ variant: 'ok', title: t('admin.outages.toast.created') });
      setCreateReviewOpen(false);
      setNewOpen(false);
      navigate(`/admin/outages/${res.data.id}`);
    },
    onError: async (error) => {
      if (error instanceof OutageCreateIndeterminateError) {
        setCreateReviewOpen(false);
        setNewOpen(false);
        setCreateOutcomeUnknown(true);
        pushToast({
          variant: 'danger',
          title: t('admin.outages.create.indeterminate_title'),
          body: t('admin.outages.create.indeterminate_body'),
        });
        return;
      }
      if (error instanceof OutageCreateWithSystemsError) {
        await qc.invalidateQueries({ queryKey: ['admin_outages'] });
        pushToast({
          variant: 'danger',
          title: t('common.error'),
          body: outageScopeErrorMessage(error, t),
        });
        setCreateReviewOpen(false);
        setNewOpen(false);
        navigate(`/admin/outages/${error.outageId}`);
        return;
      }
      pushToast({
        variant: 'danger',
        title: t('common.error'),
        body: formatErrorMessage(error),
      });
    },
  });

  const submitCreate = () => {
    if (!canMutate || createOutcomeUnknown) return;
    const errors = validateOutageForm(form, t);
    setFormErrors(errors);
    if (hasErrors(errors)) return;
    setCreateReviewOpen(true);
  };

  const rows = outagesQ.data ?? [];
  const groupedRows = groupOutages(rows);

  const verifyIndeterminateCreate = async () => {
    setVerifyingCreate(true);
    const result = await outagesQ.refetch();
    setVerifyingCreate(false);
    if (!result.isError) setCreateOutcomeUnknown(false);
  };

  return (
    <div className="space-y-6" data-testid="admin.outages.page">
      <PageHeader
        title={t('admin.outages.title')}
        actions={
          canMutate ? (
            <Button
              disabled={createOutcomeUnknown}
              onClick={() => {
                setForm(initOutageForm());
                setSystemsForm(initOutageSystemsForm([], []));
                setFormErrors({});
                setNewOpen(true);
              }}
              testId="admin.outages.new"
            >
              {t('admin.outages.action.new')}
            </Button>
          ) : null
        }
      />
      {createOutcomeUnknown ? (
        <OutageCreateIndeterminateAlert loading={verifyingCreate} onVerify={verifyIndeterminateCreate} />
      ) : null}
      <Card>
        <CardBody>
          {vpsFilter ? <Alert title={t('admin.outages.filter.vps', { id: vpsFilter })} variant="info" /> : null}
          <div className="grid gap-3 md:grid-cols-3">
            <FieldLabel label={t('admin.outages.field.state')}>
              <Select
                value={state}
                onChange={(e) => setState(e.target.value)}
                options={[
                  { value: '', label: t('common.all') },
                  ...STATES.map((v) => ({ value: v, label: t(`admin.outages.state.${v}`) })),
                ]}
              />
            </FieldLabel>
            <FieldLabel label={t('admin.outages.field.type')}>
              <Select
                value={type}
                onChange={(e) => setType(e.target.value)}
                options={[
                  { value: '', label: t('common.all') },
                  ...OUTAGE_TYPES.map((v) => ({ value: v, label: outageTypeLabel(t, v) })),
                ]}
              />
            </FieldLabel>
            <div className="flex items-end">
              <Button variant="secondary" onClick={() => outagesQ.refetch()}>
                {t('common.refresh')}
              </Button>
            </div>
          </div>
        </CardBody>
      </Card>
      {outagesQ.isLoading ? (
        <LoadingState />
      ) : outagesQ.isError ? (
        <ErrorState
          title={t('admin.outages.error.title')}
          message={formatErrorMessage(outagesQ.error)}
          onRetry={() => outagesQ.refetch()}
        />
      ) : (
        <div className="space-y-5">
          <OutageListSection group="active" rows={groupedRows.active} />
          <OutageListSection group="planned" rows={groupedRows.planned} />
          <OutageListSection group="finished" rows={groupedRows.finished} />
        </div>
      )}
      <KeysetPagination
        testId="admin.outages.pagination"
        page={pagination.page}
        pageCount={pagination.pageCount}
        canPrev={pagination.canPrev}
        canNext={pagination.hasForward || rows.length >= pagination.limit}
        onPrev={pagination.goPrev}
        onNext={() => pagination.goNext(rows[rows.length - 1]?.id)}
        onGoToPage={pagination.goToPage}
        limit={pagination.limit}
        allowedLimits={pagination.allowedLimits}
        onLimitChange={pagination.setLimit}
      />

      <Modal
        open={newOpen}
        title={t('admin.outages.create.title')}
        onClose={() => setNewOpen(false)}
        size="lg"
        testId="admin.outages.create.modal"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setNewOpen(false)} disabled={createM.isPending}>
              {t('common.cancel')}
            </Button>
            <Button onClick={submitCreate} loading={createM.isPending} testId="admin.outages.create.save">
              {t('admin.outages.action.review')}
            </Button>
          </div>
        }
      >
        {hasErrors(formErrors) ? (
          <Alert variant="warn" title={t('common.validation_error')} testId="admin.outages.create.validation">
            {t('admin.outages.validation.body')}
          </Alert>
        ) : null}
        <div className="mt-4 space-y-6">
          <OutageForm form={form} setForm={setForm} errors={formErrors} />
          <div>
            <div className="mb-3 text-sm font-semibold text-fg">{t('admin.outages.section.systems')}</div>
            <OutageScopeEditor form={systemsForm} setForm={setSystemsForm} />
          </div>
        </div>
      </Modal>
      <ConfirmDialog
        open={createReviewOpen}
        testId="admin.outages.create.confirm"
        title={t('admin.outages.create.confirm_title')}
        description={t('admin.outages.create.confirm_body')}
        confirmLabel={t('common.create')}
        confirmLoading={createM.isPending}
        onCancel={() => setCreateReviewOpen(false)}
        onConfirm={() => createM.mutate()}
      >
        <OutageReviewSummary form={form} systems={systemsForm} />
      </ConfirmDialog>
    </div>
  );
}
