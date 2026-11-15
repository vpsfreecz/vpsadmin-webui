# Select an authorized dataset when creating an export

Approved TODO EXP-01, reviewVersion `ee2d1cfe963626a9`, REQ-048. The existing
global form required a numeric dataset ID before offering that dataset's
snapshots. Offer available dataset names and preserve both source workflows.
Terminology reviewed at locked vpsAdmin `a65a4dfeb92a59df4a80a737a20bcbf8558793ff`.

## Contract and implementation

Reuse LookupCombobox's click/keyboard/touch contract, with opt-in full-label
wrapping for dataset options. Numeric names remain names; direct lookup requires
`#ID`. The actual selected ID stays distinct. The form still verifies the selected
dataset and resets snapshotId whenever selection changes. Fixed-dataset and
preselected snapshot entrypoints remain unchanged, including a snapshot outside
the existing first100 results.

Read a bounded authorized Dataset#index list, including user and count metadata.
Member/support options require the account owner. Administrator My view sends its
own user filter, filters foreign rows and retains the existing fresh mutation
ownership check. Do not widen permissions or replace authoritative server checks.
Failed/loading lists hide stale choices; retry and an honest incomplete-list
fallback remain available. Do not invent name-ordered pagination from numeric IDs.
The dataset picker is disabled during a pending Create; captured mutation fields,
error retention, other gates and API payloads remain unchanged.

## Verification status

Read-only dev baseline:4observations in CS/EN and Chromium/mobileWebKit used
actual old dev assets with synthetic API/session/VPS data. They confirmed numeric
Dataset input, correct snapshot reset, distinct lookup warning and missing help.
Original wrong-label probe failures and corrected4PASS results are retained.

Both native focused and cumulative checkouts passed the complete quick checks
and 10 targeted LookupCombobox/ExportModel unit tests each. The current dirty
cumulative build passed 102 selection cases and 81 existing export contract,
review and snapshot-shortcut cases across Chromium/mobileChrome/LinuxmobileWebKit,
with two workers and zero retries. New cases include actual emulated touch taps,
member/support/admin/My ownership, both source payloads, numeric names, stale
snapshot reset, failure/retry, bounded-list fallback, pending Create and long
unbroken names. These fixtures do not certify live permissions or physical Safari.

The long-name stress initially exposed review overflow; preserve the original
strict geometry assertion and wrap the actual dataset label. Original failure
screenshots and logs are retained. A separate private Python TLS static server
failed CSS delivery before application startup. Switching that private harness
to pinned Node HTTPS passed a 60-load probe followed by the full 102+81 cases;
no product transport, timeout, assertion, retry or CI setting changed.

This remains dirty working evidence, not committed-head/Nix/CI qualification.
Exact committed focused and cumulative qualification remains the next gate.
No live account/object or export was created for selection testing. A separate
read-only dev database metadata probe identified lab pool capabilities for the
later isolated duplicate-export investigation; it created no objects.

Evidence directory:
`/data/webui-browser-runner/verification-20261103/todo-export-selection-help-conflict-20261114`.
A final pre-push acceptance review also identified existing snapshot-list states:
loading, failure and empty results were not distinguished, and the first-100
limit was not disclosed. Add count metadata, explicit loading/error/empty feedback,
a read-only retry and a scoped link to the existing snapshot selection route.
Preserve the 100 limit, numeric cursor contract, preselected snapshot outside that
list, captured Create payload and server permissions. New cases cover delayed
responses from a previous dataset, empty/error/retry and partial/unknown lists. Verified-empty wording requires a known zero count,
not an empty page with absent count metadata. These
follow-up changes are not yet qualified; the original 102+45 focused and 102+81
cumulative clean runs describe the earlier picker commit only.

The canonical acceptance report distinguishes prepared, locally tested,
CI-qualified, paired deployed and protected TODO result publication. No current
PR, merge, deployment or task-completion claim for EXP-01. Current external KB
contract pins legacy PHP/API, not React; no unrelated KB pin or freshness claim.

The snapshot-state working build passed132 cases, including all original102 and
30 new state/race cases, without retry. A subsequent unknown-count refinement
passed6 additional cases on its own immutable dirty working build, without retry.
These are not138 cases on one build. Final exact committed quick/unit/build and
clean Nix/browser qualification must follow before the first source push.
