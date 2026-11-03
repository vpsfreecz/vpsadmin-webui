import { useI18n } from '../../../../app/i18n';
import { Alert } from '../../../../components/ui/Alert';
import { Checkbox } from '../../../../components/ui/Checkbox';
import { Input } from '../../../../components/ui/Input';
import { Select } from '../../../../components/ui/Select';
import { Textarea } from '../../../../components/ui/Textarea';
import {
  type SecurityAdvisoryNodeStatus,
  type SecurityAdvisoryNodeStatusCreatePayload,
} from '../../../../lib/api/securityAdvisories';
import { localInputToIso } from '../../../../lib/datetimeLocal';

import type { Language } from '../../../../lib/api/languages';
import { advisoryDateInput, advisoryDateValue } from './advisoryDateTime';

const NODE_STATES = ['unknown', 'not_affected', 'vulnerable', 'mitigated'] as const;
type KnownNodeState = (typeof NODE_STATES)[number];

export interface SecurityAdvisoryNodeFormValues {
  state: KnownNodeState;
  vulnerableUntil: string;
  mitigatedSince: string;
  notes: Record<string, string>;
  bulkNoteSelection?: Record<string, boolean>;
  original?: SecurityAdvisoryNodeStatus | null;
}

export type SecurityAdvisoryNodePayloadResult =
  | {
      valid: true;
      payload: Omit<SecurityAdvisoryNodeStatusCreatePayload, 'expected_content_revision' | 'expected_state'>;
    }
  | {
      valid: false;
      reason: 'vulnerable_until_required' | 'mitigated_since_required' | 'invalid_date' | 'unsupported_language';
    };

export function securityAdvisoryNodeStatusNodeId(
  status: Pick<SecurityAdvisoryNodeStatus, 'id'> & {
    node?: SecurityAdvisoryNodeStatus['node'] | number;
    node_id?: unknown;
  }
): number | null {
  if (typeof status['node_id'] === 'number' && Number.isFinite(status['node_id'])) return status['node_id'];
  if (typeof status.node === 'number' && Number.isFinite(status.node)) return status.node;
  if (status.node && typeof status.node === 'object') {
    const id = status.node.id;
    if (typeof id === 'number' && Number.isFinite(id)) return id;
  }
  return null;
}

export function buildSecurityAdvisoryNodeStatusPayload(
  nodeId: number,
  values: SecurityAdvisoryNodeFormValues
): SecurityAdvisoryNodePayloadResult {
  const notes: Pick<SecurityAdvisoryNodeStatusCreatePayload, 'cs_note' | 'en_note'> = {};
  for (const [code, note] of Object.entries(values.notes)) {
    if (code !== 'cs' && code !== 'en') return { valid: false, reason: 'unsupported_language' };
    if (values.bulkNoteSelection !== undefined && values.bulkNoteSelection[code] !== true) continue;
    if (values.original && note === String(values.original[`${code}_note`] ?? '')) continue;
    if (code === 'cs') notes.cs_note = note.trim() || null;
    else notes.en_note = note.trim() || null;
  }
  if (values.state === 'not_affected' || values.state === 'unknown') {
    return {
      valid: true,
      payload: {
        node: nodeId,
        state: values.state,
        vulnerable_until: values.original?.state === values.state ? (values.original.vulnerable_until ?? null) : null,
        mitigated_since: values.original?.state === values.state ? (values.original.mitigated_since ?? null) : null,
        ...notes,
      },
    };
  }

  if (values.state === 'mitigated' && !values.vulnerableUntil.trim()) {
    return { valid: false, reason: 'vulnerable_until_required' };
  }
  if (values.state === 'mitigated' && !values.mitigatedSince.trim()) {
    return { valid: false, reason: 'mitigated_since_required' };
  }

  const vulnerableUntil = localInputToIso(values.vulnerableUntil);
  const mitigatedSince = localInputToIso(values.mitigatedSince);
  if (!vulnerableUntil.valid || !mitigatedSince.valid) return { valid: false, reason: 'invalid_date' };

  return {
    valid: true,
    payload: {
      node: nodeId,
      state: values.state,
      vulnerable_until: advisoryDateValue(values.vulnerableUntil, values.original?.vulnerable_until),
      mitigated_since:
        values.state === 'mitigated'
          ? advisoryDateValue(values.mitigatedSince, values.original?.mitigated_since)
          : null,
      ...notes,
    },
  };
}

export function remainingSecurityAdvisoryBulkNodeIds(
  nodeIds: number[],
  completedNodeIds: ReadonlySet<number>
): number[] {
  return nodeIds.filter((nodeId) => !completedNodeIds.has(nodeId));
}

export function securityAdvisoryNodeFormValues(
  status?: SecurityAdvisoryNodeStatus | null,
  languages: Language[] = [],
  resolved = false
): SecurityAdvisoryNodeFormValues {
  const state = NODE_STATES.includes(String(status?.state ?? '') as KnownNodeState)
    ? (String(status?.state) as KnownNodeState)
    : resolved
      ? 'not_affected'
      : 'unknown';
  return {
    state,
    vulnerableUntil: advisoryDateInput(status?.vulnerable_until),
    mitigatedSince: advisoryDateInput(status?.mitigated_since),
    notes: Object.fromEntries(
      languages.map((language) => [String(language.code), String(status?.[`${language.code}_note`] ?? '')])
    ),
    original: status,
  };
}

export function SecurityAdvisoryNodeFormFields(props: {
  values: SecurityAdvisoryNodeFormValues;
  onChange: (values: SecurityAdvisoryNodeFormValues) => void;
  testId: string;
  resolved?: boolean;
}) {
  const { t } = useI18n();
  const payload = buildSecurityAdvisoryNodeStatusPayload(0, props.values);

  return (
    <div className="space-y-4">
      <label className="block">
        <span className="mb-1 block text-xs font-semibold text-muted">
          {t('admin.security_advisories.nodes.field.state')}
        </span>
        <Select
          ariaLabel={t('admin.security_advisories.nodes.field.state')}
          value={props.values.state}
          onChange={(event) => props.onChange({ ...props.values, state: event.target.value as KnownNodeState })}
          options={NODE_STATES.map((state) => ({
            value: state,
            disabled: props.resolved && !['mitigated', 'not_affected'].includes(state),
            label: t(`admin.security_advisories.nodes.state.${state}`),
          }))}
          testId={`${props.testId}.state`}
        />
      </label>

      {props.values.state === 'vulnerable' || props.values.state === 'mitigated' ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-muted">
              {t('admin.security_advisories.nodes.field.vulnerable_until')}
            </span>
            <Input
              type="datetime-local"
              step="1"
              ariaLabel={t('admin.security_advisories.nodes.field.vulnerable_until')}
              value={props.values.vulnerableUntil}
              onChange={(event) => props.onChange({ ...props.values, vulnerableUntil: event.target.value })}
              testId={`${props.testId}.vulnerable_until`}
            />
          </label>
          {props.values.state === 'mitigated' ? (
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-muted">
                {t('admin.security_advisories.nodes.field.mitigated_since')}
              </span>
              <Input
                type="datetime-local"
                step="1"
                ariaLabel={t('admin.security_advisories.nodes.field.mitigated_since')}
                value={props.values.mitigatedSince}
                onChange={(event) => props.onChange({ ...props.values, mitigatedSince: event.target.value })}
                testId={`${props.testId}.mitigated_since`}
              />
            </label>
          ) : null}
        </div>
      ) : null}

      {Object.entries(props.values.notes).map(([code, note]) => (
        <div key={code} className="space-y-2">
          {props.values.bulkNoteSelection !== undefined ? (
            <Checkbox
              checked={props.values.bulkNoteSelection[code] === true}
              onChange={(checked) =>
                props.onChange({
                  ...props.values,
                  bulkNoteSelection: { ...props.values.bulkNoteSelection, [code]: checked },
                })
              }
              label={t('admin.security_advisories.nodes.bulk.note_update', { language: code.toUpperCase() })}
              description={t('admin.security_advisories.nodes.bulk.note_update_help')}
              testId={`${props.testId}.${code}_note.update`}
            />
          ) : null}
          <Textarea
            label={`${code.toUpperCase()} ${t('admin.security_advisories.nodes.field.note')}`}
            value={note}
            disabled={props.values.bulkNoteSelection !== undefined && props.values.bulkNoteSelection[code] !== true}
            onChange={(event) =>
              props.onChange({ ...props.values, notes: { ...props.values.notes, [code]: event.target.value } })
            }
            rows={3}
            testId={`${props.testId}.${code}_note`}
          />
        </div>
      ))}

      {!payload.valid ? (
        <Alert variant="warn" title={t('admin.security_advisories.nodes.validation.title')}>
          {t(
            payload.reason === 'unsupported_language'
              ? 'admin.security_advisories.validation.language_profile_unsupported'
              : `admin.security_advisories.nodes.validation.${payload.reason}`
          )}
        </Alert>
      ) : null}
    </div>
  );
}

export function MobileCellLabel(props: { children: React.ReactNode }) {
  return <span className="text-xs font-medium text-faint md:hidden">{props.children}</span>;
}

export function withoutNode(
  payload: Omit<SecurityAdvisoryNodeStatusCreatePayload, 'expected_content_revision' | 'expected_state'>
) {
  const { node: _node, ...update } = payload;
  return update;
}

export function SecurityAdvisoryNodeTableHead() {
  const { t } = useI18n();
  return (
    <thead className="hidden md:table-header-group">
      <tr>
        <th>{t('admin.security_advisories.nodes.table.node')}</th>
        <th>{t('admin.security_advisories.nodes.table.type')}</th>
        <th>{t('admin.security_advisories.nodes.table.state')}</th>
        <th>{t('admin.security_advisories.nodes.table.vulnerable_until')}</th>
        <th>{t('admin.security_advisories.nodes.table.mitigated_since')}</th>
        <th>{t('admin.security_advisories.nodes.table.note')}</th>
        <th className="text-right">{t('admin.security_advisories.nodes.table.actions')}</th>
      </tr>
    </thead>
  );
}
