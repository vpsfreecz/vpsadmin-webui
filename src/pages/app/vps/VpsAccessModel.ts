import type { VpsPublicKey, VpsSshHostKey } from '../../../lib/api/vpsAccess';

export interface DuplicatePublicKeyGroup {
  identity: string;
  keys: VpsPublicKey[];
}

function valueString(value: unknown): string | undefined {
  if (value === undefined || value === null) return undefined;
  const s = String(value).trim();
  return s ? s : undefined;
}

function normalizedIdentity(value: unknown): string | undefined {
  const s = valueString(value);
  return s ? s.toLowerCase().replace(/\s+/g, ' ') : undefined;
}

export function publicKeyDuplicateIdentity(key: VpsPublicKey): string | null {
  return normalizedIdentity(key.fingerprint) ?? normalizedIdentity(key.key) ?? null;
}

export function findDuplicatePublicKeyGroups(keys: VpsPublicKey[]): DuplicatePublicKeyGroup[] {
  const byIdentity = new Map<string, VpsPublicKey[]>();

  for (const key of keys) {
    const identity = publicKeyDuplicateIdentity(key);
    if (!identity) continue;
    const group = byIdentity.get(identity) ?? [];
    group.push(key);
    byIdentity.set(identity, group);
  }

  return Array.from(byIdentity.entries())
    .filter(([, group]) => group.length > 1)
    .map(([identity, group]) => ({ identity, keys: group }));
}

export function hostKeyDisplayType(key: VpsSshHostKey): string {
  return valueString(key.algorithm) ?? '—';
}

export function hostKeyDisplayFingerprint(key: VpsSshHostKey): string {
  return valueString(key.fingerprint) ?? '—';
}

export function hostKeyMaterial(key: VpsSshHostKey): string {
  return ''; // The API exposes host-key fingerprints, not public-key material.
}

export function hostKeyMeta(key: VpsSshHostKey): string {
  const parts = [valueString(key.bits), valueString(key.created_at)].filter((value): value is string => Boolean(value));
  return parts.length > 0 ? parts.join(' · ') : '—';
}
