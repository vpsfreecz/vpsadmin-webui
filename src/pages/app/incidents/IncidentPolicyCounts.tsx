import { useI18n } from '../../../app/i18n';

export interface IncidentPolicyCountRow {
  days: number | null | undefined;
  count: number | null | undefined;
  limit: number | null | undefined;
}

/** Current and saved callers supply their own facts; this view never substitutes between them. */
export function IncidentPolicyCounts(props: { warning: IncidentPolicyCountRow; stop: IncidentPolicyCountRow }) {
  const { t, tc } = useI18n();
  return (
    <table className="w-full table-fixed text-left text-sm" data-testid="incidents.policyCounts">
      <thead>
        <tr className="border-b border-border text-xs text-muted">
          <th className="w-1/4 break-words py-2 pr-2 font-medium">{t('incidentEscalation.column.period')}</th>
          <th className="w-1/4 break-words py-2 pr-2 font-medium">{t('incidentEscalation.column.incidents')}</th>
          <th className="w-1/4 break-words py-2 pr-2 font-medium">{t('incidentEscalation.column.limit')}</th>
          <th className="w-1/4 break-words py-2 font-medium">{t('incidentEscalation.column.action')}</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-border">
        {(
          [
            ['warning', props.warning],
            ['stop', props.stop],
          ] as const
        ).map(([action, row]) => (
          <tr key={action}>
            <td className="break-words py-2 pr-2">
              {row.days != null ? tc('incidentEscalation.period', row.days) : t('common.na')}
            </td>
            <td className="break-words py-2 pr-2 font-mono tabular-nums">{row.count ?? t('common.na')}</td>
            <td className="break-words py-2 pr-2 font-mono tabular-nums">{row.limit ?? t('common.na')}</td>
            <td className="break-words py-2">{t(`incidentEscalation.category.${action}`)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
