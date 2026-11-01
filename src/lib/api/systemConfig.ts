import { ClientInputError } from './apiErrors';
import type { JsonValue } from 'vpsadmin-typescript-client';
import type { SystemConfig__UpdateInput } from 'vpsadmin-typescript-client';
import { getPublicApi } from './sdk';
import type { SystemConfig__IndexOutput } from 'vpsadmin-typescript-client';
import { getApi } from './sdk';
import { narrowApiResult } from './apiOutput';

export type SystemConfigItem = Omit<SystemConfig__IndexOutput[number], 'category' | 'name'> & {
  category: string;
  name: string;
  [k: string]: unknown;
};

export interface FetchSystemConfigsOptions {
  category?: string;
  signal?: AbortSignal;
}

export async function fetchSystemConfigs(options: FetchSystemConfigsOptions = {}) {
  const category = options.category?.trim();
  const res = await (
    await getApi()
  ).system_config.index({ params: category ? { category } : {},
    signal: options.signal });

  return narrowApiResult(res, narrowSystemConfigItemList, 'system_configs#index');
}

export async function updateSystemConfig(opts: { category: string; name: string; value: unknown }) {
  const category = String(opts.category).trim();
  const name = String(opts.name).trim();

  if (!isConfigJson(opts.value) || opts.value === null) throw new ClientInputError('Invalid system config value');
  const res = await (
    await getApi()
  ).system_config.update({ path: { category: category, name: name }, params: { value: opts.value } });

  return narrowApiResult(res, narrowSystemConfigItem, 'system config');
}

function isOperationsRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function isSystemConfigItem(value: unknown): value is SystemConfigItem {
  return (
    isOperationsRecord(value) &&
    typeof value['category'] === 'string' &&
    typeof value['name'] === 'string' &&
    ['description', 'label', 'type'].every(
      (key) => value[key] === undefined || value[key] === null || typeof value[key] === 'string'
    ) &&
    ['min_user_level'].every(
      (key) =>
        value[key] === undefined ||
        value[key] === null ||
        (typeof value[key] === 'number' && Number.isFinite(value[key]))
    ) &&
    ['localized'].every((key) => value[key] === undefined || value[key] === null || typeof value[key] === 'boolean')
  );
}
function narrowSystemConfigItem(value: unknown): SystemConfigItem {
  if (!isSystemConfigItem(value)) throw new TypeError('Invalid SystemConfigItem fields');
  return value;
}
function narrowSystemConfigItemList(value: unknown): SystemConfigItem[] {
  if (!Array.isArray(value)) throw new TypeError('Expected SystemConfigItem list');
  return value.map(narrowSystemConfigItem);
}

/** This setting is intentionally fetched anonymously on every heatmap surface. */
export async function fetchPublicNodeHeatmapConfig() {
  const result = await getPublicApi().system_config.show({ path: { category: 'webui', name: 'goresheat_url' } });
  return narrowApiResult(
    result,
    (data) => {
      if (!isOperationsRecord(data)) throw new TypeError('Invalid heatmap configuration');
      return data;
    },
    'node heatmap configuration'
  );
}

function isConfigJson(value: unknown, seen = new Set<object>()): value is JsonValue {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return true;
  if (typeof value === 'number') return Number.isFinite(value);
  if (!value || typeof value !== 'object' || seen.has(value)) return false;
  if (
    !Array.isArray(value) &&
    Object.getPrototypeOf(value) !== Object.prototype &&
    Object.getPrototypeOf(value) !== null
  )
    return false;
  seen.add(value);
  const valid = (Array.isArray(value) ? value : Object.values(value)).every((item) => isConfigJson(item, seen));
  seen.delete(value);
  return valid;
}
