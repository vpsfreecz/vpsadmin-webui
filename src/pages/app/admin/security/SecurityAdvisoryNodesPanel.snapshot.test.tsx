// i18n-ignore-file
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createSecurityAdvisoryNodeStatus,
  updateSecurityAdvisoryNodeStatus,
  type SecurityAdvisoryNodeStatus,
} from '../../../../lib/api/securityAdvisories';
import { fetchAdvisoryEditSnapshot } from './securityAdvisoryAdminApi';
import { SecurityAdvisoryNodesPanel } from './SecurityAdvisoryNodesPanel';

const mocks = vi.hoisted(() => ({ pushToast: vi.fn() }));
vi.mock('../../../../app/i18n', () => ({
  useI18n: () => ({ t: (key: string) => key, preferredLanguageCodes: ['en'] }),
}));
vi.mock('../../../../app/toasts', () => ({ useToasts: () => ({ pushToast: mocks.pushToast }) }));
vi.mock('./securityAdvisoryAdminApi', () => ({
  fetchAdvisoryEditSnapshot: vi.fn(),
  requireAdvisorySnapshot: vi.fn(async () => ({})),
}));
vi.mock('../../../../lib/api/securityAdvisoryMutations', async (original) => ({
  ...(await original<typeof import('../../../../lib/api/securityAdvisoryMutations')>()),
  requireAdvisoryActions: vi.fn(),
}));
vi.mock('../../../../lib/api/securityAdvisories', async (original) => ({
  ...(await original<typeof import('../../../../lib/api/securityAdvisories')>()),
  createSecurityAdvisoryNodeStatus: vi.fn(),
  updateSecurityAdvisoryNodeStatus: vi.fn(),
}));

const advisory = { id: 88, state: 'published', content_revision: 9 };
const guards = { expected_state: 'published' as const, expected_content_revision: 9 };
const current: SecurityAdvisoryNodeStatus = {
  id: 501,
  node: { id: 42 },
  state: 'mitigated',
  vulnerable_until: '2026-10-15T12:34:17+02:00',
  mitigated_since: '2026-10-15T12:34:43+02:00',
  en_note: 'Current English note',
  cs_note: 'Aktuální česká poznámka',
};
const stale: SecurityAdvisoryNodeStatus = { id: 501, node: { id: 42 }, state: 'not_affected', en_note: 'Old note' };

function renderPanel(statuses = [stale]) {
  return render(
    <SecurityAdvisoryNodesPanel
      advisoryId={88}
      advisory={advisory}
      nodes={[{ id: 42, name: 'Synthetic node', active: true, type: 'node' }]}
      statuses={statuses}
      languages={[
        { id: 1, code: 'en' },
        { id: 2, code: 'cs' },
      ]}
      onChanged={vi.fn()}
    />
  );
}

describe('coherent node editor snapshot', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fetchAdvisoryEditSnapshot).mockResolvedValue({ advisory, guards, cves: [], statuses: [current] });
    vi.mocked(updateSecurityAdvisoryNodeStatus).mockResolvedValue({
      data: current,
      meta: {},
      httpStatus: 200,
      envelope: { status: true, response: {} },
    });
  });

  it('keeps current assessment values when fresh parent props accompany a stale child row', async () => {
    renderPanel();
    fireEvent.click(screen.getByTestId('admin.security_advisories.nodes.row.42.edit'));
    await screen.findByTestId('admin.security_advisories.nodes.editor.en_note');
    expect(screen.getByTestId('admin.security_advisories.nodes.editor.state')).toHaveValue('mitigated');
    expect(screen.getByTestId('admin.security_advisories.nodes.editor.en_note')).toHaveValue(
      String(current['en_note'])
    );
    expect(screen.getByTestId('admin.security_advisories.nodes.editor.cs_note')).toHaveValue(
      String(current['cs_note'])
    );
    fireEvent.change(screen.getByTestId('admin.security_advisories.nodes.editor.en_note'), {
      target: { value: 'Note-only correction' },
    });
    fireEvent.click(screen.getByTestId('admin.security_advisories.nodes.editor.save'));
    await waitFor(() =>
      expect(updateSecurityAdvisoryNodeStatus).toHaveBeenCalledWith(88, 501, {
        ...guards,
        state: current.state,
        vulnerable_until: current.vulnerable_until,
        mitigated_since: current.mitigated_since,
        en_note: 'Note-only correction',
      })
    );
    expect(createSecurityAdvisoryNodeStatus).not.toHaveBeenCalled();
  });

  it.each([
    { name: 'removed row', statuses: [] },
    { name: 'replacement row', statuses: [{ ...current, id: 502 }] },
    { name: 'different node', statuses: [{ ...current, node: { id: 43 } }] },
  ])('rejects a $name instead of adopting it for the clicked row', async ({ statuses }) => {
    vi.mocked(fetchAdvisoryEditSnapshot).mockResolvedValue({ advisory, guards, cves: [], statuses });
    renderPanel();
    fireEvent.click(screen.getByTestId('admin.security_advisories.nodes.row.42.edit'));
    await waitFor(() =>
      expect(mocks.pushToast).toHaveBeenCalledWith(
        expect.objectContaining({
          body: 'admin.security_advisories.correction.reload',
        })
      )
    );
    expect(screen.queryByTestId('admin.security_advisories.nodes.editor')).not.toBeInTheDocument();
    expect(updateSecurityAdvisoryNodeStatus).not.toHaveBeenCalled();
    expect(createSecurityAdvisoryNodeStatus).not.toHaveBeenCalled();
  });

  it('rejects a newly appeared assessment instead of converting a stale Add to an edit', async () => {
    renderPanel([]);
    fireEvent.click(screen.getByTestId('admin.security_advisories.nodes.row.42.edit'));
    await waitFor(() => expect(mocks.pushToast).toHaveBeenCalled());
    expect(screen.queryByTestId('admin.security_advisories.nodes.editor')).not.toBeInTheDocument();
    expect(updateSecurityAdvisoryNodeStatus).not.toHaveBeenCalled();
    expect(createSecurityAdvisoryNodeStatus).not.toHaveBeenCalled();
  });
});
