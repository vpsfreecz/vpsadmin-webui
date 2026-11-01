import type { NewsLog__CreateInput, NewsLog__UpdateInput } from 'vpsadmin-typescript-client';
import { expectArray } from './apiErrors';
import { narrowApiResult } from './apiOutput';
import { narrowNewsLogRecord, type NewsLogRecord } from './newsLogViews';
import { getApi } from './sdk';

export type NewsLog = NewsLogRecord;

export async function fetchNewsLogs(opts?: { since?: string }) {
  const res = await (await getApi()).news_log.index({ params: { since: opts?.since || undefined } });
  return narrowApiResult(res, (data) => expectArray<unknown>(data, 'news logs').map(narrowNewsLogRecord), 'news logs');
}

export async function createNewsLog(payload: NewsLog__CreateInput) {
  const res = await (await getApi()).news_log.create({ params: payload });
  return narrowApiResult(res, narrowNewsLogRecord, 'news create');
}

export async function updateNewsLog(id: number, payload: NewsLog__UpdateInput) {
  const res = await (await getApi()).news_log.update({ path: { news_log_id: id }, params: payload });
  return narrowApiResult(res, narrowNewsLogRecord, 'news update');
}

export async function deleteNewsLog(id: number) {
  return (await getApi()).news_log.delete({ path: { news_log_id: id } });
}
