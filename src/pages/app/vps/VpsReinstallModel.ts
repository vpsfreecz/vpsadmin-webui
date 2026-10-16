import type { OsTemplate } from '../../../lib/api/osTemplates';
import type { Vps, VpsReinstallPayload } from '../../../lib/api/vps';

export { USER_DATA_FORMATS as reinstallUserDataFormats } from '../../../components/user/UserDataTemplatesModel';
export type { VpsUserDataFormat as ReinstallUserDataFormat } from '../../../lib/api/vpsUserData';
import { buildVpsInitializationPayload, defaultVpsInitialization, type VpsInitializationForm } from './VpsInitializationModel';

export type ReinstallForm = VpsInitializationForm & { osTemplate: string };

export function defaultReinstallForm(osTemplateId: number | null | undefined): ReinstallForm {
  return { ...defaultVpsInitialization(), osTemplate: osTemplateId ? String(osTemplateId) : '' };
}

export function parseRequiredReinstallId(raw: string): number {
  const trimmed = raw.trim();
  if (!/^\d+$/.test(trimmed)) throw new Error('required-id');
  const n = Number(trimmed);
  if (!Number.isInteger(n) || n <= 0) throw new Error('required-id');
  return n;
}

export function buildVpsReinstallPayload(form: ReinstallForm, ownerId?: number): VpsReinstallPayload {
  return {
    os_template: parseRequiredReinstallId(form.osTemplate),
    ...buildVpsInitializationPayload(form, ownerId),
  };
}

export function vpsReinstallTemplateLabel(tpl: OsTemplate | undefined): string {
  if (!tpl) return '—';
  return String(tpl.label ?? tpl.name ?? `#${tpl.id}`).trim() || `#${tpl.id}`;
}

export function vpsCurrentTemplateLabel(vps: Pick<Vps, 'os_template'>): string {
  const tpl = vps.os_template;
  if (!tpl) return '—';
  return String(tpl.label ?? tpl.name ?? `#${tpl.id}`).trim() || `#${tpl.id}`;
}
