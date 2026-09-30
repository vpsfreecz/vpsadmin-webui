# 2026-09-30 — Immediate detail after accepted VPS creation

## Request and change

The maintainer requested the legacy interaction: after creation is accepted,
open the new VPS detail while provisioning continues. Previously navigation
already happened after acceptance, but VpsLayout deferred the detail query and
showed only a loading indicator until the create action finished. Tasks also
opened automatically over the destination.

The detail now loads immediately with a localized creation banner and an explicit
Tasks link. It distinguishes pending, successful, failed and unverifiable results,
shows transaction progress when supplied, and refreshes detail/IP/transaction data
after completion. Before the API can provide the detail, the accepted VPS ID and
status remain visible. Existing local/action locks and durable creation receipts
remain authoritative; no blind retry or second create request was introduced.
Owner context survives the redirect and reload. Requirement: REQ-023.

The accepted-response handoff was extracted into `acceptVpsCreation.ts` without
changing its receipt/lock/scope order. VpsCreatePage is now under 500 lines; its
resolved structural-debt exception was removed, not enlarged or rebaselined.

## Verification

Candidate based on WebUI `534caa83a5f97d2b40b4a126886649b14dc9e8d3`, branch
`dev/vps-create-immediate-detail`.

- `npm run ci:quick`: passed, including lint, localization/design/structural
  audits and all required TypeScript checks. Both touched browser specs joined
  the strict E2E type-check set (13 adopted files on this branch).
- `npm run ci:tests`: 222 script, 57 BFF and 1,628 unit tests passed.
- `npm run build`: passed; the existing large-chunk advisory remains.
- Desktop fixture regression: 19 cases passed across `vps_create_failures`,
  `vps_create_admin_flow` and `vps_creation_progress`. This includes owner context,
  accepted receipts, missing action IDs, persistence failures and duplicate guards.
- Final responsive verification: four cs/en progress cases plus two actual
  submit-to-detail/completion cases passed on Chromium and mobile Chromium.
  They cover unavailable initial detail, reload, status fetch failure, task failure,
  immediate detail visibility, mutation locks and refresh after completion.
- Intermediate checks caught and corrected a locale-fixture setup mistake and
  an extra JSX closing tag. The final checks above are passing reruns; neither
  test expectations nor quality gates were weakened to hide those failures.
- No declared Git hook framework or custom hooks path was found.

Synthetic screenshots, reviewed on desktop and mobile:
[Czech desktop](screenshots/vps-create-pending-desktop-cs.png) and
[Czech mobile](screenshots/vps-create-pending-mobile-cs.png).

Status: prepared for review; GitHub CI is a separate check on the pushed commit.
No merge, shared deployment, or real VPS mutation was performed for this change.
Browser tests use API fixtures and do not certify live provisioning timing.

Localization guide: exact locked vpsAdmin revision
`a65a4dfeb92a59df4a80a737a20bcbf8558793ff`, both `docs/i18n-cs.md` and
`docs/agent-instructions/localization.md` read through Git at that revision.
Local Nix is unavailable and the remote root filesystem is full; no floating
branch or sibling working-tree wording was substituted. Reused the previously
resolved pinned Node 24.21.0 runtime and dependency trees in an isolated scratch
checkout on the dev host, without changing deployed services or installing there.
The new post-create banner changes cs/en screenshots; external KB captures have
not been regenerated and are not claimed current by these fixture tests.
