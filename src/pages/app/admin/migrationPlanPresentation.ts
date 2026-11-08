import type { ComponentProps } from 'react';

import type { Badge } from '../../../components/ui/Badge';

export function planBadge(
  t: (key: any) => string,
  state: unknown
): { variant: ComponentProps<typeof Badge>['variant']; label: string } {
  const st = String(state ?? 'unknown');
  if (st === 'done') return { variant: 'ok', label: t('migration_plan.state.done') };
  if (st === 'running') return { variant: 'black', label: t('migration_plan.state.running') };
  if (st === 'staged') return { variant: 'neutral', label: t('migration_plan.state.staged') };
  if (st === 'cancelled') return { variant: 'neutral', label: t('migration_plan.state.cancelled') };
  if (st === 'cancelling') return { variant: 'warn', label: t('migration_plan.state.cancelling') };
  if (st === 'failing') return { variant: 'warn', label: t('migration_plan.state.failing') };
  if (st === 'error') return { variant: 'danger', label: t('migration_plan.state.error') };
  return { variant: 'neutral', label: t('migration_plan.state.unknown') };
}

export function refLabel(ref: any): string {
  if (!ref) return '—';
  if (typeof ref === 'string') return ref;
  if (typeof ref === 'number') return String(ref);
  if (typeof ref === 'object') {
    if (typeof ref.label === 'string' && ref.label) return ref.label;
    if (typeof ref.name === 'string' && ref.name) return ref.name;
    if (typeof ref.domain_name === 'string' && ref.domain_name) return ref.domain_name;
    if (typeof ref.login === 'string' && ref.login) return ref.login;
    if (typeof ref.id === 'number') return `#${ref.id}`;
  }
  return String(ref);
}

export function refId(ref: any): number | undefined {
  const raw = ref?.id;
  const id = typeof raw === 'number' ? raw : Number(raw);
  return Number.isFinite(id) && id > 0 ? id : undefined;
}

function locationLabel(loc: any): string | undefined {
  if (!loc) return undefined;
  if (typeof loc === 'string') return loc;
  if (typeof loc === 'number') return String(loc);
  if (typeof loc === 'object') {
    if (typeof loc.label === 'string' && loc.label) return loc.label;
    if (typeof loc.name === 'string' && loc.name) return loc.name;
    if (typeof loc.id === 'number') return `#${loc.id}`;
  }
  return undefined;
}

export function nodeOptionLabel(node: any): { id: number; label: string; location?: string } | null {
  const id = typeof node?.id === 'number' ? node.id : Number(node?.id);
  if (!Number.isFinite(id) || id <= 0) return null;

  const label = String(node?.domain_name ?? node?.name ?? node?.fqdn ?? `#${id}`);
  const location = locationLabel(node?.location);
  return { id, label, location };
}
