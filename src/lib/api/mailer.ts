import type {
  MailLog__IndexInput,
  MailTemplate__IndexInput,
  MailTemplate__Recipient__IndexInput,
  MailTemplate__Translation__IndexInput,
  MailRecipient__IndexInput,
  Mailbox__IndexInput,
  Mailbox__UpdateInput,
  Mailbox__Handler__IndexInput,
  MailTemplate__UpdateInput,
  MailTemplate__CreateInput,
  MailTemplate__Recipient__ShowOutput,
  MailTemplate__Translation__ShowOutput,
  MailTemplate__Translation__CreateInput,
  MailTemplate__Translation__UpdateInput,
  MailLog__ShowOutput,
  Mailbox__CreateInput,
  Mailbox__Handler__CreateInput,
  Mailbox__Handler__UpdateInput,
  MailRecipient__CreateInput,
  MailRecipient__UpdateInput,
  User__ShowOutput,
  OsTemplate__ShowOutput,
  Language__ShowOutput,
  MailTemplate__ShowOutput,
  MailRecipient__ShowOutput,
  Mailbox__ShowOutput,
  Mailbox__Handler__ShowOutput,
} from 'vpsadmin-typescript-client';
import { expectArray } from './apiErrors';
import { narrowApiResult } from './apiOutput';
import { getApi } from './sdk';

export type ResourceRef = Pick<OsTemplate__ShowOutput, 'id' | 'label' | 'name'> &
  Pick<User__ShowOutput, 'login'> &
  Pick<Language__ShowOutput, 'code'> &
  Record<string, unknown>;
export type MailTemplateCreateInput = MailTemplate__CreateInput &
  Required<Pick<MailTemplate__CreateInput, 'name' | 'label' | 'template_id' | 'user_visibility'>>;
/** Operational identifiers require a coordinated registry/template-source migration. */
export type MailTemplateUpdateInput = Pick<MailTemplate__UpdateInput, 'label' | 'user_visibility'>;
export type MailTemplateRecipient = Omit<MailTemplate__Recipient__ShowOutput, 'mail_recipient'> & {
  id: number;
  mail_recipient?: Partial<MailRecipient> | null;
};
export type MailTemplateTranslation = Omit<MailTemplate__Translation__ShowOutput, 'language'> & {
  id: number;
  language?: ResourceRef | null;
};
export type MailLog = Omit<MailLog__ShowOutput, 'user' | 'mail_template'> & {
  id: number;
  user?: ResourceRef | null;
  mail_template?: Partial<MailTemplate> | null;
};
export type MailTemplate = MailTemplate__ShowOutput & { id: number };
export type MailRecipient = MailRecipient__ShowOutput & { id: number };
export type Mailbox = Mailbox__ShowOutput & { id: number };
export type MailboxHandler = Mailbox__Handler__ShowOutput & { id: number };

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function id(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0;
}
function fields(
  value: unknown,
  strings: readonly string[],
  numbers: readonly string[] = [],
  booleans: readonly string[] = []
): boolean {
  return (
    record(value) &&
    id(value['id']) &&
    strings.every((key) => value[key] == null || typeof value[key] === 'string') &&
    numbers.every((key) => value[key] == null || (typeof value[key] === 'number' && Number.isFinite(value[key]))) &&
    booleans.every((key) => value[key] == null || typeof value[key] === 'boolean')
  );
}
function isReference(value: unknown): value is ResourceRef | null | undefined {
  return (
    value == null ||
    (record(value) &&
      (value['id'] == null || id(value['id'])) &&
      ['name', 'label', 'login', 'code', 'to', 'cc', 'bcc', 'template_id', 'user_visibility'].every(
        (key) => value[key] == null || typeof value[key] === 'string'
      ))
  );
}
function isMailTemplate(value: unknown): value is MailTemplate {
  return fields(value, ['name', 'label', 'template_id', 'user_visibility', 'created_at', 'updated_at']);
}
function mailTemplate(value: unknown): MailTemplate {
  if (!isMailTemplate(value)) throw new Error('Invalid MailTemplate identity or fields');
  return value;
}
function isMailRecipient(value: unknown): value is MailRecipient {
  return fields(value, ['label', 'to', 'cc', 'bcc']);
}
function recipient(value: unknown): MailRecipient {
  if (!isMailRecipient(value)) throw new Error('Invalid MailRecipient identity or fields');
  return value;
}
function isMailTemplateRecipient(value: unknown): value is MailTemplateRecipient {
  return fields(value, []) && record(value) && isReference(value['mail_recipient']);
}
function templateRecipient(value: unknown): MailTemplateRecipient {
  if (!isMailTemplateRecipient(value)) throw new Error('Invalid MailTemplateRecipient identity or fields');
  return value;
}
function isMailTemplateTranslation(value: unknown): value is MailTemplateTranslation {
  return (
    fields(value, [
      'from',
      'reply_to',
      'return_path',
      'subject',
      'text_plain',
      'text_html',
      'created_at',
      'updated_at',
    ]) &&
    record(value) &&
    isReference(value['language'])
  );
}
function translation(value: unknown): MailTemplateTranslation {
  if (!isMailTemplateTranslation(value)) throw new Error('Invalid MailTemplateTranslation identity or fields');
  return value;
}
function isMailLog(value: unknown): value is MailLog {
  return (
    fields(value, [
      'to',
      'cc',
      'bcc',
      'from',
      'reply_to',
      'return_path',
      'message_id',
      'in_reply_to',
      'references',
      'subject',
      'text_plain',
      'text_html',
      'created_at',
    ]) &&
    record(value) &&
    isReference(value['user']) &&
    isReference(value['mail_template'])
  );
}
function mailLog(value: unknown): MailLog {
  if (!isMailLog(value)) throw new Error('Invalid MailLog identity or fields');
  return value;
}
function isMailbox(value: unknown): value is Mailbox {
  return fields(value, ['label', 'server', 'user', 'created_at', 'updated_at'], ['port'], ['enable_ssl']);
}
function mailbox(value: unknown): Mailbox {
  if (!isMailbox(value)) throw new Error('Invalid Mailbox identity or fields');
  return value;
}
function isMailboxHandler(value: unknown): value is MailboxHandler {
  return fields(value, ['class_name', 'created_at', 'updated_at'], ['order'], ['continue']);
}
function handler(value: unknown): MailboxHandler {
  if (!isMailboxHandler(value)) throw new Error('Invalid MailboxHandler identity or fields');
  return value;
}

export async function fetchMailLogs(opts?: { limit?: number; fromId?: number }) {
  const params: MailLog__IndexInput = {};

  if (opts?.limit !== undefined) params['limit'] = opts.limit;
  if (opts?.fromId !== undefined) params['from_id'] = opts.fromId;

  const res = await (await getApi()).mail_log.index({ params });

  return narrowApiResult(res, (data) => expectArray<unknown>(data, 'mail records').map(mailLog), 'mail records');
}

export async function fetchMailLog(mailLogId: number) {
  const res = await (await getApi()).mail_log.show({ path: { mail_log_id: mailLogId } });
  return narrowApiResult(res, mailLog, 'mail_log.show');
}

export async function fetchMailTemplates(opts?: { limit?: number; fromId?: number }) {
  const params: MailTemplate__IndexInput = {};
  if (opts?.limit !== undefined) params['limit'] = opts.limit;
  if (opts?.fromId !== undefined) params['from_id'] = opts.fromId;

  const res = await (await getApi()).mail_template.index({ params });

  return narrowApiResult(res, (data) => expectArray<unknown>(data, 'mail records').map(mailTemplate), 'mail records');
}

export async function fetchMailTemplate(mailTemplateId: number) {
  const res = await (await getApi()).mail_template.show({ path: { mail_template_id: mailTemplateId } });
  return narrowApiResult(res, mailTemplate, 'mail_template.show');
}

export async function createMailTemplate(payload: MailTemplateCreateInput) {
  const res = await (await getApi()).mail_template.create({ params: payload });
  return narrowApiResult(res, mailTemplate, 'mail_template.create');
}

export async function updateMailTemplate(mailTemplateId: number, payload: MailTemplateUpdateInput) {
  const mutableFields: MailTemplate__UpdateInput = {};
  if (payload.label !== undefined) mutableFields['label'] = payload.label;
  if (payload.user_visibility !== undefined) mutableFields['user_visibility'] = payload.user_visibility;

  const res = await (
    await getApi()
  ).mail_template.update({ path: { mail_template_id: mailTemplateId }, params: mutableFields });
  return narrowApiResult(res, mailTemplate, 'mail_template.update');
}

export async function fetchMailTemplateRecipients(mailTemplateId: number, opts?: { fromId?: number; limit?: number }) {
  const params: MailTemplate__Recipient__IndexInput = {};
  if (opts?.fromId !== undefined) params['from_id'] = opts.fromId;
  if (opts?.limit !== undefined) params['limit'] = opts.limit;

  const res = await (
    await getApi()
  ).mail_template.recipient.index({
    path: { mail_template_id: mailTemplateId },
    params,
    meta: { includes: 'mail_recipient' },
  });

  return narrowApiResult(
    res,
    (data) => expectArray<unknown>(data, 'mail records').map(templateRecipient),
    'mail records'
  );
}

export async function addMailTemplateRecipient(mailTemplateId: number, mailRecipientId: number) {
  const res = await (
    await getApi()
  ).mail_template.recipient.create({
    path: { mail_template_id: mailTemplateId },
    params: { mail_recipient: mailRecipientId },
  });
  return narrowApiResult(res, templateRecipient, 'mail_template.recipient.create');
}

export async function deleteMailTemplateRecipient(mailTemplateId: number, mailRecipientId: number) {
  return (await getApi()).mail_template.recipient.delete({
    path: { mail_template_id: mailTemplateId, recipient_id: mailRecipientId },
  });
}

export async function fetchMailTemplateTranslations(
  mailTemplateId: number,
  opts?: { fromId?: number; limit?: number }
) {
  const params: MailTemplate__Translation__IndexInput = {};
  if (opts?.fromId !== undefined) params['from_id'] = opts.fromId;
  if (opts?.limit !== undefined) params['limit'] = opts.limit;

  const res = await (
    await getApi()
  ).mail_template.translation.index({
    path: { mail_template_id: mailTemplateId },
    params,
    meta: { includes: 'language' },
  });

  return narrowApiResult(res, (data) => expectArray<unknown>(data, 'mail records').map(translation), 'mail records');
}

export async function fetchMailTemplateTranslation(mailTemplateId: number, translationId: number) {
  const res = await (
    await getApi()
  ).mail_template.translation.show({
    path: { mail_template_id: mailTemplateId, translation_id: translationId },
    meta: { includes: 'language' },
  });
  return narrowApiResult(res, translation, 'mail_template.translation.show');
}

export async function createMailTemplateTranslation(
  mailTemplateId: number,
  payload: MailTemplate__Translation__CreateInput
) {
  const res = await (
    await getApi()
  ).mail_template.translation.create({ path: { mail_template_id: mailTemplateId }, params: payload });
  return narrowApiResult(res, translation, 'mail_template.translation.create');
}

export async function updateMailTemplateTranslation(
  mailTemplateId: number,
  translationId: number,
  payload: MailTemplate__Translation__UpdateInput
) {
  const res = await (
    await getApi()
  ).mail_template.translation.update({
    path: { mail_template_id: mailTemplateId, translation_id: translationId },
    params: payload,
  });
  return narrowApiResult(res, translation, 'mail_template.translation.update');
}

export async function deleteMailTemplateTranslation(mailTemplateId: number, translationId: number) {
  return (await getApi()).mail_template.translation.delete({
    path: { mail_template_id: mailTemplateId, translation_id: translationId },
  });
}

export async function fetchMailRecipients(opts?: { limit?: number; fromId?: number }) {
  const params: MailRecipient__IndexInput = {};
  if (opts?.limit !== undefined) params['limit'] = opts.limit;
  if (opts?.fromId !== undefined) params['from_id'] = opts.fromId;

  const res = await (await getApi()).mail_recipient.index({ params });

  return narrowApiResult(res, (data) => expectArray<unknown>(data, 'mail records').map(recipient), 'mail records');
}

export async function fetchMailRecipient(mailRecipientId: number) {
  const res = await (await getApi()).mail_recipient.show({ path: { mail_recipient_id: mailRecipientId } });
  return narrowApiResult(res, recipient, 'mail_recipient.show');
}

export async function createMailRecipient(payload: MailRecipient__CreateInput) {
  const res = await (await getApi()).mail_recipient.create({ params: payload });
  return narrowApiResult(res, recipient, 'mail_recipient.create');
}

export async function updateMailRecipient(mailRecipientId: number, payload: MailRecipient__UpdateInput) {
  const res = await (
    await getApi()
  ).mail_recipient.update({ path: { mail_recipient_id: mailRecipientId }, params: payload });
  return narrowApiResult(res, recipient, 'mail_recipient.update');
}

export async function fetchMailboxes(opts?: { limit?: number; fromId?: number; count?: boolean }) {
  const params: Mailbox__IndexInput = {};
  if (opts?.limit !== undefined) params['limit'] = opts.limit;
  if (opts?.fromId !== undefined) params['from_id'] = opts.fromId;

  const res = await (await getApi()).mailbox.index({ params, meta: opts?.count ? { count: true } : undefined });

  return narrowApiResult(res, (data) => expectArray<unknown>(data, 'mail records').map(mailbox), 'mail records');
}

export async function fetchMailbox(mailboxId: number) {
  const res = await (await getApi()).mailbox.show({ path: { mailbox_id: mailboxId } });
  return narrowApiResult(res, mailbox, 'mailbox.show');
}

export async function createMailbox(payload: Mailbox__CreateInput) {
  const res = await (await getApi()).mailbox.create({ params: payload });
  return narrowApiResult(res, mailbox, 'mailbox.create');
}

export async function updateMailbox(mailboxId: number, payload: Mailbox__UpdateInput) {
  const params: Mailbox__UpdateInput = {};
  if (payload.label !== undefined) params['label'] = payload.label;
  if (payload.server !== undefined) params['server'] = payload.server;
  if (payload.port !== undefined) params['port'] = payload.port;
  if (payload.user !== undefined) params['user'] = payload.user;
  if (payload.enable_ssl !== undefined) params['enable_ssl'] = payload.enable_ssl;

  // Do not accidentally clear password.
  const pwd = payload.password !== undefined ? String(payload.password) : '';
  if (pwd.trim()) params['password'] = pwd;

  const res = await (await getApi()).mailbox.update({ path: { mailbox_id: mailboxId }, params });
  return narrowApiResult(res, mailbox, 'mailbox.update');
}

export async function deleteMailbox(mailboxId: number) {
  return (await getApi()).mailbox.delete({ path: { mailbox_id: mailboxId } });
}

export async function fetchMailboxHandlers(mailboxId: number, opts?: { limit?: number; fromId?: number }) {
  const params: Mailbox__Handler__IndexInput = {};
  if (opts?.limit !== undefined) params['limit'] = opts.limit;
  if (opts?.fromId !== undefined) params['from_id'] = opts.fromId;

  const res = await (await getApi()).mailbox.handler.index({ path: { mailbox_id: mailboxId }, params });

  return narrowApiResult(res, (data) => expectArray<unknown>(data, 'mail records').map(handler), 'mail records');
}

export async function createMailboxHandler(mailboxId: number, payload: Mailbox__Handler__CreateInput) {
  const res = await (await getApi()).mailbox.handler.create({ path: { mailbox_id: mailboxId }, params: payload });
  return narrowApiResult(res, handler, 'mailbox.handler.create');
}

export async function updateMailboxHandler(
  mailboxId: number,
  handlerId: number,
  payload: Mailbox__Handler__UpdateInput
) {
  const res = await (
    await getApi()
  ).mailbox.handler.update({ path: { mailbox_id: mailboxId, handler_id: handlerId }, params: payload });
  return narrowApiResult(res, handler, 'mailbox.handler.update');
}

export async function deleteMailboxHandler(mailboxId: number, handlerId: number) {
  return (await getApi()).mailbox.handler.delete({ path: { mailbox_id: mailboxId, handler_id: handlerId } });
}
