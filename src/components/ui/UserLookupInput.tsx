import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { searchUsers, type User } from '../../lib/api/users';
import { useDebouncedValue } from '../../lib/hooks/useDebouncedValue';
import { parseLookupIdLike } from '../../lib/lookupInput';
import { LookupCombobox } from './LookupCombobox';

export function UserLookupInput(props: {
  /** Raw input value (typically a user id string, but may be a query while searching). */
  value: string | number | null | undefined;
  onChange?: (value: string) => void;
  /** Backward-compatible alias used by older pages. */
  setValue?: (value: string) => void;

  /** Called when the user picks a suggestion. */
  onPick?: (user: User) => void;

  placeholder?: string;
  disabled?: boolean;
  testId?: string;
  ariaLabel?: string;
  label?: React.ReactNode;
  className?: string;

  /** Suggestion count limit. */
  limit?: number;

  loadingLabel?: string;
  noResultsLabel?: string;
  /** Backward-compatible flag kept for older call sites. */
  allowRawId?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const value = props.value == null ? '' : String(props.value);
  const needle = value.trim();
  const debounced = useDebouncedValue(needle, 200);
  const waiting = needle !== debounced;
  const eligible = needle.length >= 2 && parseLookupIdLike(needle) === null;
  const limit = props.limit && props.limit > 0 ? props.limit : 8;
  const setValue = props.onChange ?? props.setValue ?? (() => {});
  const q = useQuery({
    queryKey: ['users', 'search', { q: debounced, limit }],
    enabled: open && !props.disabled && eligible && !waiting,
    queryFn: async () => (await searchUsers({ q: debounced, limit })).data,
    staleTime: 10_000,
  });
  const options = useMemo(
    () =>
      waiting || q.isFetching || q.isError
        ? []
        : (q.data ?? []).map((user) => ({
            value: user,
            id: user.id,
            title: user.login || `#${user.id}`,
            detail: [user.full_name, user.email].filter(Boolean).join(' · '),
          })),
    [waiting, q.isFetching, q.isError, q.data]
  );
  return (
    <LookupCombobox
      {...props}
      value={value}
      onChange={setValue}
      onPick={(user) => {
        setValue(String(user.id));
        props.onPick?.(user);
      }}
      open={open}
      onOpenChange={setOpen}
      showSuggestions={eligible}
      options={options}
      busy={waiting || q.isLoading || q.isFetching}
      failed={q.isError}
    />
  );
}
