import { installHaveApiXhr } from '../../test/haveapiXhr';
import { afterEach, describe, expect, test, vi } from 'vitest';

import {
  datasetSnapshotRemovalAvailable,
  isStaleSnapshotRemovalPreview,
  previewDatasetSnapshotRemoval,
  removeDatasetSnapshots,
  datasetBackupCleanupAvailable,
  disableDatasetBackups,
  createDataset,
  createDatasetSnapshot,
  createSnapshotDownload,
  deleteDataset,
  fetchDatasetPlans,
  fetchDatasetSnapshots,
  fetchDatasets,
  fetchEnvironmentDatasetPlans,
  fetchSnapshotDownloads,
  findDatasetByName,
  rollbackDatasetSnapshot,
  updateDataset,
} from './datasets';
import { HaveApiError } from './apiErrors';
import { snapshotRemovalDescription, snapshotRemovalFixture } from '../../test/snapshotRemoval';
import serializedStale from '../../test/fixtures/snapshot-removal-stale.json';

function setMockRuntime() {
  window.vpsAdmin = {
    api: { url: 'https://api.example.test', version: 'v7.0' },
    description: { meta: { namespace: '_meta' } },
  };
}

function mockFetchOk(response: unknown) {
  return vi.fn(async (..._args: Parameters<typeof fetch>) =>
    new Response(JSON.stringify({ status: true, response }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  );
}

function firstFetchCall(fetchMock: ReturnType<typeof mockFetchOk>): Parameters<typeof fetch> {
  return fetchMock.mock.calls[0]! as Parameters<typeof fetch>;
}

afterEach(() => {
  vi.unstubAllGlobals();
  window.vpsAdmin = undefined;
});

describe('snapshot removal capability and stale-review boundary', () => {
  test('requires both methods, blocking semantics, all inputs and all preview outputs', () => {
    expect(datasetSnapshotRemovalAvailable(snapshotRemovalDescription())).toBe(true);
    expect(datasetSnapshotRemovalAvailable({})).toBe(false);
    for (const name of ['preview_snapshot_removal', 'remove_snapshots'] as const) {
      const missing = snapshotRemovalDescription();
      delete (missing.resources.dataset.actions as Partial<typeof missing.resources.dataset.actions>)[name];
      expect(datasetSnapshotRemovalAvailable(missing)).toBe(false);
      const wrongMethod = snapshotRemovalDescription();
      wrongMethod.resources.dataset.actions[name].method = 'GET';
      expect(datasetSnapshotRemovalAvailable(wrongMethod)).toBe(false);
      const wrongBlocking = snapshotRemovalDescription();
      wrongBlocking.resources.dataset.actions[name].blocking = !wrongBlocking.resources.dataset.actions[name].blocking;
      expect(datasetSnapshotRemovalAvailable(wrongBlocking)).toBe(false);
      for (const key of Object.keys(snapshotRemovalDescription().resources.dataset.actions[name].input.parameters)) {
        const partial = snapshotRemovalDescription();
        delete (partial.resources.dataset.actions[name].input.parameters as Record<string, unknown>)[key];
        expect(datasetSnapshotRemovalAvailable(partial)).toBe(false);
      }
    }
    for (const key of ['manifest_version', 'manifest_digest', 'manifest']) {
      const partial = snapshotRemovalDescription();
      delete (partial.resources.dataset.actions.preview_snapshot_removal.output.parameters as Record<string, unknown>)[key];
      expect(datasetSnapshotRemovalAvailable(partial)).toBe(false);
    }
    const wrongType = snapshotRemovalDescription();
    wrongType.resources.dataset.actions.remove_snapshots.input.parameters.recursive.type = 'String';
    expect(datasetSnapshotRemovalAvailable(wrongType)).toBe(false);
    const optionalDigest = snapshotRemovalDescription();
    optionalDigest.resources.dataset.actions.remove_snapshots.input.parameters.manifest_digest.required = false;
    expect(datasetSnapshotRemovalAvailable(optionalDigest)).toBe(false);
  });
  test('reads the stable marker only from a known rejection, never translated text or uncertainty', () => {
    const rejection = new HaveApiError({ status: false, message: 'Localized', errors: { manifest_digest: ['stale_preview'] } });
    expect(isStaleSnapshotRemovalPreview(rejection)).toBe(true);
    expect(isStaleSnapshotRemovalPreview(new Error('stale_preview'))).toBe(false);
    expect(isStaleSnapshotRemovalPreview(new HaveApiError({ status: false, message: 'stale_preview' }))).toBe(false);
    expect(isStaleSnapshotRemovalPreview(new HaveApiError(rejection.envelope, undefined, 503))).toBe(false);
    expect(isStaleSnapshotRemovalPreview(new HaveApiError({ ...rejection.envelope, status: true }))).toBe(false);
  });
});

describe('generated snapshot removal wire contract', () => {
  test.each([false, true])('uses generated preview without an async receipt and binds explicit options (%s)', async disable_plans => {
    setMockRuntime();
    const options = { recursive: true, disable_plans };
    const output = snapshotRemovalFixture(options);
    const wire = mockFetchOk({ dataset: output, _meta: {} });
    installHaveApiXhr(wire);
    const result = await previewDatasetSnapshotRemoval(42, options);
    const [url, init] = firstFetchCall(wire);
    expect(new URL(String(url)).pathname).toBe('/v7.0/datasets/42/preview_snapshot_removal');
    expect(init?.method).toBe('POST');
    expect(JSON.parse(String(init?.body))).toEqual({ dataset: options });
    expect(result.data).toEqual(output);
    expect(result.meta).toEqual({}); expect(result.httpStatus).toBe(200);
  });
  test.each(['root', 'options', 'missing-location', 'version'])('rejects an unusable preview (%s) while retaining the original receipt', async corrupt => {
    setMockRuntime(); const output = snapshotRemovalFixture();
    if (corrupt === 'root') output.manifest.root_dataset_id = 1000;
    if (corrupt === 'options') output.manifest.options.recursive = true;
    if (corrupt === 'missing-location') output.manifest.snapshot_locations.pop();
    if (corrupt === 'version') output.manifest_version = 2 as never;
    installHaveApiXhr(mockFetchOk({ dataset: output, _meta: {} }));
    await expect(previewDatasetSnapshotRemoval(42, { recursive: false, disable_plans: true })).rejects.toMatchObject({ code: 'INVALID_API_OUTPUT', result: { httpStatus: 200, data: output } });
  });
  test.each([false, true])('submits one generated mutation with the exact digest and explicit options (%s)', async disable_plans => {
    setMockRuntime(); const params = { recursive: false, disable_plans, manifest_digest: `v1:${'a'.repeat(64)}` };
    const wire = mockFetchOk({ dataset: {}, _meta: { action_state_id: 71 } }); installHaveApiXhr(wire);
    const result = await removeDatasetSnapshots(42, params);
    const [url, init] = firstFetchCall(wire);
    expect(new URL(String(url)).pathname).toBe('/v7.0/datasets/42/remove_snapshots');
    expect(init?.method).toBe('POST'); expect(JSON.parse(String(init?.body))).toEqual({ dataset: params });
    expect(wire).toHaveBeenCalledTimes(1); expect(result.meta.action_state_id).toBe(71);
  });
  test('retains missing removal receipt as uncertain acceptance', async () => {
    setMockRuntime(); installHaveApiXhr(mockFetchOk({ dataset: {} }));
    await expect(removeDatasetSnapshots(42, { manifest_digest: `v1:${'a'.repeat(64)}` })).rejects.toMatchObject({ code: 'MISSING_ACTION_STATE', result: { data: {} } });
  });
  test('classifies the actual stale endpoint envelope through the ordinary HaveAPI client', async () => {
    setMockRuntime();
    const wire = vi.fn(async () => new Response(JSON.stringify(serializedStale), { status: 200, headers: { 'Content-Type': 'application/json' } }));
    installHaveApiXhr(wire);
    const error = await removeDatasetSnapshots(42, { manifest_digest: `v1:${'a'.repeat(64)}` }).catch(cause => cause);
    expect(error).toBeInstanceOf(HaveApiError); expect(isStaleSnapshotRemovalPreview(error)).toBe(true);
    expect(wire).toHaveBeenCalledTimes(1);
  });
});

describe('datasets API wrappers', () => {
  test('fetchDatasets uses only declared Dataset#index params', async () => {
    setMockRuntime();
    const fetchMock = mockFetchOk({
      datasets: [{ id: 1, name: 'tank/user' }],
      _meta: { total_count: 1 },
    });
    installHaveApiXhr( fetchMock);

    if (false) {
      // @ts-expect-error Dataset#index has no q filter in the API contract.
      void fetchDatasets({ q: 'legacy-search' });
    }
    await fetchDatasets({
      limit: 42,
      includes: 'vps',
      count: true,
      role: 'hypervisor',
      q: 'legacy-search',
    } as never);

    const [url] = firstFetchCall(fetchMock);
    const u = new URL(String(url));

    expect(u.pathname).toBe('/v7.0/datasets');
    expect(u.searchParams.get('dataset[limit]')).toBe('42');
    expect(u.searchParams.has('dataset[q]')).toBe(false);
    expect(u.searchParams.get('dataset[role]')).toBe('hypervisor');
    expect(u.searchParams.get('_meta[includes]')).toBe('vps');
    expect(u.searchParams.get('_meta[count]')).toBe('true');
  });

  test('probes one exact dataset with declared NAS/backup filters', async () => {
    setMockRuntime();
    const fetchMock = mockFetchOk({ datasets: [] });
    installHaveApiXhr(fetchMock);
    await fetchDatasets({ subtree: 123, toDepth: 0, role: 'backup', limit: 1 });
    const [url] = firstFetchCall(fetchMock);
    const u = new URL(String(url));
    expect(u.searchParams.get('dataset[dataset]')).toBe('123');
    expect(u.searchParams.get('dataset[to_depth]')).toBe('0');
    expect(u.searchParams.get('dataset[role]')).toBe('backup');
    expect(u.searchParams.has('dataset[subtree]')).toBe(false);
  });

  test('fetchDatasetSnapshots uses only supported pagination params', async () => {
    setMockRuntime();
    const fetchMock = mockFetchOk({
      snapshots: [{ id: 9, name: '@s1', dataset: { id: 123 } }],
      _meta: { total_count: 1 },
    });
    installHaveApiXhr( fetchMock);

    if (false) {
      // @ts-expect-error Snapshot#index has no q filter in the API contract.
      void fetchDatasetSnapshots(123, { q: 'legacy-search' });
    }
    await fetchDatasetSnapshots(123, {
      fromId: 9,
      limit: 10,
      count: true,
      q: 'legacy-search',
    } as never);

    const [url] = firstFetchCall(fetchMock);
    const u = new URL(String(url));

    expect(u.pathname).toBe('/v7.0/datasets/123/snapshots');
    expect(u.searchParams.get('snapshot[from_id]')).toBe('9');
    expect(u.searchParams.get('snapshot[limit]')).toBe('10');
    expect(u.searchParams.has('snapshot[q]')).toBe(false);
    expect(u.searchParams.get('_meta[count]')).toBe('true');
  });

  test('findDatasetByName uses the declared exact-name action and optional owner', async () => {
    setMockRuntime();
    const fetchMock = mockFetchOk({ dataset: { id: 9, name: 'tank/user/app' } });
    installHaveApiXhr( fetchMock);

    await findDatasetByName('tank/user/app', 42);

    const [url] = firstFetchCall(fetchMock);
    const u = new URL(String(url));
    expect(u.pathname).toBe('/v7.0/datasets/find_by_name');
    expect(u.searchParams.get('dataset[name]')).toBe('tank/user/app');
    expect(u.searchParams.get('dataset[user]')).toBe('42');
    expect(u.searchParams.has('dataset[q]')).toBe(false);
  });

  test('dataset plan lists serialize the requested nested resource includes', async () => {
    setMockRuntime();
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({
          status: true,
          response: { plans: [], _meta: { total_count: 0 } },
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({
          status: true,
          response: { dataset_plans: [], _meta: { total_count: 0 } },
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );
    installHaveApiXhr( fetchMock);

    await fetchDatasetPlans(123, {
      limit: 200,
      includes: 'environment_dataset_plan__dataset_plan',
    });
    await fetchEnvironmentDatasetPlans(7, { limit: 200, includes: 'dataset_plan' });

    const assignedUrl = new URL(String(fetchMock.mock.calls[0]?.[0]));
    const availableUrl = new URL(String(fetchMock.mock.calls[1]?.[0]));

    expect(assignedUrl.pathname).toBe('/v7.0/datasets/123/plans');
    expect(assignedUrl.searchParams.get('plan[limit]')).toBe('200');
    expect(assignedUrl.searchParams.get('_meta[includes]')).toBe(
      'environment_dataset_plan__dataset_plan'
    );
    expect(availableUrl.pathname).toBe('/v7.0/environments/7/dataset_plans');
    expect(availableUrl.searchParams.get('dataset_plan[limit]')).toBe('200');
    expect(availableUrl.searchParams.get('_meta[includes]')).toBe('dataset_plan');
  });

  test('createDatasetSnapshot sends namespaced payload', async () => {
    setMockRuntime();
    const fetchMock = mockFetchOk({ snapshot: { id: 9, name: '@s1' } });
    installHaveApiXhr( fetchMock);

    await createDatasetSnapshot(123, { label: 'before-upgrade' });

    const [, init] = firstFetchCall(fetchMock);
    expect(init?.method).toBe('POST');
    expect(new Headers(init?.headers).get('Content-Type')).toMatch(/^application\/json(?:;|$)/);

    const body = JSON.parse(String(init?.body));
    expect(body).toEqual({ snapshot: { label: 'before-upgrade' } });
  });

  test('rollback requires a valid action-state id', async () => {
    setMockRuntime();
    installHaveApiXhr( mockFetchOk({ snapshot: {}, _meta: {} }));

    await expect(rollbackDatasetSnapshot(123, 9)).rejects.toMatchObject({
      code: 'MISSING_ACTION_STATE',
    });
  });

  test('rollback accepts and preserves a valid action-state id', async () => {
    setMockRuntime();
    const fetchMock = mockFetchOk({ snapshot: {}, _meta: { action_state_id: 812 } });
    installHaveApiXhr( fetchMock);

    await expect(rollbackDatasetSnapshot(123, 9)).resolves.toMatchObject({
      meta: { action_state_id: 812 },
    });
    const [url, init] = firstFetchCall(fetchMock);
    expect(String(url)).toContain('/v7.0/datasets/123/snapshots/9/rollback');
    expect(init?.method).toBe('POST');
  });

  test('createDataset sends dataset namespace with parent and properties', async () => {
    setMockRuntime();
    const fetchMock = mockFetchOk({ dataset: { id: 124, name: 'tank/user/app' } });
    installHaveApiXhr( fetchMock);

    await createDataset({ dataset: 123, name: 'app', automount: true, refquota: 10240, compression: true });

    const [url, init] = firstFetchCall(fetchMock);
    expect(String(url)).toContain('/v7.0/datasets');
    expect(init?.method).toBe('POST');
    expect(JSON.parse(String(init?.body))).toEqual({
      dataset: { dataset: 123, name: 'app', automount: true, refquota: 10240, compression: true },
    });
  });

  test('updateDataset sends editable properties to dataset namespace', async () => {
    setMockRuntime();
    const fetchMock = mockFetchOk({ dataset: {} });
    installHaveApiXhr( fetchMock);

    await updateDataset(123, { quota: 20480, sync: 'standard', admin_override: true, admin_lock_type: 'not_more' });

    const [url, init] = firstFetchCall(fetchMock);
    expect(String(url)).toContain('/v7.0/datasets/123');
    expect(init?.method).toBe('PUT');
    expect(JSON.parse(String(init?.body))).toEqual({
      dataset: { quota: 20480, sync: 'standard', admin_override: true, admin_lock_type: 'not_more' },
    });
  });

  test('deleteDataset uses dataset endpoint', async () => {
    setMockRuntime();
    const fetchMock = mockFetchOk({ dataset: {} });
    installHaveApiXhr( fetchMock);

    await deleteDataset(123);

    const [url, init] = firstFetchCall(fetchMock);
    expect(String(url)).toContain('/v7.0/datasets/123');
    expect(init?.method).toBe('DELETE');
  });

  test('createSnapshotDownload sends snapshot_download namespace', async () => {
    setMockRuntime();
    const fetchMock = mockFetchOk({ snapshot_download: { id: 5, state: 'ready' } });
    installHaveApiXhr( fetchMock);

    await createSnapshotDownload({ snapshot: 9, format: 'archive', send_mail: false });

    const [, init] = firstFetchCall(fetchMock);
    const body = JSON.parse(String(init?.body));

    expect(body).toEqual({ snapshot_download: { snapshot: 9, format: 'archive', send_mail: false } });
  });

  test('fetchSnapshotDownloads preserves supported filters and omits unsupported q', async () => {
    setMockRuntime();
    const fetchMock = mockFetchOk({
      snapshot_downloads: [{ id: 7, snapshot: { id: 9 }, format: 'archive' }],
      _meta: { total_count: 1 },
    });
    installHaveApiXhr( fetchMock);

    if (false) {
      // @ts-expect-error SnapshotDownload#index has no q filter in the API contract.
      void fetchSnapshotDownloads({ q: 'legacy-search' });
    }
    await fetchSnapshotDownloads({
      dataset: 123,
      snapshot: 9,
      fromId: 7,
      limit: 5,
      includes: 'snapshot__dataset',
      count: true,
      q: 'legacy-search',
    } as never);

    const [url] = firstFetchCall(fetchMock);
    const u = new URL(String(url));

    expect(u.pathname).toBe('/v7.0/snapshot_downloads');
    expect(u.searchParams.get('snapshot_download[dataset]')).toBe('123');
    expect(u.searchParams.get('snapshot_download[snapshot]')).toBe('9');
    expect(u.searchParams.get('snapshot_download[from_id]')).toBe('7');
    expect(u.searchParams.get('snapshot_download[limit]')).toBe('5');
    expect(u.searchParams.has('snapshot_download[q]')).toBe(false);
    expect(u.searchParams.get('_meta[includes]')).toBe('snapshot__dataset');
    expect(u.searchParams.get('_meta[count]')).toBe('true');
  });
});

describe('dataset backup cleanup discovery', () => {
  const description = () => ({ resources: { dataset: { actions: { disable_backups: {
    method: 'POST', input: { parameters: { recursive: {}, backup_first: {} } },
  } } } } });
  test('requires the whole additive contract', () => {
    expect(datasetBackupCleanupAvailable(description())).toBe(true);
    expect(datasetBackupCleanupAvailable({})).toBe(false);
    const partial = description();
    partial.resources.dataset.actions.disable_backups.input.parameters.backup_first = null as never;
    expect(datasetBackupCleanupAvailable(partial)).toBe(false);
    const wrongMethod = description();
    wrongMethod.resources.dataset.actions.disable_backups.method = 'GET';
    expect(datasetBackupCleanupAvailable(wrongMethod)).toBe(false);
  });
});

describe('generated dataset backup cleanup action', () => {
  test.each([
    [{}, {}],
    [{ backup_first: false, recursive: false }, { backup_first: false, recursive: false }],
    [{ backup_first: true, recursive: true }, { backup_first: true, recursive: true }],
  ])('serializes only declared options through one SDK request: %o', async (options, expected) => {
    setMockRuntime();
    const fetchMock = mockFetchOk({ dataset: {}, _meta: { action_state_id: 71 } });
    installHaveApiXhr(fetchMock);
    const result = await disableDatasetBackups(123, options);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = firstFetchCall(fetchMock);
    expect(new URL(String(url)).pathname).toBe('/v7.0/datasets/123/disable_backups');
    expect(init?.method).toBe('POST');
    expect(JSON.parse(String(init?.body))).toEqual({ dataset: expected });
    expect(result.data).toEqual({});
    expect(result.meta.action_state_id).toBe(71);
  });
  test('retains acceptance without its ordinary receipt as unknown', async () => {
    setMockRuntime(); installHaveApiXhr(mockFetchOk({ dataset: {} }));
    await expect(disableDatasetBackups(123, {})).rejects.toMatchObject({ code: 'MISSING_ACTION_STATE', result: { data: {} } });
  });
});
