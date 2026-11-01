import type {
  User__MailRoleRecipient__IndexOutput,
  User__MailRoleRecipient__UpdateInput,
  User__MailTemplateRecipient__IndexOutput,
  User__MailTemplateRecipient__UpdateInput,
} from 'vpsadmin-typescript-client';
import { narrowApiResult } from './apiOutput';
import { getApi } from './sdk';

export type UserMailRoleRecipient = User__MailRoleRecipient__IndexOutput[number] & { id: string };
export type UserMailTemplateRecipient = User__MailTemplateRecipient__IndexOutput[number] & { id: string };

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function role(value: unknown): value is UserMailRoleRecipient {
  return (
    record(value) &&
    typeof value['id'] === 'string' &&
    value['id'].length > 0 &&
    ['label', 'description', 'to'].every((key) => value[key] == null || typeof value[key] === 'string')
  );
}
function template(value: unknown): value is UserMailTemplateRecipient {
  return record(value) && (value['enabled'] == null || typeof value['enabled'] === 'boolean') && role(value);
}

export async function fetchUserMailRoleRecipients(userId: number) {
  return narrowApiResult(
    await (await getApi()).user.mail_role_recipient.index({ path: { user_id: userId } }),
    (data) => {
      if (!Array.isArray(data) || !data.every(role)) throw new TypeError('Expected mail role recipients');
      return data;
    },
    'mail role recipients'
  );
}
export async function updateUserMailRoleRecipient(
  userId: number,
  roleId: string,
  params: User__MailRoleRecipient__UpdateInput
) {
  return narrowApiResult(
    await (
      await getApi()
    ).user.mail_role_recipient.update({ path: { user_id: userId, mail_role_recipient_id: roleId }, params }),
    (data) => {
      if (!role(data)) throw new TypeError('Expected mail role recipient');
      return data;
    },
    'mail role recipient update'
  );
}
export async function fetchUserMailTemplateRecipients(userId: number) {
  return narrowApiResult(
    await (await getApi()).user.mail_template_recipient.index({ path: { user_id: userId } }),
    (data) => {
      if (!Array.isArray(data) || !data.every(template)) throw new TypeError('Expected mail template recipients');
      return data;
    },
    'mail template recipients'
  );
}
export async function updateUserMailTemplateRecipient(
  userId: number,
  templateName: string,
  params: User__MailTemplateRecipient__UpdateInput
) {
  return narrowApiResult(
    await (
      await getApi()
    ).user.mail_template_recipient.update({
      path: { user_id: userId, mail_template_recipient_id: templateName },
      params,
    }),
    (data) => {
      if (!template(data)) throw new TypeError('Expected mail template recipient');
      return data;
    },
    'mail template recipient update'
  );
}
