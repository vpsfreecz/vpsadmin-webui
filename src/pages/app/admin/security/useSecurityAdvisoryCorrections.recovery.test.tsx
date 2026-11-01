import { act, renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, expect, it, vi } from 'vitest';
import {
  fetchAdvisoryEditSnapshot,
  reconcileSecurityAdvisoryCves,
  AdvisoryChildSequenceError,
} from './securityAdvisoryAdminApi';
import { updateSecurityAdvisory } from '../../../../lib/api/securityAdvisories';
import { AdvisoryWriteError } from '../../../../lib/api/securityAdvisoryMutations';
import { useSecurityAdvisoryCorrections } from './useSecurityAdvisoryCorrections';
const { pushToast } = vi.hoisted(() => ({ pushToast: vi.fn() }));
vi.mock('../../../../app/i18n', () => ({ useI18n: () => ({ t: (key: string) => key }) }));
vi.mock('../../../../app/toasts', () => ({ useToasts: () => ({ pushToast }) }));
vi.mock('../../../../components/layout/ChromeContext', () => ({ useChrome: () => ({ trackActionState: vi.fn() }) }));
vi.mock('../../../../lib/api/securityAdvisoryMutations', async (original) => ({
  ...(await original<typeof import('../../../../lib/api/securityAdvisoryMutations')>()),
  requireAdvisoryActions: vi.fn(),
}));
vi.mock('../../../../lib/api/securityAdvisories', async (original) => ({
  ...(await original<typeof import('../../../../lib/api/securityAdvisories')>()),
  updateSecurityAdvisory: vi.fn(),
}));
vi.mock('./securityAdvisoryAdminApi', async (original) => ({
  ...(await original<typeof import('./securityAdvisoryAdminApi')>()),
  fetchAdvisoryEditSnapshot: vi.fn(),
  reconcileSecurityAdvisoryCves: vi.fn(),
}));
beforeEach(() => {
  vi.clearAllMocks();
});
function renderCorrections(invalidate = vi.fn(async () => {})) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return renderHook(() => useSecurityAdvisoryCorrections({ advisoryId: 7, invalidate, evict: vi.fn() }), {
    wrapper: ({ children }) => (
      <MemoryRouter>
        <QueryClientProvider client={client}>{children}</QueryClientProvider>
      </MemoryRouter>
    ),
  });
}
it('shows a failure toast when review opening fails and keeps the editor closed', async () => {
  vi.mocked(fetchAdvisoryEditSnapshot).mockRejectedValue(new Error('Review unavailable'));
  const { result } = renderCorrections();
  await act(async () => {
    await result.current.openEdit();
  });
  expect(result.current.editorOpen).toBe(false);
  expect(result.current.snapshot).toBeNull();
  expect(pushToast).toHaveBeenCalledExactlyOnceWith({
    variant: 'danger',
    title: 'common.error',
    body: 'Review unavailable',
  });
});
it('retains structured child results and prevents replay after the accepted parent edit', async () => {
  const sequenceError = new AdvisoryChildSequenceError(
    ['+CVE-2026-1001'],
    ['+CVE-2026-1002'],
    new TypeError('Reply lost')
  );
  vi.mocked(fetchAdvisoryEditSnapshot).mockResolvedValue({
    advisory: { id: 7, state: 'draft', content_revision: 0 },
    guards: { expected_state: 'draft', expected_content_revision: 0 },
    cves: [],
    statuses: [],
  });
  vi.mocked(updateSecurityAdvisory).mockResolvedValue({
    data: { id: 7, state: 'draft', content_revision: 1 },
    meta: {},
    httpStatus: 200,
    envelope: { status: true, response: {} },
  });
  vi.mocked(reconcileSecurityAdvisoryCves).mockRejectedValue(sequenceError);
  const invalidate = vi.fn(async () => {});
  const { result } = renderCorrections(invalidate);
  await act(async () => {
    await result.current.openEdit();
  });
  const values = {
    name: '',
    publishedAt: '',
    cves: 'CVE-2026-1001,CVE-2026-1002',
    translations: {
      cs: { summary: 'CS', description: '', response: '' },
      en: { summary: 'EN', description: '', response: '' },
    },
  };
  const mutate = async () =>
    result.current.editM.mutateAsync({ values, cves: ['CVE-2026-1001', 'CVE-2026-1002'] }).catch(() => {});
  await act(async () => {
    await mutate();
  });
  expect(result.current.editorOpen).toBe(true);
  expect(result.current.editBlocked).toBe(true);
  expect(result.current.partialResult).toEqual({
    advisoryId: 7,
    desiredCves: ['CVE-2026-1001', 'CVE-2026-1002'],
    sequenceError,
  });
  expect(updateSecurityAdvisory).toHaveBeenCalledTimes(1);
  await act(async () => {
    await result.current.reviewPartial();
  });
  expect(result.current.editorOpen).toBe(false);
  expect(result.current.partialResult?.sequenceError).toBe(sequenceError);
  await act(async () => {
    await result.current.openEdit();
  });
  await act(async () => {
    await mutate();
  });
  expect(result.current.editBlocked).toBe(true);
  expect(updateSecurityAdvisory).toHaveBeenCalledTimes(1);
  expect(reconcileSecurityAdvisoryCves).toHaveBeenCalledTimes(1);
});

it.each([null, 2])('retains accepted-parent recovery when the returned revision is %s', async (returnedRevision) => {
  vi.mocked(fetchAdvisoryEditSnapshot).mockResolvedValue({
    advisory: { id: 7, state: 'draft', content_revision: 0 },
    guards: { expected_state: 'draft', expected_content_revision: 0 },
    cves: [],
    statuses: [],
  });
  vi.mocked(updateSecurityAdvisory).mockResolvedValue({
    data: { id: 7, state: 'draft', content_revision: returnedRevision },
    meta: {},
    httpStatus: 200,
    envelope: { status: true, response: {} },
  });
  const { result } = renderCorrections();
  await act(async () => {
    await result.current.openEdit();
  });
  const desiredCves = ['CVE-2026-1001', 'CVE-2026-1002'];
  const variables = {
    values: {
      name: '',
      publishedAt: '',
      cves: desiredCves.join(','),
      translations: {
        cs: { summary: 'CS', description: '', response: '' },
        en: { summary: 'EN', description: '', response: '' },
      },
    },
    cves: desiredCves,
  };
  const mutate = async () => result.current.editM.mutateAsync(variables).catch(() => {});
  await act(async () => {
    await mutate();
  });
  const partial = result.current.partialResult;
  expect(partial).toEqual({
    advisoryId: 7,
    desiredCves,
    sequenceError: expect.any(AdvisoryChildSequenceError),
  });
  expect(partial?.sequenceError.completed).toEqual([]);
  expect(partial?.sequenceError.remaining).toEqual(desiredCves);
  expect(partial?.sequenceError.originalError).toBeInstanceOf(AdvisoryWriteError);
  expect(partial?.sequenceError.originalError).toMatchObject({ kind: 'concurrent' });
  expect(result.current.editorError).toContain('admin.security_advisories.toast.saved_without_cves');
  expect(result.current.editBlocked).toBe(true);
  expect(updateSecurityAdvisory).toHaveBeenCalledTimes(1);
  expect(reconcileSecurityAdvisoryCves).not.toHaveBeenCalled();

  await act(async () => {
    result.current.setEditorOpen(false);
  });
  expect(result.current.editorOpen).toBe(false);
  expect(result.current.partialResult).toBe(partial);
  vi.mocked(fetchAdvisoryEditSnapshot).mockResolvedValue({
    advisory: { id: 7, state: 'draft', content_revision: 1 },
    guards: { expected_state: 'draft', expected_content_revision: 1 },
    cves: [],
    statuses: [],
  });
  await act(async () => {
    await result.current.openEdit();
  });
  expect(result.current.editorOpen).toBe(true);
  expect(result.current.editBlocked).toBe(true);
  expect(result.current.partialResult).toBe(partial);
  expect(result.current.partialResult?.desiredCves).toEqual(desiredCves);
  await act(async () => {
    await mutate();
  });
  expect(result.current.editBlocked).toBe(true);
  expect(result.current.partialResult).toBe(partial);
  expect(updateSecurityAdvisory).toHaveBeenCalledTimes(1);
  expect(reconcileSecurityAdvisoryCves).not.toHaveBeenCalled();
});
