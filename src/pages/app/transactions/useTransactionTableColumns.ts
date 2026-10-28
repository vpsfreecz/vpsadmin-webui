import { useSyncExternalStore } from 'react';

// Match the table's md/lg/xl visibility classes. A fixed colspan of seven
// creates phantom columns in WebKit when the narrow table has only three.
const columnBreakpoints = ['(min-width: 48rem)', '(min-width: 64rem)', '(min-width: 80rem)'];
function subscribeColumns(onChange: () => void) {
  const queries = columnBreakpoints.map((query) => window.matchMedia(query));
  queries.forEach((query) => query.addEventListener('change', onChange));
  return () => queries.forEach((query) => query.removeEventListener('change', onChange));
}
function visibleColumns() {
  const [md, lg, xl] = columnBreakpoints.map((query) => window.matchMedia(query).matches);
  return xl ? 7 : lg ? 5 : md ? 4 : 3;
}

export function useTransactionTableColumns(extraDesktopColumns = 0) {
  const columns = useSyncExternalStore(subscribeColumns, visibleColumns, () => 3);
  return columns === 7 ? columns + extraDesktopColumns : columns;
}
