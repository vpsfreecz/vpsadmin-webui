import type { Language__IndexInput, Language__IndexOutput } from 'vpsadmin-typescript-client';
import { narrowApiResult } from './apiOutput';
import { getApi } from './sdk';

export type Language = Language__IndexOutput[number] & { id: number };

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function language(value: unknown): value is Language {
  return (
    record(value) &&
    typeof value['id'] === 'number' &&
    Number.isSafeInteger(value['id']) &&
    value['id'] > 0 &&
    ['code', 'label'].every((key) => value[key] == null || typeof value[key] === 'string')
  );
}

export async function fetchLanguages(opts?: { limit?: number; fromId?: number }) {
  const params: Language__IndexInput = { limit: opts?.limit, from_id: opts?.fromId };
  return narrowApiResult(
    await (await getApi()).language.index({ params }),
    (data) => {
      if (!Array.isArray(data) || !data.every(language)) throw new TypeError('Expected languages');
      return data;
    },
    'languages#index'
  );
}
