import type { Vps__Mount__CreateInput, Vps__Mount__UpdateInput } from 'vpsadmin-typescript-client';
import type { StorageReference } from '../../../lib/api/vpsStorageOutput';
import type { ResourceRef } from '../../../lib/api/appTypes';
import type { Dataset as StorageDataset } from '../../../lib/api/datasets';
import type { Dataset, VpsMount } from '../../../lib/api/vpsMounts';

export type MountMode = 'ro' | 'rw';
export type MountStartFail = 'ignore' | 'umount' | 'fail';
export type StorageTone = 'neutral' | 'ok' | 'warn' | 'danger' | 'info';

export interface MountDraft {
  dataset: Dataset | StorageReference | null;
  mountpoint: string;
  mode: MountMode | undefined;
  onStartFail: MountStartFail | undefined;
  enabled: boolean | undefined;
  masterEnabled: boolean | undefined;
}

export interface MountValidationResult {
  ok: boolean;
  issues: MountValidationIssue[];
}

export type MountValidationIssue = 'dataset_required' | 'mountpoint_required' | 'mountpoint_absolute' | 'mountpoint_root';
export type MountDiffField = 'on_start_fail' | 'enabled' | 'master_enabled';

export interface MountDiffItem {
  field: MountDiffField;
  before: string | boolean | undefined;
  after: string | boolean | undefined;
}

export interface RootDatasetSummary {
  id: number | null;
  label: string;
  used: number | null;
  available: number | null;
  referenceQuota: number | null;
  quota: number | null;
  referenced: number | null;
  state: string | null;
  mountCount: number | null;
  snapshotCount: number | null;
  exportCount: number | null;
  capacityPercent: number | null;
  capacityTone: StorageTone;
}

export interface StorageOverviewSummary {
  mountCount: number;
  enabledMountCount: number;
  disabledMountCount: number;
  writableMountCount: number;
  readOnlyMountCount: number;
  failedMountCount: number;
}

export type SsdResizeValidationIssue = 'required' | 'invalid' | 'unchanged' | 'below_used';

export interface SsdResizeValidationResult {
  ok: boolean;
  valueMiB: number | null;
  issue: SsdResizeValidationIssue | null;
}

type DatasetLike = (StorageDataset | Dataset | ResourceRef | Record<string, unknown>) & { id?: number };

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function recordString(value: unknown, key: string): string | null {
  if (!isRecord(value)) return null;
  const raw = value[key];
  if (raw === undefined || raw === null) return null;
  const s = String(raw).trim();
  return s ? s : null;
}

function recordNumber(value: unknown, key: string): number | null {
  if (!isRecord(value)) return null;
  const raw = value[key];
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
  if (typeof raw === 'string' && raw.trim() !== '') {
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function compact<T extends Record<string, unknown>>(obj: T): T {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined) continue;
    out[k] = v;
  }
  return out as T;
}

export function errorMessage(error: unknown): string {
  if (isRecord(error) && typeof error['message'] === 'string') return error['message'];
  return String(error);
}

export function canonicalBool(value: unknown, fallback: boolean): boolean {
  return value === true ? true : value === false ? false : fallback;
}

export function finiteNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

export function positiveNumber(value: unknown): number | null {
  const n = finiteNumber(value);
  return n !== null && n > 0 ? n : null;
}

export function ssdSizeGiBInput(valueMiB: unknown): string {
  const value = positiveNumber(valueMiB);
  if (value === null) return '';
  return String(Number((value / 1024).toFixed(2)));
}

export function validateSsdResize(
  rawGiB: string,
  currentMiB: number | null,
  usedMiB: number | null
): SsdResizeValidationResult {
  const normalized = rawGiB.trim().replace(',', '.');
  if (!normalized) return { ok: false, valueMiB: null, issue: 'required' };

  const valueGiB = Number(normalized);
  if (!Number.isFinite(valueGiB) || valueGiB <= 0) {
    return { ok: false, valueMiB: null, issue: 'invalid' };
  }

  const valueMiB = Math.round(valueGiB * 1024);
  if (valueMiB <= 0) return { ok: false, valueMiB: null, issue: 'invalid' };
  if (currentMiB !== null && valueMiB === currentMiB) {
    return { ok: false, valueMiB, issue: 'unchanged' };
  }
  if (usedMiB !== null && valueMiB < Math.ceil(usedMiB)) {
    return { ok: false, valueMiB, issue: 'below_used' };
  }

  return { ok: true, valueMiB, issue: null };
}

export function datasetId(dataset: unknown): number | null {
  const id = recordNumber(dataset, 'id');
  return id !== null && Number.isInteger(id) && id > 0 ? id : null;
}

export function datasetLabel(dataset: unknown): string {
  if (!dataset) return '—';
  if (typeof dataset === 'string' || typeof dataset === 'number') return String(dataset);
  return recordString(dataset, 'name') ?? recordString(dataset, 'full_name') ?? recordString(dataset, 'label') ?? (datasetId(dataset) ? `#${datasetId(dataset)}` : '—');
}

export function defaultMountDraft(): MountDraft {
  return {
    dataset: null,
    mountpoint: '',
    mode: 'rw',
    onStartFail: 'ignore',
    enabled: true,
    masterEnabled: true,
  };
}

export function parseMountMode(value: unknown): MountMode | undefined {
  return value === 'ro' || value === 'rw' ? value : undefined;
}

export function parseMountStartFail(value: unknown): MountStartFail | undefined {
  return value === 'umount' || value === 'fail' || value === 'ignore' ? value : undefined;
}

export function mountDraftFromMount(mount: VpsMount): MountDraft {
  return {
    dataset: mount.dataset ?? null,
    mountpoint: String(mount.mountpoint ?? ''),
    mode: parseMountMode(mount.mode),
    onStartFail: parseMountStartFail(mount.on_start_fail),
    enabled: mount.enabled ?? undefined,
    masterEnabled: mount.master_enabled ?? undefined,
  };
}

export function validateMountDraft(draft: MountDraft, opts: { requireDataset: boolean }): MountValidationResult {
  const issues: MountValidationIssue[] = [];
  const mountpoint = draft.mountpoint.trim();

  if (opts.requireDataset && !datasetId(draft.dataset)) issues.push('dataset_required');
  if (!mountpoint) issues.push('mountpoint_required');
  if (mountpoint && !mountpoint.startsWith('/')) issues.push('mountpoint_absolute');
  if (mountpoint === '/') issues.push('mountpoint_root');

  return { ok: issues.length === 0, issues };
}

export function buildCreateMountPayload(draft: MountDraft, _canAdmin: boolean): Vps__Mount__CreateInput {
  const id = datasetId(draft.dataset);
  if (!id) throw new Error('dataset_required');
  return {
    dataset: id, mountpoint: draft.mountpoint.trim(), mode: draft.mode,
    on_start_fail: draft.onStartFail, enabled: draft.enabled,
  };
}

export function buildUpdateMountPayload(draft: MountDraft, canAdmin: boolean): Vps__Mount__UpdateInput {
  return {
    on_start_fail: draft.onStartFail, enabled: draft.enabled,
    ...(canAdmin && draft.masterEnabled !== undefined ? { master_enabled: draft.masterEnabled } : {}),
  };
}

function mountComparable(mount: VpsMount) {
  return {
    mountpoint: String(mount.mountpoint ?? ''),
    mode: parseMountMode(mount.mode),
    onStartFail: parseMountStartFail(mount.on_start_fail),
    enabled: mount.enabled ?? undefined,
    masterEnabled: mount.master_enabled ?? undefined,
  };
}

export function buildMountDiff(draft: MountDraft, mount: VpsMount, canAdmin: boolean): MountDiffItem[] {
  const current = mountComparable(mount);
  const diff: MountDiffItem[] = [];

  if (draft.onStartFail !== current.onStartFail) diff.push({ field: 'on_start_fail', before: current.onStartFail, after: draft.onStartFail });
  if (draft.enabled !== current.enabled) diff.push({ field: 'enabled', before: current.enabled, after: draft.enabled });
  if (canAdmin && draft.masterEnabled !== current.masterEnabled) {
    diff.push({ field: 'master_enabled', before: current.masterEnabled, after: draft.masterEnabled });
  }

  return diff;
}

export function isMountDraftDirty(draft: MountDraft, mount: VpsMount, canAdmin: boolean): boolean {
  return buildMountDiff(draft, mount, canAdmin).length > 0;
}

export function mountDeleteConfirmation(mount: VpsMount): string {
  return String(mount.mountpoint ?? mount.id);
}

export function rootDatasetSummary(rootDataset: StorageDataset | null | undefined, fallback: unknown): RootDatasetSummary {
  const source = rootDataset ?? fallback;
  const used = finiteNumber(recordNumber(source, 'used'));
  const available = finiteNumber(recordNumber(source, 'avail'));
  const referenceQuota = positiveNumber(recordNumber(source, 'refquota'));
  const quota = positiveNumber(recordNumber(source, 'quota'));
  const hardLimit = referenceQuota ?? quota;
  const state = recordString(source, 'object_state');
  const capacityPercent = computeCapacityPercent(used, available, hardLimit);

  return {
    id: datasetId(source),
    label: datasetLabel(source),
    used,
    available,
    referenceQuota,
    quota,
    referenced: finiteNumber(recordNumber(source, 'referenced')),
    state,
    mountCount: recordNumber(source, 'mount_count'),
    snapshotCount: recordNumber(source, 'snapshots_count'),
    exportCount: recordNumber(source, 'export_count'),
    capacityPercent,
    capacityTone: capacityTone(capacityPercent, available),
  };
}

export function computeCapacityPercent(used: number | null, available: number | null, hardLimit: number | null): number | null {
  if (used === null) return null;
  if (hardLimit !== null && hardLimit > 0) return Math.min(999, Math.round((used / hardLimit) * 100));
  if (available !== null && used + available > 0) return Math.min(999, Math.round((used / (used + available)) * 100));
  return null;
}

export function capacityTone(percent: number | null, available: number | null): StorageTone {
  if (percent !== null && percent >= 95) return 'danger';
  if (percent !== null && percent >= 85) return 'warn';
  if (available !== null && available <= 1024) return 'warn';
  if (percent === null) return 'neutral';
  return 'ok';
}

export function storageOverviewSummary(mounts: VpsMount[]): StorageOverviewSummary {
  let enabledMountCount = 0;
  let writableMountCount = 0;
  let failedMountCount = 0;

  for (const mount of mounts) {
    if (canonicalBool(mount.enabled, true)) enabledMountCount += 1;
    if (parseMountMode(mount.mode) === 'rw') writableMountCount += 1;
    const state = String(mount.current_state ?? '').toLowerCase();
    if (state.includes('fail') || state.includes('error')) failedMountCount += 1;
  }

  return {
    mountCount: mounts.length,
    enabledMountCount,
    disabledMountCount: mounts.length - enabledMountCount,
    writableMountCount,
    readOnlyMountCount: mounts.length - writableMountCount,
    failedMountCount,
  };
}

export function mountStateTone(mount: VpsMount): StorageTone {
  const state = String(mount.current_state ?? '').toLowerCase();
  if (state.includes('fail') || state.includes('error')) return 'danger';
  if (!canonicalBool(mount.enabled, true) || !canonicalBool(mount.master_enabled, true)) return 'warn';
  if (state.includes('mounted') || state.includes('active') || state.includes('ok')) return 'ok';
  return 'neutral';
}
