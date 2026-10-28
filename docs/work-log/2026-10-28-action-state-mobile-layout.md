# Reachable transaction details in task inspection — 2026-10-28

Status: prepared review candidate; no merge/deployment. REQ-010/012.

The broad mobile baseline exposed a real problem in action-state detail for
both members and admins. Its ten-column, minimum-large-width table could push
the document sideways; Playwright's ordinary click repeatedly landed under
other cards, and the detail toggle was not usable. This differs from older
mobile cases that merely target hidden desktop-only representations.

Use a fixed-width responsive table with three mobile columns (state, operation,
detail control), retaining ID/node/VPS context under the operation as their
separate columns disappear. All original desktop metadata remains in the full
view and expanded details. Reuse the existing breakpoint-aware column-count
hook, including dynamic colspan to avoid phantom WebKit columns. Enlarge the
small touch target and provide aria-expanded/controls. Permissions, API requests,
polling, mutation state, filtering and payload serialization remain unchanged.
Existing translated labels are reused; no catalog or wording changes.

A new strictly typed regression covers member/admin views, normal first-tap
expansion/collapse, multiline payload contents and document-width bounds. It is
selected for desktop/mobile PR smoke and mobile WebKit. Capture implemented
synthetic desktop/mobile screenshots; never authenticated real user content.
The old broad mobile failure and new before-fix reproduction must be retained.
Final counts and PR/commit references follow verification.

## Explicit dependency and retained attempts

This candidate is stacked on header PR109 (`2895f24f`): its strict768px admin
check independently found global account-label overflow. The first six table
checks passed; adding intermediate widths exposed that separate defect (13/14
passed), so the assertion was retained and the dependency fixed separately.
Only own unpublished local edits were stashed/fast-forwarded; both work-log
entries and both WebKit selectors were preserved when resolving the overlap.
Initial runner install permissions and missing JSDOMmatchMedia were test setup
issues, resolved with an owned-directory correction and an explicit unit browser
API stub. The actual before-fix width regression remains393px/820px.

## Completed local verification

With the explicit header dependency, all14focused browser checks passed with
zero retries: the original member/admin/reload/cancel scenarios in Chromium and
mobile Chrome, and the new member/admin width/first-tap/payload checks in all
three projects including mobile WebKit. Intermediate768/1024/1280px expanded
colspans are4/5/10; mobile remains3 without document overflow.

ci:quick and9combined parent/header unit tests passed. A production build of
the table candidate and of the header candidate passed separately; the final
stacked build and documentation audits also passed before publication. Implemented synthetic compact
desktop/mobile screenshots and expanded-detail images are attached to browser
artifacts. Existing payload formatting/copying and API/permission behavior remain
unchanged; this is not a live API certification of a deployed candidate.
