import type { NewsLog__ShowOutput } from 'vpsadmin-typescript-client';

export type NewsLogRecord = NewsLog__ShowOutput & { id: number } & Record<string, unknown>;
export type PublicNewsLog = NewsLogRecord & { message: string };

function isNewsLogRecord(value: unknown): value is NewsLogRecord {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const row = value as Record<string, unknown>;
  const strings = [
    'message',
    'cs_message',
    'en_message',
    'published_at',
    'created_at',
    'updated_at',
  ] satisfies readonly (keyof NewsLog__ShowOutput)[];
  return (
    typeof row['id'] === 'number' &&
    Number.isSafeInteger(row['id']) &&
    row['id'] > 0 &&
    strings.every((key) => row[key] === undefined || row[key] === null || typeof row[key] === 'string')
  );
}

export function narrowNewsLogRecord(value: unknown): NewsLogRecord {
  if (!isNewsLogRecord(value)) throw new Error('Invalid news identity or fields');
  return value;
}

export function narrowPublicNewsLog(value: unknown): PublicNewsLog {
  const row = narrowNewsLogRecord(value);
  if (typeof row.message !== 'string') throw new Error('Missing localized news message');
  return { ...row, message: row.message };
}
