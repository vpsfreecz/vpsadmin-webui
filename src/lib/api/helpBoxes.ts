import type {
  HelpBox__CreateInput,
  HelpBox__UpdateInput,
  HelpBox__IndexInput,
  HelpBox__ShowOutput,
  Language__ShowOutput,
} from 'vpsadmin-typescript-client';
import { expectArray } from './apiErrors';
import { narrowApiResult } from './apiOutput';
import { getApi, getPublicApi } from './sdk';

export type HelpBoxLanguage = Pick<Language__ShowOutput, 'id' | 'code' | 'label'>;
export type HelpBox = Omit<HelpBox__ShowOutput, 'language'> & {
  id: number;
  language?: HelpBoxLanguage | null;
};
export type ContextualHelpAccessMode = 'public' | 'authenticated';

function isHelpBox(value: unknown): value is HelpBox {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const row = value as Record<string, unknown>;
  if (typeof row['id'] !== 'number' || !Number.isSafeInteger(row['id']) || row['id'] <= 0) return false;
  if (!['page', 'action', 'content'].every((key) => row[key] == null || typeof row[key] === 'string')) return false;
  if (row['order'] != null && (typeof row['order'] !== 'number' || !Number.isFinite(row['order']))) return false;
  const lang = row['language'];
  if (lang == null) return true;
  if (typeof lang !== 'object' || Array.isArray(lang)) return false;
  const ref = lang as Record<string, unknown>;
  return (
    (ref['id'] == null || (typeof ref['id'] === 'number' && Number.isSafeInteger(ref['id']) && ref['id'] > 0)) &&
    ['code', 'label'].every((key) => ref[key] == null || typeof ref[key] === 'string')
  );
}

function narrowHelpBox(value: unknown): HelpBox {
  if (!isHelpBox(value)) throw new Error('Invalid help box identity or fields');
  return value;
}

export async function fetchHelpBoxesAdmin(opts?: {
  page?: string;
  action?: string;
  language?: number;
  fromId?: number;
  limit?: number;
}) {
  const params: HelpBox__IndexInput = {
    page: opts?.page || undefined,
    action: opts?.action || undefined,
    language: opts?.language,
    from_id: opts?.fromId,
    limit: opts?.limit,
  };
  const res = await (await getApi()).help_box.index({ params });
  return narrowApiResult(res, (data) => expectArray<unknown>(data, 'help boxes').map(narrowHelpBox), 'help boxes');
}

export async function createHelpBox(payload: HelpBox__CreateInput) {
  const res = await (await getApi()).help_box.create({ params: payload });
  return narrowApiResult(res, narrowHelpBox, 'help box create');
}

export async function updateHelpBox(id: number, payload: HelpBox__UpdateInput) {
  const res = await (await getApi()).help_box.update({ path: { help_box_id: id }, params: payload });
  return narrowApiResult(res, narrowHelpBox, 'help box update');
}

export async function deleteHelpBox(id: number) {
  return (await getApi()).help_box.delete({ path: { help_box_id: id } });
}

export async function fetchContextualHelpBoxes(page: string, action: string, accessMode: ContextualHelpAccessMode) {
  const api = accessMode === 'authenticated' ? await getApi() : getPublicApi();
  const res = await api.help_box.index({ params: { page, action, view: true } });
  return narrowApiResult(
    res,
    (data) => expectArray<unknown>(data, 'contextual help').map(narrowHelpBox),
    'contextual help'
  );
}
