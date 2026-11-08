# Main and approved preview integration — 2026-11-07

The maintainer requested a release candidate for newadmin, then explicitly asked
to adapt our UI changes to Aither's current main, give his behavior priority,
deploy the verified integration to both preview hosts, and test it thoroughly.

## Source and compatibility

Production was clean `babe51421bd1df61a548e7b2f047053df14ff3eb`;
both previews were clean `594337ab62a9cf4a054ecf9f9775b693f1ec20bf`.
Main `47b6992e28c16585aa6247bd75413637a7ca6388` adds the SDK release prerequisite
documentation beyond production. Production and preview had 52 and 91 commits,
respectively, after their common ancestor. Deploying preview unchanged would
lose production client migrations and API/fixture corrections.

The isolated candidate starts at current main and integrates the preview history.
It preserves main's HaveAPI 0.32.0 and published SDK 0.4.0, request policy,
guarded advisory writes and canonical wire fixtures. Public overview advisory
summaries now use the generated anonymous operation and the same domain narrower.
Picker names use the API's canonical `name` field. Missing status/telemetry values
remain unknown; unsupported historical disk telemetry is not fabricated.

SDK 0.4.0 does not declare `payer_account`, `expiration_change` or
`include_expiration_changes`. The maintainer's explicit precedence decision
means the candidate retains main's payment contract: the extra payer-account
row and manual-expiration event extension are held until a matching published SDK
and compatible backend exist. Their original preview history and backend data
are preserved. Ordinary payment history, account updates, review, permissions
and pagination remain. No hand-written SDK descriptor or dependency override is
introduced. This is a release scope limitation, not proof those features work.

Terminology remains bound to locked vpsAdmin
`a65a4dfeb92a59df4a80a737a20bcbf8558793ff`.

## Verification and state

Initial typechecking found stale imports, old API mocks, nullable values and
unsupported preview fields. Those errors were corrected without weakening strict
compiler settings. Required ci:quick checks passed, including strict application/tooling/E2E/BFF
types and audits. All 240 script tests and 58 BFF tests passed. The complete
unit run initially found one public URL parameter-order assertion, now corrected
to the SDK serializer. Packaged browser and live checks remain in progress.
The first served-package probe lacked synthetic BFF boot replies; its failed
startup is retained as harness evidence, not an API capability result.

No newadmin production activation or shared main merge has occurred.
The exact final source, test results, paired preview receipts, rollback and
remaining release gates will be appended after verification.

## Latest verified preview filter batch

The concurrently authorized TODO worker verified and deployed clean
`f41af18b1de10126149ebd5d17c0f0c0c5102247` on both previews while this
integration was being prepared. The candidate preserves that history too.
Its 22 runtime files are checked against the already integrated main: only
JSX className/size attributes differ (excluding insignificant JSX whitespace).
Conflicts on Environments/Locations/OS templates retain main's filter behavior;
removed unsupported free-text and OS flags are not resurrected. The OS template
browser case now exercises the supported Advanced dialog instead of a removed
search-help control. Existing structural limits are retained and retired
exceptions removed. The union checks 188 strict E2E leaves with 113 deferred.

The first immutable browser snapshot also exposed old preview assertions for
mount type/default-map and old public-stat response namespace. These are being
aligned to the generated contract; original failures remain in the audit logs.
No compiler setting, timeout or retry budget was relaxed.

## Exact-package fixture correction after thread transfer

The clean `facf4feb` package completed 100 critical browser cases: 92 passed and
8 failed. On both Chromium and mobile WebKit, three metrics cases stopped before
rendering because their old `dns_resolver: 'inherit'` fixture violated main's
resource-or-null relation contract. The subdataset case supplied its parent's
`full_name` on the child, so the correct detail label was the wrong fixture value.
These are fixture defects; the strict relation guard and full-name preference
remain unchanged. Correct the same obsolete resolver in the eight affected
journey files, and use canonical dataset names without the inherited legacy full-name field. Historical
disk fields absent from the generated status contract are removed from the metrics
fixture. Existing chart, navigation, payload and permission assertions remain.

The focused exact-package rerun passed all 26 metrics/storage cases on Chromium
and mobile WebKit. The canonical final fixture also removes the legacy
full-name field altogether; its final artifact rerun remains required. All 33
existing VPS/dataset/metrics unit cases and strict E2E coverage (190 adopted,
111 deferred) pass. ci:quick, formatting and both production dependency audits
pass with zero reported vulnerabilities. Remaining integration regressions and
new clean-artifact verification are pending.
Original failure logs and traces are retained under the release-readiness audit
and the private `main-preview-integration-20261107/compiled` browser task. The
new foreground thread owns this work; the existing serial TODO worker and timer
continue unchanged. No extra worker, merge or production activation is authorized.

## Later approved work retained

Focused PR199 removes the queued account copy request. Its local merge retains
both histories and the pre-existing optional-description row. The concurrent
worker's focused PR198 is also being integrated with all seven local presentation
changes. Conflict review found main intentionally replaced user-data smart search
with a format-only selector; retain that supported filter and adapt dimensions and
role/query fixtures accordingly. The other six runtime files merge with style-only
differences; the complete seven-file AST comparison confirms unchanged logic.
These additions still require final source/package/browser and CI acceptance.

The first corrected clean `caf6ca83` critical matrix passed 100/100 on desktop
Chromium and mobile WebKit, including all eight original failures. Its four Nix
outputs, matching provenance and 381 assets passed. The subsequent account/PR198
adaptation passed ci:quick (192 checked E2E leaves), 240 script tests, eight
existing catalog/UserData unit cases, a working build, and 36 working browser cases
covering the canonical format filter across member/support/admin/My/selected-owner
contexts, account copy, keyboard/copy/Clear/320px and existing account saves/retry.
Seven integrated runtime files differ only in presentation attributes by AST review.
The final clean package and remaining regression matrix still require acceptance.

## Feature journey fixture correction

The final c09 package passed controls100 and filters112, then the journey batch
finished 66 passed / 4 failed. Both feature scenarios on both engines still tried
to edit `quota`/`xtables`, which main deliberately leaves read-only because SDK0.4
update-all declares only fuse/impermanence/kvm/lxc/ppp/tun. The fixture now changes
supported fuse/tun and additionally proves that undeclared rows remain read-only
and never enter the request. Existing target/payload/rejection/retry assertions
remain. Runtime guards, timeouts and retries are unchanged. The original failure
logs are retained. Corrected focused4 pass on exact c09 after also restoring the
SDK-required `feature: {}` success namespace with the original action-state IDs.
The broader final regressions are still running.

The published c09 desktop broad-smoke failure was the detail-tabs matrix still
requiring a removed explanatory boot subtitle. It now checks the actual enabled
member Cgroup selector and its canonical options; all existing member/admin
permission exclusions, route and lifecycle assertions remain. No product copy
is restored. Original CI failure logs are preserved outside the repository.

The advisory lifecycle regression exposed another old fixture envelope: successful
DELETE returned null although SDK0.4 declares `security_advisory` output namespace.
It now returns `{ security_advisory: {} }`, matching main's existing API unit
contract. Content-revision/state guards, the real confirmation and post-delete
list navigation assertions are retained. No product deletion behavior changes.

## Broader workflow and CI fixture alignment

The full exact-package workflow matrix is running across both engines. It found
additional legacy fixture contracts: SSH deployment omitted the `vps` output
namespace, and the session preference PUT returned an empty body instead of a
valid `user`. Align those successful responses with the generated SDK and existing
API units, retaining original request/receipt, retry, target and progress checks.
The same empty `vps` namespace is added to power/delete fixtures; missing-action-ID
negative tests still omit the ID and keep their exact safety-lock assertions.

The published head's desktop PR smoke reported the two member-journey cases,
four session preference cases and the support permission case. The last expected
one disabled fieldset while the shared admin-modification choice now supplies a
second disabled group. Verify every visible disabled group and every actual form
input/select/textarea is disabled, retaining all sensitive-control exclusions.
Malformed password output is rejected earlier by main's typed adapter; assert its
exact invalid-response error, the preserved uncertainty guard and no secret.

Expanded mobile workflow coverage also exposed desktop-only request-table,
selection and expansion selectors. Use each actual visible mobile/desktop control
while retaining payload, confirmation, failed-selection and keyboard assertions.
Desktop select-all indeterminate semantics stay checked on desktop; the mobile
partial selection is checked through its two existing row checkboxes. No hidden
control is forced, no case is skipped and no product permission is changed.

The private served BFF harness supplies a configured Authorization header, whereas
the unchanged source authentication smoke tests assert the legacy fixture header.
That mismatch is a harness assertion adaptation: in a later focused BFF rerun,
assert the exact configured synthetic token and absence of legacy headers. Keep
the source legacy regression unchanged; it passed in the normal CI runtime.
The original expanded-run failure remains evidence, not a product auth failure.

The expanded exact c09 workflow run finished 279 passed / 15 failed. Its remaining
failures were stale rejection/body/error selectors, not a reason to change main:
HTTP200 with status:false is intentionally ambiguous, so explicit rejection mocks
now use HTTP422. Generated power requests retain exact assertions for
`{ vps: {} }` (start) and `{ vps: { force: false } }` (stop/restart). The malformed
password response is asserted in its precise confirmation error, retaining the
uncertainty lock and absence of a generated secret.

Corrected reruns passed power24, bulk-rejection2 and password2 on the same immutable
c09 artifact, covering all 15 failures plus related safety cases. This is not a
claim of 294 passing in one run. The CI sidebar/support cases passed14 (the local
wrapper initially expected10 and reported only a count mismatch; collection
confirmed14). Main-comparison captures passed22. Earlier journey4, advisory4,
controls100 and remaining-filter112 exact-package results remain retained. All
these requests are intercepted synthetic fixtures, not live API certification.
No timeout, retry, compiler baseline, transport or runtime guard was weakened.
The updated integration still needs matching packages, fresh CI and paired live
verification.


## Additional verified preview controls

Integrate PR201's single-line secret controls and PR202's pagination/native map-kind
presentation history while retaining main's adapters and API guards. The map-detail
conflict retains main's apiErrors import and adds only coarse-pointer dimensions;
its existing structural exception keeps the same line allowance, owner and removal
condition, rebinding its content hash with both rationales. Strict E2E coverage is
the union of adopted leaves; no deferred baseline is reset. Existing source and
exact-package proofs for the focused changes do not certify this new integration
artifact. Matching package, affected control reruns and fresh CI are required.


The affected-control run on clean9599 exposed one further successful fixture
mismatch: TOTP create/confirm returned raw objects. Main's existing TOTP unit
contract requires the `totp_device` namespace and rejects raw recovery data.
Both fixture replies now use that namespace. All URI/secret/recovery values,
reveal/hide, clipboard, focus and dimension assertions remain unchanged. Strict
E2E coverage and the existing canonical TOTP unit3 pass; the corrected browser
rerun is required before accepting this follow-up. Product guards are unchanged.


## Mobile search fixture readiness

Fresh6cd3 mobile CI jobs reached their unchanged40-minute budget while old search
scope tests repeatedly waited90 seconds for a palette that never opened. The
fixture invoked Ctrl+K immediately after navigation, without waiting for the
shell; its real handler is registered on mount and deliberately ignores text
fields. Wait for the visible navigation trigger, focus that native button, then
invoke one shortcut and await the actual palette. No retry, sleep or budget
increase replaces readiness.

The same fixture also used obsolete `cluster_search` output. Generated SDK0.4
requires `clusters`; return that namespace and assert the empty result UI after
explicit scope switching, not just a request counter. Add canonical settings
fixtures so screenshots do not contain unrelated synchronization errors. All
scope, owner, query, failure and navigation assertions remain. Corrected exact
6cd3 cases passed18 on Chromium, mobile Chrome and mobile WebKit; fresh CI is
still required. This changes fixtures/documentation only, not runtime guards.

## Received queue6: independent OOM task limit fix

Locally integrate focused main-based41ba4806 (issue103), preserving its independent
history and all received requests1–5. All six full originals are now available.
Runtime OOM source was identical on main and6cf before the fix; generated SDK
contracts and all Aither guards remain authoritative. Resolve documentation and
strict E2E inventory conflicts by retaining the complete existing preview content
and adding only the bounded process paging contract and two adopted specs.
No deferred hash reset or compiler/test budget change.

The full merged working source passes356 files/2309 unit tests (45.67s), and
ci:quick passes200 adopted E2E leaves/109 deferred plus normal lint/catalog/type
and BFF contract checks. Focused source passes unit6, quick155/129 and clean
Nix4/379; its exact18 browsers are still waiting for the shared lease. Original
6cf reproduces the invalid2000 request in both engines. Final matching combined
Nix/browser/CI and paired preview activation/live checks remain pending; no
production switch or shared-main/PR merge is authorized.
