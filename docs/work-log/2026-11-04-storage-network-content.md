# Storage and networking content review

The whole-interface content review extends the work in
[PR150](https://github.com/vpsfreecz/vpsadmin-webui/pull/150). The initial storage
package applies the accepted content-selection rules to Backup Center and NFS
exports. Related requirements: REQ-047 and REQ-048.

Backup Center and the export list omit introductions that repeat their tabs or
controls. Export detail keeps its ID and source in the header, without repeating
them in the summary. Export rows retain their labelled enabled state and warning
treatment while omitting a second status dot. All-VPS access retains its scope
badge and automatic host-management explanation beside the disabled Add button;
the repeated information alert is removed. Host actions and the full-width host
table, stacked mount examples and temporary-snapshot instructions remain.

Synthetic baseline inspection covered English/light Backup Center and
selected-host export detail on desktop and mobile, Czech/dark all-VPS export
detail on desktop and mobile, and the Czech administrator owner-filtered export
list. These are browser-fixture observations, not live API or deployment proof.

The existing export-host fixture reproduced loading, failed and successfully
empty host reads in English and Czech on desktop and mobile. All four baseline
cases failed the intended warning-absence assertions. Inspection of all 12 state
images confirmed the false warning during loading and failure. The warning now
appears only after a successful empty read. Loading, failure/Retry, the empty
state mounting consequence and Add action remain.

Backup Center download cards and rows show a fallback dataset ID once when its
name is unavailable. A known dataset name still has its separate ID. The
incomplete-metadata notice and authorized download actions remain.

Local checks passed: TypeScript, the catalog audit with 8,398 matching keys per
language, and 35 focused tests in the existing Backup Center page, export model
and export-list semantics suites. The standard BFF build passed in 23.86 seconds.
The first static candidate could not mount because that build correctly rejected
the HTTP fixture origin; it provided no storage-page evidence. An explicit legacy
build for synthetic fixtures passed in 25.50 seconds, with production bootstrap
and API checks preserved. All 18 selected candidate browser cases passed without
retries. Visual inspection of the English and Czech desktop and mobile captures
and trace frames confirmed the intended hierarchy and retained states, scope,
instructions and actions. Independent final review and full-interface coverage
remain pending. No API, persisted format or migration changes are intended;
reverting the presentation change restores the previous UI.

Terminology was checked against the locked vpsAdmin input
`a65a4dfeb92a59df4a80a737a20bcbf8558793ff`. Existing export success messages already
say that the operation started; accepted feedback and later task outcomes are
preserved.

The next storage package is in progress. Unknown expansion states no longer
produce a resolved notice, and the adjacent dataset state has its own label.
DNS enabled and dynamic-update summaries preserve missing values as unknown;
mobile DDNS values have a label, while the duplicate enabled dot is removed.
Host assignment detail preserves unknown state and uses the existing inventory
action rules. Repeated IP identity, route facts and assignment values are removed.
Downloads omit their generic introduction and ready-state explanation, retaining
the Ready badge, actions and all non-ready detail. Filename fallbacks show one ID.

The current nine-source package passed TypeScript and the lookup audit, with
29 focused existing tests and eight lookup tests passing. The standard BFF build
passed in 25.32 seconds; the explicit legacy build for synthetic fixtures passed
in 24.03 seconds. Source and build receipts are retained. All 24 selected candidate
cases passed without retries: 16 state cases, four lookup recovery cases and four
download views (two Czech and two English). Visual inspection covered the changed
states and layouts in both languages across desktop and mobile. Other
storage/network families and distinct workflow obligations remain tracked
separately; final whole-interface checks and review remain pending.
Failed dataset baseline setup was traced to
missing fixture response namespaces; only those fixtures were corrected. The
first lookup probe stopped at an unrelated label precondition and supplied no
failed-query coverage. The corrected baseline then reproduced an empty-results
message after a failed network read in both languages on desktop and mobile.
The lookup now shows a local error and Retry while retaining the query and
selected network. Its eight focused tests pass. All four candidate locale/project
cases exercised Retry and recovered to successful empty results.

The summary-card follow-up preserves unknown used and available values
independently. Its bar uses the API's used plus available values only when both
are known; its quota percentage needs known used and a positive reference quota.
Actual zero remains zero, and only explicit reference-quota zero is unlimited.
An expansion ID opens the existing detail without asserting that the expansion
is active. The three read-only expansion flags distinguish enabled, disabled
and unknown; forms and action gates are unchanged.

Inspection covered all 26 synthetic baseline matrix images in English desktop
and Czech mobile views. The matrix reproduced the false zero, unlimited and
disabled claims, including a full warning bar when available space was missing.
Five fixture matchers were corrected to the existing 5.0 GiB format; the
formatter is unchanged. TypeScript and 11 focused tests passed. The standard BFF
build passed in 23.79 seconds; the explicit legacy fixture build passed in
22.79 seconds. All four candidate cases passed without retries. Visual inspection
of all 26 English desktop and Czech mobile images confirmed the intended values,
bar and badges, with the expansion ID, Open, Edit and Add space controls retained.
Shared documentation assembly, final whole-interface checks and independent
review remain pending.

The dataset and NAS hierarchy follow-up removes the generic dataset-list
introduction and repeated management subtitle and identity. NAS retains its
primary-pool, non-VPS scope. Quota and reference-quota labels, privileged allocation
override help, advanced ZFS options and destructive confirmation targets remain.
Standalone NAS creation uses the page heading and places the existing parent
relationship explanation beside its selector. No-parent and failed parent reads,
Retry, rejected creation and retained drafts keep their existing behavior.

The dataset history card is headed Recent transactions. A missing label shows
its fallback ID once; a known label retains its separate ID. Timestamps, status,
related links and the bounded recent query remain. The existing progress value
now uses the translation's required argument, fixing a literal placeholder without
changing percentage calculation or clamping.

Retained normal-family traces and all 16 new English desktop and Czech mobile
baseline images were inspected. The four new cases failed only the intended
nested-heading, duplicate-ID and literal-progress assertions. TypeScript and the
catalog audit passed, with 8,398 matching keys per language. The standard BFF
build passed in 22.42 seconds, followed by the explicit legacy fixture build in
22.97 seconds. All eight selected candidate cases passed without retries. Visual
inspection covered all 16 state images in English desktop and Czech mobile views,
plus four dataset/NAS list frames on desktop and mobile. Parent help, failure and
draft states, recent scope, percentage values and IDs remain visible. Shared
documentation assembly, final whole-interface checks and independent review
remain pending.

The snapshot tab omits its generic introduction. Snapshot creation retains its
point-in-time meaning, conditional tracked-action feedback, exact target and
row-after-start explanation. Deletion eligibility and retry, exact-label rollback
and manual recovery instructions remain. Seven existing page tests, application
TypeScript checking and strict type checking for the selected fixtures passed.
All ten reduced baseline cases passed without retries. Visual inspection covered
all 30 synthetic English desktop and Czech desktop/mobile images of snapshot
creation, accepted progress, NAS deletion review, embedded snapshot export, plans
and expansion dialogs. The new row is visible while its action is still running;
these images do not establish completion. Plans and expansion retain their useful
instructions and safeguards. The standard BFF build passed in 28.69 seconds,
followed by the explicit legacy fixture build in 25.94 seconds. All four selected
candidate cases passed without retries. Visual inspection of all 12 English
desktop and Czech desktop/mobile images confirmed the omission in direct and
embedded snapshot views, with create instructions, action 701 at 50%, source IDs,
retention guidance and export controls preserved. The mobile export image shows
only the upper part of its scrollable review; the desktop image shows the source
and lifecycle consequences. Shared documentation assembly, remaining domain
packages and final whole-interface review remain pending.

The available-plan count now requires an environment and successful reads of
assigned and available plans. Unknown reads use the existing unavailable marker and
omit the definitive no-available explanation while retaining the empty title
and warnings. Successful cached counts remain visible during background refresh;
a settled error marks the count unavailable without clearing cached plans.
Known zero and positive eligible counts, assigned-plan exclusion, permissions,
busy controls and all requests and actions are unchanged.

All 12 existing and extended plan-page tests and application TypeScript checking
passed. The new English desktop successful-empty fixture passed strict type
checking and discovers one case. Its baseline passed without retries; visual
inspection confirmed actual zero, the empty explanation and no Assign action.
The standard BFF build passed in 24.31 seconds, followed by the explicit legacy
fixture build in 24.93 seconds. All three selected candidate cases passed without
retries. Visual inspection of all 13 English desktop and Czech mobile images
confirmed unavailable counts for failed or missing reads, known zero and positive
counts, busy controls, selected-plan preview and removal targets. Cache refresh
transitions are covered by the page tests. Earlier snapshot build receipts are
retained. Shared assembly, remaining domain packages and final whole-interface
review remain pending.

Networking omits the generic member and administrator shell introductions.
Monthly, live-rate and bounded-sample metric groups each keep one scope label.
The monitor's sample definition, oldest timestamp, pause/hidden status, session
history and separately readable top-talker scopes remain. IP, host and assignment
inventories keep their labelled flags and warning treatment without a second
status dot or blank state column. Route and host addresses, owners, environments,
copy controls, actions and consequences are unchanged. Add host IPs retains the
one-address-per-line instruction and omits the developer test-data advice.
Host inventory deletion confirmation interpolates the address without stray literal
braces; its target, wording and action are unchanged.

All ten selected synthetic baseline cases passed without retries. Visual
inspection covered all 28 English desktop/mobile and Czech mobile images,
including member traffic, monitor pause/hidden states and host dialogs. Existing
horizontal table scrolling and the host fixture's long-string stress data limit
what those images establish. Twenty focused tests, application TypeScript,
strict fixture checking and the catalog audit passed, with 8,398 matching keys
per language. Header/cell counts agree in all three edited tables. The unchanged
monitor-model tests cover stale and unknown timestamps. The standard BFF build
passed in 26.43 seconds, followed by the explicit legacy fixture build in
24.93 seconds. All ten selected candidate cases passed without retries. Visual
inspection of all 28 candidate images confirmed group scope, timestamps, monitor
states, retained flags and warnings, the creation instruction and the corrected
inventory deletion target. Existing table clipping, stress data and disabled
assignment without a parent interface remain explicit limits. Stale/unknown
monitor states remain unit-test evidence. The separate IP-detail confirmation
copy, remaining domain work, shared assembly and final whole-interface review
remain pending.

DNS zones and settings omit generic introductions. Zone rows and mobile cards
retain their labelled enabled and DNSSEC states and disabled warning treatment
without a second status dot; the table and empty row now use six columns.
Recent DNS transactions show a missing-label fallback ID once, while named
transactions retain their separate ID. Timestamps, progress, failure treatment,
item and history links remain. A plain-language qualifier warns that the list
may omit transactions related to the zone.
Previously delivered unknown enabled/DDNS presentation and labelled mobile DDNS
are reused unchanged. Forms, TTL rules, permissions, requests and actions are
unchanged; the separate DNS semantics PRs are outside this package.

All six selected synthetic baseline cases passed without retries. Visual
inspection covered all 14 English desktop/mobile and Czech mobile images of the
zone list, record creation, normal and invalid settings, and recent history with
a missing label and a failed read. Eight existing DNS model and TTL tests,
application TypeScript, strict fixture checking, table alignment, whitespace and
the catalog audit passed, with 8,398 matching keys per language. The standard BFF
build passed in 24.97 seconds, followed by the explicit legacy fixture build in
25.25 seconds. All six selected candidate cases passed without retries. Visual
inspection of all 14 English desktop/mobile and Czech mobile images confirmed
the omissions, exact bilingual qualifier, fallback and named IDs, timestamps,
progress, status, links, TTL validation and failed-read feedback. The list
captures show only the initial viewport; each screenshot pair shows the same
position. The record dialog obscures underlying content. Administrative state
variants reuse earlier inspected S2 evidence; these fixtures do not establish
live actions or authoritative DNS publication. Earlier networking outputs and
receipts are retained. Only this log changed after the frozen build; source,
fixtures and output remain unchanged. Shared assembly and final whole-interface
review remain pending.

The separate IP-detail host deletion confirmation now interpolates the host
address without stray literal braces in English and Czech. Only the existing
placeholder syntax changes; the exact wording, target, consequence, caller and
actions remain. Both selected synthetic baseline cases passed without retries.
Visual inspection of the English desktop and Czech dark mobile dialogs confirmed
the extra braces around the full target and the retained Cancel/Delete controls.
The existing fixture retains its rejection and retry checks and now also covers
opening, Cancel and reopening the same known-unassigned host dialog. Underlying
page clipping and sticky-header capture positions remain limits of these images.
The catalog audit passed with 8,398 matching keys per language, and each value
has one host placeholder. Complete-fixture strict TypeScript, formatting and
whitespace checks passed. Earlier DNS application/model checks are retained.
The standard BFF build passed in 24.54 seconds, followed by the explicit legacy
fixture build in 24.50 seconds. Both selected candidate cases passed without
retries, including the original rejection/retry assertions. Visual inspection of
both English desktop and Czech dark mobile images confirmed the complete target
and consequence without stray braces, with Cancel/Delete controls retained.
These images show the dialog before submission; they do not establish a live
deletion or assignment outcome. Earlier DNS and networking outputs and receipts
are retained. Only this log changed after the frozen build; source, fixtures and
output remain unchanged. Wider storage review, shared assembly and final
whole-interface review remain pending.

Download creation now points to Tasks when progress tracking is available and
omits the generic review introduction. The target and snapshot/base identities,
format, mail choice, scope notice, validation and all temporary/readiness/full or
incremental instructions remain. This is a wording and hierarchy change; form
defaults, requests, action gates and receipt handling are unchanged.

Both selected synthetic baseline cases passed without retries. Inspection of all
six English desktop and Czech dark mobile images confirmed the complete lower
full and incremental reviews after scrolling the actual modal body, alongside
separate source-selection views. The original payload and action 702 assertions
remain. The catalog audit passed with 8,398 matching keys per language; complete
selected-fixture strict TypeScript, the owned case's formatting and whitespace
checks passed. Whole-file legacy formatting differences remain outside the
formatter adoption scope. A separately labelled DNS fixture repair restores the
already-declared nullable type for callback-written lookup parameters, retaining
all 12 query assertions and compiler flags.

Application TypeScript checking passed in 54.47 seconds. The standard BFF build
passed in 24.26 seconds, followed by the explicit legacy fixture build in
24.01 seconds. Both selected candidate cases passed without retries. Visual
inspection of all six English desktop and Czech dark mobile candidate images
confirmed the exact bilingual help, omitted review introduction, concrete
full and incremental review values, and all three warning bullets. Top help
and lower reviews appear at separate modal scroll positions; no single image
shows the whole dialog. These synthetic images show the review before submission
and do not establish live download readiness or backend completion. Earlier DNS,
networking and detail-host output trees and receipts are retained. Only this log
changed after the frozen build; source, fixtures and output remain unchanged.
Remaining storage Keep reconciliation, shared assembly and final whole-interface
review remain pending.

The remaining storage and networking Keep review reused earlier captures and
inspected five retained frames of owner changes, partial host-address batch
recovery, foreign-owner denial and restricted support editing. Unpictured inline
owner controls and generic partial-list branches remain source-backed evidence.
Four further synthetic cases passed without retries. Inspection of all eight PNGs
and six native trace frames confirmed conditional DNS help and validation,
configuration disclosure without a TSIG key, exact transfer and server-relation
rejection targets and retry controls, and the populated member route-via selector
and read-back. These views use English and the light desktop theme. Two cropped
editor images retain earlier Priority-field pixels; the native frames show the
conditional layout without that field. Long input values and outer page context
remain cropped in some images. Other valid-state transitions and retry outcomes
remain fixture assertions, and no live mutation outcome is established.

This checkpoint adds capture points to two existing DNS fixtures and records the
bounded Keep disposition. Application code, catalogs, requests and gates are
unchanged. Existing strict and discovery results are reused. Original download
build outputs, receipts and the earlier post-build log delta are preserved; this
log adds a further documentary delta without a rebuild. Source-backed and cropped
views remain labelled as such. Shared assembly, adoption and final whole-interface
review remain pending.

No merge or deployment has been performed.
