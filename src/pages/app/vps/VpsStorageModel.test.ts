import { describe, expect, it } from 'vitest';

import {
  buildCreateMountPayload,
  buildMountDiff,
  buildUpdateMountPayload,
  capacityTone,
  computeCapacityPercent,
  defaultMountDraft,
  mountDeleteConfirmation,
  mountDraftFromMount,
  rootDatasetSummary,
  ssdSizeGiBInput,
  storageOverviewSummary,
  validateSsdResize,
  validateMountDraft,
} from './VpsStorageModel';
import type { VpsMount } from '../../../lib/api/vpsMounts';

describe('VpsStorageModel', () => {
  it('summarizes partial and null root references without inventing identity or capacity', () => {
    expect(rootDatasetSummary(null, { name: 'root', id: null })).toMatchObject({
      id: null, label: 'root', used: null, available: null, capacityPercent: null,
    });
    for (const fallback of [undefined, null, {}, { id: null }]) {
      expect(rootDatasetSummary(null, fallback)).toMatchObject({
        id: null, used: null, available: null, capacityPercent: null,
      });
    }
  });

  it('builds only declared create and mutable update mount payloads', () => {
    const draft = {
      ...defaultMountDraft(),
      dataset: { id: 77, name: 'tank/data' },
      mountpoint: ' /srv/data ',
      mode: 'ro' as const,
      onStartFail: 'fail' as const,
      enabled: false,
      masterEnabled: false,
    };

    expect(buildCreateMountPayload(draft, true)).toEqual({
      dataset: 77,
      mountpoint: '/srv/data',
      mode: 'ro',
      on_start_fail: 'fail',
      enabled: false,
    });

    expect(buildUpdateMountPayload(draft, false)).toEqual({
      on_start_fail: 'fail',
      enabled: false,
    });
  });

  it('validates dataset and mountpoint footguns before submit', () => {
    expect(validateMountDraft(defaultMountDraft(), { requireDataset: true }).issues).toEqual([
      'dataset_required',
      'mountpoint_required',
    ]);

    expect(
      validateMountDraft({ ...defaultMountDraft(), dataset: { id: 1 }, mountpoint: 'relative/path' }, { requireDataset: true }).issues
    ).toEqual(['mountpoint_absolute']);

    expect(validateMountDraft({ ...defaultMountDraft(), dataset: { id: 1 }, mountpoint: '/' }, { requireDataset: true }).issues).toEqual([
      'mountpoint_root',
    ]);
  });

  it('detects only changed mount fields for edit review', () => {
    const mount: VpsMount = {
      id: 10,
      dataset: { id: 7, name: 'tank/app' },
      mountpoint: '/srv/app',
      mode: 'rw',
      on_start_fail: 'ignore',
      enabled: true,
      master_enabled: true,
    };

    const draft = { ...mountDraftFromMount(mount), mode: 'ro' as const, onStartFail: 'umount' as const, masterEnabled: false };

    expect(buildMountDiff(draft, mount, false)).toEqual([
      { field: 'on_start_fail', before: 'ignore', after: 'umount' },
    ]);

    expect(buildMountDiff(draft, mount, true)).toContainEqual({ field: 'master_enabled', before: true, after: false });
  });

  it('summarizes root dataset capacity without exposing backup creation as a normal action', () => {
    const summary = rootDatasetSummary(
      {
        id: 5,
        name: 'tank/vps/root',
        used: 900,
        avail: 100,
        refquota: 1000,
        quota: 0,
        referenced: 850,
        mount_count: 2,
        snapshots_count: 8,
        export_count: 1,
        object_state: 'active',
      },
      null
    );

    expect(summary).toMatchObject({
      id: 5,
      label: 'tank/vps/root',
      capacityPercent: 90,
      capacityTone: 'warn',
      snapshotCount: 8,
      exportCount: 1,
    });
  });

  it('summarizes mounts and confirmation targets', () => {
    const mounts: VpsMount[] = [
      { id: 1, mountpoint: '/srv/a', mode: 'rw', enabled: true, current_state: 'mounted' },
      { id: 2, mountpoint: '/srv/b', mode: 'ro', enabled: false, current_state: 'failed' },
    ];

    expect(storageOverviewSummary(mounts)).toEqual({
      mountCount: 2,
      enabledMountCount: 1,
      disabledMountCount: 1,
      writableMountCount: 1,
      readOnlyMountCount: 1,
      failedMountCount: 1,
    });
    expect(mountDeleteConfirmation(mounts[0]!)).toBe('/srv/a');
    expect(computeCapacityPercent(50, 50, null)).toBe(50);
    expect(capacityTone(96, 100)).toBe('danger');
  });

  it('validates root SSD resize values in GiB and converts them to refquota MiB', () => {
    expect(ssdSizeGiBInput(20 * 1024)).toBe('20');
    expect(validateSsdResize('32', 20 * 1024, 5 * 1024)).toEqual({
      ok: true,
      valueMiB: 32 * 1024,
      issue: null,
    });
    expect(validateSsdResize('20', 20 * 1024, 5 * 1024).issue).toBe('unchanged');
    expect(validateSsdResize('4,5', 20 * 1024, 5 * 1024).issue).toBe('below_used');
    expect(validateSsdResize('not-a-size', 20 * 1024, 5 * 1024).issue).toBe('invalid');
  });
});
