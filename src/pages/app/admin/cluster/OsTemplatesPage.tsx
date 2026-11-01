import type { OsTemplate__CreateInput } from 'vpsadmin-typescript-client';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CircleHelp, SlidersHorizontal } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useI18n } from '../../../../app/i18n';
import { useToasts } from '../../../../app/toasts';
import { formatErrorMessage } from '../../../../lib/errors';
import {
  createOsTemplate,
  deleteOsTemplate,
  fetchOsFamilies,
  fetchOsTemplates,
  updateOsTemplate,
  type OsFamily,
  type OsTemplate,
} from '../../../../lib/api/osTemplates';
import { parseBoolParam, parsePositiveInt } from '../../../../lib/parse';
import { parseNumericToken, splitKeyValueToken, unquoteSmartValue } from '../../../../lib/smartFilter';
import { FilterBar } from '../../../../components/layout/FilterBar';
import { Alert } from '../../../../components/ui/Alert';
import { Button } from '../../../../components/ui/Button';
import { CopyButton } from '../../../../components/ui/CopyButton';
import { Card, CardBody } from '../../../../components/ui/Card';
import { ConfirmDialog } from '../../../../components/ui/ConfirmDialog';
import { Modal } from '../../../../components/ui/Modal';
import { EmptyState } from '../../../../components/ui/EmptyState';
import { ErrorState } from '../../../../components/ui/ErrorState';
import { FilterChip } from '../../../../components/ui/FilterChip';
import { Input } from '../../../../components/ui/Input';
import { LoadingState } from '../../../../components/ui/LoadingState';
import { Select, type SelectOption } from '../../../../components/ui/Select';
import { SmartFilterInput, type SmartFilterSuggestion } from '../../../../components/ui/SmartFilterInput';
import { SmartInputHelp } from '../../../../components/ui/SmartInputHelp';
import { SwitchRow } from '../../../../components/ui/SwitchRow';
import { Textarea } from '../../../../components/ui/Textarea';
import { OsTemplatesList } from './OsTemplatesList';
function osFamilyLabel(f: OsFamily): string {
  const label = f.label?.trim() ?? '';
  return label || `#${f.id}`;
}
type EditorState =
  | null
  | {
      mode: 'create' | 'edit';
      tpl?: OsTemplate;
    };

type FormState = {
  osFamilyId: string;

  label: string;
  info: string;
  enabled: boolean;
  supported: boolean;
  order: string;

  hypervisorType: string;
  cgroupVersion: string;

  manageHostname: boolean;
  manageDnsResolver: boolean;
  enableScript: boolean;
  enableCloudInit: boolean;

  vendor: string;
  variant: string;
  arch: string;
  distribution: string;
  version: string;

  config: string;
};

function initForm(tpl?: OsTemplate): FormState {
  const f: Partial<OsTemplate> = tpl ?? {};

  const osFamilyId =
    typeof f.os_family?.id === 'number'
        ? String(f.os_family.id)
        : '';

  return {
    osFamilyId,

    label: typeof f.label === 'string' ? f.label : '',
    info: typeof f.info === 'string' ? f.info : '',
    enabled: typeof f.enabled === 'boolean' ? f.enabled : true,
    supported: typeof f.supported === 'boolean' ? f.supported : true,
    order: typeof f.order === 'number' ? String(f.order) : '1',

    hypervisorType: typeof f.hypervisor_type === 'string' ? f.hypervisor_type : 'vpsadminos',
    cgroupVersion: typeof f.cgroup_version === 'string' ? f.cgroup_version : 'cgroup_any',

    manageHostname: typeof f.manage_hostname === 'boolean' ? f.manage_hostname : true,
    manageDnsResolver: typeof f.manage_dns_resolver === 'boolean' ? f.manage_dns_resolver : true,
    enableScript: typeof f.enable_script === 'boolean' ? f.enable_script : true,
    enableCloudInit: typeof f.enable_cloud_init === 'boolean' ? f.enable_cloud_init : true,

    vendor: typeof f.vendor === 'string' ? f.vendor : '',
    variant: typeof f.variant === 'string' ? f.variant : '',
    arch: typeof f.arch === 'string' ? f.arch : '',
    distribution: typeof f.distribution === 'string' ? f.distribution : '',
    version: typeof f.version === 'string' ? f.version : '',

    config: typeof f.config === 'string' ? f.config : '',
  };
}

function buildPayload(form: FormState): OsTemplate__CreateInput {
  const osFamilyId = parsePositiveInt(form.osFamilyId.trim());
  const order = parsePositiveInt(form.order.trim());
  if (!osFamilyId) throw new Error('Invalid OS family');

  const payload: OsTemplate__CreateInput = {
    os_family: osFamilyId,
    label: form.label.trim(),
    info: form.info.trim() || undefined,
    enabled: form.enabled,
    supported: form.supported,
    order: order ?? 1,

    hypervisor_type: form.hypervisorType,
    cgroup_version: form.cgroupVersion,

    manage_hostname: form.manageHostname,
    manage_dns_resolver: form.manageDnsResolver,
    enable_script: form.enableScript,
    enable_cloud_init: form.enableCloudInit,

    vendor: form.vendor.trim(),
    variant: form.variant.trim(),
    arch: form.arch.trim(),
    distribution: form.distribution.trim(),
    version: form.version.trim(),

    config: form.config,
  };

  return payload;
}

export function OsTemplatesPage() {
  const { t } = useI18n();
  const { pushToast } = useToasts();
  const qc = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [osFamily, setOsFamily] = useState(() => searchParams.get('os_family') ?? '');
  const [hypervisorType, setHypervisorType] = useState(() => searchParams.get('hypervisor_type') ?? '');
  const [cgroupVersion, setCgroupVersion] = useState(() => searchParams.get('cgroup_version') ?? '');
  const [enableScript, setEnableScript] = useState(() => searchParams.get('enable_script') ?? '');
  const [enableCloudInit, setEnableCloudInit] = useState(() => searchParams.get('enable_cloud_init') ?? '');
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [removedFilters, setRemovedFilters] = useState(false);
  const osFamilyId = parsePositiveInt(osFamily.trim());
  const hvTrim = hypervisorType.trim();
  const cgTrim = cgroupVersion.trim();
  const enableScriptBool = parseBoolParam(enableScript);
  const enableCloudInitBool = parseBoolParam(enableCloudInit);

  useEffect(() => {
    const next = new URLSearchParams(searchParams);
    const unsupported = ['q', 'enabled', 'supported'].some(key => next.has(key));
    for (const key of ['q', 'enabled', 'supported']) next.delete(key);
    if (unsupported) setRemovedFilters(true);
    for (const [key, value] of [
      ['os_family', osFamily], ['hypervisor_type', hypervisorType], ['cgroup_version', cgroupVersion],
      ['enable_script', enableScript], ['enable_cloud_init', enableCloudInit],
    ]) {
      if (value?.trim()) next.set(key!, value.trim());
      else next.delete(key!);
    }
    if (next.toString() !== searchParams.toString()) setSearchParams(next, { replace: true });
  }, [osFamily, hypervisorType, cgroupVersion, enableScript, enableCloudInit, searchParams, setSearchParams]);

  const familiesQ = useQuery({
    queryKey: ['os_families', 'index'],
    queryFn: async () => (await fetchOsFamilies({ limit: 500 })).data,
    staleTime: 60_000,
  });

  const familyOptions = useMemo<SelectOption[]>(() => [{ value: '', label: t('common.all') }, ...(familiesQ.data ?? []).map(family => ({ value: String(family.id), label: osFamilyLabel(family) }))], [familiesQ.data, t]);

  const listQ = useQuery({
    queryKey: [
      'os_templates',
      'index',
      {
        osFamilyId,
        hv: hvTrim,
        cg: cgTrim,
        enableScript: enableScriptBool,
        enableCloudInit: enableCloudInitBool,
      },
    ],
    queryFn: async () =>
      (
        await fetchOsTemplates({
          limit: 500,
          osFamily: osFamilyId,
          hypervisorType: hvTrim || undefined,
          cgroupVersion: cgTrim || undefined,
          enableScript: enableScriptBool,
          enableCloudInit: enableCloudInitBool,
        })
      ).data,
    staleTime: 15_000,
  });

  const rows: OsTemplate[] = listQ.data ?? [];
  const shareUrl = typeof window !== 'undefined' ? window.location.href : '';

  function clearAllFilters() {
    setOsFamily(''); setHypervisorType(''); setCgroupVersion(''); setEnableScript(''); setEnableCloudInit('');
  }

  const triBoolOptions: SelectOption[] = useMemo(
    () => [
      { value: '', label: t('common.all') },
      { value: 'true', label: t('common.yes') },
      { value: 'false', label: t('common.no') },
    ],
    [t]
  );

  const hypervisorOptions: SelectOption[] = useMemo(
    () => [
      { value: '', label: t('common.all') },
      { value: 'vpsadminos', label: 'vpsadminos' },
      { value: 'openvz', label: 'openvz' },
    ],
    [t]
  );

  const cgroupOptions: SelectOption[] = useMemo(
    () => [
      { value: '', label: t('common.all') },
      { value: 'cgroup_any', label: 'cgroup_any' },
      { value: 'cgroup_v1', label: 'cgroup_v1' },
      { value: 'cgroup_v2', label: 'cgroup_v2' },
    ],
    [t]
  );

  const [editor, setEditor] = useState<EditorState>(null);
  const [form, setForm] = useState<FormState>(() => initForm(undefined));
  const [actionError, setActionError] = useState<string | null>(null);

  const openCreate = () => {
    setActionError(null);
    setForm(initForm(undefined));
    setEditor({ mode: 'create' });
  };

  const openEdit = (tpl: OsTemplate) => {
    setActionError(null);
    setForm(initForm(tpl));
    setEditor({ mode: 'edit', tpl });
  };

  const closeEditor = () => {
    setEditor(null);
    setActionError(null);
  };

  const saveM = useMutation({
    mutationFn: async () => {
      if (!editor) return;

      const payload = buildPayload(form);

      if (editor.mode === 'create') {
        return createOsTemplate(payload);
      }

      if (!editor.tpl || typeof editor.tpl.id !== 'number') {
        throw new Error('missing template id');
      }

      return updateOsTemplate(editor.tpl.id, payload);
    },
    onSuccess: () => {
      setActionError(null);
      closeEditor();
      void qc.invalidateQueries({ queryKey: ['os_templates', 'index'] });
    },
    onError: (err) => {
      setActionError(formatErrorMessage(err));
    },
  });

  const [confirmDelete, setConfirmDelete] = useState<null | { tpl: OsTemplate }>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const deleteM = useMutation({
    mutationFn: async () => {
      if (!confirmDelete) return;
      await deleteOsTemplate(confirmDelete.tpl.id);
    },
    onSuccess: () => {
      setDeleteError(null);
      setConfirmDelete(null);
      void qc.invalidateQueries({ queryKey: ['os_templates', 'index'] });
    },
    onError: (err) => {
      setDeleteError(formatErrorMessage(err));
    },
  });

  const modalTitle = editor?.mode === 'create' ? t('admin.cluster.os_templates.create.title') : t('admin.cluster.os_templates.edit.title');

  const requiresFamily = editor?.mode === 'create';
  const osFamilyOk = !requiresFamily || Boolean(parsePositiveInt(form.osFamilyId.trim()));

  const requiredLabelOk = Boolean(form.label.trim());

  const requiredCreateOk =
    editor?.mode !== 'create'
      ? true
      : Boolean(form.vendor.trim()) && Boolean(form.variant.trim()) && Boolean(form.arch.trim()) && Boolean(form.distribution.trim()) && Boolean(form.version.trim());

  const canSave = osFamilyOk && requiredLabelOk && requiredCreateOk && !saveM.isPending;

  const rowsEmpty = rows.length === 0 && !listQ.isLoading && !listQ.isError;

  return (
    <div className="mt-4 space-y-4" data-testid="admin.cluster.os_templates.page">
      {actionError ? (
        <Alert title={t('common.error')} variant="danger">
          {actionError}
        </Alert>
      ) : null}

      {removedFilters ? <Alert variant="neutral">{t('admin.cluster.os_templates.unsupported_filters_removed')}</Alert> : null}
      <FilterBar testId="admin.cluster.os_templates.filters">
        <Button variant="secondary" onClick={() => setAdvancedOpen(true)} testId="admin.cluster.os_templates.advanced">{t('filters.advanced.label')}</Button>
        <CopyButton text={shareUrl} label={t('common.copy_link')} testId="admin.cluster.os_templates.copy_link" />
        {(osFamily || hypervisorType || cgroupVersion || enableScript || enableCloudInit) ? <Button variant="secondary" onClick={clearAllFilters} testId="admin.cluster.os_templates.filter.clear">{t('common.clear_filters')}</Button> : null}
        <Button testId="admin.cluster.os_templates.create" variant="primary" onClick={openCreate}>{t('admin.cluster.os_templates.create.button')}</Button>
      </FilterBar>

      <Modal showCloseButton closeTestId="drawer.close"
        open={advancedOpen}
        onClose={() => setAdvancedOpen(false)}
        size="lg"
        title={t('filters.advanced.title')}
        testId="admin.cluster.os_templates.advanced.drawer"
        footer={
          <div className="flex items-center justify-between gap-2">
            <Button variant="secondary" onClick={clearAllFilters}>{t('common.clear_filters')}</Button>
            <Button variant="primary" onClick={() => setAdvancedOpen(false)}>{t('common.done')}</Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div>
            <div className="mb-1 text-sm font-medium text-fg">{t('admin.cluster.os_templates.form.os_family')}</div>
            <Select testId="admin.cluster.os_templates.filter.os_family" value={osFamily} onChange={(e) => setOsFamily(e.target.value)} options={familyOptions} />
          </div>
          <div>
            <div className="mb-1 text-sm font-medium text-fg">{t('admin.cluster.os_templates.form.hypervisor_type')}</div>
            <Select testId="admin.cluster.os_templates.filter.hypervisor" value={hypervisorType} onChange={(e) => setHypervisorType(e.target.value)} options={hypervisorOptions} />
          </div>
          <div>
            <div className="mb-1 text-sm font-medium text-fg">{t('admin.cluster.os_templates.form.cgroup_version')}</div>
            <Select testId="admin.cluster.os_templates.filter.cgroup" value={cgroupVersion} onChange={(e) => setCgroupVersion(e.target.value)} options={cgroupOptions} />
          </div>
          <div>
            <div className="mb-1 text-sm font-medium text-fg">{t('admin.cluster.os_templates.form.enable_script')}</div>
            <Select testId="admin.cluster.os_templates.filter.enable_script" value={enableScript} onChange={(e) => setEnableScript(e.target.value)} options={triBoolOptions} />
          </div>
          <div>
            <div className="mb-1 text-sm font-medium text-fg">{t('admin.cluster.os_templates.form.enable_cloud_init')}</div>
            <Select testId="admin.cluster.os_templates.filter.enable_cloud_init" value={enableCloudInit} onChange={(e) => setEnableCloudInit(e.target.value)} options={triBoolOptions} />
          </div>
        </div>
      </Modal>

      {listQ.isLoading ? <LoadingState testId="admin.cluster.os_templates.loading" /> : null}

      {listQ.isError ? (
        <ErrorState
          testId="admin.cluster.os_templates.error"
          title={t('admin.cluster.os_templates.error.title')}
          message={t('admin.cluster.os_templates.error.body')}
          onRetry={() => listQ.refetch()}
        />
      ) : null}

      {rowsEmpty ? <EmptyState title={t('admin.cluster.os_templates.empty.title')} message={t('admin.cluster.os_templates.empty.body')} /> : null}

      {!listQ.isLoading && !listQ.isError && rows.length > 0 ? (
        <OsTemplatesList
          templates={rows}
          onEdit={openEdit}
          onDelete={(template) => {
            setDeleteError(null);
            setConfirmDelete({ tpl: template });
          }}
        />
      ) : null}

      <Modal
        open={Boolean(editor)}
        title={modalTitle}
        onClose={closeEditor}
        size="lg"
        testId="admin.cluster.os_templates.editor"
        footer={
          <div className="flex items-center justify-end gap-2">
            <Button variant="secondary" onClick={closeEditor} disabled={saveM.isPending}>
              {t('common.cancel')}
            </Button>
            <Button
              variant="primary"
              onClick={() => saveM.mutate()}
              loading={saveM.isPending}
              disabled={!canSave}
              testId="admin.cluster.os_templates.editor.save"
            >
              {t('common.save')}
            </Button>
          </div>
        }
      >
        {actionError ? (
          <Alert title={t('common.error')} variant="danger">
            {actionError}
          </Alert>
        ) : null}

        <div className={actionError ? 'mt-4 space-y-4' : 'space-y-4'}>
          <Card>
            <CardBody>
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <label className="text-sm font-medium">{t('admin.cluster.os_templates.form.label')}</label>
                  <div className="mt-1">
                    <Input
                      testId="admin.cluster.os_templates.editor.label"
                      value={form.label}
                      onChange={(e) => setForm((p) => ({ ...p, label: e.target.value }))}
                      placeholder={t('admin.cluster.os_templates.form.label_placeholder')}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium">{t('admin.cluster.os_templates.form.os_family')}</label>
                  <div className="mt-1">
                    <Select
                      value={form.osFamilyId}
                      onChange={(e) => setForm((p) => ({ ...p, osFamilyId: e.target.value }))}
                      options={[{ value: '', label: t('common.select') }, ...familyOptions.filter((o) => o.value !== '')]}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium">{t('admin.cluster.os_templates.form.order')}</label>
                  <div className="mt-1">
                    <Input
                      type="number"
                      value={form.order}
                      onChange={(e) => setForm((p) => ({ ...p, order: e.target.value }))}
                      placeholder="1"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium">{t('admin.cluster.os_templates.form.hypervisor_type')}</label>
                  <div className="mt-1">
                    <Select
                      value={form.hypervisorType}
                      onChange={(e) => setForm((p) => ({ ...p, hypervisorType: e.target.value }))}
                      options={hypervisorOptions.filter((o) => o.value !== '')}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium">{t('admin.cluster.os_templates.form.cgroup_version')}</label>
                  <div className="mt-1">
                    <Select
                      value={form.cgroupVersion}
                      onChange={(e) => setForm((p) => ({ ...p, cgroupVersion: e.target.value }))}
                      options={cgroupOptions.filter((o) => o.value !== '')}
                    />
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="text-sm font-medium">{t('admin.cluster.os_templates.form.info')}</label>
                  <div className="mt-1">
                    <Textarea
                      value={form.info}
                      rows={3}
                      onChange={(e) => setForm((p) => ({ ...p, info: e.target.value }))}
                      placeholder={t('admin.cluster.os_templates.form.info_placeholder')}
                    />
                  </div>
                </div>
              </div>

              <div className="mt-4 grid gap-2 md:grid-cols-2">
                <SwitchRow
                  label={t('admin.cluster.os_templates.form.enabled')}
                  description={t('admin.cluster.os_templates.form.enabled_desc')}
                  checked={form.enabled}
                  onChange={(checked) => setForm((p) => ({ ...p, enabled: checked }))}
                />
                <SwitchRow
                  label={t('admin.cluster.os_templates.form.supported')}
                  description={t('admin.cluster.os_templates.form.supported_desc')}
                  checked={form.supported}
                  onChange={(checked) => setForm((p) => ({ ...p, supported: checked }))}
                />
                <SwitchRow
                  label={t('admin.cluster.os_templates.form.manage_hostname')}
                  description={t('admin.cluster.os_templates.form.manage_hostname_desc')}
                  checked={form.manageHostname}
                  onChange={(checked) => setForm((p) => ({ ...p, manageHostname: checked }))}
                />
                <SwitchRow
                  label={t('admin.cluster.os_templates.form.manage_dns_resolver')}
                  description={t('admin.cluster.os_templates.form.manage_dns_resolver_desc')}
                  checked={form.manageDnsResolver}
                  onChange={(checked) => setForm((p) => ({ ...p, manageDnsResolver: checked }))}
                />
                <SwitchRow
                  label={t('admin.cluster.os_templates.form.enable_script')}
                  description={t('admin.cluster.os_templates.form.enable_script_desc')}
                  checked={form.enableScript}
                  onChange={(checked) => setForm((p) => ({ ...p, enableScript: checked }))}
                />
                <SwitchRow
                  label={t('admin.cluster.os_templates.form.enable_cloud_init')}
                  description={t('admin.cluster.os_templates.form.enable_cloud_init_desc')}
                  checked={form.enableCloudInit}
                  onChange={(checked) => setForm((p) => ({ ...p, enableCloudInit: checked }))}
                />
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardBody>
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <label className="text-sm font-medium">{t('admin.cluster.os_templates.form.vendor')}</label>
                  <div className="mt-1">
                    <Input value={form.vendor} onChange={(e) => setForm((p) => ({ ...p, vendor: e.target.value }))} />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium">{t('admin.cluster.os_templates.form.variant')}</label>
                  <div className="mt-1">
                    <Input value={form.variant} onChange={(e) => setForm((p) => ({ ...p, variant: e.target.value }))} />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium">{t('admin.cluster.os_templates.form.arch')}</label>
                  <div className="mt-1">
                    <Input value={form.arch} onChange={(e) => setForm((p) => ({ ...p, arch: e.target.value }))} />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium">{t('admin.cluster.os_templates.form.distribution')}</label>
                  <div className="mt-1">
                    <Input
                      value={form.distribution}
                      onChange={(e) => setForm((p) => ({ ...p, distribution: e.target.value }))}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium">{t('admin.cluster.os_templates.form.version')}</label>
                  <div className="mt-1">
                    <Input value={form.version} onChange={(e) => setForm((p) => ({ ...p, version: e.target.value }))} />
                  </div>
                </div>
              </div>

              {editor?.mode === 'create' ? (
                <div className="mt-3 text-xs text-muted">
                  {t('admin.cluster.os_templates.form.create_required_hint')}
                </div>
              ) : null}
            </CardBody>
          </Card>

          <Card>
            <CardBody>
              <label className="text-sm font-medium">{t('admin.cluster.os_templates.form.config')}</label>
              <div className="mt-1">
                <Textarea
                  value={form.config}
                  rows={10}
                  onChange={(e) => setForm((p) => ({ ...p, config: e.target.value }))}
                  placeholder={t('admin.cluster.os_templates.form.config_placeholder')}
                  className="font-mono text-xs"
                />
              </div>
              <div className="mt-2 text-xs text-muted">{t('admin.cluster.os_templates.form.config_hint')}</div>
            </CardBody>
          </Card>
        </div>
      </Modal>

      <ConfirmDialog
        open={Boolean(confirmDelete)}
        onCancel={() => {
          setDeleteError(null);
          setConfirmDelete(null);
        }}
        onConfirm={() => deleteM.mutate()}
        confirmLoading={deleteM.isPending}
        danger
        title={t('admin.cluster.os_templates.delete.title')}
        description={
          confirmDelete
            ? t('admin.cluster.os_templates.delete.desc', {
                label: typeof confirmDelete.tpl.label === 'string' ? confirmDelete.tpl.label : `#${confirmDelete.tpl.id}`,
              })
            : undefined
        }
        testId="admin.cluster.os_templates.delete"
      >
        {deleteError ? (
          <Alert title={t('common.error')} variant="danger" testId="admin.cluster.os_templates.delete.error">
            {deleteError}
          </Alert>
        ) : null}
      </ConfirmDialog>
    </div>
  );
}
