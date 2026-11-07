import type { Dataset } from '../../../lib/api/datasets';

// Dataset#index orders by name, but HaveAPI's cursor compares IDs.
// Take one bounded subtree snapshot and paginate it locally instead.
export const MOUNT_DATASET_LIMIT = 1000;
export const MOUNT_DATASET_PAGE_SIZE = 25;

export function positiveId(value: unknown): number | null {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0 ? value : null;
}

export function mountDatasetMatches(dataset: Dataset, root: Dataset, ownerId: number): boolean {
  const prefix = root.name;
  return (
    positiveId(dataset.id) !== null &&
    dataset.id !== root.id &&
    typeof prefix === 'string' &&
    prefix.length > 0 &&
    typeof dataset.name === 'string' &&
    dataset.name.startsWith(`${prefix}/`) &&
    dataset.user?.id === ownerId
  );
}

export function completeMountDatasetSnapshot(length: number, total: number | undefined): boolean {
  if (total !== undefined)
    return Number.isSafeInteger(total) && total >= 0 && total === length && total <= MOUNT_DATASET_LIMIT;
  return length < MOUNT_DATASET_LIMIT;
}

export function mountDatasetPage(datasets: Dataset[], search: string, page: number) {
  const needle = search.trim().toLocaleLowerCase();
  const matches = datasets
    .filter((dataset) => (dataset.name ?? '').toLocaleLowerCase().includes(needle))
    .sort((a, b) => (a.name ?? '').localeCompare(b.name ?? '') || a.id - b.id);
  const pages = Math.max(1, Math.ceil(matches.length / MOUNT_DATASET_PAGE_SIZE));
  const currentPage = Math.min(Math.max(0, page), pages - 1);
  return {
    items: matches.slice(currentPage * MOUNT_DATASET_PAGE_SIZE, (currentPage + 1) * MOUNT_DATASET_PAGE_SIZE),
    pages,
    currentPage,
  };
}
