// i18n-ignore-file
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createSecurityAdvisoryUpdate,
  fetchSecurityAdvisoryCves,
  fetchSecurityAdvisoryNodeStatuses,
  type SecurityAdvisory,
} from '../../../../lib/api/securityAdvisories';
import { fetchNodes } from '../../../../lib/api/nodes';
import { isoToLocalInput } from '../../../../lib/datetimeLocal';
import { AdminSecurityAdvisoryDetailPage } from './AdminSecurityAdvisoryDetailPage';
import { advisoryDateInput } from './advisoryDateTime';

const mocks = vi.hoisted(() => ({
  advisory: {
    id: 88,
    state: 'published',
    content_revision: 5,
    published_at: '2026-10-15T12:34:17.000Z',
    en_summary: 'Synthetic assessment',
    cs_summary: 'Synthetic Czech assessment',
  } as SecurityAdvisory,
}));
vi.mock('../../../../app/i18n', () => ({
  useI18n: () => ({ t: (key: string) => key, preferredLanguageCodes: ['en'] }),
}));
vi.mock('../../../../app/toasts', () => ({ useToasts: () => ({ pushToast: vi.fn() }) }));
vi.mock('../../../../components/layout/ChromeContext', () => ({
  useChrome: () => ({ trackActionState: vi.fn() }),
}));
vi.mock('../../../../lib/api/securityAdvisoryMutations', async (original) => ({
  ...(await original<typeof import('../../../../lib/api/securityAdvisoryMutations')>()),
  requireAdvisoryActions: vi.fn(),
}));
vi.mock('../../../../lib/api/languages', () => ({
  fetchLanguages: vi.fn(async () => ({
    data: [
      { id: 1, code: 'en', label: 'English' },
      { id: 2, code: 'cs', label: 'Česky' },
    ],
  })),
}));
vi.mock('../../../../lib/api/nodes', () => ({ fetchNodes: vi.fn(async () => ({ data: [] })) }));
vi.mock('../../../../lib/api/securityAdvisories', async (original) => ({
  ...(await original<typeof import('../../../../lib/api/securityAdvisories')>()),
  fetchSecurityAdvisory: vi.fn(async () => ({ data: { ...mocks.advisory } })),
  fetchSecurityAdvisoryCves: vi.fn(async () => ({ data: [] })),
  fetchSecurityAdvisoryNodeStatuses: vi.fn(async () => ({ data: [] })),
  fetchAllSecurityAdvisoryUpdates: vi.fn(async () => ({ data: [] })),
  fetchSecurityAdvisoryOutageLinks: vi.fn(async () => ({ data: [] })),
  updateSecurityAdvisory: vi.fn<typeof import('../../../../lib/api/securityAdvisories').updateSecurityAdvisory>(
    async (_id, payload) => {
      mocks.advisory = { ...mocks.advisory, ...payload, content_revision: Number(mocks.advisory.content_revision) + 1 };
      return { data: { ...mocks.advisory }, meta: {}, httpStatus: 200, envelope: { status: true, response: {} } };
    }
  ),
  createSecurityAdvisoryUpdate: vi.fn(async () => ({ data: { id: 333 } })),
}));

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
  const router = createMemoryRouter(
    [{ path: '/advisories/:advisoryId', element: <AdminSecurityAdvisoryDetailPage /> }],
    {
      initialEntries: ['/advisories/88'],
    }
  );
  render(
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
  return client;
}

describe('original editor and announcement snapshot boundaries', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.advisory = {
      id: 88,
      state: 'published',
      content_revision: 5,
      published_at: '2026-10-15T12:34:17.000Z',
      en_summary: 'Synthetic assessment',
      cs_summary: 'Synthetic Czech assessment',
    };
  });

  it.each(['save', 'cancel'] as const)(
    'uses corrected live publication time after an original editor %s',
    async (action) => {
      const correctedTime = '2026-10-15T12:35:47.000Z';
      const client = renderPage();
      fireEvent.click(await screen.findByTestId('admin.security_advisory.edit'));
      const editor = await screen.findByTestId('admin.security_advisories.editor');
      if (action === 'save') {
        fireEvent.change(screen.getByTestId('admin.security_advisories.editor.published_at'), {
          target: { value: advisoryDateInput(correctedTime) },
        });
        fireEvent.click(screen.getByTestId('admin.security_advisories.editor.save'));
        await waitFor(() => expect(screen.queryByTestId('admin.security_advisories.editor')).not.toBeInTheDocument());
      } else {
        fireEvent.click(within(editor).getByRole('button', { name: 'common.cancel' }));
        // Another correction refreshes the live query; the cancelled editor snapshot stays at T1.
        mocks.advisory = { ...mocks.advisory, published_at: correctedTime, content_revision: 6 };
        await act(async () => {
          await client.invalidateQueries({ queryKey: ['security_advisory', 88] });
        });
      }
      expect(mocks.advisory.published_at).toBe(correctedTime);
      fireEvent.click(screen.getByTestId('admin.security_advisory.post_update'));
      const date = await screen.findByTestId('admin.security_advisories.update.editor.published_at');
      expect(date).toHaveValue(isoToLocalInput(correctedTime));
      const state = screen.getByTestId('admin.security_advisories.update.editor.state');
      expect(state).toHaveValue('');
      expect(state.querySelector('option[value="retracted"]')).not.toBeNull();
      expect(screen.getByTestId('admin.security_advisories.update.editor.send_mail')).not.toBeChecked();
      fireEvent.change(screen.getByTestId('admin.security_advisories.update.editor.en.summary'), {
        target: { value: 'Separate announcement' },
      });
      fireEvent.click(screen.getByTestId('admin.security_advisories.update.editor.language.cs'));
      fireEvent.change(screen.getByTestId('admin.security_advisories.update.editor.cs.summary'), {
        target: { value: 'Samostatné oznámení' },
      });
      fireEvent.click(screen.getByTestId('admin.security_advisories.update.editor.save'));
      await waitFor(() =>
        expect(createSecurityAdvisoryUpdate).toHaveBeenCalledWith({
          security_advisory: 88,
          published_at: correctedTime,
          state: null,
          send_mail: false,
          cs_summary: 'Samostatné oznámení',
          cs_message: null,
          en_summary: 'Separate announcement',
          en_message: null,
        })
      );
    }
  );
});

const queryReceipt = <T,>(data: T) => ({
  data,
  meta: {},
  httpStatus: 200,
  envelope: { status: true as const, response: {} },
});
const readinessNode = { id: 10, active: true, type: 'node', domain_name: 'synthetic-node.test' };
const readinessCves = [{ id: 9, security_advisory: { id: 88 }, cve_id: 'CVE-2026-12345' }];
const readinessStatuses = [{ id: 11, security_advisory: { id: 88 }, node: readinessNode, state: 'not_affected' }];

describe('draft publication checks through the actual detail caller', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.advisory = {
      id: 88,
      state: 'draft',
      content_revision: 5,
      en_summary: 'Retained report',
      cs_summary: 'Zachované hlášení',
    };
    vi.mocked(fetchNodes).mockResolvedValue(queryReceipt([readinessNode]));
    vi.mocked(fetchSecurityAdvisoryCves).mockResolvedValue(queryReceipt(readinessCves));
    vi.mocked(fetchSecurityAdvisoryNodeStatuses).mockResolvedValue(queryReceipt(readinessStatuses));
  });

  it('does not turn a held inventory into Ready or invented blockers, then shows verified Ready', async () => {
    let release!: (value: Awaited<ReturnType<typeof fetchNodes>>) => void;
    vi.mocked(fetchNodes).mockReturnValue(
      new Promise((resolve) => {
        release = resolve;
      })
    );
    renderPage();
    const readiness = await screen.findByTestId('admin.security_advisory.readiness');
    expect(readiness).toHaveTextContent('common.loading');
    expect(readiness).not.toHaveTextContent('admin.security_advisories.readiness.ready');
    expect(readiness).not.toHaveTextContent('admin.security_advisories.readiness.missing_node_status');
    expect(screen.getByTestId('admin.security_advisory.publish')).toBeDisabled();
    await act(async () => {
      release(queryReceipt([readinessNode]));
    });
    await waitFor(() => expect(readiness).toHaveTextContent('admin.security_advisories.readiness.ready_body'));
    expect(screen.getByTestId('admin.security_advisory.publish')).toBeEnabled();
  });

  it('shows a required-read failure ahead of a sibling that is still pending, without repeating the error body', async () => {
    let release!: (value: Awaited<ReturnType<typeof fetchSecurityAdvisoryNodeStatuses>>) => void;
    vi.mocked(fetchSecurityAdvisoryNodeStatuses).mockReturnValue(
      new Promise((resolve) => {
        release = resolve;
      })
    );
    vi.mocked(fetchNodes).mockRejectedValue(new Error('Inventory rejected'));
    renderPage();
    const readiness = await screen.findByTestId('admin.security_advisory.readiness');
    await waitFor(() => expect(readiness).toHaveTextContent('admin.security_advisories.readiness.data_unavailable'));
    expect(readiness).not.toHaveTextContent('common.loading');
    expect(readiness).not.toHaveTextContent('admin.security_advisories.readiness.ready_body');
    expect(screen.getAllByText('Inventory rejected')).toHaveLength(1);
    expect(screen.getByTestId('admin.security_advisory.publish')).toBeDisabled();
    await act(async () => {
      release(queryReceipt(readinessStatuses));
    });
  });

  it.each(['cves', 'nodes', 'statuses'] as const)(
    'does not certify retained successful data after a %s refetch fails',
    async (feed) => {
      const client = renderPage();
      const readiness = await screen.findByTestId('admin.security_advisory.readiness');
      await waitFor(() => expect(screen.getByTestId('admin.security_advisory.publish')).toBeEnabled());
      const error = new Error('Required read rejected');
      const queryKey =
        feed === 'cves'
          ? ['security_advisory_cves', 88]
          : feed === 'nodes'
            ? ['nodes', 'security_advisory_relevant']
            : ['security_advisory_node_statuses', 88];
      if (feed === 'cves') vi.mocked(fetchSecurityAdvisoryCves).mockRejectedValue(error);
      else if (feed === 'nodes') vi.mocked(fetchNodes).mockRejectedValue(error);
      else vi.mocked(fetchSecurityAdvisoryNodeStatuses).mockRejectedValue(error);
      await act(async () => {
        await client.invalidateQueries({ queryKey });
      });
      await waitFor(() => expect(readiness).toHaveTextContent('admin.security_advisories.readiness.data_unavailable'));
      expect(readiness).not.toHaveTextContent('admin.security_advisories.readiness.ready_body');
      expect(readiness).not.toHaveTextContent('admin.security_advisories.readiness.missing_cves');
      expect(screen.getAllByText('Required read rejected')).toHaveLength(1);
      expect(screen.getByTestId('admin.security_advisory.publish')).toBeDisabled();
      expect(client.getQueryData(queryKey)).toBeDefined();
      expect(screen.getByText('Retained report')).toBeVisible();
    }
  );

  it('keeps confirmed missing-CVE guidance and the existing disabled Publish gate', async () => {
    vi.mocked(fetchSecurityAdvisoryCves).mockResolvedValue(queryReceipt([]));
    renderPage();
    const readiness = await screen.findByTestId('admin.security_advisory.readiness');
    await waitFor(() => expect(readiness).toHaveTextContent('admin.security_advisories.readiness.missing_cves'));
    expect(readiness).toHaveTextContent('admin.security_advisories.readiness.not_ready');
    expect(screen.getByTestId('admin.security_advisory.publish')).toBeDisabled();
  });
});
