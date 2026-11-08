# OOM task API limit and pagination

Issue103 reports that Processes requests task[limit]=2000 while the API accepts
0–1000. Confirmed on currentmain47b6992 and our candidate; the older layout fixture
also asserted2000 and hid the contract failure. No comments or existing focused
fix PR were found at inspection. Full queued original6 explicitly requests a fix.

Use shared URL/session-backed ascending keyset pagination with25/50/100 visible
rows (default100), plus one look-ahead row. Every request is at most101, including
an invalid ?limit=2000 URL which the shared hook normalizes. Keep later processes
reachable, including beyond1000, and avoid an empty Next page after an exactly
full final page. The generated SDK0.4.0 already supports from_id and AbortSignal;
forward these in the existing adapter, retain its canonical task/tasks namespace
and typed output narrowing. Keep query identity scoped to report/view/cursor/size.
An error replaces rows and retries the same page. No backend/BFF/dependency or
capability changes, and no production report is fetched with user credentials.

Primary contracts: published SDK0.4.0 OomReport__Task__Index descriptor/input;
API Task::Index uses with_pagination and enforces report-owner authorization;
backend HaveAPI0.32.2 gem SHA2563b4621b3bf8ded453066b413378f74fcddd7934e8b6bac4e2530db507cb7e624
confirms with_pagination aliases ascending primary-key pagination. This is a
read-only contract inspection; frontend HaveAPI0.32.0 remains unchanged.

REQ-051/010. No new wording/catalog keys; shared localized pagination is reused.
The localization procedure/terminology revision a65a4dfeb92a59df4a80a737a20bcbf8558793ff
and effective b83b26e1ba1c8e869ae3ffbcb5801ed071c3844e remain applicable. No KB prose,
legacy route or screenshot certification; new React screenshots are fixture proof.

Update and fully adopt the old mobile process-layout spec (no deferred hash reset),
add normal strict browser coverage for1001 processes in both views/languages/themes,
URL bounds, exact100/empty, reload/Previous/page-size reset and later-page error/retry.
The fixture rejects out-of-range wire requests, so the previous build must fail
that regression. Existing ten process fields and compact layout checks are retained.
Verification, focused draft, integration and final paired activation are pending.
No shared-main/PR merge or newadmin production switch is authorized.

The fix has no runtime dependency on preview work: the original OOM adapter,
page, cursor helper and pagination hook are identical on main and6cf. Prepare
the focused draft directly from main47b6992, then merge its history locally into
the authorized preview candidate. Preserve the earlier uncommitted6cf-based
preparation as a backup; it is not the focused source or a release candidate.

Main-based source checks pass: ci:quick155 adopted/129 deferred E2E leaves,
normal lint32, design180 documents/76 requirements, types and BFF contract6;
focused adapter/shared-hook unit6 pass. Old6cf Chromium/mobile WebKit both
reproduce the original wire2000 failure against the1000 cap. Original failures
and metadata are retained. Earlier preparation quick stopped on an unnecessary
new as-any cast; remove it without adding an allowance. No baseline/test budget
was relaxed. Clean package/browser verification still follows this source commit.

Initial exact41ba package run finished6 passes/12 failures. All12 failures were
the unchanged strict zero-write assertion: the empty UI-settings fixture caused
the existing preference provider to initialize missing account settings. The
1001-record traversal, last cursor, reload, size reset and retry assertions had
already succeeded in those cases. Supply an existing canonical settings resource
with the requested language/theme; retain zero-write and all paging assertions,
budgets and retries unchanged. Original failed run/log is retained. Strict
E2E155/129 passes after this fixture-only correction; no runtime change.
