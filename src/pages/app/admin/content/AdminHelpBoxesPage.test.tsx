// i18n-ignore-file
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createHelpBox, deleteHelpBox, fetchHelpBoxesAdmin, updateHelpBox } from '../../../../lib/api/helpBoxes';
import { fetchLanguages } from '../../../../lib/api/languages';
import { AdminHelpBoxesPage } from './AdminHelpBoxesPage';

vi.mock('../../../../app/i18n', () => ({ useI18n: () => ({ t: (key: string) => key }) }));
vi.mock('../../../../app/theme', () => ({ useTheme: () => ({ effective: 'light' }) }));
const notifications = vi.hoisted(() => ({ pushToast: vi.fn() }));
vi.mock('../../../../app/toasts', () => ({ useToasts: () => notifications }));
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
  it('announces a rejected deletion locally with its target and retry, then keeps accepted feedback', async () => {
    vi.mocked(deleteHelpBox)
      .mockRejectedValueOnce(new Error('Help delete rejected'))
      .mockResolvedValueOnce({
        data: {},
        meta: {},
        httpStatus: 200,
        envelope: { status: true, response: {} },
      });
    renderPage();
    fireEvent.click(await screen.findByTestId('admin.help_boxes.delete.7'));
    const dialog = screen.getByTestId('admin.help_boxes.delete_confirm');
    fireEvent.click(within(dialog).getByRole('button', { name: 'common.delete' }));
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('Help delete rejected');
    expect(dialog).toHaveTextContent('#7');
    expect(dialog).toHaveTextContent('Help');
    expect(within(dialog).getByRole('button', { name: 'common.cancel' })).toBeEnabled();
    expect(notifications.pushToast).not.toHaveBeenCalled();
    fireEvent.click(within(dialog).getByRole('button', { name: 'common.delete' }));
    await waitFor(() => expect(screen.queryByTestId('admin.help_boxes.delete_confirm')).not.toBeInTheDocument());
    expect(deleteHelpBox).toHaveBeenCalledTimes(2);
    expect(notifications.pushToast).toHaveBeenCalledWith({ variant: 'ok', title: 'admin.help_boxes.toast.deleted' });
  });
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
