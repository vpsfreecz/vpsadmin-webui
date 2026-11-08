export function safeInt(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.floor(value);
  if (typeof value === 'string') {
    const n = Number(value);
    if (Number.isFinite(n)) return Math.floor(n);
  }
  return undefined;
}

export function formatMoneyLike(amount: number | null | undefined, language?: 'cs' | 'en'): string {
  if (amount == null) return '—';
  return new Intl.NumberFormat(language === 'cs' ? 'cs-CZ' : language, { maximumFractionDigits: 0 }).format(amount);
}
