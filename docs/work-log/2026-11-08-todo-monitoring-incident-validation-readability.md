# Monitoring and incident inline validation readability

Scope: approved UX-03 / UX-04, REQ-043 and REQ-051. Actual clean preview652 baseline inspection found small danger-colored body text on the ordinary dark card in the incident VPS lookup error and in both monitoring custom-until dialogs. The exact baseline fixtures, screenshots, geometry and diagnostics are retained under `/data/webui-browser-runner/verification-20261103/todo-monitoring-incident-presentation-audit-20261108`.

Only the three existing inline error class lists change: readable foreground and medium weight, with a separate danger-colored left marker. Keep existing Czech/English messages, state and validation, retry/action behavior, IDs, queries, role/mode contracts and payloads. No new wording, catalogs, API/BFF or dependency changes. The focused13a incident page has the historical HaveAPI error-helper import; current integrated source uses apiErrors. Preserve that modern import when integrating; do not copy the old page wholesale.

Existing browser specs now cover rendered contrast on each actual card/dialog surface, medium weight, marker, 1280/320 containment, invalid-disabled/valid-enabled date decisions and zero intercepted writes. Adopt both complete touched specs into strict E2E typing without raising the baseline. These are fixture checks, not live API permissions/OAuth, physical display/Safari or full WCAG certification.

Status: local preparation; source/browser/CI/package/paired-preview verification pending. The broad finite acceptance matrix and both TODO tasks remain partial. No merge, production activation or timer/controller changes are authorized by this follow-up.

The first source check rejected the modified legacy route exception (652lines versus647 baseline, content-bound allowance). Extract the existing UntilPreset/untilIso block unchanged into monitoringEventUntil.ts and remove the resolved exception; the route is now below647. No budget or baseline increase. The original structural-check failure remains recorded.

Strict adoption records include both explicit tsconfig roots and the coverage manifest, removing the two touched specs from deferred while preserving the immutable baseline. The first incomplete-manifest audit failure is retained; no coverage waiver.
