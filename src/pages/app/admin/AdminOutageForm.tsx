import React from 'react';
import { useI18n } from '../../../app/i18n';
import { Input } from '../../../components/ui/Input';
import { Select } from '../../../components/ui/Select';
import { Textarea } from '../../../components/ui/Textarea';
import { formatErrorMessage } from '../../../lib/errors';
import { formatDateTime } from '../../../lib/format';
import { outageImpactLabel, outageTypeLabel } from '../../../lib/apiValues';
import type { Outage, OutageEntity } from '../../../lib/api/public';
import {
  OutageCreateWithSystemsError,
  OutageSystemsApplyError,
  type OutageAdminState,
  type OutageAdminType,
  type OutagePayload,
  type OutageUpdatePayload,
} from '../../../lib/api/outages';
import { fromOutageDateTimeInput, toOutageDateTimeInput, type OutageSystemsFormState } from './outageAdminModel';

export type OutageFormState = {
  beginsAt: string;
  finishedAt: string;
  duration: string;
  type: OutageAdminType;
  impact: string;
  state: string;
  autoResolve: boolean;
  enSummary: string;
  enDescription: string;
  csSummary: string;
  csDescription: string;
  sendMail: boolean;
};

export type OutageFormErrors = Partial<
  Record<'beginsAt' | 'duration' | 'type' | 'impact' | 'enSummary' | 'csSummary', string>
>;

export const OUTAGE_TYPES: OutageAdminType[] = ['planned_outage', 'unplanned_outage'];
const IMPACTS = ['tbd', 'performance', 'network', 'system_restart', 'system_reset', 'unavailability', 'export'];
export const STATES: OutageAdminState[] = ['staged', 'announced', 'cancelled', 'resolved'];

export function entityLabel(ent: OutageEntity): string {
  return ent.label || `${ent.name}${ent.entity_id ? ` #${ent.entity_id}` : ''}`;
}

export function initOutageForm(outage?: Outage): OutageFormState {
  const x: any = outage ?? {};
  return {
    beginsAt: toOutageDateTimeInput(x.begins_at) || toOutageDateTimeInput(new Date().toISOString()),
    finishedAt: toOutageDateTimeInput(x.finished_at),
    duration: x.duration != null ? String(x.duration) : '',
    type:
      typeof x.type === 'string' && OUTAGE_TYPES.includes(x.type as OutageAdminType)
        ? (x.type as OutageAdminType)
        : 'planned_outage',
    impact: typeof x.impact === 'string' ? x.impact : 'tbd',
    state: typeof x.state === 'string' ? x.state : 'staged',
    autoResolve: outage ? Boolean(x.auto_resolve) : true,
    enSummary: typeof x.en_summary === 'string' ? x.en_summary : '',
    enDescription: typeof x.en_description === 'string' ? x.en_description : '',
    csSummary: typeof x.cs_summary === 'string' ? x.cs_summary : '',
    csDescription: typeof x.cs_description === 'string' ? x.cs_description : '',
    sendMail: true,
  };
}

export function formPayload(form: OutageFormState): OutagePayload {
  const duration = form.duration.trim() ? Number(form.duration) : null;
  const beginsAt = fromOutageDateTimeInput(form.beginsAt);
  if (beginsAt === null || duration === null || !Number.isFinite(duration)) throw new Error('Invalid outage form');
  const payload: OutagePayload = {
    begins_at: beginsAt,
    finished_at: fromOutageDateTimeInput(form.finishedAt),
    duration,
    type: form.type,
    impact: form.impact,
    auto_resolve: form.autoResolve,
    en_summary: form.enSummary,
    en_description: form.enDescription,
    cs_summary: form.csSummary,
    cs_description: form.csDescription,
  };
  return payload;
}
export function updatePayload(
  form: OutageFormState,
  outageId: number,
  currentState?: string | null
): OutageUpdatePayload {
  const duration = form.duration.trim() ? Number(form.duration) : null;
  return {
    outage: outageId,
    send_mail: form.sendMail,
    begins_at: fromOutageDateTimeInput(form.beginsAt),
    finished_at: fromOutageDateTimeInput(form.finishedAt),
    duration: duration !== null && Number.isFinite(duration) ? duration : undefined,
    impact: form.impact,
    state: form.state !== currentState ? form.state : undefined,
    en_summary: form.enSummary || undefined,
    en_description: form.enDescription || undefined,
    cs_summary: form.csSummary || undefined,
    cs_description: form.csDescription || undefined,
  };
}

export function outageScopeErrorMessage(error: unknown, t: (key: any, vars?: any) => string): string {
  if (error instanceof OutageCreateWithSystemsError) {
    return t(
      error.rollbackSucceeded
        ? 'admin.outages.create.scope_failed_restored'
        : 'admin.outages.create.scope_failed_partial',
      { id: error.outageId }
    );
  }
  if (error instanceof OutageSystemsApplyError) {
    return t(error.rollbackSucceeded ? 'admin.outages.systems.error_restored' : 'admin.outages.systems.error_partial');
  }
  return formatErrorMessage(error);
}

export function validateOutageForm(
  form: OutageFormState,
  t: (key: any, vars?: any) => string,
  opts?: { requireType?: boolean }
) {
  const errors: OutageFormErrors = {};
  if (!form.beginsAt.trim() || !Number.isFinite(new Date(form.beginsAt).getTime()))
    errors.beginsAt = t('admin.outages.validation.begins_at');
  const duration = Number(form.duration);
  if (!form.duration.trim() || !Number.isFinite(duration) || duration <= 0)
    errors.duration = t('admin.outages.validation.duration');
  if (opts?.requireType !== false && !OUTAGE_TYPES.includes(form.type))
    errors.type = t('admin.outages.validation.type');
  if (!IMPACTS.includes(form.impact)) errors.impact = t('admin.outages.validation.impact');
  if (!form.enSummary.trim()) errors.enSummary = t('admin.outages.validation.en_summary');
  if (!form.csSummary.trim()) errors.csSummary = t('admin.outages.validation.cs_summary');
  return errors;
}

export function hasErrors(errors: OutageFormErrors) {
  return Object.keys(errors).length > 0;
}

function ErrorText({ message }: { message?: string }) {
  if (!message) return null;
  return <div className="mt-1 text-xs text-danger">{message}</div>;
}

export function FieldLabel(props: { label: React.ReactNode; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold text-muted">{props.label}</span>
      {props.children}
    </label>
  );
}

export function OutageForm(props: {
  form: OutageFormState;
  setForm: React.Dispatch<React.SetStateAction<OutageFormState>>;
  errors?: OutageFormErrors;
  includeState?: boolean;
  updateMode?: boolean;
}) {
  const { t } = useI18n();
  const { form, setForm, errors = {} } = props;
  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <FieldLabel label={t('admin.outages.field.begins_at')}>
            <Input
              testId="admin.outages.form.begins_at"
              type="datetime-local"
              value={form.beginsAt}
              onChange={(e) => setForm((p) => ({ ...p, beginsAt: e.target.value }))}
            />
          </FieldLabel>
          <ErrorText message={errors.beginsAt} />
        </div>
        <FieldLabel label={t('admin.outages.field.finished_at')}>
          <Input
            testId="admin.outages.form.finished_at"
            type="datetime-local"
            value={form.finishedAt}
            onChange={(e) => setForm((p) => ({ ...p, finishedAt: e.target.value }))}
          />
        </FieldLabel>
        <div>
          <FieldLabel label={t('admin.outages.field.duration')}>
            <Input
              testId="admin.outages.form.duration"
              inputMode="numeric"
              value={form.duration}
              onChange={(e) => setForm((p) => ({ ...p, duration: e.target.value }))}
            />
          </FieldLabel>
          <ErrorText message={errors.duration} />
        </div>
        <div>
          <FieldLabel label={t('admin.outages.field.impact')}>
            <Select
              testId="admin.outages.form.impact"
              value={form.impact}
              onChange={(e) => setForm((p) => ({ ...p, impact: e.target.value }))}
              options={IMPACTS.map((v) => ({ value: v, label: outageImpactLabel(t, v) }))}
            />
          </FieldLabel>
          <ErrorText message={errors.impact} />
        </div>
        {!props.updateMode ? (
          <div>
            <FieldLabel label={t('admin.outages.field.type')}>
              <Select
                testId="admin.outages.form.type"
                value={form.type}
                onChange={(e) => setForm((p) => ({ ...p, type: e.target.value as OutageAdminType }))}
                options={OUTAGE_TYPES.map((v) => ({ value: v, label: outageTypeLabel(t, v) }))}
              />
            </FieldLabel>
            <ErrorText message={errors.type} />
          </div>
        ) : null}
        {props.includeState ? (
          <FieldLabel label={t('admin.outages.field.state')}>
            <Select
              testId="admin.outages.form.state"
              value={form.state}
              onChange={(e) => setForm((p) => ({ ...p, state: e.target.value }))}
              options={STATES.map((v) => ({ value: v, label: t(`admin.outages.state.${v}`) }))}
            />
          </FieldLabel>
        ) : null}
      </div>
      {!props.updateMode ? (
        <label className="flex items-center gap-2 text-sm text-fg">
          <input
            type="checkbox"
            checked={form.autoResolve}
            onChange={(e) => setForm((p) => ({ ...p, autoResolve: e.target.checked }))}
          />
          {t('admin.outages.field.auto_resolve')}
        </label>
      ) : (
        <label className="flex items-center gap-2 text-sm text-fg">
          <input
            type="checkbox"
            checked={form.sendMail}
            onChange={(e) => setForm((p) => ({ ...p, sendMail: e.target.checked }))}
          />
          {t('admin.outages.field.send_mail')}
        </label>
      )}
      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <FieldLabel label={t('admin.outages.field.en_summary')}>
            <Input
              testId="admin.outages.form.en_summary"
              value={form.enSummary}
              onChange={(e) => setForm((p) => ({ ...p, enSummary: e.target.value }))}
            />
          </FieldLabel>
          <ErrorText message={errors.enSummary} />
        </div>
        <div>
          <FieldLabel label={t('admin.outages.field.cs_summary')}>
            <Input
              testId="admin.outages.form.cs_summary"
              value={form.csSummary}
              onChange={(e) => setForm((p) => ({ ...p, csSummary: e.target.value }))}
            />
          </FieldLabel>
          <ErrorText message={errors.csSummary} />
        </div>
        <Textarea
          testId="admin.outages.form.en_description"
          value={form.enDescription}
          onChange={(e) => setForm((p) => ({ ...p, enDescription: e.target.value }))}
          label={t('admin.outages.field.en_description')}
          rows={4}
        />
        <Textarea
          testId="admin.outages.form.cs_description"
          value={form.csDescription}
          onChange={(e) => setForm((p) => ({ ...p, csDescription: e.target.value }))}
          label={t('admin.outages.field.cs_description')}
          rows={4}
        />
      </div>
    </div>
  );
}

export function OutageReviewSummary(props: {
  form: OutageFormState;
  systems?: OutageSystemsFormState;
  showState?: boolean;
}) {
  const { t } = useI18n();
  const { form, systems } = props;
  return (
    <dl className="grid gap-x-4 gap-y-2 text-sm sm:grid-cols-2">
      <div>
        <dt className="text-xs text-muted">{t('admin.outages.field.type')}</dt>
        <dd>{outageTypeLabel(t, form.type)}</dd>
      </div>
      <div>
        <dt className="text-xs text-muted">{t('admin.outages.field.impact')}</dt>
        <dd>{outageImpactLabel(t, form.impact)}</dd>
      </div>
      <div>
        <dt className="text-xs text-muted">{t('admin.outages.field.begins_at')}</dt>
        <dd>{formatDateTime(fromOutageDateTimeInput(form.beginsAt))}</dd>
      </div>
      <div>
        <dt className="text-xs text-muted">{t('admin.outages.field.duration')}</dt>
        <dd>{form.duration} min</dd>
      </div>
      {form.finishedAt ? (
        <div>
          <dt className="text-xs text-muted">{t('admin.outages.field.finished_at')}</dt>
          <dd>{formatDateTime(fromOutageDateTimeInput(form.finishedAt))}</dd>
        </div>
      ) : null}
      {props.showState ? (
        <div>
          <dt className="text-xs text-muted">{t('admin.outages.field.state')}</dt>
          <dd>{t(`admin.outages.state.${form.state}`)}</dd>
        </div>
      ) : null}
      <div className="sm:col-span-2">
        <dt className="text-xs text-muted">{t('admin.outages.field.en_summary')}</dt>
        <dd>{form.enSummary || '—'}</dd>
      </div>
      <div className="sm:col-span-2">
        <dt className="text-xs text-muted">{t('admin.outages.field.cs_summary')}</dt>
        <dd>{form.csSummary || '—'}</dd>
      </div>
      {systems ? (
        <>
          <div className="sm:col-span-2">
            <dt className="text-xs text-muted">{t('admin.outages.systems.preview.scope')}</dt>
            <dd>{systems.scope.map((item) => item.label).join(', ') || t('admin.outages.systems.none_selected')}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-xs text-muted">{t('admin.outages.systems.handlers')}</dt>
            <dd>{systems.handlers.map((item) => item.label).join(', ') || t('admin.outages.empty.handlers')}</dd>
          </div>
        </>
      ) : null}
    </dl>
  );
}
