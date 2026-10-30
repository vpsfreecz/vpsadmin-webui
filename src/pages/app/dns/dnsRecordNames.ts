export function normalizedRecordName(value: string): string {
  const trimmed = value.trim().toLowerCase();
  if (trimmed === '@') return '@';
  return trimmed.replace(/\.$/, '');
}

export function sameRecordName(a: string | undefined, b: string): boolean {
  return normalizedRecordName(String(a ?? '')) === normalizedRecordName(b);
}

export function isValidRecordName(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (trimmed.length > 253) return false;
  if (/\s/.test(trimmed)) return false;
  if (trimmed.includes('..')) return false;
  if (trimmed === '@' || trimmed === '*') return true;

  const withoutWildcard = trimmed.startsWith('*.') ? trimmed.slice(2) : trimmed;
  const labels = withoutWildcard.replace(/\.$/, '').split('.');
  return labels.every((label) => {
    if (!label || label.length > 63) return false;
    if (!/^[A-Za-z0-9_-]+$/.test(label)) return false;
    return !label.startsWith('-') && !label.endsWith('-');
  });
}

export function isValidDomainTarget(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 253) return false;
  if (/\s/.test(trimmed)) return false;
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed)) return false;
  if (trimmed === '@') return true;

  const labels = trimmed.replace(/\.$/, '').split('.');
  return labels.every((label) => {
    if (!label || label.length > 63) return false;
    if (!/^[A-Za-z0-9_-]+$/.test(label)) return false;
    return !label.startsWith('-') && !label.endsWith('-');
  });
}
