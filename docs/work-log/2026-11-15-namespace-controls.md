# Namespace controls: approved NSP-01/02/03/04

Approved versions: NSP-01 `300f0bc18071af3b`, NSP-02 `efa485a83d2d68e5`,
NSP-03 `d79751600dbe125a`, NSP-04 `3c64d7f060acb477` (human revision380).
Update existing own draft PR240; keep its historical UX-04 contrast evidence.
Its original hosted Chromium OOM failure and later retry remain historical,
not qualification for this new head. The already deployed PR243 OOM pagination
race correction is an explicit focused dependency, retaining its authorship.

Actual dev baseline ce34b098: eight fixture cases (member/admin, CS dark/EN light,
desktop Chromium/mobile WebKit320), forty unedited captures, sixteen individually
reviewed selected images. Technical placeholders and icon-only Help obscured the
common filter pattern; Clear looked like plain text. Map Open/Delete differed in
appearance. New-map Create was left-aligned before Cancel. A real View maps link
already existed: retain it and remove only the generic detail subtitle.

Extract shared filter presentation and map row actions, reducing both existing
list components below their inherited exception-removal thresholds. Remove those
two structural exceptions without changing the frozen baseline or allowances.
Use labeled Help, bordered clear controls, 44 px filter controls and a truthful
ID-or-filter placeholder. Retain numeric and key:value grammar, supported API
fields, owner/role guards, cursor traversal and every mutation callback.
Open remains an anchor; Delete is a common labeled button with a separate danger edge. The new-map
footer has Cancel then Create, wrapping and aligned right. Source-specific
fixture response envelopes follow each source's actual API adapter.

Terminology source: locked vpsadmin input (alias vpsadminServices)
`a65a4dfeb92a59df4a80a737a20bcbf8558793ff`; both guides read in full.
The separate KB contract accepts API/legacy-PHP inputs, not a React feature SHA.
React labels/screenshots may need later KB editorial review; no external KB
publication or screenshot freshness is claimed by this frontend-only change.

Verification is in progress. New strict browser coverage checks member/support/
admin, CS/EN, help keyboard/focus restoration, real filter/clear restoration,
scoped map links, nested row Delete confirmation without navigation, Cancel/Create
visual and keyboard order, narrow overflow, exact Create payload and its pending
duplicate guard. Existing permission/filter/pagination and mutation rejection
specs remain. No live account/object mutation, no backend timing/permission change,
no merge, production deployment, builder access or scheduler changes.

Source review caught the old focused shared danger-fill token at about4.00:1
in dark mode. Use a shared secondary button with the existing separate danger
edge, preserving readable foreground and avoiding a contrast regression. The
cumulative shared danger-token fix remains untouched; no unrelated theme change.

Expanded mobile WebKit coverage exposed an existing asynchronous test race:
the VPS configuration owner-contract cases checked the request array immediately
after an unrelated field appeared. Await the exact same expected request array
with expect.poll; retain the full payload/owner/duplicate assertions and existing
timeout budget. Adopt the complete unchanged-otherwise contract spec into strict
TypeScript instead of updating a deferred hash or adding a compiler exception.
The first affected local run and original source bytes remain evidence.

The pre-existing contract suite now recognizes both mobile project names in its
390px viewport setup; it previously treated newly added mobile WebKit as desktop.
New namespace-control scenarios separately cover320px on both mobile projects.
All viewport and exact API assertions remain; the frozen actualdev review capture
program is unchanged.

### Accepted integration evidence



### Existing preview evidence

Initial cumulative browser40PASS/2FAIL/1INT/19notRun exposed a new fixture
arrow-body mistake: map Show used a JavaScript labeled block and returned
undefined. Correct it to an object expression matching the cumulative SDK's
response namespace. POST payload/pending assertions already passed; keep the
detail value assertion, budgets and product code unchanged. Original log retained.
Working verification: full repository quick checks, relevant namespace/API/
pagination units and native build passed on both sources. Each source then
passed62 source-bound browser cases on Chromium, mobile Chrome and Linux mobile
WebKit, two workers, zero retry/failure/flaky/skip in qualifying runs. Fixtures
include support level21 and owner/admin guards, actual filter restoration,
keyboard link/row/delete/cancel actions, exact create payload/pending protection
and normal/hover button contrast. No live API permission or physical Safari claim.

Earlier local setup failures remain evidence: JSON formatting, explicit TypeScript
files-list registration and a cumulative dependency link missing haveapi-client.
Use the unchanged exact current-preview dependency set, without compiler changes.
The first browser attempt stopped2failed/1interrupted/59notRun because old tests
dynamically imported local diagnostic hooks during execution. The special local
harness now loads those hooks statically during collection; wire/session isolation,
product code and assertions are unchanged. Raw repository fixture hooks were never
changed. Exact committed checks, clean Nix/browser, original hosted CI and paired
preview/protected result publication are still separate remaining gates.
