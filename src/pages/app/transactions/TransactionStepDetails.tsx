import type { Transaction } from '../../../lib/api/transactions';
import { formatDateTime } from '../../../lib/format';
import { refLabel } from '../../../lib/resources';
import { formatPayload, transactionErrorText } from '../../../lib/txFormat';
import { TransactionDebugSections } from '../../../components/ui/TransactionPayloadPanels';
import type { TransactionChainsTranslator } from './transactionChainSemantics';

export function TransactionStepDetails({ tx, t }: { tx: Transaction; t: TransactionChainsTranslator }) {
  const metadata = [
    [t('transactions.tx.queued_at_label'), formatDateTime(tx.created_at)],
    [t('common.started'), formatDateTime(tx.started_at)],
    [t('common.finished'), formatDateTime(tx.finished_at)],
    [t('common.user'), refLabel(tx.user) ?? t('common.na')],
    [t('transactions.tx.type_label'), tx.type === undefined ? t('common.na') : String(tx.type)],
    [t('transactions.tx.prio_label'), tx.priority === undefined ? t('common.na') : String(tx.priority)],
    [
      t('transactions.tx.depends_on'),
      Array.isArray(tx.depends_on)
        ? tx.depends_on
            .map((ref) => refLabel(ref))
            .filter(Boolean)
            .join(', ') || t('common.na')
        : (refLabel(tx.depends_on) ?? t('common.na')),
    ],
  ];
  return (
    <div className="min-w-0 space-y-4 py-4">
      <dl className="grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
        {metadata.map(([label, value]) => (
          <div key={label} className="min-w-0">
            <dt className="text-muted">{label}</dt>
            <dd className="mt-1 break-words">{value}</dd>
          </div>
        ))}
      </dl>
      <TransactionDebugSections
        t={t}
        input={formatPayload(tx.input)}
        output={formatPayload(tx.output)}
        errorText={transactionErrorText(tx)}
        source={tx}
        raw={tx}
        payloadLayout="stacked"
        readablePayload
      />
    </div>
  );
}
