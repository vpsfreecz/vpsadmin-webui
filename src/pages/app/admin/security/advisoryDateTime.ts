import { isoToLocalInput, localInputToIso } from '../../../../lib/datetimeLocal';

export function advisoryDateInput(value: unknown): string {
  const local = isoToLocalInput(value);
  if (!local) return '';
  const date = new Date(String(value));
  return `${local}:${String(date.getSeconds()).padStart(2, '0')}.${String(date.getMilliseconds()).padStart(3, '0')}`;
}

export function advisoryDateValue(value: string, original?: string | null) {
  return value === advisoryDateInput(original) ? (original ?? null) : localInputToIso(value).iso;
}
