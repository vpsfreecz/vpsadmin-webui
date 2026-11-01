import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  deleteSecurityAdvisoryNodeStatus,
  updateSecurityAdvisoryNodeStatus,
} from '../../../../lib/api/securityAdvisories';
import { fetchAdvisoryEditSnapshot, requireAdvisorySnapshot } from './securityAdvisoryAdminApi';
import { SecurityAdvisoryNodesPanel } from './SecurityAdvisoryNodesPanel';

const { pushToast } = vi.hoisted(() => ({ pushToast: vi.fn() }));
vi.mock('../../../../app/i18n', () => ({
  useI18n: () => ({ t: (key: string) => key, preferredLanguageCodes: ['en'] }),
}));
vi.mock('../../../../app/toasts', () => ({ useToasts: () => ({ pushToast }) }));
vi.mock('../../../../lib/api/securityAdvisories', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../../lib/api/securityAdvisories')>()),
  deleteSecurityAdvisoryNodeStatus: vi.fn(),
  updateSecurityAdvisoryNodeStatus: vi.fn(),
}));
vi.mock('../../../../lib/api/securityAdvisoryMutations', async (original) => ({
  ...(await original<typeof import('../../../../lib/api/securityAdvisoryMutations')>()),
  requireAdvisoryActions: vi.fn(),
}));
vi.mock('./securityAdvisoryAdminApi', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./securityAdvisoryAdminApi')>()),
  fetchAdvisoryEditSnapshot: vi.fn(),
  requireAdvisorySnapshot: vi.fn(),
}));
const node = { id: 7, name: 'node7', type: 'node', active: true };
const oldStatus = { id: 11, node: { id: 7 }, state: 'not_affected', en_note: 'Old query' };
const reviewedParent = { id: 44, state: 'draft', content_revision: 4 };
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(requireAdvisorySnapshot).mockResolvedValue({ ...reviewedParent, content_revision: 5 });
  vi.mocked(deleteSecurityAdvisoryNodeStatus).mockResolvedValue({
    data: {},
    meta: {},
    httpStatus: 200,
    envelope: { status: true, response: {} },
  });
});
function showPanel() {
  render(
    <SecurityAdvisoryNodesPanel
      advisoryId={44}
      advisory={reviewedParent}
      languages={[{ id: 1, code: 'en' }]}
      nodes={[node]}
      statuses={[oldStatus]}
      onChanged={vi.fn()}
    />
  );
}

describe('advisory child deletion review', () => {
  it('freezes parent and exact child from one fresh review instead of stale props', async () => {
    vi.mocked(fetchAdvisoryEditSnapshot).mockResolvedValue({
      advisory: reviewedParent,
      guards: { expected_state: 'draft', expected_content_revision: 4 },
      cves: [],
      statuses: [{ ...oldStatus, en_note: 'Reviewed current value' }],
    });
    showPanel();
    fireEvent.click(screen.getByTestId('admin.security_advisories.nodes.row.7.delete'));
    await waitFor(() =>
      expect(screen.getByTestId('admin.security_advisories.nodes.delete.confirm')).toBeInTheDocument()
    );
    fireEvent.click(screen.getByTestId('admin.security_advisories.nodes.delete.confirm'));
    await waitFor(() =>
      expect(deleteSecurityAdvisoryNodeStatus).toHaveBeenCalledExactlyOnceWith(44, 11, {
        expected_state: 'draft',
        expected_content_revision: 4,
      })
    );
    expect(requireAdvisorySnapshot).toHaveBeenCalledWith(44, { expected_state: 'draft', expected_content_revision: 5 });
  });
  it('rejects a missing reviewed child visibly and sends no deletion', async () => {
    vi.mocked(fetchAdvisoryEditSnapshot).mockResolvedValue({
      advisory: reviewedParent,
      guards: { expected_state: 'draft', expected_content_revision: 4 },
      cves: [],
      statuses: [],
    });
    showPanel();
    fireEvent.click(screen.getByTestId('admin.security_advisories.nodes.row.7.delete'));
    await waitFor(() =>
      expect(pushToast).toHaveBeenCalledWith(expect.objectContaining({ variant: 'danger', title: 'common.error' }))
    );
    expect(screen.queryByTestId('admin.security_advisories.nodes.delete.confirm')).not.toBeInTheDocument();
    expect(deleteSecurityAdvisoryNodeStatus).not.toHaveBeenCalled();
  });
});

it('keeps stopped bulk work disabled and requires review after an accepted write loses read-back', async () => {
  vi.mocked(fetchAdvisoryEditSnapshot).mockResolvedValue({
    advisory: reviewedParent,
    guards: { expected_state: 'draft', expected_content_revision: 4 },
    cves: [],
    statuses: [oldStatus],
  });
  vi.mocked(updateSecurityAdvisoryNodeStatus).mockResolvedValue({
    data: oldStatus,
    meta: {},
    httpStatus: 200,
    envelope: { status: true, response: {} },
  });
  vi.mocked(requireAdvisorySnapshot).mockRejectedValue(new Error('Read-back failed'));
  showPanel();
  fireEvent.click(screen.getByTestId('admin.security_advisories.nodes.bulk.open'));
  const apply = await screen.findByTestId('admin.security_advisories.nodes.bulk.apply');
  fireEvent.click(apply);
  fireEvent.click(await screen.findByTestId('admin.security_advisories.nodes.bulk.confirm.confirm'));
  await waitFor(() => expect(apply).toHaveTextContent('admin.security_advisories.nodes.action.review_required'));
  expect(apply).toBeDisabled();
  expect(updateSecurityAdvisoryNodeStatus).toHaveBeenCalledTimes(1);
  fireEvent.click(apply);
  expect(updateSecurityAdvisoryNodeStatus).toHaveBeenCalledTimes(1);
});
