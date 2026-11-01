import type {
  DnsZone__ShowOutput,
  Node__ShowOutput,
  Environment__ShowOutput,
  HostIpAddress__IndexOutput,
  IpAddress__IndexOutput,
  Location__ShowOutput,
  Network__IndexOutput,
  NetworkInterface__IndexOutput,
  User__ShowOutput,
  Vps__IndexOutput,
} from 'vpsadmin-typescript-client';

export type DnsReference = Pick<DnsZone__ShowOutput, 'id' | 'name' | 'label'> &
  Pick<User__ShowOutput, 'login' | 'full_name'> &
  Pick<Node__ShowOutput, 'domain_name'> &
  Record<string, unknown>;
export type OwnerReference = Pick<User__ShowOutput, 'id' | 'login' | 'full_name'> & Record<string, unknown>;
export type NodeReference = Pick<Node__ShowOutput, 'id' | 'name' | 'domain_name'> & {
  location?: LocationReference | null;
} & Record<string, unknown>;
export type VpsReference = Pick<Vps__IndexOutput[number], 'id' | 'hostname'> & {
  user?: OwnerReference | null;
  node?: NodeReference | null;
} & Record<string, unknown>;
export type LocationReference = Pick<Location__ShowOutput, 'id' | 'label' | 'domain'> & {
  environment?: Pick<Environment__ShowOutput, 'id' | 'label'> | null;
} & Record<string, unknown>;
export type NetworkReference = Omit<Network__IndexOutput[number], 'primary_location'> & {
  primary_location?: LocationReference | null;
} & Record<string, unknown>;
export type InterfaceReference = Omit<NetworkInterface__IndexOutput[number], 'vps'> & {
  vps?: VpsReference | null;
} & Record<string, unknown>;
export type IpReference = Omit<
  IpAddress__IndexOutput[number],
  'network' | 'network_interface' | 'user' | 'charged_environment' | 'route_via'
> & {
  network?: NetworkReference | null;
  network_interface?: InterfaceReference | null;
  user?: OwnerReference | null;
  charged_environment?: Pick<Environment__ShowOutput, 'id' | 'label'> | null;
  route_via?: Pick<HostIpAddress__IndexOutput[number], 'id' | 'addr'> | null;
} & Record<string, unknown>;

export function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
export function isId(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0;
}
export function optionalId(value: unknown): boolean {
  return value === null || value === undefined || isId(value);
}
export function fields(
  value: Record<string, unknown>,
  strings: readonly string[] = [],
  numbers: readonly string[] = [],
  booleans: readonly string[] = []
): boolean {
  return (
    strings.every((key) => value[key] == null || typeof value[key] === 'string') &&
    numbers.every((key) => value[key] == null || (typeof value[key] === 'number' && Number.isFinite(value[key]))) &&
    booleans.every((key) => value[key] == null || typeof value[key] === 'boolean')
  );
}
export function optional(value: unknown, guard: (value: unknown) => boolean): boolean {
  return value === undefined || value === null || guard(value);
}
export function reference(value: unknown): boolean {
  return (
    isRecord(value) &&
    optionalId(value['id']) &&
    fields(value, ['name', 'label', 'login', 'full_name', 'hostname', 'domain_name', 'addr'])
  );
}
export function locationReference(value: unknown): value is LocationReference {
  return (
    isRecord(value) &&
    optionalId(value['id']) &&
    fields(value, ['label', 'domain']) &&
    optional(value['environment'], reference)
  );
}
export function networkReference(value: unknown): value is NetworkReference {
  return (
    isRecord(value) &&
    optionalId(value['id']) &&
    fields(
      value,
      ['address', 'label', 'purpose', 'role', 'split_access'],
      [
        'assigned',
        'available_to_users',
        'ip_version',
        'owned',
        'owned_unassigned',
        'prefix',
        'size',
        'split_prefix',
        'taken',
        'used',
      ],
      ['enabled', 'managed']
    ) &&
    optional(value['primary_location'], locationReference)
  );
}
export function interfaceReference(value: unknown): value is InterfaceReference {
  return (
    isRecord(value) &&
    optionalId(value['id']) &&
    fields(value, ['name', 'mac', 'type'], ['max_rx', 'max_tx'], ['enable']) &&
    optional(value['vps'], vpsReference)
  );
}
export function ipReference(value: unknown): value is IpReference {
  return (
    isRecord(value) &&
    optionalId(value['id']) &&
    fields(value, ['addr'], ['prefix', 'size']) &&
    optional(value['network'], networkReference) &&
    optional(value['network_interface'], interfaceReference) &&
    optional(value['user'], reference) &&
    optional(value['charged_environment'], reference) &&
    optional(value['route_via'], reference)
  );
}

export function vpsReference(value: unknown): value is VpsReference {
  return (
    isRecord(value) &&
    optionalId(value['id']) &&
    fields(value, ['hostname']) &&
    optional(value['user'], reference) &&
    optional(value['node'], nodeReference)
  );
}
function nodeReference(value: unknown): value is NodeReference {
  return (
    isRecord(value) &&
    optionalId(value['id']) &&
    fields(value, ['name', 'domain_name']) &&
    optional(value['location'], locationReference)
  );
}
