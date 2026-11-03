import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createSecurityAdvisoryNodeStatus,
  deleteSecurityAdvisoryNodeStatus,
  updateSecurityAdvisoryNodeStatus,
} from '../../../../lib/api/securityAdvisories';
import { fetchAdvisoryEditSnapshot, requireAdvisorySnapshot } from './securityAdvisoryAdminApi';
import { SecurityAdvisoryNodesPanel } from './SecurityAdvisoryNodesPanel';

const { pushToast, locale } = vi.hoisted(() => ({ pushToast: vi.fn(), locale: { language: 'en' } }));
vi.mock('../../../../app/i18n', async () => {
  const { enAdmin_security_advisories: en } = await import('../../../../i18n/locales/en/admin/security_advisories');
  const { csAdmin_security_advisories: cs } = await import('../../../../i18n/locales/cs/admin/security_advisories');
  return {
    useI18n: () => ({
      t: (key: string, params?: Record<string, unknown>) => {
        const messages = locale.language === 'cs' ? cs : en;
        const text =
          key === 'admin.security_advisories.nodes.bulk.note_update' ||
          key === 'admin.security_advisories.nodes.bulk.note_update_help'
            ? messages[key]
            : key;
        return text.replace(/\{(\w+)\}/g, (_, name: string) => String(params?.[name] ?? `{${name}}`));
      },
      preferredLanguageCodes: [locale.language],
    }),
  };
});
vi.mock('../../../../app/toasts', () => ({ useToasts: () => ({ pushToast }) }));
vi.mock('../../../../lib/api/securityAdvisories', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../../lib/api/securityAdvisories')>()),
  createSecurityAdvisoryNodeStatus: vi.fn(),
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
  locale.language = 'en';
  vi.mocked(requireAdvisorySnapshot).mockResolvedValue({ ...reviewedParent, content_revision: 5 });
  vi.mocked(deleteSecurityAdvisoryNodeStatus).mockResolvedValue({
    data: {},
    meta: {},
    httpStatus: 200,
    envelope: { status: true, response: {} },
  });
});
function showPanel(statuses = [oldStatus], nodes = [node]) {
  render(
    <SecurityAdvisoryNodesPanel
      advisoryId={44}
      advisory={reviewedParent}
      languages={[
        { id: 1, code: 'en' },
        { id: 2, code: 'cs' },
      ]}
      nodes={nodes}
      statuses={statuses}
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

describe('explicit bulk note changes', () => {
  beforeEach(() => {
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
    vi.mocked(createSecurityAdvisoryNodeStatus).mockResolvedValue({
      data: { id: 12, node: { id: 8 } },
      meta: {},
      httpStatus: 200,
      envelope: { status: true, response: {} },
    });
  });

  it.each(['en', 'cs'])('omits untouched notes and keeps localized choices independent in %s', async (language) => {
    locale.language = language;
    showPanel();
    fireEvent.click(screen.getByTestId('admin.security_advisories.nodes.bulk.open'));
    const enChoice = await screen.findByTestId('admin.security_advisories.nodes.bulk.en_note.update');
    expect(enChoice).toHaveAccessibleName(
      language === 'cs'
        ? 'Změnit poznámku (EN) Pokud volbu nezaškrtneš, stávající poznámka se nezmění. Zaškrtnutá volba s prázdným polem poznámku smaže.'
        : 'Update EN note Keep this unchecked to leave the existing note unchanged. Check it and leave the field empty to clear the note.'
    );
    expect(screen.getByTestId('admin.security_advisories.nodes.bulk.cs_note.update')).toHaveAccessibleName(
      language === 'cs'
        ? 'Změnit poznámku (CS) Pokud volbu nezaškrtneš, stávající poznámka se nezmění. Zaškrtnutá volba s prázdným polem poznámku smaže.'
        : 'Update CS note Keep this unchecked to leave the existing note unchanged. Check it and leave the field empty to clear the note.'
    );
    enChoice.focus();
    expect(enChoice).not.toBeChecked();
    expect(screen.getByTestId('admin.security_advisories.nodes.bulk.en_note')).toBeDisabled();
    expect(screen.getByTestId('admin.security_advisories.nodes.bulk.cs_note')).toBeDisabled();
    fireEvent.click(screen.getByTestId('admin.security_advisories.nodes.bulk.apply'));
    fireEvent.click(await screen.findByTestId('admin.security_advisories.nodes.bulk.confirm.confirm'));
    await waitFor(() =>
      expect(updateSecurityAdvisoryNodeStatus).toHaveBeenCalledExactlyOnceWith(44, 11, {
        state: 'unknown',
        vulnerable_until: null,
        mitigated_since: null,
        expected_state: 'draft',
        expected_content_revision: 4,
      })
    );
    expect(createSecurityAdvisoryNodeStatus).not.toHaveBeenCalled();
  });

  it.each([
    { language: 'en', text: '  ' },
    { language: 'cs', text: '' },
  ])('clears only explicitly selected $language, including whitespace', async ({ language, text }) => {
    showPanel();
    fireEvent.click(screen.getByTestId('admin.security_advisories.nodes.bulk.open'));
    fireEvent.click(await screen.findByTestId(`admin.security_advisories.nodes.bulk.${language}_note.update`));
    const input = screen.getByTestId(`admin.security_advisories.nodes.bulk.${language}_note`);
    expect(input).toBeEnabled();
    fireEvent.change(input, { target: { value: text } });
    fireEvent.click(screen.getByTestId('admin.security_advisories.nodes.bulk.apply'));
    fireEvent.click(await screen.findByTestId('admin.security_advisories.nodes.bulk.confirm.confirm'));
    await waitFor(() =>
      expect(updateSecurityAdvisoryNodeStatus).toHaveBeenCalledExactlyOnceWith(44, 11, {
        state: 'unknown',
        vulnerable_until: null,
        mitigated_since: null,
        expected_state: 'draft',
        expected_content_revision: 4,
        [`${language}_note`]: null,
      })
    );
  });

  it('retains drafts on uncheck and confirmation cancel while omitting the unchecked write', async () => {
    showPanel();
    fireEvent.click(screen.getByTestId('admin.security_advisories.nodes.bulk.open'));
    const choice = await screen.findByTestId('admin.security_advisories.nodes.bulk.en_note.update');
    fireEvent.click(choice);
    const input = screen.getByTestId('admin.security_advisories.nodes.bulk.en_note');
    fireEvent.change(input, { target: { value: 'Retained draft' } });
    fireEvent.click(choice);
    expect(input).toBeDisabled();
    expect(input).toHaveValue('Retained draft');
    fireEvent.click(choice);
    expect(input).toBeEnabled();
    expect(input).toHaveValue('Retained draft');
    fireEvent.click(choice);
    fireEvent.click(screen.getByTestId('admin.security_advisories.nodes.bulk.cs_note.update'));
    fireEvent.change(screen.getByTestId('admin.security_advisories.nodes.bulk.cs_note'), {
      target: { value: '  Nová poznámka  ' },
    });
    fireEvent.click(screen.getByTestId('admin.security_advisories.nodes.bulk.apply'));
    fireEvent.click(await screen.findByTestId('admin.security_advisories.nodes.bulk.confirm.cancel'));
    expect(input).toHaveValue('Retained draft');
    expect(choice).not.toBeChecked();
    expect(screen.getByTestId('admin.security_advisories.nodes.bulk.cs_note.update')).toBeChecked();
    fireEvent.click(screen.getByTestId('admin.security_advisories.nodes.bulk.apply'));
    fireEvent.click(await screen.findByTestId('admin.security_advisories.nodes.bulk.confirm.confirm'));
    await waitFor(() =>
      expect(updateSecurityAdvisoryNodeStatus).toHaveBeenCalledExactlyOnceWith(44, 11, {
        state: 'unknown',
        vulnerable_until: null,
        mitigated_since: null,
        expected_state: 'draft',
        expected_content_revision: 4,
        cs_note: 'Nová poznámka',
      })
    );
  });

  it('resets selections and drafts after cancelling and reopening bulk', async () => {
    showPanel();
    fireEvent.click(screen.getByTestId('admin.security_advisories.nodes.bulk.open'));
    fireEvent.click(await screen.findByTestId('admin.security_advisories.nodes.bulk.en_note.update'));
    fireEvent.change(screen.getByTestId('admin.security_advisories.nodes.bulk.en_note'), {
      target: { value: 'Discarded draft' },
    });
    fireEvent.click(
      within(screen.getByTestId('admin.security_advisories.nodes.bulk')).getByRole('button', {
        name: 'admin.security_advisories.nodes.action.cancel',
      })
    );
    fireEvent.click(screen.getByTestId('admin.security_advisories.nodes.bulk.open'));
    const choice = await screen.findByTestId('admin.security_advisories.nodes.bulk.en_note.update');
    expect(choice).not.toBeChecked();
    expect(screen.getByTestId('admin.security_advisories.nodes.bulk.en_note')).toHaveValue('');
    expect(screen.getByTestId('admin.security_advisories.nodes.bulk.en_note')).toBeDisabled();
    expect(updateSecurityAdvisoryNodeStatus).not.toHaveBeenCalled();
  });

  it.each([false, true])(
    'keeps note selection %s for existing and missing rows with sequential guards',
    async (selected) => {
      showPanel([oldStatus], [node, { ...node, id: 8 }]);
      fireEvent.click(screen.getByTestId('admin.security_advisories.nodes.bulk.open'));
      await screen.findByTestId('admin.security_advisories.nodes.bulk.en_note.update');
      if (selected) {
        fireEvent.click(screen.getByTestId('admin.security_advisories.nodes.bulk.en_note.update'));
        fireEvent.click(screen.getByTestId('admin.security_advisories.nodes.bulk.cs_note.update'));
        fireEvent.change(screen.getByTestId('admin.security_advisories.nodes.bulk.en_note'), {
          target: { value: '  New note  ' },
        });
      }
      const notes = selected ? { en_note: 'New note', cs_note: null } : {};
      fireEvent.click(screen.getByTestId('admin.security_advisories.nodes.bulk.apply'));
      fireEvent.click(await screen.findByTestId('admin.security_advisories.nodes.bulk.confirm.confirm'));
      await waitFor(() =>
        expect(createSecurityAdvisoryNodeStatus).toHaveBeenCalledExactlyOnceWith(44, {
          node: 8,
          state: 'unknown',
          vulnerable_until: null,
          mitigated_since: null,
          ...notes,
          expected_state: 'draft',
          expected_content_revision: 5,
        })
      );
      expect(updateSecurityAdvisoryNodeStatus).toHaveBeenCalledExactlyOnceWith(44, 11, {
        state: 'unknown',
        vulnerable_until: null,
        mitigated_since: null,
        ...notes,
        expected_state: 'draft',
        expected_content_revision: 4,
      });
      expect(requireAdvisorySnapshot).toHaveBeenNthCalledWith(1, 44, {
        expected_state: 'draft',
        expected_content_revision: 5,
      });
      expect(requireAdvisorySnapshot).toHaveBeenNthCalledWith(2, 44, {
        expected_state: 'draft',
        expected_content_revision: 6,
      });
    }
  );

  it('keeps the captured note payload when controls change during an in-flight batch', async () => {
    const otherStatus = { ...oldStatus, id: 12, node: { id: 8 } };
    vi.mocked(fetchAdvisoryEditSnapshot).mockResolvedValue({
      advisory: reviewedParent,
      guards: { expected_state: 'draft', expected_content_revision: 4 },
      cves: [],
      statuses: [oldStatus, otherStatus],
    });
    let finishFirst: (() => void) | undefined;
    vi.mocked(updateSecurityAdvisoryNodeStatus).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finishFirst = () =>
            resolve({ data: oldStatus, meta: {}, httpStatus: 200, envelope: { status: true, response: {} } });
        })
    );
    showPanel([oldStatus, otherStatus], [node, { ...node, id: 8 }]);
    fireEvent.click(screen.getByTestId('admin.security_advisories.nodes.bulk.open'));
    const choice = await screen.findByTestId('admin.security_advisories.nodes.bulk.en_note.update');
    fireEvent.click(choice);
    const input = screen.getByTestId('admin.security_advisories.nodes.bulk.en_note');
    fireEvent.change(input, { target: { value: 'Captured note' } });
    fireEvent.click(screen.getByTestId('admin.security_advisories.nodes.bulk.apply'));
    fireEvent.click(await screen.findByTestId('admin.security_advisories.nodes.bulk.confirm.confirm'));
    await waitFor(() => expect(updateSecurityAdvisoryNodeStatus).toHaveBeenCalledTimes(1));
    fireEvent.change(input, { target: { value: 'Later draft' } });
    fireEvent.click(choice);
    if (!finishFirst) throw new Error('First write did not start');
    finishFirst();
    await waitFor(() => expect(updateSecurityAdvisoryNodeStatus).toHaveBeenCalledTimes(2));
    expect(updateSecurityAdvisoryNodeStatus).toHaveBeenNthCalledWith(2, 44, 12, {
      state: 'unknown',
      vulnerable_until: null,
      mitigated_since: null,
      en_note: 'Captured note',
      expected_state: 'draft',
      expected_content_revision: 5,
    });
    expect(createSecurityAdvisoryNodeStatus).not.toHaveBeenCalled();
  });
});
