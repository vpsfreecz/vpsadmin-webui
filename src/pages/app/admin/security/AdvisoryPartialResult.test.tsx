import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { enAdmin_security_advisories } from '../../../../i18n/locales/en/admin/security_advisories';
import { csAdmin_security_advisories } from '../../../../i18n/locales/cs/admin/security_advisories';
import { AdvisoryChildSequenceError } from './securityAdvisoryAdminApi';
import { AdvisoryPartialResult } from './AdvisoryPartialResult';

const state = vi.hoisted(() => ({ language: 'en' }));
vi.mock('../../../../app/i18n', () => ({
  useI18n: () => ({
    t: (key: string) => {
      const catalog: Record<string, string> =
        state.language === 'cs' ? csAdmin_security_advisories : enAdmin_security_advisories;
      return catalog[key] ?? key;
    },
  }),
}));

describe('partial advisory result copy', () => {
  it.each(['en', 'cs'])('renders approved %s labels for accepted sends and work requiring review', (language) => {
    state.language = language;
    const catalog = language === 'cs' ? csAdmin_security_advisories : enAdmin_security_advisories;
    const sequenceError = new AdvisoryChildSequenceError(
      ['+CVE-2026-1001'],
      ['+CVE-2026-1002'],
      new Error('Read-back failed')
    );
    const onReview = vi.fn();
    render(
      <MemoryRouter>
        <AdvisoryPartialResult
          created
          onReview={onReview}
          result={{ advisoryId: 44, desiredCves: ['CVE-2026-1001', 'CVE-2026-1002'], sequenceError }}
        />
      </MemoryRouter>
    );
    expect(screen.getByText(catalog['admin.security_advisories.cve_changes.title'])).toBeInTheDocument();
    expect(screen.getByTestId('admin.security_advisories.partial.accepted')).toHaveTextContent(
      catalog['admin.security_advisories.cve_changes.accepted']
    );
    expect(screen.getByTestId('admin.security_advisories.partial.remaining')).toHaveTextContent(
      catalog['admin.security_advisories.cve_changes.remaining']
    );
    expect(screen.getByText(catalog['admin.security_advisories.cve_changes.body'])).toBeInTheDocument();
    expect(screen.getByTestId('admin.security_advisories.partial.open')).toHaveTextContent(
      catalog['admin.security_advisories.cve_changes.review']
    );
    fireEvent.click(screen.getByTestId('admin.security_advisories.partial.open'));
    expect(onReview).toHaveBeenCalledTimes(1);
  });
});
