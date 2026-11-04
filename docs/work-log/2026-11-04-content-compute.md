# Compute content and state presentation

Prepared as part of the whole-interface content review. Not merged or deployed.

The VPS list omits its generic introduction and the repeated body in an
unfiltered administrator empty state. Its heading, Create action, filters,
member-specific guidance, no-match guidance and previous-page recovery remain.
The overview keeps uptime/load in the header and disk usage in Resources,
omitting their duplicates from Access and Storage. Those cards retain SSH,
console, dataset/pool context and navigation; their generic descriptions are
omitted. A stale chain read now has one layout recovery notice with retained
chain IDs, error and Retry, rather than another generic overview notice.
Other overview warnings remain. Related contracts: REQ-015, REQ-017, REQ-028,
REQ-046 and REQ-050.

The Features browser fixture now matches the locked SDK contract: an inherited
DNS resolver is null, editable features use FUSE/TUN, and success replies contain
`feature: {}` with their original action receipts. The old resolver prevented
the page from mounting; the missing response namespace later blocked successful
submission. The corrected fixture verifies the exact payload, target and
rejected-update retry. Production validation and editable names are unchanged.

The detail-tab fixture adds Czech/English missing-usage, stopped and stale-chain
recovery views. An initial new expectation was too strong: the existing usage
model shows one unknown dash when either measurement is unavailable. The
corrected assertion checks that dash, absence of a progress graphic, and
independent CPU/header/navigation facts. Candidate checks retain the layout stale
notice and verify that its overview duplicate is absent. The existing unreliable
60-second TTL can clear busy status; lock and recovery semantics are unchanged.
An obsolete assertion for the removed Storage subtitle was also deleted; actual
dataset, pool, links, status and role assertions remain.

Baseline evidence uses synthetic fixtures and source-equivalent UI revision
`6cfe5e1cbbd9992772dde6acc6c7f35f23b64582`. Selected retained desktop/mobile
frames and full missing-usage/stopped/stale screenshots were inspected, with
Czech/English and desktop/mobile represented overall. Paired stale images show
both notices before the change and one recovery notice afterward. Candidate
inspection also covered member/admin empty lists in light/dark themes, resource
navigation and the admin dataset/pool/backup links. No new clipping, overlap or
overflow was observed in these views. Changed-state cs/en desktop/mobile
inspection confirmed that useful warnings, chain IDs, error and Retry remain.
Synthetic fixtures do not verify a live
API or terminal usability. This presentation change alters no API, schema,
persisted format or runtime model.

Application typecheck, 33 focused model/list tests and owned whitespace checks
passed. The existing E2E TypeScript configuration passed strict preflight.
Focused fixture formatting passed; unrelated whole-file formatting was retained.
Shared adoption of `vps_features_tab_apply.spec.ts` remains pending final
manifest assembly, so the full adoption guard has not passed.

Baseline continuations passed 10 desktop resource cases, 17 original mobile
cases, four corrected Features cases and four state cases. All 18 targeted
candidate cases passed with zero retries: four state, six detail/role, four
resource and four member/admin list cases. The standard BFF-mode frontend build passed in 22.21 s
and the legacy build in 22.16 s from the same recorded inputs. Candidate port
5200 served that legacy output; its index matched the recorded build hash.
The inspected application source stayed unchanged during the test-only subtitle
assertion correction. Remaining compute-family rendered gaps and C2-C4
implementation remain open. Expanded-scope independent review and current-head
CI remain pending.

Further pre-capture fixture checks found the same obsolete inherited-DNS value
in the weekly maintenance and overview-chart specs; both now use null. The
environment/location editor fixtures use the existing JSON request context,
and normal node-maintenance/status, migration-child and network-association
responses now contain their declared output namespaces. Payload assertions,
wire values, action receipts and deliberate failed or unknown replies remain.
These repairs prepare later compute-family captures; they do not change
application validation or provide rendered evidence. A local type annotation
keeps the network fixture's existing object/null/undefined location values;
node-lifecycle status replies use the same namespace, and two environment
accesses use bracket notation for the existing strict setting. All eight repaired
specs and the adopted E2E core pass strict TypeScript preflight. Deferred-spec
adoption remains pending. No continuation browser run has been launched by this
owner.

The prepared Create form omits the repeated introduction, noninteractive step
rail, generic readiness notices and advance explanation of later lifecycle
actions. Its complete review, owner/placement choices, initialization fields,
validation focus and pending/uncertain/accepted recovery remain. Existing SSH,
password-fallback and host-fingerprint instructions are available in a native
disclosure; the existing browser workflow now opens it and checks all three.

Access retains its owner context, credential controls and actual outcomes while
omitting repeated status tiles and checklist panels. One fingerprint/copy view
keeps host-key metadata; the duplicate table and permanently unavailable
public-key column are omitted. Missing-host trust advice stays in its warning,
password-fallback advice stays beside generation, and copy/clear advice appears
with the generated result. Duplicate-key profile navigation is retained beside
the warning. Confirmation descriptions use the reviewed English/Czech text and
preserve type/key/hostname placeholders. Terminology input:
`a65a4dfeb92a59df4a80a737a20bcbf8558793ff`.

Configuration omits generic Safe badges and descriptions that repeat adjacent
fields. It retains live/boot/restart/network/admin effects, before/after review,
permission and error states, independent disk/compute saves and drafts. Mobile
uses its sticky unsaved actions; the bottom unsaved notice remains on desktop.
Application typecheck, six focused suites/33 tests, strict E2E preflight,
translation parity/structure, Tailwind tokens and banned-pattern checks pass.
Selected synthetic Create and Access/config baseline frames were inspected.
Both frontend builds passed: standard BFF mode in 23.68 seconds and explicit
legacy mode in 24.25 seconds. All 22 candidate cases passed without retries.
Actual desktop/mobile and Czech dark views retain the complete review and access
instructions, fingerprint/copy metadata, credential outcomes, before/after
configuration review and recovery controls. Some rapid credential rejection
messages fell between trace frames; their exact assertions passed, without
claiming pixel coverage. Full-page fixed-chrome stitching was checked against
viewport frames. The separate Features label-equality gap and C3/C4 families
remain open. Expanded-scope independent review, shared E2E adoption and
current-head CI remain pending.

The console now distinguishes confirmed revocation from an unconfirmed suspended
session. Confirmed revoke feedback stays unchanged. Other suspension shows an
Unknown status and a warning that the session could not be confirmed and the
embedded console is hidden. This also applies after an ordinary failure of an
explicit recovery attempt; clearing the earlier marked error must not restore a
Revoked claim. Existing reconnecting/error priority, explicit New session and
dialog Create/Cancel controls remain. Query/token/cache behavior, direct-revoke
rejection, automatic-request bounds and all action gates are unchanged.
Related contracts: REQ-020 and REQ-023.

Maintenance omits only the routine clean-draft sentence. Its unsaved-day count,
server-confirmed saved feedback, partial-save retry, weekday/time/zone scope,
permissions and draft handling remain. No maintenance fallback or parser changed.

Synthetic baseline inspection confirmed the misleading English Revoked notice
after uncertain replacement and separately inspected confirmed Czech revocation.
The two additional mobile recovery baseline cases passed in 18.648 seconds,
including failed explicit recovery, pending controls, restored session and a
retained iframe after direct-revoke rejection. The failed Czech recovery dialog
obscures the notice in its screenshot; its underlying status has assertion
coverage, while the earlier English trace directly shows the false claim.
The existing recovery case now covers both languages and closes the dialog for
an unobscured candidate warning view. Maintenance checks retain exact save
payloads and partial-retry counts, with clean/dirty/saved/error screenshots.

C3 application typecheck, strict E2E preflight, two focused suites/seven
tests, translation parity/structure (8,400 keys per language), Tailwind tokens
and banned-pattern checks passed. Both frontend builds passed: standard BFF
mode in 24.25 seconds and explicit legacy mode in 24.57 seconds. All nine
candidate cases passed without retries. Actual English desktop and Czech
mobile dark console views show the unknown warning, failed explicit recovery,
pending controls and restored session. Maintenance desktop/mobile views retain
the unsaved count, real saved confirmation and weekday/time controls. The
final English revoke outcome and below-viewport partial-save error have
assertion coverage without a final pixel claim. Shared E2E adoption,
expanded-scope independent review and current-head CI remain pending. Features
and the other C3/C4 families remain outside this increment.

The next network/storage increment removes repeated overview decoration.
Network retains its compact state cue, monthly traffic with period/loading/error
context and the actual interface/address inventories. The repeated state and
interface tiles, duplicate admin state tile, and address introduction/step rail
are omitted. Route and interface-address headings and their useful two-step
instructions remain, with complete addresses, owner/route-via context and actions.
Storage retains its task heading/Add mount action, root facts and actual mount
inventory while omitting the capacity/mount/access aggregate tiles and routine
no-failure reassurance. Root dataset identity remains as its caption without the
generic prefix. API/query/mutation/permission/model behavior is unchanged.

Nine retained synthetic Wave 7 frames were inspected, including member/admin
storage, network monthly values, mobile route/prefix composition and mount-dialog
fields. Four additional baseline cases passed without retries, with 30 actual
English desktop/mobile PNGs inspected. They show missing/null network state as
Enabled, green zero-interface summaries during incomplete reads, unavailable
quotas as infinity and missing desktop mount flags as Enabled. Known disabled
and failed attention states were also inspected. The old fixture bytes and hashes
remain with these baseline receipts; candidate expectations cover corrected
states and add Czech dark mobile views through the existing settings helper.

Network display now treats only literal booleans as known while the original
canonical action selector and every gate/handler remain unchanged. The unique
known-disabled instruction to have an administrator enable access is retained in
a conditional warning. Root reference-quota details receive the raw value from
exactly the whole object selected for the root summary: numeric zero remains
infinity, a positive value retains the existing units, and missing/null is
unavailable. A fetched object missing refquota cannot borrow the older relation's
quota. Models, capacity/effective-limit computation and resize behavior remain.

Desktop mounts reuse the existing mobile flag/state badges, preserving known
states and unavailable values. Mobile mount paths and dataset names sit above
wrapping badges, so status width cannot truncate the target. The unbound Default
map caption is omitted: the API relation does not establish a default-use Boolean,
and no such value was supplied. Mode, start-failure behavior, expiration, dataset
links and actions remain. No mapping/default/API behavior or catalog changed.

C3 network/storage application typecheck, strict E2E preflight, two model
suites/12 tests, translation parity/structure (8,400 keys per language), Tailwind
tokens and banned-pattern checks passed. Both frontend builds passed: standard
BFF mode in 23.65 seconds and explicit legacy mode in 22.34 seconds. All 13 unique
candidate cases passed without retries. One existing Czech mobile case then
passed as a visual supplement after a one-line scroll adjustment; the other
cases were not repeated. All 38 original candidate PNGs, eight supplemental PNGs
and 24 selected trace frames were inspected. English desktop and Czech mobile
dark views show unknown/known network state, the disabled recovery warning,
unavailable/zero/positive reference quotas and full mount targets with their
flags, failed state and actions. Source and fixture assertions separately verify
unchanged network action selection and quota provenance from the selected whole
root object. Lower interface loading/error/empty text and some rapid outcomes
have assertion coverage without a pixel claim; selected final action dialogs
remain pending in their frames, and existing action toasts cover some lower
content. This is synthetic evidence, without a real API or human usability claim.
Build metadata remains honestly 7084b73e plus dirty inputs. The build-time input
graph and both complete output trees are retained. Subsequent input differences
are only the fixture's capture scroll and this evidence paragraph; application
and build inputs are unchanged. Features/list-capacity, remaining C3/C4 families,
shared adoption, expanded-scope final review and current-head CI remain pending.

VPS list allocation now appears once per resource. Mobile omits a separate
allocation only when that resource's labelled usage bar already contains it.
Desktop retains the same bar condition and shows the existing formatted raw
allocation in its resource cell when usage is unavailable. Real zero usage with
positive allocation remains a bar; zero allocation remains 0 MiB, while missing
or null allocation keeps the existing unavailable marker. Owner, CPU/load,
uptime, risk badges, actions, models, queries and formatters are unchanged.

Invalid list-filter input keeps its visible removable error chip and draft. The
existing SmartFilterInput error interface supplies the input's invalid state,
description link and one accessible announcement, allowing omission of the
duplicate parse-error toast. Copy feedback and filter parsing/query behavior
remain. List deletion omits only its implementation/task-navigation description;
target, destructive effects, retention controls, backup/dependency advice,
accepted/completed meaning and error/retry remain. Features omits a technical
name only when it exactly matches the primary label. Distinct names, unknown
values, permission feedback, restart effects, controls and action receipts stay.
No API, SDK, persisted-state, payload, default or catalog change is introduced.

Six unique synthetic baseline cases passed, with 20 actual baseline PNGs
inspected. Application typecheck, final strict E2E preflight, five existing
suites/22 tests, translation parity/structure (8,400 keys per language), Tailwind
tokens and pattern checks passed. Both frontend build commands passed on the same
2,603-file input graph: standard BFF in 23.40 seconds and explicit legacy in
23.51 seconds. Both complete output trees and the build-time graph are
retained with honest 45cdd0fa plus dirty-input metadata.

All six candidate cases passed without retries. Nineteen candidate PNGs and four
selected trace frames were inspected. English desktop and Czech dark mobile
views retain allocation when usage is missing, one representation for each known
resource, real zero values, unknown markers and the existing actions. Editable
and read-only Features views retain distinct names, unknown values, permissions
and restart effects. Real feature rejection and the delete review/error pair
retain target, consequences, dependency advice and explicit retry. Filter error
clearing remains visible; exact assertions verify the retained draft and one
linked accessible announcement without a duplicate toast.

The Czech filter input is behind fixed chrome in its selected page image, so its
draft and accessibility attributes have assertion coverage without an input
pixel claim. The delete pair uses different scroll positions. The selected final retry
frames still show a pending operation, so settled outcomes have assertion
evidence rather than final pixel proof. These are synthetic fixtures, without a real API or human
usability claim. The final evidence edit changes only this log relative to the
frozen build graph; compiled source, configuration, dependencies, fixtures and
distribution outputs are unchanged. Shared adoption, expanded final review,
current-head CI and wider C4 work remain pending.

VPS lifecycle pages now omit the generic capability introduction, repeated
index instructions and duplicated clone/swap introductions. Action groups,
permission errors, the administrator delete link in My view, administrator
target/expiration context and unique clone review instructions remain. The
accepted clone/swap English/Czech descriptions retain chosen owner/node and
member location/account scope without legacy endpoint narration.

Swap retains one complete pair of labelled after-swap IP cards. Source after
shows the full target-IP list; Target after shows the full source-IP list, with
the existing explicit original-VPS origin descriptions. Only the identical IP
table row and second options sentence are omitted. Every other before/after
comparison, full IP/prefix, loading/partial notice, fit qualification, option,
warning and acknowledgement remains.

Reinstall retains its selected OS-template control and omits the same value's
adjacent summary and legacy-endpoint field help. The always-visible User data
notice now describes valid inclusion in the current reinstall request for both
inline and saved owner-template data. Its existing enabled-and-valid predicate
is unchanged: No can also mean an enabled but invalid draft. This is not an
accepted-operation or first-boot success claim. Root-filesystem loss, backup
advice, target/owner/template, identity/network/resources, validation, rejection
and explicit retry remain. No API, model, payload, query, permission, default,
persisted format or action-receipt change is introduced.

Eighteen retained lifecycle trace frames and seven new baseline PNGs were
inspected. The two nearest existing reinstall cases passed without retries:
English desktop inline data and Czech dark mobile owner-saved data, with real
default/open/closed controls and saved-template rejection. Application
TypeScript, complete selected-spec TypeScript, seven existing suites/37 tests,
translation parity/structure (8,400 keys per language), formatting, whitespace,
Tailwind and pattern checks passed. Both frontend build commands passed on the
same 2,603-file input graph: standard BFF in 24.65 seconds and explicit legacy
in 24.41 seconds. Both complete output trees and the build-time graph are
retained with honest 4a53c8c3 plus dirty-input metadata.

All nine selected candidate cases passed without retries. Seventeen candidate
PNGs and five selected viewport trace frames were inspected. English desktop
member/admin index and clone views retain action groups, task descriptions,
owner/node or location/account scope, copied parts, consistency and target
acknowledgement. Swap shows the full loaded IPv4/IPv6 prefixes in their labelled
after-swap destinations, with original-VPS origin help, one options summary,
comparison rows, warnings and acknowledgement. English mobile also retains the
labelled known-empty IP lists, options and warning. English inline and Czech
dark mobile saved-template reinstall views retain the mode-neutral No/Yes
request-inclusion notice outside closed details, selected data, consequences
and explicit rejection/retry controls.

Fixed chrome covers portions of some stitched upper or current-value content.
Existing mobile comparison-table cells clip or overlap some hostname, node and
dataset text; the source/target cards and desktop counterpart retain those
facts. Native saved-format text is clipped. Enabled-but-invalid No and settled
retry outcomes have assertion coverage without a pixel claim. Selected action
frames precede submission and do not establish completed clone, swap or
reinstall operations. These are synthetic fixtures, without a real API or human
usability claim. Only this log differs from the frozen build inputs after the
final evidence edit; compiled source, catalogs, fixtures, configuration,
dependencies and output trees remain unchanged. Shared adoption, expanded
whole-interface review, current-head CI and the later C4 infrastructure package
remain pending.

The next bounded node/cluster increment removes exact repeated mobile node
hostnames while keeping numeric IDs and distinct FQDNs. Sample and transaction
descriptions keep the latest count and this-node scope without endpoint/query
syntax. Cluster maintenance retains one badge, reason, controls and actual
feedback; generic layout/Operations prose and the extra status subtitle/dot
are omitted. Zero-total node inventory is neutral, with raw ratios and existing
unknown/positive/down/partial handling retained. Secret editing keeps hidden
values, Reveal/Copy/Reset/Hide, drafts, validation, type, minimum level and API
descriptions. The Add-address notice retains the managed-network and count
consequences. OS template details are omitted only when exactly equal to the
label; distinct technical details, family, use counts and actions remain.

Maintenance display now shares the existing closed-set parser and returns
unknown for missing, null or unrecognized state. Existing String/trim/lowercase
normalization and the three known states are retained. Both controllable and
read-only pool badges show the existing neutral Unknown label without claiming
a direct or inherited lock. Supplied reasons remain independent data. An open
confirmation that becomes unknown keeps its target, reason draft and Cancel,
while Confirm is disabled and guarded before an attempt, POST or settling
callback. Known-state types, reconciliation, provider, exact pool validation,
read-back, guards and explicit recovery are unchanged. No wire/persisted format,
capability, API, query, payload or default changes are introduced.

The relevant baseline is ten unique passing synthetic cases, using eight
retained Wave51 passes and two Wave53 pool remainder passes. Seventeen prepared
PNG views and seven retained viewport frames were inspected. The original pool
failure remains recorded: its admin .state locator did not exist, and only the
two selectors were repaired before capturing the missing/null/open-confirmation
and read-only states. Native responses confirm those raw states and zero pool
writes. The passing baseline is English desktop and OS desktop/mobile, with
retained Czech dark mobile node identity views; it does not certify a real API
or wider locale/viewport coverage. Long desktop OS label geometry remains a
qualified limit.

The focused maintenance and node/storage model suites passed 27 tests. Private
strict preflight of all ten complete selected specifications, formatting,
whitespace, 8,400-key bilingual parity, catalog structure, Tailwind and pattern
checks passed. The parent application typecheck passed in 55.468 seconds. Both
frontend build commands passed on the same 2,603-file input graph: standard BFF
in 24.25 seconds and explicit legacy in 23.86 seconds.

Sixteen unique candidate cases passed. The original fourteen passes were
retained; only two OS cases ran again after correcting a newly added fixture
expectation to match the unchanged long technical detail. The original failed
attempts remain recorded separately, and every job used zero Playwright retries.
Seventeen prepared PNGs and sixteen native viewport frames were inspected.
English desktop pool views for admin and read-only support retain neutral
unknown badges and independent reasons. The admin dialog keeps its target,
draft and Cancel with disabled Confirm. Other desktop views retain zero/missing
versus positive inventory, recent sample/transaction scope and address/secret
controls. Desktop and English 320px OS mobile views retain distinct technical
details and actions. Native frames also show environment/location unknown
states, Czech dark 393px mobile node identity, known maintenance, explicit
recovery, and the OS edit, 409 rejection, explicit retry and cleared error on
reopening.

The selected final Czech node frame still shows a pending unlock; settled node
and pool-retry outcomes have assertion evidence rather than final pixel proof.
Known pool lower details and the mobile OS lower form extend beyond selected
viewports. Long OS editor labels and native selects clip text, and the existing
desktop long-label/family overlap remains. The ordinary configuration frame
precedes its changed draft and save. These synthetic captures do not certify a
real API or whole-page geometry. The immutable build graph is retained: its only
later differences are the OS fixture correction and this log. Application
source, catalogs, configuration, dependencies and compiled output are unchanged.
Shared test adoption, expanded whole-interface review, current-head CI and the
later resource-package/migration-plan increment remain pending.

No merge or deployment has been performed.


## Resource packages and migration plans (CMP37–42)

Resource-package lists and independent item/assignment sections show loading
before confirmed empty results. A personal scope without a selected user keeps
its required-user prompt. Item counts describe the successfully returned list,
which has the existing 500-item limit. Assignment totals use only successful
reads and the existing metadata parser; known zero remains zero, and unavailable
counts use the same dash in the header, global warning and delete impacts.
Personal scope, its known-one item impact, deletion restriction, per-user and
environment facts, and replacement consequences remain intact. Query functions,
cache policy, targets, payloads and mutation gates are unchanged, including the
list impact query's existing undefined-result error behavior.

Migration summaries describe only the successful current keyset page. Pending
and failed reads rely on the existing local list state; a successful empty page
still has a page-local zero. The header retains canonical identity and state,
while duplicate Plan-card ID/state and generic descriptions are omitted. Owner,
creation/finish times, locks, settings, scheduling options, native batch preview,
partial/uncertain recovery, action tracking and Tasks remain. Filter errors keep
their removable chips and receive a local polite live announcement in place of
the duplicate toast; input and URL recovery use the existing contract.

Three existing package count placeholders use single braces in both languages.
The Czech cancellation notice says the request was accepted, matching a response
that can still report a running plan. English, confirmation text and action/Tasks
labels remain unchanged. Main authored the exact copy; terminology was checked
against locked vpsAdmin revision a65a4dfeb92a59df4a80a737a20bcbf8558793ff.

Baseline evidence comprises seven passing synthetic cases across six jobs,
43 inspected prepared PNGs and five additional native images. Twelve earlier
retained frames remain separate. The baseline assignment-error body is outside
the inspected viewport, and one mobile target transition is still loading;
DOM and response evidence bind those facts without inventing pixels. Those
original limits remain recorded independently of candidate evidence.

The focused five-suite batch passed all 20 tests, including cached-count retention
and failed-refresh removal. Catalog parity/structure, Tailwind and banned-pattern
audits passed. Complete selected-spec private strict, scoped formatting and
finite discovery are preflight, not shared test adoption. The first parent app
typecheck exited 2 after 58.400 seconds: the new detail unit used dot access on
index-signature values and incomplete typed request results. The installed SDK
requires envelope and HTTP status in addition to data and valid empty metadata.
Bracket access and a complete test-local result fix those errors without casts
or flag changes. All six affected detail-unit tests passed on rerun in 17.590
seconds; scoped formatting/whitespace passed. The original failure is retained.

The parent app remainder passed in 58.140 seconds. Both frontend build commands
passed sequentially on the same 2,603-file input graph: standard BFF in 24.848
seconds and explicit legacy in 24.058 seconds. Both complete 382-file output
trees and eight older trees remain preserved. The existing 5200 endpoint serves
exact legacy HTML, build-info, entry and favicon bytes. Compiled metadata is
401ee15572b3 plus dirty; the original build-time log and input graph are retained.
This final log is the only later input change.

All seven candidate cases passed across six jobs with zero retries and stable
fixture hashes. All 43 prepared candidate PNGs were inspected, along with two
selected native timestamps that contain one identical viewport image. The
images show loading states, known zero, unavailable header/warning/impact counts,
complete child-error recovery bodies and retained personal/replacement facts.
Migration views retain canonical identity, owner/timing/settings/options and
current-page zero or 50 counts without an unverified pending/error summary.
The filter error remains visible once; DOM evidence confirms its local polite,
atomic live region. Both locales retain rejection and explicit cancellation
retry. The accepted request still returns running with unfinished Tasks703 at
50 percent; the Czech notice now describes request acceptance.

Coverage is synthetic English desktop and Czech dark mobile in the selected
administrator roles. Element crops and fixed chrome do not certify whole-page
geometry. Populated missing/null assignment rows and the global replacement
target are bound by native responses and DOM, outside their header/editor crops.
Scheduling and destructive previews made no package or scheduling mutation;
accepted cancellation does not establish completion. Live-region semantics are
verified, without claiming spoken assistive-technology output. Evidence hashes,
timestamps, targets and limits are recorded separately. Real API acceptance,
shared test adoption, expanded interface review and current-head CI remain
separate work. No merge or deployment has been performed.
