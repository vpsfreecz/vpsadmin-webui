import type { VpsUserDataFormat } from '../../../lib/api/vpsUserData';

export type VpsInitializationForm = {
  userDataEnabled: boolean;
  userDataSource: 'inline' | 'saved';
  userDataFormat: VpsUserDataFormat;
  userDataContent: string;
  userDataTemplateId: string;
  userDataOwnerId?: number;
};

export function defaultVpsInitialization(): VpsInitializationForm {
  return {
    userDataEnabled: false,
    userDataSource: 'inline',
    userDataFormat: 'cloudinit_config',
    userDataContent: '',
    userDataTemplateId: '',
  };
}

export function initializationError(form: VpsInitializationForm, ownerId?: number): string | undefined {
  if (!form.userDataEnabled) return undefined;
  if (form.userDataSource === 'inline') {
    return form.userDataContent.trim() ? undefined : 'vps.initialization.content_required';
  }
  if (!ownerId) return 'vps.initialization.owner_required';
  const id = Number(form.userDataTemplateId);
  if (
    !/^\d+$/.test(form.userDataTemplateId) ||
    !Number.isSafeInteger(id) ||
    id <= 0 ||
    form.userDataOwnerId !== ownerId
  )
    return 'vps.initialization.template_required';
  return undefined;
}

export function buildVpsInitializationPayload(
  form: VpsInitializationForm,
  ownerId?: number
): {
  vps_user_data?: number;
  user_data_format?: string;
  user_data_content?: string;
} {
  const error = initializationError(form, ownerId);
  if (error) throw new Error(error);
  if (!form.userDataEnabled) return {};
  if (form.userDataSource === 'saved') return { vps_user_data: Number(form.userDataTemplateId) };
  // Validate blank content without rewriting scripts, YAML indentation or trailing newlines.
  return { user_data_format: form.userDataFormat, user_data_content: form.userDataContent };
}
