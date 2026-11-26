import { parsePositiveInt } from '../../../../lib/parse';

const unsupportedNetworkIndexParams = ['q', 'ip_version', 'role', 'managed'] as const;

export function normalizeLegacyNetworkSearch(searchParams: URLSearchParams): {
  changed: boolean;
  searchParams: URLSearchParams;
} {
  const next = new URLSearchParams(searchParams);

  for (const key of unsupportedNetworkIndexParams) {
    if (!next.has(key)) continue;
    next.delete(key);
  }

  // These were canonicalized by the former mirrored-filter effect. Keep
  // that URL behavior when filters read directly from the router.
  if (next.has('location')) {
    const location = parsePositiveInt(next.get('location'));
    if (location) next.set('location', String(location));
    else next.delete('location');
  }
  if (next.has('purpose')) {
    const purpose = (next.get('purpose') ?? '').trim();
    if (purpose === 'any' || purpose === 'vps' || purpose === 'export') next.set('purpose', purpose);
    else next.delete('purpose');
  }
  const changed = next.toString() !== searchParams.toString();

  if (changed) {
    next.delete('from_id');
    next.set('page', '1');
  }

  return { changed, searchParams: next };
}
