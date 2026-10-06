import React from 'react';
import { act, cleanup, render, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider, QueryObserver } from '@tanstack/react-query';
import { afterEach, expect, it, vi } from 'vitest';
import { ApiLanguageSync } from './ApiLanguageSync';

const state = vi.hoisted(() => ({ lang: 'en' }));
vi.mock('./i18n', () => ({ useI18n: () => state }));
afterEach(() => { cleanup(); state.lang = 'en'; });

it('refreshes reads and stale inactive data, discarding old-language responses without replaying mutations', async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  client.setQueryData(['inactive'], 'English');
  let completeOld!: (value: string) => void;
  const oldResponse = new Promise<string>(resolve => { completeOld = resolve; });
  const read = vi.fn(() => state.lang === 'en' ? oldResponse : Promise.resolve('Česky'));
  const observer = new QueryObserver(client, { queryKey: ['transaction', 1], queryFn: read });
  const unsubscribe = observer.subscribe(() => {});
  const write = vi.fn(async () => 'saved');
  await client.getMutationCache().build(client, { mutationFn: write }).execute(undefined);
  const tree = () => <QueryClientProvider client={client}><ApiLanguageSync /><input defaultValue="draft" /></QueryClientProvider>;
  const view = render(tree());
  const editor = view.getByRole('textbox');
  expect(read).toHaveBeenCalledTimes(1);
  state.lang = 'cs';
  view.rerender(tree());
  await waitFor(() => expect(client.getQueryData(['transaction', 1])).toBe('Česky'));
  await act(async () => { completeOld('English'); await oldResponse; });
  expect(client.getQueryData(['transaction', 1])).toBe('Česky');
  expect(client.getQueryState(['inactive'])?.isInvalidated).toBe(true);
  expect(view.getByRole('textbox')).toBe(editor);
  expect(write).toHaveBeenCalledTimes(1);
  unsubscribe(); client.clear();
});
