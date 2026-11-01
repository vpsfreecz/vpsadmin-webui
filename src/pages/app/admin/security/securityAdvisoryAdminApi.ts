import {
  createSecurityAdvisoryCve,
  deleteSecurityAdvisoryCve,
  fetchSecurityAdvisoryAffectedUsers,
  fetchSecurityAdvisoryAffectedVps,
  fetchSecurityAdvisoryCves,
  fetchSecurityAdvisory,
  fetchSecurityAdvisoryNodeStatuses,
  type SecurityAdvisory,
  type SecurityAdvisoryMutationGuards,
  type SecurityAdvisoryAffectedUser,
  type SecurityAdvisoryAffectedVps,
  type SecurityAdvisoryCve,
} from '../../../../lib/api/securityAdvisories';
import {
  type AdvisoryAction,
  AdvisoryWriteError,
  advisoryGuards,
  nextAdvisoryRevision,
} from '../../../../lib/api/securityAdvisoryMutations';

export async function fetchAdvisoryEditSnapshot(id: number) {
  const before = (await fetchSecurityAdvisory(id)).data;
  const guards = advisoryGuards(before);
  const cves = await fetchAllSecurityAdvisoryCvesForAdmin(id);
  const statuses = (await fetchSecurityAdvisoryNodeStatuses(id, { limit: 1000, includes: 'node' })).data;
  if (statuses.length >= 1000) throw new AdvisoryWriteError('snapshot');
  const after = (await fetchSecurityAdvisory(id)).data;
  const finalGuards = advisoryGuards(after);
  if (
    guards.expected_content_revision !== finalGuards.expected_content_revision ||
    guards.expected_state !== finalGuards.expected_state
  ) {
    throw new AdvisoryWriteError('snapshot');
  }
  return { advisory: before, cves, statuses, guards };
}

export function advisoryCveActions(existing: SecurityAdvisoryCve[], desired: string[]): AdvisoryAction[] {
  const current = new Set(existing.map((row) => row.cve_id));
  const wanted = new Set(desired);
  return [
    ...(desired.some((cve) => !current.has(cve)) ? [{ resource: 'cve' as const, action: 'create' as const }] : []),
    ...(existing.some((row) => !wanted.has(String(row.cve_id)))
      ? [{ resource: 'cve' as const, action: 'delete' as const }]
      : []),
  ];
}

const MAX_CURSOR_PAGES = 1_000;

async function collectCursorPages<T extends { id: number }>(
  fetchPage: (fromId: number | undefined) => Promise<{ data: T[] }>,
  pageSize: number
): Promise<T[]> {
  const rows: T[] = [];
  const seenIds = new Set<number>();
  const seenCursors = new Set<number>();
  let cursor: number | undefined;

  for (let page = 0; page < MAX_CURSOR_PAGES; page += 1) {
    const result = await fetchPage(cursor);
    for (const row of result.data) {
      if (seenIds.has(row.id)) continue;
      seenIds.add(row.id);
      rows.push(row);
    }

    if (result.data.length < pageSize) return rows;
    const nextCursor = result.data.at(-1)?.id;
    if (!nextCursor || seenCursors.has(nextCursor)) {
      throw new Error('Security advisory relation pagination stalled before all rows were loaded');
    }
    seenCursors.add(nextCursor);
    cursor = nextCursor;
  }

  throw new Error('Security advisory cursor pagination exceeded its safety limit');
}

export function fetchAllSecurityAdvisoryCvesForAdmin(securityAdvisoryId: number): Promise<SecurityAdvisoryCve[]> {
  return collectCursorPages(
    (fromId) =>
      fetchSecurityAdvisoryCves({
        securityAdvisoryId,
        limit: 100,
        fromId,
      }),
    100
  );
}

export function fetchAllSecurityAdvisoryAffectedUsersForAdmin(
  securityAdvisoryId: number
): Promise<SecurityAdvisoryAffectedUser[]> {
  return collectCursorPages(
    (fromId) =>
      fetchSecurityAdvisoryAffectedUsers({
        securityAdvisoryId,
        limit: 1_000,
        fromId,
        includes: 'user',
      }),
    1_000
  );
}

export function fetchAllSecurityAdvisoryAffectedVpsForAdmin(
  securityAdvisoryId: number
): Promise<SecurityAdvisoryAffectedVps[]> {
  return collectCursorPages(
    (fromId) =>
      fetchSecurityAdvisoryAffectedVps({
        securityAdvisoryId,
        limit: 1_000,
        fromId,
        includes: 'vps,user,environment,location,node',
      }),
    1_000
  );
}

export class AdvisoryChildSequenceError extends Error {
  constructor(
    readonly completed: readonly string[],
    readonly remaining: readonly string[],
    readonly originalError: unknown
  ) {
    super('Advisory child sequence stopped', { cause: originalError });
    this.name = 'AdvisoryChildSequenceError';
  }
}

export async function requireAdvisorySnapshot(
  id: number,
  guards: SecurityAdvisoryMutationGuards
): Promise<SecurityAdvisory> {
  const current = (await fetchSecurityAdvisory(id)).data;
  const observed = advisoryGuards(current);
  if (
    current.id !== id ||
    observed.expected_state !== guards.expected_state ||
    observed.expected_content_revision !== guards.expected_content_revision
  ) {
    throw new AdvisoryWriteError('snapshot');
  }
  return current;
}

/** Add before removing; preserve accepted sends even when their read-back fails. */
export async function reconcileSecurityAdvisoryCves(
  securityAdvisoryId: number,
  existing: SecurityAdvisoryCve[],
  desiredCves: string[],
  guards: SecurityAdvisoryMutationGuards
): Promise<number> {
  const wanted = new Set(desiredCves.map((item) => item.trim().toUpperCase()).filter(Boolean));
  const current = new Map(
    existing
      .filter((item) => typeof item.cve_id === 'string' && item.cve_id.trim())
      .map((item) => [String(item.cve_id).trim().toUpperCase(), item])
  );
  const tasks = [
    ...[...wanted]
      .filter((cve) => !current.has(cve))
      .map((cve) => ({
        label: '+' + cve,
        write: (revision: number) =>
          createSecurityAdvisoryCve({
            security_advisory: securityAdvisoryId,
            cve_id: cve,
            ...guards,
            expected_content_revision: revision,
          }),
      })),
    ...[...current]
      .filter(([cve]) => !wanted.has(cve))
      .map(([cve, item]) => ({
        label: '-' + cve,
        write: (revision: number) =>
          deleteSecurityAdvisoryCve(item.id, { ...guards, expected_content_revision: revision }),
      })),
  ];
  let revision = guards.expected_content_revision;
  try {
    await requireAdvisorySnapshot(securityAdvisoryId, guards);
  } catch (cause) {
    throw new AdvisoryChildSequenceError([], desiredCves, cause);
  }
  const completed: string[] = [];
  for (let index = 0; index < tasks.length; index += 1) {
    const task = tasks[index];
    if (!task) continue;
    try {
      await task.write(revision);
      completed.push(task.label);
      revision = nextAdvisoryRevision(revision);
      await requireAdvisorySnapshot(securityAdvisoryId, { ...guards, expected_content_revision: revision });
    } catch (cause) {
      throw new AdvisoryChildSequenceError(
        completed,
        tasks.slice(index + (completed.includes(task.label) ? 1 : 0)).map((item) => item.label),
        cause
      );
    }
  }
  return revision;
}
