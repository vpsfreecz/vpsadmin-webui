import { getApi } from './sdk';
import type { SecurityAdvisory, SecurityAdvisoryMutationGuards } from './securityAdvisories';

const WRITE_ERRORS = {
  revision: 'Advisory writes require a compatible API with content revisions. Reload after upgrading the API.',
  capability: 'This API does not support guarded advisory changes. Upgrade the API before saving.',
  concurrent: 'The advisory revision changed unexpectedly. Reload and review before continuing.',
  snapshot: 'The advisory changed while loading. Reload and review before editing.',
} as const;
export class AdvisoryWriteError extends Error {
  constructor(public readonly kind: keyof typeof WRITE_ERRORS) {
    super(WRITE_ERRORS[kind]);
  }
}

export function advisoryGuards(advisory: SecurityAdvisory): SecurityAdvisoryMutationGuards {
  const revision = advisory.content_revision;
  const state = advisory.state;
  if (
    typeof revision !== 'number' ||
    !Number.isSafeInteger(revision) ||
    revision < 0 ||
    (state !== 'draft' && state !== 'published' && state !== 'retracted')
  ) {
    throw new AdvisoryWriteError('revision');
  }
  return { expected_content_revision: revision, expected_state: state };
}

type ChildAction = 'create' | 'update' | 'delete';
export type AdvisoryAction =
  | { resource: 'advisory'; action: 'create' | 'update' | 'publish' }
  | { resource: 'advisory'; action: 'retract' | 'delete'; id: number }
  | { resource: 'cve' | 'node_status'; action: ChildAction };

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function field(value: unknown, key: string): unknown {
  return record(value) ? value[key] : undefined;
}

function validateAction(root: unknown, action: AdvisoryAction, selectedState: string) {
  const resources = field(root, 'resources');
  const parent = field(resources, 'security_advisory');
  const resource =
    action.resource === 'cve'
      ? field(resources, 'security_advisory_cve')
      : action.resource === 'node_status'
        ? field(field(parent, 'resources'), 'node_status')
        : parent;
  const metadata = field(field(resource, 'actions'), action.action);
  const params = field(field(metadata, 'input'), 'parameters');
  const revision = field(params, 'expected_content_revision');
  const state = field(params, 'expected_state');
  const values = field(field(field(state, 'validators'), 'include'), 'values');
  const choices =
    Array.isArray(values) && values.every((value) => typeof value === 'string')
      ? values
      : record(values) && Object.values(values).every((value) => typeof value === 'string')
        ? Object.keys(values)
        : [];
  const createParent = action.resource === 'advisory' && action.action === 'create';
  const publish = action.resource === 'advisory' && action.action === 'publish';
  if (
    !record(metadata) ||
    (!createParent && field(revision, 'type') !== 'Integer') ||
    (!createParent && !publish && (field(state, 'type') !== 'String' || !choices.includes(selectedState)))
  ) {
    throw new AdvisoryWriteError('capability');
  }
}

/** Live application capability policy; generated bindings own every request. */
export async function requireAdvisoryActions(actions: AdvisoryAction[], guards?: SecurityAdvisoryMutationGuards) {
  const api = await getApi();
  const root = await api.describe();
  const selectedState = guards?.expected_state ?? 'draft';
  // Draft synchronization requires the entire guarded child contract before
  // the first write, even when this edit happens to use only one child action.
  if (selectedState === 'draft') {
    for (const resource of ['cve', 'node_status'] as const) {
      for (const action of ['create', 'update', 'delete'] as const) {
        validateAction(root.data, { resource, action }, selectedState);
      }
    }
  }
  for (const action of actions) {
    validateAction(root.data, action, selectedState);
    if (action.resource === 'advisory' && action.action === 'retract') {
      await api.security_advisory.retract.describe({ path: { security_advisory_id: action.id } });
    } else if (action.resource === 'advisory' && action.action === 'delete') {
      await api.security_advisory.delete.describe({ path: { security_advisory_id: action.id } });
    }
  }
}

export function nextAdvisoryRevision(previous: number, returned?: number | null): number {
  if (returned !== undefined && returned !== previous + 1) {
    throw new AdvisoryWriteError('concurrent');
  }
  return previous + 1;
}
