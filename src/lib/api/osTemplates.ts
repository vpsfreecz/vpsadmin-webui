import type { OsFamily__IndexInput, OsTemplate__CreateInput, OsTemplate__IndexInput, OsTemplate__UpdateInput } from 'vpsadmin-typescript-client';
import type { OsFamily__ShowOutput, OsTemplate__ShowOutput } from 'vpsadmin-typescript-client';
import { narrowApiResult } from './apiOutput';
import { fields, positiveId, reference, rows, object, type StorageReference } from './vpsStorageOutput';

export type OsFamily = Omit<OsFamily__ShowOutput, 'id'> & { id: number; } & Record<string, unknown>;
function isOsFamily(value: unknown): value is OsFamily {
  return fields(value, ['label', 'description'], [], []) && positiveId(value['id']);
}

export type OsTemplate = Omit<OsTemplate__ShowOutput, 'id' | 'os_family'> & { id: number; os_family?: StorageReference | null; } & Record<string, unknown>;
function isOsTemplate(value: unknown): value is OsTemplate {
  return fields(value, ['name', 'label', 'info', 'hypervisor_type', 'cgroup_version', 'vendor', 'variant', 'arch', 'distribution', 'version', 'config'], ['order'], ['enabled', 'supported', 'manage_hostname', 'manage_dns_resolver', 'enable_script', 'enable_cloud_init']) && positiveId(value['id'])
    && reference(value['os_family']);
}

import { getApi } from './sdk';

export async function fetchOsFamilies(opts?: { limit?: number }) {
  const params: OsFamily__IndexInput = {};
  if (opts?.limit !== undefined) params['limit'] = opts.limit;

  const res = await (await getApi()).os_family.index({
    params,
  });

  return narrowApiResult(res, data => rows(data, isOsFamily), 'fetchOsFamilies');
}

export async function fetchOsTemplates(opts?: {
  limit?: number;

  osFamily?: number;
  hypervisorType?: string;
  cgroupVersion?: string;
  enableScript?: boolean;
  enableCloudInit?: boolean;
}) {
  const params: OsTemplate__IndexInput = {};

  if (opts?.limit !== undefined) params['limit'] = opts.limit;

  if (opts?.osFamily !== undefined) params['os_family'] = opts.osFamily;
  if (opts?.hypervisorType) params['hypervisor_type'] = opts.hypervisorType;
  if (opts?.cgroupVersion) params['cgroup_version'] = opts.cgroupVersion;
  if (opts?.enableScript !== undefined) params['enable_script'] = opts.enableScript;
  if (opts?.enableCloudInit !== undefined) params['enable_cloud_init'] = opts.enableCloudInit;

  const res = await (await getApi()).os_template.index({
    params,
  });

  return narrowApiResult(res, data => rows(data, isOsTemplate), 'fetchOsTemplates');
}

export async function createOsTemplate(payload: OsTemplate__CreateInput) {
  const res = await (await getApi()).os_template.create({
    params: payload,
  });
  return narrowApiResult(res, data => object(data, isOsTemplate), 'createOsTemplate');
}

export async function updateOsTemplate(osTemplateId: number, payload: OsTemplate__UpdateInput) {
  const res = await (await getApi()).os_template.update({
    path: { os_template_id: osTemplateId },
    params: payload,
  });
  return narrowApiResult(res, data => object(data, isOsTemplate), 'updateOsTemplate');
}

export async function deleteOsTemplate(osTemplateId: number) {
  return (await getApi()).os_template.delete({
    path: { os_template_id: osTemplateId },
  });
}

/** Enabled is omitted by the authenticated non-admin Index whitelist. */
export function isOsTemplateAvailable(template: OsTemplate, role: unknown): boolean {
  if (role === 'admin') return template.enabled === true;
  return (role === 'user' || role === 'support') && (template.enabled === true || template.enabled === undefined);
}

export async function fetchOsTemplate(id: number) {
  const result = await (await getApi()).os_template.show({ path: { os_template_id: id } });
  return narrowApiResult(result, data => object(data, isOsTemplate), 'OS template');
}
