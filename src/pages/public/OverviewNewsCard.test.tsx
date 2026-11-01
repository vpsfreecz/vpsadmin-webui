import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { OverviewNewsCard } from './OverviewNewsCard';

const locale = vi.hoisted(() => ({ codes: ['en', 'cs'] }));
vi.mock('../../app/i18n', () => ({ useI18n: () => ({ t: (key: string) => key, preferredLanguageCodes: locale.codes }) }));

const props = {
  newsLoading: false, newsError: false,
  news: [
    { id: 1, message: 'Legacy message', en_message: 'English announcement', cs_message: 'Česká novinka' },
    { id: 2, message: 'Legacy fallback' },
    { id: 3, message: 'Server fallback', en_message: 'English-only announcement', cs_message: '' },
  ],
};

describe('public overview news language', () => {
  it('changes cached news translations immediately and preserves fallbacks', () => {
    locale.codes = ['en', 'cs'];
    const view = render(<MemoryRouter><OverviewNewsCard {...props} /></MemoryRouter>);
    expect(screen.getByText('English announcement')).toBeVisible();
    locale.codes = ['cs', 'en'];
    view.rerender(<MemoryRouter><OverviewNewsCard {...props} /></MemoryRouter>);
    expect(screen.getByText('Česká novinka')).toBeVisible();
    expect(screen.queryByText('English announcement')).not.toBeInTheDocument();
    expect(screen.getByText('Legacy fallback')).toBeVisible();
    expect(screen.getByText('English-only announcement')).toBeVisible();
    locale.codes = ['en', 'cs'];
    view.rerender(<MemoryRouter><OverviewNewsCard {...props} /></MemoryRouter>);
    expect(screen.getByText('English announcement')).toBeVisible();
  });
});
