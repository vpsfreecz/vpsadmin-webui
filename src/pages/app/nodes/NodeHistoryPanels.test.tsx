import type { ReactNode } from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { NodeSysctl } from '../../../lib/api/nodeHistory';
import { NodeHistoryPanels } from './NodeHistoryPanels';

const state = vi.hoisted((): { row: NodeSysctl } => ({ row: { id: 1 } }));
vi.mock('../../../app/auth', () => ({ useAuth: () => ({ role: 'admin' }) }));
vi.mock('../../../app/i18n', () => ({ useI18n: () => ({ lang: 'en', t: (key: string) => key }) }));
vi.mock('./NodeHistoryTable', () => ({
  NodeHistoryTable: ({ columns }: { columns: Array<{ label: string; render: (row: NodeSysctl) => ReactNode }> }) => (
    <div>
      {columns.map((column) => (
        <div key={column.label} data-testid={column.label}>
          {column.render(state.row)}
        </div>
      ))}
    </div>
  ),
}));

describe('sysctl observation display', () => {
  it.each([
    [{ id: 1 }, 'state.unknown'],
    [{ id: 1, available: null }, 'state.unknown'],
    [{ id: 1, available: true }, 'state.unknown'],
    [{ id: 1, available: true, configured_value: '1', effective_value: null }, 'state.unknown'],
    [{ id: 1, available: false }, 'admin.node.history.unavailable'],
    [{ id: 1, available: true, configured_value: null }, 'admin.node.history.not_configured'],
    [{ id: 1, available: true, configured_value: '', effective_value: '' }, 'admin.node.history.matches'],
    [{ id: 1, available: true, configured_value: '1', effective_value: '2' }, 'admin.node.history.differs'],
  ] satisfies Array<[NodeSysctl, string]>)('keeps missing observations distinct for %j', (row: NodeSysctl, expected) => {
    state.row = row;
    render(<NodeHistoryPanels nodeId={7} section="sysctls" />);
    expect(screen.getByTestId('admin.node.history.result')).toHaveTextContent(expected);
    expect(screen.getByTestId('admin.node.history.configured')).toHaveTextContent(
      row.configured_value === null ? 'admin.node.history.not_configured' : (row.configured_value ?? 'state.unknown')
    );
  });
});
