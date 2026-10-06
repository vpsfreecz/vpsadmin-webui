import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchNodes, type Node } from '../../lib/api/nodes';
import { useDebouncedValue } from '../../lib/hooks/useDebouncedValue';
import { parseLookupIdLike } from '../../lib/lookupInput';
import { LookupCombobox } from './LookupCombobox';

export function NodeLookupInput(props: {
  /** Raw input value (typically a node id string, but may be a query while searching). */
  value: string;
  onChange: (value: string) => void;

  /** Called when the user picks a suggestion. */
  onPick?: (node: Node) => void;
  selectedLabel?: string;

  placeholder?: string;
  disabled?: boolean;
  testId?: string;
  ariaLabel?: string;
  className?: string;

  /** Suggestion count limit. */
  limit?: number;

  /** How many nodes to load for client-side search. */
  fetchLimit?: number;

  loadingLabel?: string;
  noResultsLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const needle = props.value.trim();
  const debounced = useDebouncedValue(needle, 150);
  const waiting = needle !== debounced;
  const limit = props.limit && props.limit > 0 ? props.limit : 8;
  const fetchLimit = props.fetchLimit && props.fetchLimit > 0 ? props.fetchLimit : 250;
  const q = useQuery({
    queryKey: ['nodes', 'lookup', { limit: fetchLimit }],
    enabled: open && !props.disabled,
    queryFn: async () => (await fetchNodes({ limit: fetchLimit })).data,
    staleTime: 30_000,
  });
  const options = useMemo(() => {
    if (waiting || q.isFetching || q.isError || !needle) return [];
    const id = parseLookupIdLike(needle);
    const query = needle.toLowerCase();
    return (q.data ?? [])
      .filter((node) =>
        id !== null
          ? node.id === id
          : String(node.domain_name ?? node.name ?? '')
              .toLowerCase()
              .includes(query) ||
            String(node.fqdn ?? '')
              .toLowerCase()
              .includes(query)
      )
      .slice(0, limit)
      .map((node) => ({
        value: node,
        id: node.id,
        title: String(node.domain_name ?? node.name ?? `#${node.id}`),
        detail: String(node.fqdn ?? ''),
      }));
  }, [waiting, q.isFetching, q.isError, q.data, needle, limit]);
  return (
    <LookupCombobox
      {...props}
      value={props.selectedLabel && !open ? props.selectedLabel : props.value}
      onPick={(node) => {
        props.onChange(String(node.id));
        props.onPick?.(node);
      }}
      open={open}
      onOpenChange={setOpen}
      showSuggestions={needle.length > 0}
      options={options}
      busy={waiting || q.isLoading || q.isFetching}
      failed={q.isError}
    />
  );
}
