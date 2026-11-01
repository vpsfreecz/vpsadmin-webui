import type {
  Environment__ShowOutput,
  User__ShowOutput,
  Node__ShowOutput,
  Vps__ShowOutput,
} from 'vpsadmin-typescript-client';

/** Partial included references remain nullable and need no identity until an action consumes it. */
export function isOperationsRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
export type OperationsReference = Pick<Environment__ShowOutput, 'id' | 'label' | 'description' | 'domain'> &
  Pick<User__ShowOutput, 'login' | 'full_name'> &
  Pick<Node__ShowOutput, 'name' | 'domain_name' | 'fqdn'> &
  Pick<Vps__ShowOutput, 'hostname'> & { api_ip_addr?: string | null; [k: string]: unknown };
export function isOperationsReference(value: unknown): value is OperationsReference {
  return (
    isOperationsRecord(value) &&
    (value['id'] === undefined ||
      value['id'] === null ||
      (typeof value['id'] === 'number' && Number.isSafeInteger(value['id']) && value['id'] > 0)) &&
    [
      'label',
      'description',
      'domain',
      'login',
      'full_name',
      'name',
      'domain_name',
      'fqdn',
      'hostname',
      'api_ip_addr',
    ].every((key) => value[key] === undefined || value[key] === null || typeof value[key] === 'string')
  );
}
