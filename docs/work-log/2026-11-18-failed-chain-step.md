# Initially open the failed transaction step — 2026-11-18

ACT-08 / REQ-051. The maintainer delegates pending model choices. Select the
variant which initially opens the first failed step,with successful steps
remaining collapsed. Individual transaction payloads already appear directly;
this change is limited to chain-step expansion.

Derive the initial expansion from loaded failure data until the user acts.
Manual state is keyed to chain ID and takes precedence after toggling or
expand/collapse-all,without an effect that reopens a deliberately closed step
on later renders. Keep filtering,chronological summary rows and API reads.
Update existing browser assertions to include the intentional default-open
row while still checking summary order and keyboard collapse/reopen.

No localization/API/SDK,payload,permission,mutation or polling change. Exact
focused checks,browser qualification,CI and paired preview remain pending.
New cases use intercepted API/session and delayed synthetic reads; they do
not certify real API timing or account permissions.
