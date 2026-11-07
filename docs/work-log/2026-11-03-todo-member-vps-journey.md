# UX-02: verify one complete member VPS journey

The maintainer authorized implementing approved TODO work as focused PRs and
previewing selected changes, without PR approvals, merges or production rollout.
UX-02 is bounded to one member journey: find a VPS, open its resource editor,
review a memory change, recover from a known rejection, track acceptance through
completion, open access, review a saved SSH-key deployment, verify its result,
and return to the list with the same VPS identity.

Existing specs exercised these screens independently. Add a bilingual regression
that traverses the actual UI routes without replacing them by direct page loads.
Verify both target confirmations, no write before confirmation, exact payloads,
preserved resource input after rejection, separate pending/completed Tasks and
visible result. All identities and API writes are intercepted synthetic fixtures;
this is not evidence of real VPS provisioning, resize or SSH deployment. Actual
positive dev workflows remain blocked by the separately recorded mailer issue.

Register the new spec in WebKit selection and the strict E2E type inventory.
No application/API behavior or runtime dependencies are changed by this PR.

## Verification

- Focused remote browser checks: 6 passed, 0 failed, no retries; desktop
  Chromium, mobile Chrome and mobile WebKit.
- `npm run ci:quick` passed (including strict E2E adoption, typechecks,
  design documentation, localization, mutation and structural audits).
- Production build/full-suite evidence will be recorded for the combined preview;
  this entry does not anticipate that result.

- PR and preview activation: not yet performed; this is prepared work.

## Scope, documentation and release limits

TODO decisions were read at revision 14; approvals, comments and completion
remain untouched. Requirements: REQ-013, REQ-017, REQ-023. Base: `13a39a58` on
`kerrycek-021126`; main, colleagues' PRs and held DNS changes are excluded.
Locked terminology reference read: vpsadmin `a65a4dfeb92a59df4a80a737a20bcbf8558793ff`.
No UI wording changes. The linked KB workflow describes legacy vpsAdmin input
pins; do not pin that API/legacy input to a React WebUI commit. This work does
not publish KB pages or claim external documentation/screenshot currency.
Screenshots below, when present, use synthetic member data on the pinned
server runner. They are implemented UI evidence, not a real API audit.

The live TODO report and canonical continuity record retain full paths to
private run artifacts and the known dependency/TLS/mailer limitations.

## Probe correction

The first long journey passed four cases but timed out in WebKit: it attempted
to open Tasks through shell navigation while the SSH progress panel already
provided Open tasks. Use that actual progress action, retain all pending/result
assertions, and allow 180 seconds for the composed cold-load/two-operation
scenario. Individual expect budgets and zero retries are unchanged. The final
six cases passed. Original failure evidence remains in the private runner tree.
