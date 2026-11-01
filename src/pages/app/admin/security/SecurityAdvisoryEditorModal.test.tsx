import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SecurityAdvisoryEditorModal } from './SecurityAdvisoryEditorModal';
vi.mock('../../../../app/i18n', () => ({ useI18n: () => ({ t: (key: string) => key }) }));

describe('advisory edit draft lifetime', () => {
  it('retains unsaved text when a background refetch changes query props', () => {
    const languages = [
      { id: 1, code: 'cs', label: 'Česky' },
      { id: 2, code: 'en', label: 'English' },
    ];
    const props = {
      open: true,
      mode: 'edit' as const,
      languages,
      cves: ['CVE-2026-1234'],
      advisory: { id: 7, state: 'draft', content_revision: 0, cs_summary: 'Původní', en_summary: 'Original' },
      onClose: vi.fn(),
      onSubmit: vi.fn(),
    };
    const { rerender } = render(<SecurityAdvisoryEditorModal {...props} />);
    fireEvent.change(screen.getByTestId('admin.security_advisories.editor.cs.summary'), {
      target: { value: 'Neuložený text' },
    });
    rerender(
      <SecurityAdvisoryEditorModal
        {...props}
        advisory={{ ...props.advisory, content_revision: 1, cs_summary: 'Server changed' }}
        cves={['CVE-2026-9999']}
      />
    );
    expect(screen.getByTestId('admin.security_advisories.editor.cs.summary')).toHaveValue('Neuložený text');
    expect(screen.getByTestId('admin.security_advisories.editor.cves')).toHaveValue('CVE-2026-1234');
  });
});
