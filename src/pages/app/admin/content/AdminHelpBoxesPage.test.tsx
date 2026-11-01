// i18n-ignore-file
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createHelpBox, fetchHelpBoxesAdmin, updateHelpBox } from '../../../../lib/api/helpBoxes';
import { fetchLanguages } from '../../../../lib/api/languages';
import { AdminHelpBoxesPage } from './AdminHelpBoxesPage';

vi.mock('../../../../app/i18n', () => ({ useI18n: () => ({ t: (key: string) => key }) }));
vi.mock('../../../../app/theme', () => ({ useTheme: () => ({ effective: 'light' }) }));
vi.mock('../../../../app/toasts', () => ({ useToasts: () => ({ pushToast: vi.fn() }) }));
vi.mock('../../../../lib/api/helpBoxes', () => ({
  createHelpBox: vi.fn(),
  fetchHelpBoxesAdmin: vi.fn(),
  updateHelpBox: vi.fn(),
  deleteHelpBox: vi.fn(),
}));
vi.mock('../../../../lib/api/languages', () => ({ fetchLanguages: vi.fn() }));

function renderPage(path = '/admin/content/help') {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const router = createMemoryRouter([{ path: '/admin/content/help', element: <AdminHelpBoxesPage /> }], {
    initialEntries: [path],
  });
  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
  return router;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(fetchLanguages).mockResolvedValue({
    data: [{ id: 1, code: 'en', label: 'English' }],
    meta: {},
    httpStatus: 200,
    envelope: { status: true, response: {} },
  });
  vi.mocked(fetchHelpBoxesAdmin).mockResolvedValue({
    data: [{ id: 7, page: 'log', action: '*', content: 'Help', order: 0, language: { id: 1 } }],
    meta: {},
    httpStatus: 200,
    envelope: { status: true, response: {} },
  });
});

describe('HelpBox supported language controls', () => {
  it('visibly removes stale unlocalized-only URL filter without sending null', async () => {
    const router = renderPage('/admin/content/help?language=&page=log');
    expect(screen.getByText('admin.help_boxes.filter.unlocalized_removed')).toBeVisible();
    await waitFor(() => expect(fetchHelpBoxesAdmin).toHaveBeenCalled());
    expect(vi.mocked(fetchHelpBoxesAdmin).mock.calls[0]![0]).not.toHaveProperty('language');
    await waitFor(() => expect(router.state.location.search).toBe('?page=log'));
    expect(screen.getByTestId('admin.help_boxes.filter.language').querySelector('option[value=""]')).toBeNull();
  });
  it('prevents clearing a localized record and explains the restriction', async () => {
    renderPage();
    fireEvent.click(await screen.findByTestId('admin.help_boxes.edit.7'));
    const select = screen.getByTestId('admin.help_boxes.editor.language');
    expect(select.querySelector('option[value=""]')).toBeDisabled();
    expect(screen.getByText('admin.help_boxes.validation.language_clear_unsupported')).toBeVisible();
    fireEvent.change(select, { target: { value: '' } });
    expect(screen.getByTestId('admin.help_boxes.editor.save')).toBeDisabled();
    expect(updateHelpBox).not.toHaveBeenCalled();
    expect(createHelpBox).not.toHaveBeenCalled();
  });
});
