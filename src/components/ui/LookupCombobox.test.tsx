import React, { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import { UserLookupInput } from './UserLookupInput';
import { NodeLookupInput } from './NodeLookupInput';
import { LookupCombobox } from './LookupCombobox';
import { searchUsers } from '../../lib/api/users';
import { fetchNodes } from '../../lib/api/nodes';

vi.mock('../../app/i18n', () => ({ useI18n: () => ({ t: (key: string) => key }) }));
vi.mock('../../lib/api/users', () => ({ searchUsers: vi.fn() }));
vi.mock('../../lib/api/nodes', () => ({ fetchNodes: vi.fn() }));
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

for (const kind of ['user', 'node'] as const) {
  test(`${kind} commits on click, preserves focus and consumes only the first Escape`, async () => {
    vi.mocked(searchUsers).mockResolvedValue({ data: [{ id: 7, login: 'alpha' }] } as Awaited<
      ReturnType<typeof searchUsers>
    >);
    vi.mocked(fetchNodes).mockResolvedValue({ data: [{ id: 7, domain_name: 'alpha' }] } as Awaited<
      ReturnType<typeof fetchNodes>
    >);
    const picked = vi.fn();
    function Harness() {
      const [value, setValue] = useState('');
      const Component = kind === 'user' ? UserLookupInput : NodeLookupInput;
      return <Component value={value} onChange={setValue} onPick={picked} ariaLabel="Lookup" />;
    }
    render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <Harness />
      </QueryClientProvider>
    );
    const input = screen.getByRole('combobox');
    act(() => input.focus());
    fireEvent.change(input, { target: { value: 'al' } });
    const option = await screen.findByRole('option');
    fireEvent.mouseDown(option);
    expect(picked).not.toHaveBeenCalled();
    fireEvent.click(option);
    expect(picked).toHaveBeenCalledTimes(1);
    expect(input).toHaveValue('7');
    expect(input).toHaveFocus();
    fireEvent.change(input, { target: { value: 'al' } });
    await screen.findByRole('option');
    const escape = vi.fn();
    window.addEventListener('keydown', escape);
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(escape).not.toHaveBeenCalled();
    expect(screen.queryByRole('option')).toBeNull();
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(escape).toHaveBeenCalledTimes(1);
    window.removeEventListener('keydown', escape);
  });
}

test('user lookup cannot pick an obsolete result while another query is debouncing', async () => {
  vi.mocked(searchUsers).mockResolvedValue({ data: [{ id: 7, login: 'alpha' }] } as Awaited<
    ReturnType<typeof searchUsers>
  >);
  const picked = vi.fn();
  function Harness() {
    const [value, setValue] = useState('');
    return <UserLookupInput value={value} onChange={setValue} onPick={picked} />;
  }
  render(
    <QueryClientProvider client={new QueryClient()}>
      <Harness />
    </QueryClientProvider>
  );
  const input = screen.getByRole('combobox');
  act(() => input.focus());
  fireEvent.change(input, { target: { value: 'al' } });
  await screen.findByRole('option');
  fireEvent.change(input, { target: { value: 'beta' } });
  expect(screen.queryByRole('option')).toBeNull();
  fireEvent.keyDown(input, { key: 'Enter' });
  expect(picked).not.toHaveBeenCalled();
});

test('pointer hover preserves a manually scrolled list while arrow keys reveal their active option', () => {
  const calls: HTMLElement[] = [];
  const original = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'scrollIntoView');
  Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
    configurable: true,
    value: function (this: HTMLElement) {
      calls.push(this);
    },
  });
  try {
    const options = Array.from({ length: 8 }, (_, index) => ({
      id: index + 1,
      value: index + 1,
      title: `Member ${index + 1}`,
    }));
    render(
      <LookupCombobox
        value="member"
        onChange={() => {}}
        onPick={() => {}}
        open
        onOpenChange={() => {}}
        showSuggestions
        options={options}
        busy={false}
        failed={false}
        ariaLabel="Member"
        testId="lookup"
      />
    );
    const popup = screen.getByTestId('lookup.dropdown');
    popup.scrollTop = 300;
    calls.length = 0;
    fireEvent.mouseEnter(screen.getByRole('option', { name: 'Member 5 #5' }));
    expect(screen.getByRole('combobox')).toHaveAttribute(
      'aria-activedescendant',
      screen.getByRole('option', { name: 'Member 5 #5' }).id
    );
    expect(calls).toEqual([]);
    expect(popup.scrollTop).toBe(300);
    fireEvent.keyDown(screen.getByRole('combobox'), { key: 'ArrowDown' });
    expect(calls).toEqual([screen.getByRole('option', { name: 'Member 6 #6' })]);
  } finally {
    if (original) Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', original);
    else Reflect.deleteProperty(HTMLElement.prototype, 'scrollIntoView');
  }
});
