// i18n-ignore-file
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { IncomingPaymentsBulkActions } from './IncomingPaymentsBulkActions';
import type { IncomingPaymentBulkAction } from './IncomingPaymentsBulkModel';

vi.mock('../../../app/i18n', () => ({
  useI18n: () => ({ t: (key: string) => key }),
}));

function actions(selectedIds: number[], action: IncomingPaymentBulkAction = 'mark_unmatched') {
  return (
    <IncomingPaymentsBulkActions
      rows={[{ id: 300, state: 'queued' }]}
      selectedIds={new Set(selectedIds)}
      action={action}
      applying={false}
      onActionChange={vi.fn()}
      onReplaceSelection={vi.fn()}
      onClearSelection={vi.fn()}
      onApply={vi.fn(async () => {})}
    />
  );
}

describe('IncomingPaymentsBulkActions', () => {
  it('keeps selection available and reveals the bulk task only after selecting payments', () => {
    const view = render(actions([]));
    expect(screen.getByTestId('admin.payments.incoming.bulk.select_needs_review')).toBeEnabled();
    expect(screen.getByTestId('admin.payments.incoming.bulk.select_visible')).toBeEnabled();
    expect(screen.queryByTestId('admin.payments.incoming.bulk.review.open')).not.toBeInTheDocument();

    view.rerender(actions([300]));
    expect(screen.getByTestId('admin.payments.incoming.bulk.review.open')).toBeEnabled();

    view.rerender(actions([]));
    expect(screen.queryByTestId('admin.payments.incoming.bulk.review.open')).not.toBeInTheDocument();
  });

  it.each([
    ['mark_ignored', 'payments.incoming.bulk.review.warning.ignored'],
    ['mark_processed', 'payments.incoming.bulk.review.warning.processed_without_user'],
  ] as const)('retains the financial warning for %s after selection', (action, warning) => {
    render(actions([300], action));
    fireEvent.click(screen.getByTestId('admin.payments.incoming.bulk.review.open'));

    expect(screen.getByTestId('admin.payments.incoming.bulk.review.warning')).toHaveTextContent(warning);
    expect(screen.getByTestId('admin.payments.incoming.bulk.review.confirm')).toBeEnabled();
  });
});
