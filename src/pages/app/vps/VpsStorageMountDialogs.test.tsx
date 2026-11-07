import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import { defaultMountDraft, mountDraftFromMount } from './VpsStorageModel';
import { VpsStorageMountCreateModal, VpsStorageMountEditModal } from './VpsStorageMountDialogs';

vi.mock('../../../app/i18n', () => ({ useI18n: () => ({ t: (key: string) => key }) }));

const common = { open: true, canAdmin: true, gate: { allowed: true as const }, startFailOptions: [], onClose: vi.fn(), onDraftPatch: vi.fn(), onSubmit: vi.fn(), canSubmit: false };

describe('supported mount controls', () => {
  test('create has mountpoint/mode, without fabricated type/map or admin master flag', () => {
    render(<VpsStorageMountCreateModal {...common} draft={defaultMountDraft()} datasetPicker={<div data-testid="dataset-picker" />} createError={null} createLoading={false} />);
    expect(screen.getByTestId('vps.storage.mounts.create.mountpoint')).toBeEnabled();
    expect(screen.getByTestId('vps.storage.mounts.create.mode')).toBeEnabled();
    for (const field of ['type', 'use_default_map', 'master_enabled']) {
      expect(screen.queryByTestId(`vps.storage.mounts.create.${field}`)).not.toBeInTheDocument();
    }
  });

  test('edit keeps mountpoint/mode immutable and missing booleans unavailable', () => {
    const mount = { id: 7, dataset: { id: 9 }, mountpoint: '/srv', mode: null, enabled: null, master_enabled: null };
    render(<VpsStorageMountEditModal {...common} mount={mount} draft={mountDraftFromMount(mount)} editError={null} editLoading={false} />);
    expect(screen.getByTestId('vps.storage.mounts.edit.mountpoint')).toBeDisabled();
    expect(screen.getByTestId('vps.storage.mounts.edit.mode')).toBeDisabled();
    expect(screen.getByTestId('vps.storage.mounts.edit.enabled')).toBeDisabled();
    expect(screen.getByTestId('vps.storage.mounts.edit.master_enabled')).toBeDisabled();
    expect(screen.queryByTestId('vps.storage.mounts.edit.type')).not.toBeInTheDocument();
    expect(screen.queryByTestId('vps.storage.mounts.edit.use_default_map')).not.toBeInTheDocument();
  });
});
