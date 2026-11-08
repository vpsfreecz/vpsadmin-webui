import { getRuntimeConfig } from '../../app/config';
import { staticTForDocument } from '../staticI18n';
import { HaveApiError, ClientInputError } from './apiErrors';
import { narrowApiResult } from './apiOutput';
import { getApi } from './sdk';

function requireCanonicalSettingsPath(): void {
  const configured = getRuntimeConfig().uiSettings.server.path;
  if (typeof configured !== 'string' || configured.replace(/\/+$/, '') !== '/webui_user_settings') {
    throw new ClientInputError(
      staticTForDocument(typeof document === 'undefined' ? undefined : document, 'errors.settings_path_unsupported')
    );
  }
}

function parseStoredValue(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

export async function fetchWebuiUserSetting(namespace: string, key: string, opts?: { signal?: AbortSignal }): Promise<unknown | undefined> {
  requireCanonicalSettingsPath();
  try {
    opts?.signal?.throwIfAborted();
    const api = await getApi();
    opts?.signal?.throwIfAborted();
    const result = await api.webui_user_setting.index({ params: { namespace, key }, ...(opts?.signal ? { signal: opts.signal } : {}) });
    opts?.signal?.throwIfAborted();
    const settings = narrowApiResult(
      result,
      (data) => {
        if (!Array.isArray(data)) throw new TypeError('Expected settings collection');
        for (const row of data) {
          if (
            !row ||
            typeof row !== 'object' ||
            Array.isArray(row) ||
            typeof row.namespace !== 'string' ||
            typeof row.key !== 'string'
          )
            throw new TypeError('Expected setting identity');
        }
        return data;
      },
      'UI settings'
    );
    const setting = settings.data.find((row) => row.namespace === namespace && row.key === key);
    return setting ? parseStoredValue(setting.value) : undefined;
  } catch (error) {
    if (error instanceof HaveApiError && error.httpStatus === 404) return undefined;
    throw error;
  }
}

export async function saveWebuiUserSetting(namespace: string, key: string, value: unknown): Promise<void> {
  requireCanonicalSettingsPath();
  let serialized: string | undefined;
  try {
    serialized = JSON.stringify(value);
  } catch {
    throw new ClientInputError(
      staticTForDocument(typeof document === 'undefined' ? undefined : document, 'common.validation_error')
    );
  }
  if (serialized === undefined)
    throw new ClientInputError(
      staticTForDocument(typeof document === 'undefined' ? undefined : document, 'common.validation_error')
    );
  await (await getApi()).webui_user_setting.set({ path: { namespace, key }, params: { value: serialized } });
}
