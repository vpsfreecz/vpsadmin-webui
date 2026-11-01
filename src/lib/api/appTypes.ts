import type { Location__ShowOutput } from 'vpsadmin-typescript-client';

/** Generic UI reference, supplied only after its owning domain validates identity. */
export interface ResourceRef {
  id: number;
  label?: string;
  name?: string;
  [key: string]: unknown;
}

/** A concrete location view; partial associations use their own generated references. */
export type Location = Location__ShowOutput & { id: number } & Record<string, unknown>;

function isLocation(value: unknown): value is Location {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const row = value as Record<string, unknown>;
  if (typeof row['id'] !== 'number' || !Number.isSafeInteger(row['id']) || row['id'] <= 0) return false;
  const strings = ['label', 'description', 'remote_console_server', 'domain', 'maintenance_lock', 'maintenance_lock_reason'] as const;
  if (!strings.every(key => row[key] == null || typeof row[key] === 'string')) return false;
  if (row['has_ipv6'] != null && typeof row['has_ipv6'] !== 'boolean') return false;
  const environment = row['environment'];
  return environment == null || (typeof environment === 'object' && !Array.isArray(environment));
}

export function narrowLocation(value: unknown): Location {
  if (!isLocation(value)) throw new Error('Invalid location identity or fields');
  return value;
}
