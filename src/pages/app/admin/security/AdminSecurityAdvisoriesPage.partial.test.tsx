import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createSecurityAdvisory,
  createSecurityAdvisoryCve,
  fetchSecurityAdvisory,
} from '../../../../lib/api/securityAdvisories';
import { AdminSecurityAdvisoriesPage } from './AdminSecurityAdvisoriesPage';
import { AdvisoryPartialResult } from './AdvisoryPartialResult';

vi.mock('../../../../app/i18n', () => ({
  useI18n: () => ({ preferredLanguageCodes: ['en'], t: (key: string) => key }),
}));
vi.mock('../../../../app/toasts', () => ({ useToasts: () => ({ pushToast: vi.fn() }) }));
vi.mock('../../../../lib/api/securityAdvisories', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../../lib/api/securityAdvisories')>()),
  createSecurityAdvisory: vi.fn(),
  createSecurityAdvisoryCve: vi.fn(),
  fetchSecurityAdvisory: vi.fn(),
  fetchAllSecurityAdvisories: vi.fn(async () => ({ data: [] })),
}));
vi.mock('../../../../lib/api/securityAdvisoryMutations', async (original) => ({
  ...(await original<typeof import('../../../../lib/api/securityAdvisoryMutations')>()),
  requireAdvisoryActions: vi.fn(),
}));
vi.mock('../../../../lib/api/languages', () => ({
  fetchLanguages: vi.fn(async () => ({
    data: [
      { id: 1, code: 'cs' },
      { id: 2, code: 'en' },
    ],
  })),
}));
vi.mock('./SecurityAdvisoryEditorModal', () => ({
  securityAdvisoryEditorPayload: vi.fn(() => ({ cs_summary: 'CS', en_summary: 'EN' })),
  SecurityAdvisoryEditorModal: (props: {
    open: boolean;
    blocked?: boolean;
    onClose: () => void;
    onSubmit: (values: object, cves: string[]) => void;
    partialResult?: AdvisoryPartialResult | null;
  }) =>
    props.open ? (
      <div data-testid="test.editor">
        <button
          data-testid="test.submit"
          disabled={props.blocked}
          onClick={() => props.onSubmit({}, ['CVE-2026-1001', 'CVE-2026-1002', 'CVE-2026-1003'])}
        >
          Submit
        </button>
        <button data-testid="test.close" onClick={props.onClose}>
          Close
        </button>
        {props.partialResult ? <AdvisoryPartialResult result={props.partialResult} created /> : null}
      </div>
    ) : null,
}));
const receipt = <T,>(data: T) => ({
  data,
  meta: {},
  httpStatus: 200,
  envelope: { status: true as const, response: {} },
});
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(createSecurityAdvisory).mockResolvedValue(receipt({ id: 44, state: 'draft', content_revision: 0 }));
});

describe('retained partial advisory creation', () => {
  it.each([
    ['initial', new Error('Initial draft lookup unavailable')],
    ['readback', new Error('Read-back unavailable')],
    ['secondwrite', new TypeError('Second reply lost')],
  ] as const)('keeps the accepted parent and original desired CVEs after %s', async (scenario, cause) => {
    let revision = 0;
    vi.mocked(fetchSecurityAdvisory).mockImplementation(async () => {
      if (scenario === 'initial' || (scenario === 'readback' && revision === 1)) throw cause;
      return receipt({ id: 44, state: 'draft', content_revision: revision });
    });
    vi.mocked(createSecurityAdvisoryCve).mockImplementation(async () => {
      if (revision === 1) throw cause;
      revision += 1;
      return receipt({ id: 9, cve_id: 'CVE-2026-1001' });
    });
    const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    render(
      <QueryClientProvider client={client}>
        <MemoryRouter>
          <AdminSecurityAdvisoriesPage />
        </MemoryRouter>
      </QueryClientProvider>
    );
    const create = await screen.findByTestId('admin.security_advisories.create');
    await waitFor(() => expect(create).toBeEnabled());
    fireEvent.click(create);
    fireEvent.click(screen.getByTestId('test.submit'));
    await waitFor(() => expect(screen.getByTestId('test.submit')).toBeDisabled());
    const editor = within(screen.getByTestId('test.editor'));
    expect(editor.getByTestId('admin.security_advisories.partial.desired')).toHaveTextContent(
      'CVE-2026-1001, CVE-2026-1002, CVE-2026-1003'
    );
    expect(editor.getByTestId('admin.security_advisories.partial.accepted')).toHaveTextContent(
      scenario === 'initial' ? '—' : '+CVE-2026-1001'
    );
    expect(editor.getByTestId('admin.security_advisories.partial.remaining')).toHaveTextContent(
      scenario === 'initial' ? 'CVE-2026-1001, CVE-2026-1002, CVE-2026-1003' : '+CVE-2026-1002, +CVE-2026-1003'
    );
    expect(editor.getByText((text) => text.includes(cause.message))).toBeInTheDocument();
    expect(editor.getByTestId('admin.security_advisories.partial.open')).toHaveAttribute(
      'href',
      '/admin/security-advisories/44'
    );
    fireEvent.click(screen.getByTestId('test.submit'));
    expect(createSecurityAdvisory).toHaveBeenCalledTimes(1);
    expect(createSecurityAdvisoryCve).toHaveBeenCalledTimes(
      scenario === 'initial' ? 0 : scenario === 'readback' ? 1 : 2
    );
    fireEvent.click(screen.getByTestId('test.close'));
    expect(create).toBeDisabled();
    expect(screen.getByTestId('admin.security_advisories.partial.desired')).toHaveTextContent('CVE-2026-1003');
    expect(createSecurityAdvisory).toHaveBeenCalledTimes(1);
  });
});
