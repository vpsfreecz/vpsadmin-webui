import React from 'react';

export function NetworkSummaryTable(props: {
  caption: string;
  rowHeading: string;
  columns: string[];
  rows: Array<{ label: string; values: Array<{ text: string; testId?: string }> }>;
  testId: string;
}) {
  return (
    <div className="rounded-lg border border-border" data-testid={props.testId}>
      <table className="w-full table-fixed text-left text-sm [overflow-wrap:anywhere]">
        <caption className="sr-only">{props.caption}</caption>
        <thead className="border-b border-border bg-surface-2 text-xs text-muted">
          <tr>
            <th scope="col" className="px-2 py-2 font-medium">
              {props.rowHeading}
            </th>
            {props.columns.map((label) => (
              <th key={label} scope="col" className="px-2 py-2 text-right font-medium">
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {props.rows.map((row) => (
            <tr key={row.label}>
              <th scope="row" className="px-2 py-2 text-xs font-medium text-muted">
                {row.label}
              </th>
              {row.values.map((value, index) => (
                <td
                  key={index}
                  className="px-2 py-2 text-right font-medium tabular-nums text-fg"
                  data-testid={value.testId}
                >
                  {value.text}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
