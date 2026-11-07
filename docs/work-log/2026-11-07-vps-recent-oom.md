# Recent OOM reports on the VPS overview

DIA-01 from the approved TODO series, linked to REQ-051. The diagnostics
card on the member VPS overview shows up to three recent OOM reports.
A row includes the report ID, time and killed process when provided.
The list preserves the VPS filter and provides direct report links.
Loading, an empty list and a failed request have separate states.

Terminology and API checked at a65a4dfeb92a59df4a80a737a20bcbf8558793ff.
The API filters by VPS, orders reports by creation time and restricts a
member's results to their VPS. The card also drops mismatched VPS references.
No new write or permission is involved.
