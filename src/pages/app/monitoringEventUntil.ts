export type UntilPreset = 'forever' | '1h' | '6h' | '1d' | '1w' | 'custom';

export function untilIso(preset: UntilPreset, customLocal: string): { iso?: string; valid: boolean } {
  if (preset === 'forever') return { iso: undefined, valid: true };

  const now = Date.now();
  const ms =
    preset === '1h'
      ? 60 * 60 * 1000
      : preset === '6h'
        ? 6 * 60 * 60 * 1000
        : preset === '1d'
          ? 24 * 60 * 60 * 1000
          : preset === '1w'
            ? 7 * 24 * 60 * 60 * 1000
            : 0;

  if (preset !== 'custom') {
    return { iso: new Date(now + ms).toISOString(), valid: true };
  }

  const t = customLocal.trim();
  if (!t) return { iso: undefined, valid: false };
  const d = new Date(t);
  if (Number.isNaN(d.getTime())) return { iso: undefined, valid: false };
  return { iso: d.toISOString(), valid: true };
}
