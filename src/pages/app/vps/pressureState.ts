import { pressureFilterKeys, type PressureFilterKey, type PressureFilters } from '../../../lib/api/vpsPressureModels';
import type { UserRole } from '../../../lib/roles';

/** Unlike uptime, a recorded duration must retain lower units above the threshold. */
export function pressureDuration(us: number | null, lang = 'en'): string {
  if (us === null || !Number.isSafeInteger(us) || us < 0) return '—';
  if (us > 0 && us < 1_000_000) return '<1s';
  const parts: string[] = [];
  let remaining = us;
  for (const [unit, label] of [
    [86_400_000_000, 'd'],
    [3_600_000_000, 'h'],
    [60_000_000, 'm'],
  ] as const) {
    const count = Math.floor(remaining / unit);
    if (count) parts.push(`${count}${label}`);
    remaining %= unit;
  }
  if (remaining || parts.length === 0)
    parts.push(
      `${(remaining / 1_000_000).toLocaleString(lang === 'cs' ? 'cs-CZ' : 'en', { useGrouping: false, maximumFractionDigits: 6 })}s`
    );
  return parts.join(' ');
}

export function exactPressureDuration(us: number, lang: string): string {
  return `${us.toLocaleString(lang === 'cs' ? 'cs-CZ' : 'en')} µs`;
}

/** Invalid or unsupported filters fail closed rather than becoming an unfiltered read. */
export function readPressureFilters(search: URLSearchParams, supported: readonly PressureFilterKey[]): PressureFilters {
  const filters: PressureFilters = {};
  for (const key of pressureFilterKeys) {
    const values = search.getAll(key);
    if (values.length === 0 || (values.length === 1 && values[0] === '')) continue;
    const value = values[0] ?? '';
    if (values.length !== 1 || !supported.includes(key) || !/^[1-9]\d*$/.test(value))
      throw new Error('Invalid pressure filter');
    const id = Number(value);
    if (!Number.isSafeInteger(id)) throw new Error('Invalid pressure filter');
    filters[key] = id;
  }
  return filters;
}

export function applyPressureFilters(search: URLSearchParams, values: Record<string, string>): URLSearchParams {
  const next = new URLSearchParams(search);
  for (const key of pressureFilterKeys) {
    next.delete(key);
    if (values[key]?.trim()) next.set(key, values[key].trim());
  }
  next.delete('offset');
  const limit = Number(next.get('limit'));
  if (
    next.has('limit') &&
    (next.getAll('limit').length > 1 || !Number.isSafeInteger(limit) || limit < 1 || limit > 100)
  )
    next.delete('limit');
  return next;
}

export function pressurePagination(search: URLSearchParams) {
  const read = (key: string, fallback: number, min: number, max: number) => {
    const values = search.getAll(key);
    if (values.length === 0) return fallback;
    const value = values[0] ?? '';
    const number = Number(value);
    if (
      values.length !== 1 ||
      !/^(0|[1-9]\d*)$/.test(value) ||
      !Number.isSafeInteger(number) ||
      number < min ||
      number > max
    )
      throw new Error('Invalid pressure pagination');
    return number;
  };
  return { offset: read('offset', 0, 0, Number.MAX_SAFE_INTEGER), limit: read('limit', 25, 1, 100) };
}

/** Privileged My view must constrain the API read, independently of visible columns. */
export function scopePressureFilters(
  filters: PressureFilters,
  mode: 'admin' | 'user',
  role: UserRole,
  userId: number | undefined,
  supported: readonly PressureFilterKey[]
): PressureFilters {
  if (mode === 'admin' && role === 'admin') return filters;
  if (filters.user !== undefined) throw new Error('Owner override is unavailable');
  if (role !== 'admin') return filters;
  if (!userId || !Number.isSafeInteger(userId) || !supported.includes('user'))
    throw new Error('Owned pressure scope is unavailable');
  return { ...filters, user: userId };
}
