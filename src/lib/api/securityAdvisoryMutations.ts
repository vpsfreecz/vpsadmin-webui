import { haveApiCall } from './haveapi';
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
  if (
    !Number.isSafeInteger(advisory.content_revision) ||
    Number(advisory.content_revision) < 0 ||
    !['draft', 'published', 'retracted'].includes(String(advisory.state))
  ) {
    throw new AdvisoryWriteError('revision');
  }
  return {
    expected_content_revision: Number(advisory.content_revision),
    expected_state: advisory.state as SecurityAdvisoryMutationGuards['expected_state'],
  };
}

export type AdvisoryAction = { path: string; method: 'POST' | 'PUT' | 'DELETE'; state?: boolean; revision?: boolean };

/** Validate every effective action before a multi-request workflow writes. */
export async function requireAdvisoryActions(actions: AdvisoryAction[], guards?: SecurityAdvisoryMutationGuards) {
  const root = await haveApiCall<{ resources?: Record<string, unknown> }>({ method: 'OPTIONS', path: '/' });
  for (const action of actions) {
    const nested = action.path.includes('/node_statuses');
    const resourceName = action.path.startsWith('/security_advisory_cves')
      ? 'security_advisory_cve'
      : 'security_advisory';
    let resource = root.data?.resources?.[resourceName] as
      { actions?: Record<string, unknown>; resources?: Record<string, unknown> } | undefined;
    if (nested) resource = resource?.resources?.['node_status'] as typeof resource;
    const verb = action.path.endsWith('/publish')
      ? 'publish'
      : action.path.endsWith('/retract')
        ? 'retract'
        : action.method === 'POST'
          ? 'create'
          : action.method === 'PUT'
            ? 'update'
            : 'delete';
    const metadata = resource?.actions?.[verb] as { input?: { parameters?: Record<string, unknown> } } | undefined;
    const parameters = metadata?.input?.parameters;
    const revision = parameters?.['expected_content_revision'] as { type?: unknown } | undefined;
    const state = parameters?.['expected_state'] as
      | {
          type?: unknown;
          validators?: { include?: { values?: unknown } };
        }
      | undefined;
    const values = state?.validators?.include?.values;
    const choices =
      Array.isArray(values) && values.every((value) => typeof value === 'string')
        ? values
        : values && typeof values === 'object' && Object.values(values).every((label) => typeof label === 'string')
          ? Object.keys(values)
          : [];
    if (
      !metadata ||
      (action.revision !== false && revision?.type !== 'Integer') ||
      (action.state !== false && (state?.type !== 'String' || !choices.includes(guards?.expected_state ?? 'draft')))
    ) {
      throw new AdvisoryWriteError('capability');
    }
    if (verb === 'retract' || (resourceName === 'security_advisory' && !nested && verb === 'delete')) {
      await haveApiCall({ method: 'OPTIONS', path: `${action.path}?method=${action.method}` });
    }
  }
}

export function nextAdvisoryRevision(previous: number, returned?: number): number {
  if (returned !== undefined && returned !== previous + 1) {
    throw new AdvisoryWriteError('concurrent');
  }
  return previous + 1;
}
