# Bulk member package removal — 2026-10-27

Status: prepared on `dev/packages-bulk-delete`, based on main `5a2d2bdc`.
Not merged or deployed. No live packages or resource limits were changed.

## Request and scope

The maintainer asked to remove multiple packages from the administrator view.
The maintainer confirmed Users → selected member → Packages as the intended
scope. This candidate removes assignments and does not delete shared catalog
package definitions. REQ-076 and the workflow/action contracts describe that scope.

## Implementation

- Checkbox selection of visible removable assignments, select-visible and clear;
  the existing 500-row loaded-list boundary remains explicit.
- Confirmation lists the member, exact assignment IDs, labels and environments,
  and the effect on resource limits. Repeated instances of the same package
  definition remain distinct assignments. Personal and unknown-type packages
  are protected; foreign-owner rows cannot enter a new selection.
- Sequential calls to the existing synchronous DELETE endpoint; no new API and
  no atomic-success assumption. Per-item success/rejection/unknown/not-attempted
  outcomes remain visible. Only failed/unattempted items stay selected.
- Unknown outcomes stop further writes and block blind retries. Explicit fresh
  read plus clearing the old selection allows a newly reviewed selection, without
  relabeling an uncertain old outcome as successful. 401/403 also stop the batch.
- An immutable reviewed snapshot survives owner navigation without targeting
  the new member. An immediate ref guard blocks duplicate submit and pending
  cancellation before React's pending render commits.
- Assignment and usage caches refresh after known results; read errors are
  explicit rather than an empty-list proof. Existing single-item actions cannot
  interleave with an active/uncertain batch.

Read-only inspection confirmed `UserClusterResourcePackage::Delete` is admin-only,
returns synchronously and rejects personal base packages via `can_destroy?`.
Deleting a shared catalog definition has different effects and is not used here.

Localization follows both guides from locked vpsAdmin revision
`a65a4dfeb92a59df4a80a737a20bcbf8558793ff` (`vpsadminServices`). Czech copy uses
informal address. The standalone React navigation adds no legacy KB selector;
external KB screenshots have not been certified by these local fixtures.

## Verification

Final local receipts and synthetic desktop/mobile captures are recorded below.
The first focused browser run found a real immediate-Escape race before the
pending render (two Chrome failures, WebKit passed); the synchronous ref guard
addresses it. Initial fixture type checking also required complete User seeds.
These early failures are not counted as successful verification.

## Final local receipts

- Toolchain matches `.node-version`/lock: Node 24.21.0, npm 11.19.0. The official
  Node archive was checked against its SHA-256 manifest. Root and BFF used npm ci.
- `npm run ci:quick`: passed, including types, localization, structural/mutation
  audits, documentation and strict E2E coverage (72 adopted, 196 deferred).
- `npm test`: 302 files, 1,876 tests passed (including seven new model cases).
- `npm run test:scripts`: 226 passed. `npm run test:bff`: 57 passed.
- `npm run build`: passed with the existing large-chunk warning.
- Targeted Playwright: 24 passed. New selection/cancel/confirmation, role,
  owner-navigation, partial-rejection and ambiguous-result cases ran on desktop
  Chrome, mobile Chrome and mobile WebKit; existing member resource/package
  regressions ran on desktop/mobile Chrome. Both cs/en are covered.

Root production audit has zero findings. Main's unchanged BFF dependency audit
still reports high body-parser advisory GHSA-27r3-jxmh-p828; the separate prepared
`dev/bff-body-parser-patch` review addresses it. This feature does not modify BFF
or dependency locks and does not claim that remote release CI is entirely green.
No Nix package build or deployed/live mutation test was run for this candidate.
Browser evidence is synthetic fixtures, not a live permission/quotas audit.

The current checkout's author/committer were checked; no active hook files or
hook framework were declared. GitHub CLI still returns HTTP 401. The Safari
fallback again timed out, so PR creation/remote PR CI cannot be claimed. The
feature branch and prepared PR body remain reviewable; no merge or deployment
was authorized or performed.

## Implemented UI captures

Captured from the tested working tree based on `5a2d2bdc`, using only synthetic
member and package data. No real quotas or packages were changed.

[Desktop selection](screenshots/2026-10-27-user-package-bulk-removal/desktop-selection.png)

[Desktop confirmation](screenshots/2026-10-27-user-package-bulk-removal/desktop-confirmation.png)

[Mobile selection](screenshots/2026-10-27-user-package-bulk-removal/mobile-selection.png)

[Mobile confirmation](screenshots/2026-10-27-user-package-bulk-removal/mobile-confirmation.png)

## 2026-10-27 — PR #93 CI security prerequisite

Carry PR #88's body-parser 1.20.9 and qs 6.16.1 baseline through an ordinary
merge commit, preserving this feature and all published history. The independent
review base is `dev/bff-body-parser-patch`; return to main after explicitly
approved security integration. No PR is merged into main and no deployment.

Integrated `ci:quick`, fresh root/BFF installs and the BFF production audit passed
locally; the audit reports zero vulnerabilities. The security candidate's full
Nix frontend/BFF and provenance/source/package checks also passed in isolation.
Remote CI on this new feature head is a separate pending result. See
[shared diagnosis and evidence](2026-10-27-ci-security-baseline.md).
