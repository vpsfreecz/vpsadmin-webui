# Operations content and rendered evidence

Prepared from UI `6cfe5e1cbbd9992772dde6acc6c7f35f23b64582`; not merged or deployed.
The accepted content-selection rules govern OP01–33 / REQ-009, 010, 011, 012,
051, 053–055, 072. This log covers the implemented subset; the full source/render
inventory and remaining family obligations stay in the session audit.

## Content changes and preserved behavior

News, public Outages and Security advisories omit their generic introductions.
Semantic headings, complete dated announcements/links, outage groups and dates,
unknown states, advisory CVEs, personal impact and recommendations remain. The
public-list deletion is compatible with PR 124's content-only subset; its larger
heading/layout/news changes are excluded. About keeps product identity, exact
credits, source link and build provenance while omitting responsive/theme promotion.
Locked terminology input: `a65a4dfeb92a59df4a80a737a20bcbf8558793ff`.

Dashboard omits its generic purpose sentence and News widget subtitle alongside
the two scoped contributions below. Existing PR 145 status behavior remains.
Command palette puts its unchanged four keyboard hints in existing Help. Query,
scope, selection, keyboard handlers and accessible controls remain. Contextual
Help has one compact header with a neutral count, existing Expand/Collapse and
Manage controls, privileged page/action context and saved preference. All ordered,
sandboxed HTML, reading-height limits, fetch and access behavior remain.

Transaction chain/item lists omit their generic introductions and duplicate
page-summary card. Per-row API operation labels, state/counts/percentages,
failure/pin treatment, related links, readable payloads, scope, filters and paging
remain. Inspector/detail/raw hierarchy changes remain held for loaded-step evidence.

Public Overview omits its routine global nominal/checking aggregate. Its current
outage alert/link, scoped node/outage pending/error/missing states, IPv4 scarcity
and expiry notices remain. Unknown-only outage visibility is a separate held
follow-up; this change does not alter that predicate.

## Scoped Dashboard contribution provenance

PR 136 head `c0a0a5f1ff2282dc9c967a2de0224e623bf5082b` and PR 141 head
`ec7eace9fc469094239695c958846f77b92d8b46` each have parent
`13a39a58bdedbd87be9bc55bf5120e35d4a26c76`. Read-only comparison against
main `47b6992` found divergence at merge base `70bd11d9`, each 5 ahead/53 behind.
Only the approved head contributions are included. Predecessor commits,
experimental sidebar/design/docs, complete branches and PR 146 are excluded.

Distinct scoped port commits retain author Kerrycek <kerry@kerrycze.net> and
original author dates 2026-11-04T14:23:58Z (PR 136) and 2026-11-04T15:53:09Z (PR 141).
PR 136 removes repeated signed-in header metadata and adapts the identity assertion
to the visible shell account control. The existing shell still hides login text
at its mobile breakpoint. PR 141 supplies one My/all scope label above the same
resource counts/links, with compact wrapping rows and two original keys in each language.
Missing/loading/error count treatments and role-dependent rows remain. Other
catalog entries are retained; there is no unused-key cleanup.

## Fixtures and verification

Existing fixtures cover the public outage/advisory list/detail routes, incident
detail and OOM Stats using synthetic data. One Czech public contextual-Help case
uses the established locale helper and shared mocks; its two desktop/mobile
baseline cases passed and all four collapsed/expanded PNGs were inspected.
The English public/member/admin baseline was reused.

The new authentication-content fixture uses production BFF HTML/security-header
renderers, actual mounted React OAuth failure/denial routes and the exported
bootstrap renderer. Its annotations distinguish fulfilled renderer output,
actual routes and an isolated component. The isolated bootstrap case needs Vite's
source-module path; it is not required-runtime/BFF integration. Twenty baseline
cases passed, retaining six earlier BFF/bootstrap passes across corrected runs.
No real provider exchange, production credentials or security certification is
claimed. Those initial cases did not cover transient OAuth progress or lazy-route
fallback; the residual follow-up below records their separate evidence.

Retained failed attempts exposed fixture drift: Cluster.Search needs response.clusters,
outage updates need en_description/cs_description, and React error-title locators
must exclude the hidden DocumentTitleOverride span. The fixture corrections keep
exact request/content assertions and strict compiler flags; no product adapter
or authentication tolerance was added. The separate shared cold-search one-key
repair retains ten hits, one search, focus, scrolling, navigation and cs/en checks.

The frozen frontend candidate uses a source manifest with 1,157 inputs and digest
`6d34f076c11b5e55b488cc377af09778444e4cf13c58fb5be19f4442f88183d2`.
Standard BFF and explicit legacy builds passed (24.71 s/23.90 s). The synthetic
static preview serves the legacy artifact; build metadata honestly reports 6cfe5e1c
with local modifications. Baseline app source is equivalent to 6cfe5e1c with cached
c417 build metadata, so the changed footer/provenance and modified-build paragraph
are expected. This is not a clean committed-release or deployment receipt.

All 66 focused candidate cases passed and their supplied PNGs/selected trace
rasters were inspected: editorial 16, Dashboard 12, palette 4, contextual Help 6,
transaction lists 16 and public subtitle/detail 12. Czech/English, desktop/mobile,
light/dark and distinct member/admin-My/admin/support compositions are represented.
Introductions/duplicate summaries are absent; the retained content, scope,
warnings, controls and wrapping remain. No clipping/overflow regression was
observed in these views. The desktop News-empty terminal raster still shows
loading; the inspected mobile empty state and unchanged shared source branch
satisfy the finite obligation. Scrolled unchanged item-detail rasters do not
close its separate detail-top/inspector gaps.

Application typecheck, focused strict E2E compilation, 31 focused unit tests,
8,400 matching keys per language, locked Node 24.21.0/npm 11.19.0 and whitespace checks pass.
The adapted identity spec has inherited Prettier differences at both baseline
and candidate and is outside the required scoped formatter; unrelated whole-file
formatting was not applied. Global test-adoption manifests and structural-ledger
reconciliation remain with the final assembly owner.

Candidate fixture evidence does not certify a real API, required BFF runtime,
WebKit or physical-device usability.

## Incident investigation hierarchy follow-up

Existing synthetic scenarios provided Czech and English list/detail baselines
for desktop and mobile in privileged My and administrator views. The list omits
its generic introduction. The detail omits repeated action and ID, and places
report text and subject before the factual summary. It retains the fetched ID,
warning/action/CPU/reporter context, distinct detected and reported times,
VPS/IP links, administrator-only owner/mailbox and all other summary facts.
Long subjects wrap. Loading, error and retry behavior is unchanged. No new
wording or API/query/role behavior is introduced. Existing admin mobile cards
omit the desktop Filed by field; this pre-existing discrepancy remains a
separate reported limitation.

OOM Stats remains unchanged after inspected populated/empty/error and zero-value
baselines. Long-cgroup OOM Overview was inspected separately; its proposed
conditional duplicate removal is retained outside this incident snapshot for
separate inspection and acceptance. It is not included in this source/build delta.

The incident snapshot passes application typecheck and 33 incident unit cases.
Its unchanged existing fixture is strict-compiled and browser-free listing confirms
eight candidate cases. Standard BFF and explicit legacy builds pass (28.615 s and
24.937 s). Their 1,157 frontend inputs changed only in the two incident source
files; the parked OOM proposal is excluded. The source and legacy artifact are
frozen. All eight existing candidate cases passed (50.220 s), and every one of
their 16 PNGs was inspected against the retained baseline. Czech dark/English
light, privileged My/admin, desktop and mobile preserve the dates, warning/action,
CPU limit, reporter, owner/mailbox, VPS/IP and summary facts. Report text comes
first; long subjects and codes still wrap. No clipping or overflow regression
was observed. Candidate metadata is 5bdee4a8 with local changes; baseline has cached
c417 metadata. These are synthetic Chromium observations, with no real API or
WebKit claim.

## Tasks inspector hierarchy and selected language

The Tasks inspector keeps one action identity/status summary with exact
progress counts and percentage, object, timestamps and chain links. It omits
the repeated State value, positive Success reassurance for known completed
success, and the terminal progress bar; active progress and all existing
nonpositive/unknown branches remain. Backend JSON follows the transaction steps
in a native keyboard-accessible disclosure. Padding belongs to the native
summary itself; the candidate checks its 44 px mobile hit area. The exact
diagnostic serialization, child-read errors, empty/loading states, step
expansion, full input/output and Copy controls, tracking, dismissal and
navigation remain.

Two existing badge callers now pass their available translator: the inspector
uses i18n.t and TransactionInlineDetails uses its t prop. The inspected Czech UI
previously showed English Done on child status badges because the fallback used
browser language. API-provided operation names remain exact. This is a local
caller repair, with no global translator, API/model or payload-panel change.
The shared helper's other callers receive only the same supplied-translator
status correction; their parent layouts are unchanged.

The populated baseline was inspected in English desktop and Czech mobile views.
It exposed English child badges in the Czech UI. Candidate assertions target
the card and expanded status directly and require exact Hotovo; they also check
native disclosure keyboard behavior, exact JSON and payloads, counts, links and
both Copy controls. The intentionally empty completed case is preserved.

Existing taskStatus tests pass all 15 cases. The changed shared helper passes
ESLint and Prettier; whitespace passes. Application typecheck passed (61.889 s)
and the selected complete-spec strict E2E preflight passed (11.051 s). This private
preflight covers the selected fixture; final global adoption remains separate.
Standard BFF and explicit legacy builds passed (27.987 s and 24.969 s), using the
same 1,157 frontend inputs, digest b45a0755. The 383-file legacy output is
4c4591ca. Port 5203 serves its matching index and entry module. Build metadata
honestly records 6c5f90dd with local changes; this is a synthetic review bundle.

All 10 Tasks candidate cases passed without retries (68.570 s), with fixture
232cf83d unchanged. All 14 supplied PNGs and nine selected trace frames were
inspected. Member and administrator, desktop and mobile, Czech dark and English
light compositions retain completed counts/percentages, active progress,
failure/unknown-total rows, empty child results, targets, links and controls.
Populated views show the compact summary, exact backend JSON after steps,
native disclosure keyboard behavior, and unchanged input/output with both Copy
controls. The mobile summary hit area measures 359 by 44 CSS px. Czech child and
expanded status both render Hotovo; API operation names remain exact. No clipping
or overflow regression was observed in these views.

The existing no-chain and read-error/recovery branches are source-verified as
unchanged; this selection does not independently render all of them. Existing
standalone detail tops, other transaction hierarchy and the parked OOM proposal
remain outside this snapshot. Synthetic Chromium evidence does not certify a
real API, WebKit or physical-device usability. Final global adoption, aggregate
checks and independent whole-branch review remain separate.

## Residual shared route and header fixtures

Two existing specifications add four named scenarios, selected as four English
desktop and three Czech mobile cases. The original 20 authentication cases and
header actor-case bodies remain unchanged. All seven unique cases passed with
zero retries: two authentication desktop cases (22.341 s), three mobile cases
(28.498 s) and the two-case desktop remainder (25.675 s). Earlier passes were
retained without replay. The final selected complete-spec strict preflight passed
(9.653 s); final global adoption remains with the assembly owner.

The OAuth scenario holds and releases the native PKCE digest and a synthetic
.test token response to inspect the mounted login and callback progress states.
It checks the authorization parameters, native challenge, callback exchange,
safe About navigation and synchronous logout cleanup. The Vite development run
recorded one authorization and two token exchanges. This does not establish
provider single-code-use semantics or BFF integration. Success and logout
navigate without a lasting success screen.

The actual delayed About import renders its loading fallback, then the nearest
nested ErrorPage with closed/open details and successful reload recovery.
RootErrorPage remains source-only and unrendered. This case requires Vite's
source-module route and uses the registered baseline on port 5199, whose app
source is equivalent to 6cfe5e1c with cached c417 build metadata.

Desktop timezone evidence covers the browser/server mismatch, failed Keep with
retained prompt and error, successful dismissal/refetch, persistence after
reload and failed-read absence. The first desktop attempt returned a canonical
empty settings collection. The adapter returned undefined, React Query
rejected it, and the tip stayed hidden. The source confirms this behavior for
a missing preference; its prevalence on real accounts has not been checked.
The corrected positive fixture supplies a stored row with JSON-string value
"{}", representing an undismissed tip. A failed save leaves it unchanged. The
earlier mobile pass proves hidden desktop-only tips at the original mobile
viewport, including the drawer. Its missing-row response does not prove
successful preference reading or a mobile decision UI.

Legacy impersonation evidence covers target, start, reason/no-reason and busy
Return. The actual synthetic close request carries the borrowed token; its
rejection still clears impersonation state and returns safely to About.
The banner screenshots cover banner composition while the underlying VPS list
is loading. They do not establish real token issuance, operator identity
restoration or required BFF runtime behavior.

All 19 supplied PNGs and three selected trace frames were inspected. No clipping
or overflow regression was observed in the target views. The original failed
missing-row attempt remains separate from the passing remainder. Only these two
fixtures and this log change; application/query/API code and the frozen Tasks
source and bundle remain unchanged. Synthetic Chromium evidence does not certify
a real provider, production API, WebKit or physical-device usability.

## Missing timezone preference at the sidebar caller

SidebarTips maps a successfully resolved undefined setting to null inside its
query function. This lets React Query accept absence and preserves the existing
undismissed-tip branch. Every other value and rejection passes through unchanged.
The shared adapter, query key, enabled/retry/stale/cache policy, eligibility,
desktop placement, stored decisions, session synchronization and mutation guards
remain unchanged. The formatter only reflows the existing isDismissed expression.
No visible wording changes. Real-account prevalence of missing preferences has
not been checked.

The nearest existing header fixture adds one desktop missing-row case. It uses
the canonical empty settings collection and actual SidebarTips caller, and
requires the prompt, both zones, enabled decisions, no undefined-data diagnostic
and no automatic write. The original failed missing-row trace supplies the
baseline. The candidate selection is only this new case plus the existing
desktop decision/failure/dismissal/read-error case; prior mobile and shared
passes remain separate and are not replayed.

The 14 existing settings/timezone tests pass. Direct ESLint, Prettier and
whitespace checks pass, as does the selected complete-header strict E2E preflight.
Application typecheck passed (57.094 s). Standard BFF and explicit legacy builds
passed (24.317 s and 24.679 s) from the same 1,157 frontend inputs, digest e2af8349.
Only SidebarTips differs from the prior b45a0755 graph. Complete old Tasks legacy
and new BFF/legacy output trees are retained. Port 5203 serves the matching
383-file legacy output, digest 1ee6f39c. Its build metadata honestly records
961ae054 with local changes; this is a synthetic review bundle.

Both selected desktop cases passed without retries (12.835 s), with fixture
22f5ac42 unchanged. All three PNGs and two selected trace frames were inspected.
The missing-row attachment records one read, no undefined-data diagnostic and
no writes. The actual prompt shows both zones and available decisions. The
existing stored-row case retains the prompt and error after a rejected Keep,
then hides the tip after successful dismissal and saved-value refetch. A rejected
read still hides it. No clipping or overflow regression was observed in these
English light desktop member views. Earlier mobile/shared evidence is retained
without replay. Other decision forms and Use browser time zone/session-sync
behavior are unchanged in source; this selection does not execute that mutation.
Real-account prevalence remains unchecked. Synthetic Chromium evidence does not
certify a real API, provider/BFF integration, WebKit or physical-device usability.

## Unknown-only public outage at Overview

The Overview card now includes outages whose timing category is unknown. It
shows up to three current outages, otherwise up to three planned outages,
otherwise up to three with unknown timing. Resolved-only results stay quiet.
Pending/error sections, genuine category counts, links, times and API-provided
state labels remain unchanged. This does not turn unknown timing into an
active outage warning. OverviewPage, the category model and compact row
renderer are unchanged; no wording, health aggregate or public-layout redesign
is introduced.

The nearest existing public fixture adds one unknown-only scenario, selected as
English light desktop and Czech dark mobile. Both pre-change baselines captured
actual anonymous / with settled healthy stats/node data and retained News. Their
native canonical response contains only outage 74, without timing fields. Both
raw cases fail only the expected card and accessible-row soft assertions after
screenshot and wire attachment (9.562 s desktop, 9.108 s mobile); they are retained
baseline evidence. All four PNGs were inspected: two full-page CSS captures and
two automatic failure viewport images. The valid row is absent from the page.
The candidate keeps the same fixture and desired assertions without a bypass.
Earlier normal Overview and mixed outage-category images are retained; the
mixed /outages page is not direct compact-Overview precedence certification.

Nine existing Overview page/model tests pass, including independent read errors,
current-outage destination, IPv4 scarcity and session-expiry behavior. Direct
source ESLint passes. The unchanged full public fixture has strict preflight and
format passes; whitespace passes. Application typecheck passed (66.625 s).
Standard BFF and explicit legacy builds passed (25.024 s and 25.271 s), with
1,157 frontend inputs, digest 39f0ab51. Complete old timezone and new BFF/legacy
trees are retained. Port 5203 serves the matching 383-file legacy output,
digest f371ccb6. Its metadata honestly records 0dd82ee6 with local changes;
the baseline has 961ae054 metadata. This is a synthetic review bundle.

Both candidate cases passed without retries (6.868 s desktop, 6.912 s mobile),
with fixture dd42ae29 unchanged. Both full-page PNGs were inspected. English
light desktop and Czech dark mobile retain healthy stats/node data and News,
and now show the actual outage card, localized row 74 and /outages/74 link.
The unknown start-time placeholder and existing Active/Aktivní lifecycle badge
remain. The page does not add a global ongoing-outage warning. Native primary
and entity reads return 200 with the same canonical outage response and no
auth headers. No clipping or overflow regression was observed in these views.
Current/planned priority, resolved-only quietness and other status/error branches
are source-verified as unchanged; this two-case selection does not independently
render every composition. Synthetic Chromium evidence does not certify a real
API, WebKit, physical-device usability or full-interface readiness.

No API, schema or persisted format changed. Final aggregate checks,
full-interface coverage and independent whole-branch review remain pending.
No merge or deployment has been performed.


## Investigation views and local OOM rule recovery

Monitoring, Audit, the prefilled incident form and the OOM list omit generic
introductions or repeated headings. The incident form retains its existing
owner-notification and optional-action consequence above the fields. Audit
retains the exact API event name and timestamp in its header, with missing-value
markers kept in the summary. User, session, tracked-object links and exact raw
JSON remain. Monitoring status colors, acknowledgement and ignore consequences,
logs, dates and retry controls are unchanged. The earlier incident list/detail
checkpoint and OOM statistics evidence are reused.

The OOM Overview omits known cgroup, named process/PID and numeric count values
from the summary when the cross-tab header already displays them. Missing names
still retain both unique PIDs in the summary; unknown cgroup/count markers remain.
Rule ID, pattern and action, distinct reported time and historical memory-usage
scope are retained. The existing long-cgroup test now asserts the retained header
facts, and its missing-name scenario protects the sole PID representation. The
parked proposal's new unit file remains absent.

Rejected rule creation and inline edits now show an accessible error in the
mounted form or editing row, using the existing English and Czech titles and
exact error message. Their mutation context records only the submitted UI target
so another VPS or rule does not inherit the failure. Cancel and opening another
editor clear a settled edit error. Drafts, actions, validation, request bodies,
pending controls, success notifications and refresh behavior are unchanged.
Delete retains its existing notification inside the active confirmation dialog;
it already provides the exact alert, target, warning, Cancel and retry controls.
No second delete alert or notification-provider change is introduced. The OOM
list retains visible invalid-filter chips and their removal controls, connects
the existing accessible error interface to the input and omits the duplicate
error toast. Unsupported input still sends no list request.

Actual synthetic baseline inspection covers 12 normal desktop/mobile cases,
two English desktop/Czech dark mobile PID-only cases and the complete rejected
create/update/delete flows in both projects. The first rejection run stopped
after three writes because the fixture iterated shifting toast positions; its
raw failure and partial captures remain separate. The repaired run reaches all
six writes, exact create/update bodies, target/reset/retry and final guards.
Its raw cases fail only the expected six create/update scoped-alert assertions
per project. All six rejection PNGs were inspected. The delete alert passes its
semantic assertions and is visible inside the modal. Mobile update/delete
images are scrolled full-page captures with a fixed-header compositing offset.
Other normal-view locale, role, loading and crop limits remain recorded; these
fixtures do not certify a real API, uncertain mutation outcomes, WebKit or
physical-device usability.

Thirteen existing filter/accessibility and API tests pass, as does strict
compilation of all seven selected complete specs and their imported fixtures.
Source ESLint retains eight baseline diagnostics with no new finding; this is
not a clean whole-file lint result. Compiler and lint settings are unchanged.
The terminology input is a65a4dfeb92a59df4a80a737a20bcbf8558793ff. No new catalog
wording or unused-key cleanup is included. Application typecheck passed in
60.468 s. Standard BFF and explicit legacy builds passed once, sequentially,
in 24.655 s and 25.271 s. Full maps and complete 383-file outputs are retained,
alongside the previous timezone/Overview trees and earlier artifact receipts.
The frozen 1,157-file frontend graph is 50a057a1; BFF digest is f5e1963b and
legacy is 61f1b09f. Existing preview 5203 served the matching index, entry,
build information and all eight affected route chunks. Its build information
honestly records 7d0bfd795253 with local changes.

All 16 affected candidate cases passed with zero retries and stable selected
fixture hashes. Command times were monitoring 20.364 s, OOM filters 25.676 s,
Overview 20.615 s, rule recovery 23.350 s, Audit 12.355 s and incident-new
21.052 s. Ten prepared PNGs and 16 necessary native trace frames were inspected.
Both rule traces retain all nine semantic rejection guards, six native writes,
exact create/update bodies, scoped reads, drafts/actions, reset/retry and final
row guards. These are synthetic rejection/success envelopes, not proof of live
completed operations. No unrelated Stats, delivered incident list/detail or
rule-geometry case was repeated.

Monitoring detail is an English member view; its administrator-identity list
uses My view. Audit, incident-new and OOM list are English light administrator
views on desktop and mobile. Known long-cgroup Overview is Czech light with
its existing 1280/320/390-width checks; PID-only Overview and rule recovery use
English light desktop and Czech dark mobile. Browser locale remains en-US.
Prepared images and retained frames show the changed hierarchy, exact rule/
process/count/time facts, local errors and controls. Invalid-filter chips
remain without duplicate error toasts; native assertions verify their accessible
input/error association and no list request for unsupported input. The existing
success toast remains visible during update recovery. Desktop Ignore's selected
frame is pending, while its native rejection assertions and actual mobile error
frame preserve the failure contract. Mobile Audit shows only the start of its
JSON; desktop shows the complete short payload. Missing Audit-value branches
remain source-backed preservation. Scrolled rule PNGs include a fixed-header
compositing offset, and the incident mobile PNG uses native device scale.
The existing narrow desktop OOM process column and list row layout are unchanged.
These observations do not certify every role/state, real API, uncertain outcomes,
WebKit, physical devices or full-interface readiness.

Only this evidence paragraph update follows the frozen build/candidate inputs.
The accepted build-time log hash is retained separately from the final log;
all frontend/spec/output bytes remain unchanged. No rebuild or repeated browser,
application or test check is attributed to this documentary change.

No API, schema or persisted format changed. Final aggregate checks,
full-interface coverage and independent whole-branch review remain pending.
No merge or deployment has been performed.

## Managed content and outage/advisory reads (2026-11-05)

Admin diagnostics retain every labelled session, runtime, token-presence and
server-sync fact, with their generic page/section subtitles omitted. Shortcuts
are unchanged. Generic content, outage and advisory introductions and the
linked-outage subtitle are omitted at their callers. Help matching rules remain
labelled quiet text with exact values, wildcard and order semantics intact;
language restrictions remain. Outage reason retains its existing label and full
text in quiet report presentation. Advisory counts and precise/null publication
time use compact labelled facts, with complete bilingual report content retained.

Outage systems, handlers, updates and related advisories expose their own pending
or failed read and Retry, preserving independent successful sections and retained
rows. Only a successful empty read produces the existing empty presentation.
Each advisory list row exposes its existing CVE query state and scoped Retry,
retaining embedded/cached badges, summary, counts, Open and usable sibling rows.
Draft Overview readiness uses the existing successful CVE/node/status predicate:
failure takes precedence over pending, and blockers appear only after verified
reads. The detailed header error, Publish gate and background-refetch policy are
unchanged. Query definitions, models and publication policy are unchanged.

Inspected News save/delete, Help delete and advisory outage-link rejections use
local live-error wrappers before the duplicate notification is omitted. Drafts,
targets, Cancel, explicit retry and accepted success feedback remain. Static
update/delete/unlink error composition outside this file boundary retains its
existing announcing notification. Scope-editor instructions, exact advisory ID,
affected-owner/derived scope, active-node assessment and uninspected recovery
feedback remain unchanged. Catalogs and keys are unchanged; the locked terminology
revision remains a65a4dfeb92a59df4a80a737a20bcbf8558793ff.

Synthetic baselines supplied fourteen passing normal cases and four complete
read-state gap observations in representative English/Czech desktop/mobile views.
Original malformed mock and setup failures remain separately recorded. All eight
remainder PNGs and ten needed native frames were inspected, reusing the earlier
22 PNGs and 19 frames. The rightmost Affected columns are clipped; their null time
is wire/source evidence. Final deletion frames are pending/Loading, while the
successful response and navigation are fixture assertions. Existing role, locale,
blank-preview, lower-crop and real-API limits remain explicit.

Fifteen focused tests in three existing suites pass, including pending/error
precedence, cached-read failure, isolated row Retry and local live-error recovery.
All seven selected complete E2E specs pass strict compilation. Fourteen changed
source/test files passed the initial scoped ESLint with no baseline or introduced
diagnostics; i18n, Tailwind and banned-pattern checks pass. An AST comparison
preserves all 43 query/mutation contracts apart from the four authorized
error-notification callbacks. Candidate cases use local query Retry for outage
children and list CVEs; readiness retains its existing reload phase transitions.
External documentation-contract/screenshot review remains outside this checkpoint.

The first application typecheck failed in 53.156 s on two unsupported `exact`
options in the existing Help test. Role queries already compare string names
exactly; removing those options preserves both scoped Delete queries and every
other assertion. The three existing Help tests pass after the correction in
15.647 s, and scoped formatting passes. Original failure receipts remain separate.
Other accepted quick results are reused for their unchanged scope. The parent
application typecheck remainder passed in 56.229 s. Standard BFF and explicit
legacy builds then passed once, sequentially, in 23.779 s and 24.699 s. Complete
383-file output trees/maps and all previous outputs are retained. The existing
5203 preview matched all thirteen selected compiled legacy paths. Both builds
honestly record 5e0ee1974729 with local changes. The original build-time log
663b8f67 and full 1,157-file frontend input map remain immutable.

Wave64 supplied fourteen passing candidate cases and one final error-text
expectation failure. Both local Retry/recovery phases and the wire attachment
had completed. The unchanged scope reader wraps entity/handler read rejections;
the fixture incorrectly expected the underlying synthetic cause. Only its
displayed-error expectation changed to the exact formatted scope/outage message,
preserving raw responses, targets, read counts, independent siblings and no-write
guards. The failed-only remainder passed in 13.352 s, with stable fixture hashes
and zero retries. Fifteen distinct selected cases now pass; the original failure
remains separate and the fourteen passes were not replayed. No application check
or build was repeated for this fixture-only correction outside the frontend map.

Seventeen prepared candidate PNGs, the automatic failure PNG and fourteen selected
native frames were opened. They show the changed diagnostics/help/report hierarchy,
local errors with retained drafts/targets/retry, independent child/CVE recovery,
verified readiness transitions and unchanged meaningful scope and warnings. Native
semantic assertions verify the local alert contract; no screen-reader outcome is
claimed. Outside unlink errors retain their static text and provider alert.

News uses English/Czech dark views; Help is English light at 320px, and the original
Czech advisory editor is light with English initially selected. Other desktop
views are English light; the Czech outage-read case is dark. Shortcuts links,
lower editor fields and rightmost Affected columns remain cropped. Null mitigation
time is wire/source evidence. A sticky header crosses the recovered mobile
advisory heading. The normal linked-outage native frame is pending, and the
publication frame shows an unchecked mail control; later payload/outcome guards
remain assertion evidence. Compressed native frames do not prove every field was
simultaneously visible. Synthetic fixtures certify no real API, publication or mail
outcome, full role/locale matrix, clipboard result or whole-interface readiness.

Only this final evidence prose follows the accepted remainder. The separately
bound E2E expectation correction does not change the compiled frontend graph;
source, units, dependencies and old/new output bytes remain exact. No check,
build or capture was repeated for the documentary delta. Main prose acceptance,
the serialized commit window and independent whole-branch review remain pending.

No API, schema or persisted format changed. Final aggregate checks,
full-interface coverage and independent whole-branch review remain pending.
No merge or deployment has been performed.
