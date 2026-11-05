# Account and finance content hierarchy

Prepared for the whole-interface content update in PR150.
This increment implements the accepted A1 account package and the inspected
Finance overview/forecast portion of A3. Requirements: REQ-005, REQ-040 and
REQ-052. Other account, finance and request families remain separate increments.

## Changes and preserved behavior

- Profile removes generic introductions and the Tips card. Routine preference
  persistence and load/save timestamps live in the existing Diagnostics
  disclosure. Loading, saving and errors remain visible in a status region;
  sync-recovery guidance, retry/reset, scope, time-zone and language instructions
  remain. Personal changes retain their approval receipt and request link.
- MFA recovery omits its aggregate banner only after successful, settled reads
  establish ready state. Pending or failed reads retain the card, Refresh and
  loading/error content, without an aggregate status badge. Disabled, staged,
  missing-factor, single-path and unfinished-setup guidance stays visible.
  Individual factor controls and the master switch are unchanged.
- Authentication settings omit an empty review. Existing warnings remain even
  when there are no edits; actual changes retain before/after values, effects
  and the immediate-save consequence. Parent submit gates and payloads are
  unchanged.
- Finance overview keeps monetary totals, snapshot scope/time/caveats and
  stale/currency errors. Status counts appear in the queue filters once, with
  the selected category's definition; the paid count remains a compact fact.
  Permanent ready reassurance and duplicate count cards are removed.
- Forecast removes repeated introductions and mode subtitles. English and Czech
  descriptions replace backend identifiers while retaining independent year
  and month limits, the December 2025 and July 2026 exclusion example, unknown
  currency/unit and current-account recalculation rather than saved history.
  The paid seven-day boundary and existing subtitle remain unchanged.
- Payment history keeps its useful accepted-payment qualifier, financial
  facts, links and read-recovery notices; no forced change was made there.

The locked terminology revision is
`a65a4dfeb92a59df4a80a737a20bcbf8558793ff`. Final bilingual wording was reviewed
by the lead. No API, authentication, role, model, action or persistence format
changes are introduced. No migration or coordinated rollout is required;
reverting presentation code does not require state conversion.

## Verification and limits

Pinned Nix checks passed: 36 focused tests across six component/model files,
application typecheck and literal i18n audit (8,398 matching keys per language).
E2E fixture discovery selected 21 existing-spec cases. The modified existing
`profile_security_settings.spec.ts` needs adoption during the final shared E2E
manifest reconciliation; its guard stopped before TypeScript. No bypass or
changed deferral was introduced in this package.

Synthetic baseline screenshots were inspected for relevant account conditions,
including unchanged sign-in warnings, every MFA recovery state and preference
loading/error/saving/recovery. English/light and Czech/dark desktop and selected
mobile views were inspected. The separate mobile guard run passed 21 cases.
Duplicate desktop launches shared an output directory and collided during trace
packaging; that combined desktop summary is not accepted as a clean pass.
Retained images supply only their actual observed states. Finance baseline
inspection includes desktop/mobile normal, stale, empty and loading views.

The standard BFF build passed in 27.33 seconds and the legacy fixture build
in 25.96 seconds from the same recorded frontend and build inputs. The
registered legacy candidate passed 44 account cases and 22 finance cases with
no retries. Four additional Czech finance cases passed on both the baseline
and candidate. Changed account layouts were inspected in English and Czech on
desktop and mobile: quiet normal state, retained MFA loading/errors and factor
controls, unchanged authentication warnings, preference failure feedback and
reset failure/retry. Finance overview and forecast were inspected in English and Czech
on desktop and mobile, retaining monetary facts, category scope, stale warnings
and uncertainty. These observations cover the inspected states only.

The BFF bundle retains its production origin and session requirements; the
legacy fixture does not certify a real API or authentication exchange. Final
shared E2E adoption, full-interface coverage, current-head checks and independent
whole-branch review remain pending. No merge or deployment has been performed.

## Account rows and incoming-payment continuation

This bounded A2/A3 subset prioritizes device, session and metrics-token rows
instead of count tiles computed from the loaded page. Repeated Sessions/Metrics
wrapper descriptions are removed; Prometheus guidance remains in the shared
metrics panel for both member and administrator views. Session technical fields
start collapsed behind the existing control, with explicit `details=1` retained.
Identity, authentication type, last use, trust and revoke/close consequences stay
visible. User-data format guidance moves beside Format. Successful checklist
entries are omitted; input constraints, actual warnings, accessible descriptions,
linked over-limit status and parent save gates remain.

Incoming payments remove duplicate header facts and assignment-readiness badges.
The selected account is shown neutrally as Target user; looking it up does not
establish a payment match. Zero review count no longer shows green OK, including
when global totals are incomplete. Duplicate filter rows are removed while scope
warnings, counts, useful queue links and actions remain. Bulk selection controls
stay available; the action/review body appears after selecting payments. The
English and Czech subtitle explains current-page scope and separate updates that
may fail. Financial facts, target-state consequences, selected/skipped/partial
outcomes, confirmations and parent submit gates are unchanged.

Selected-user accounting removes three generic accounting, settings and
instructions descriptions. Payment instructions, accepted
history qualification, zero assessment, manual-payment impact, notification
caveat, stale blockers and rejection/retry remain. No authentication, financial
classification, API payload, persistence or action model changes are introduced.

Actual baseline inspection includes English/Czech dark Sessions/Metrics on
desktop and mobile, selected-user device rows, full incoming target/review and
zero/nonzero review under incomplete totals, and editor/accounting frames.
The editor mobile frame shows the over-limit count and blocked Create; its lower
status is outside the crop. Existing accessibility assertions and the focused
component test protect that linked status. Selected-user Mail/User data wrappers,
namespace entry failures, remaining requests and the separate shared lifecycle
renderer remain named later work. AdminUserOverview lifecycle evidence does not
establish LifecyclePanel coverage.

All 48 focused component/model cases across nine files passed: 43 retained cases
in eight files and five cases in the existing user-data editor suite. Its three
original accessibility cases are unchanged, preserving unique IDs, label focus,
atomic status linkage, no duplicate live region and touch-size assertions. Two
added cases cover successful-checklist omission and retained warnings. Only the
five-case editor file reran for this restoration; earlier preparation results are
superseded. The bulk-action component test is the only new test file.

Application typecheck and direct strict compilation of all nine changed E2E
specs passed. The i18n audit remains valid for the unchanged 8,398-key catalogs
and the two accepted subtitle translations. No global manifest or deferral was
changed.

Baseline fixture repairs retain request/state/retry assertions: target users now
supply mandatory identity fields; mobile cases target visible cards and pagers;
lifecycle fixtures supply explicit nullable dates and required action metadata.
The exact lifecycle payload assertion includes nullable expiration without a null
reminder. The create-member assertion now checks the complete supported payload;
monthly assessment is absent from both the current form and generated create
contract. No runtime guard was relaxed.

Two Czech normal-state cases were appended to the existing incoming specs using
the established helpers. The original English test bodies, payload/state/date
assertions and names remain byte-identical. Both complete specs pass strict
compilation. All four Czech baseline cases passed without retries; their actual
six desktop/mobile dark-theme images were inspected for the target, untouched
bulk scope and selected-payment warning. The matching six Czech candidate
images were also inspected on desktop and mobile: the neutral target, approved
subtitle, payment amounts, resulting state and selected-payment consequences
remain visible after the hierarchy changes.

The standard BFF frontend build passed in 26.52 seconds and the explicit legacy
fixture build in 25.67 seconds, from the same recorded source/build and fixture
graphs. Both bundles honestly report `28d5ea7cd5db` with local changes. The BFF
output is preserved separately; the legacy dist is frozen. Read-only HTTP checks
on the existing 5202 preview match the frozen index, referenced assets and build
metadata. No service registration or restart was performed. After the builds and
candidate captures, only the non-bundled editor test changed in the conservative
source graph. A separate current-source digest and exact one-file equivalence
receipt retain the original build/candidate inputs without relabelling them.
Production, E2E, dependency and output bytes remain unchanged; the test-only
restoration required no rebuild or browser repeat.

The registered legacy candidate passed all 51 unique cases in seven bounded
jobs without retries, with every selected spec unchanged before and after its
job. The 14-case English incoming job excludes the Czech tag; the four Czech
cases have their own job. Actual desktop/mobile inspection covered compact and
explicit-detail session rows, device rows, token-revocation consequences, valid
and invalid user-data editors, and the changed incoming-payment hierarchy.
English and Czech incoming images were compared with their baseline views.
Incomplete-total scope, bulk confirmation and partial-failure feedback remain.
Accounting inspection covered instructions, accepted-history qualification,
manual-payment review, zero-assessment consequences, stale write blockers and
rejection/retry. No content or layout issue was found in those inspected states.

Inspection limits remain explicit: the mobile over-limit warning text is below
its retained crop, and a refreshing Sessions frame does not establish a visible
read-error alert. Existing accessibility/functional assertions cover those
branches. This checkpoint does not close the separate Mail, namespace, Users,
request or shared lifecycle work. Final shared E2E adoption, full-interface
coverage, current-head checks and independent whole-branch review remain pending.
The BFF build retains production origin/session requirements; the legacy fixture
does not certify a real API or authentication exchange. Earlier A1/finance
receipts remain available. No merge or deployment has been performed.

## Mail recipient hierarchy and wrapper scope

Mail settings now lead the page. Recipient precedence appears once as neutral
context immediately above the template table, with its existing title. The
generic template subtitle, repeated inheritance help and footer legend are
removed. English and Czech guidance distinguishes explicit template overrides
from inherited recipients that the table cannot determine, and keeps the
system-recipient caveat. Role input help lists the separators already supported
by the unchanged parser, including semicolons.

The selected-user Mail wrapper adds no prose. The selected-user User data hint
identifies whose templates are being managed and remains useful; both wrappers
are unchanged. The existing model still returns unknown template routing without
an explicit override. Settings, row drafts, enable/disable, copy, save/reset,
local errors and retry, accessible names and owner/action gates are unchanged.
No API, payload, permission or persistence format changes are introduced.

Eight new cases in the nearest two existing specs passed against the frozen
baseline without retries, with stable before/after hashes. Actual English/Czech
dark desktop/mobile images were inspected for selected-user and personal-admin
Mail composition, including primary fallback, explicit template override,
unknown routing and disabled templates. Selected-user User data list/editor and
personal-admin template images were inspected across the material compositions;
the owner-query assertions distinguish selected account 42 from operator 1 even
when a personal route includes a user query. These are synthetic read/draft
specimens; no new mutation is submitted by them. The old member save/retry and
editor evidence is retained separately.

Both complete changed specs pass strict browser-free compilation; the original
test bodies remain unchanged. All eight existing Mail model/accessibility cases
passed without test edits, preserving recipient-specific names, unknown routing,
row-scoped save/reset and payload checks. Application typecheck and the literal
i18n audit passed with 8,398 keys per language. The locked terminology revision
remains `a65a4dfeb92a59df4a80a737a20bcbf8558793ff`; the final two-key English/Czech
wording was reviewed by the lead.

The standard BFF frontend build passed in 28.25 seconds and the explicit legacy
fixture build in 24.75 seconds from the same frozen application/toolchain and
fixture graphs. Both complete output trees are retained. Build metadata reports
`3dab04a2efe5` with local changes. Read-only requests verified that the existing
5202 preview serves the frozen index, every local asset referenced by it and
matching build metadata. No service registration or restart was performed.
Earlier A2/A3 receipts and both prior output trees remain separate.

The registered legacy candidate passed all 14 unique cases without retries:
eight wrapper/scope cases and six existing Mail layout/save-retry cases. Both
jobs retained exact before/after spec hashes. Actual English/Czech dark desktop
and mobile views were inspected for selected-user and personal-admin Mail. The
single guidance block retains precedence, unknown inherited template routing
and system copies; role syntax help, explicit/disabled states and the selected
account versus current-self identities remain. The 320px member view keeps
recipient controls within the viewport. No issue was found in those inspected
changed states.

Retained traces show the role rejection beside its draft and Save/Reset controls,
the settings rejection in context, and the successful settings retry with Saved
feedback and disabled Save. Some template/settings error text is below individual
frame crops; the exact error/draft/retry assertions passed. The final template
retry frame shows Saving, not completed feedback. Unchanged User data wrapper
Keep evidence is reused from the baseline, with the earlier editor protections
retained; this Mail checkpoint does not claim new full-family User data coverage.
The final log update is outside the frozen application and fixture graphs.

The BFF bundle retains its production origin/session requirements; the legacy
fixture does not certify a real API or authentication exchange. Final shared
E2E adoption, full-interface coverage, current-head checks and independent
whole-branch review remain separate. No merge or deployment has been performed.

## Namespace entry availability and Users hierarchy

Namespace detail removes its generic introduction. Users removes the generic
page description and API-adaptation hint while retaining the conditional
progressive-search scope notice. Owner, namespace size/offset/blocks, user
identity, security states, filters and paging remain unchanged (REQ-009,
REQ-010, REQ-040 and REQ-046).

Map entry loading and failure now appear inside the entry panel. Unavailable
entries show an unknown count and local Retry, preserving map metadata and
independent rename/delete actions. Add, row editing, Save and row deletion
require a successful entries feed. A successful background refresh keeps those
actions available. A failed refresh retains cached rows, dirty values, field
errors and an open delete confirmation; entry controls and confirmation become
disabled until recovery. Retry keeps dirty rows and the independent label draft.
UID/GID definitions, the 10 UID and 10 GID limits, Save-all consequence, existing
mutation guards and reconciliation remain. No API, owner, permission, query,
payload or persistence contract changes are introduced.

The repaired namespace baseline passed six cases, alongside the two earlier
Czech Users cases, without replaying Users. The first namespace attempt failed
before authentication bootstrap and supplies no domain evidence. Actual dark
English/Czech desktop/mobile images were inspected for global namespace/map,
member namespace/map, administrator personal map and initial/cached entry
failures. The existing index redirect passed its route assertion. Failure images
show the old false empty/zero result and enabled entry actions, including a dirty
row and open confirmation. Sticky-header offsets in the full-page modal images
limit geometry evidence. Retained list/filter/owner-scope views remain separate.

All 33 existing API, filter, pagination and Users model tests passed across five
files. Complete strict compilation of the three changed browser specs and the
literal i18n audit passed, with 8,399 keys per language. Original browser-test
bodies remain unchanged. Application typecheck passed in 58.21 seconds. The
exact new English/Czech entry-error title uses the locked terminology
revision `a65a4dfeb92a59df4a80a737a20bcbf8558793ff` and the lead's final wording.

The standard BFF build passed in 25.87 seconds and the explicit legacy fixture
build in 24.98 seconds from the same frozen source, fixture, dependency and
toolchain inputs. Both complete 382-file output trees are retained, alongside
the earlier Mail and A2/A3 outputs and receipts. Build metadata reports
`4279dcff50a0` with local changes. Read-only requests verified the existing 5202
preview's index, every local asset referenced by it and matching build-info.
No service registration or restart was performed.

The registered legacy candidate passed all 16 unique cases without retries:
12 namespace cases and four Users cases, with exact before/after spec hashes.
Actual inspection covered 26 English/Czech dark desktop/mobile PNGs and four
English light Users trace frames. Initial entry loading and failure show an
unavailable count without a false empty result; Retry restores a known empty
result and enabled Add. A successful held background refresh keeps entry actions
available. Cached failure retains dirty count 256 and the open delete dialog
with disabled confirmation. Cancel exposes the retained draft and local error;
Retry restores entry controls without losing the draft or independent label
edit. Map metadata, rename/delete availability, UID/GID instructions and Users
security rows, search and paging remain in the inspected compositions.

Both cached-failure traces contain zero namespace writes and four passing
empty-write assertions each. This is trace-derived evidence; the test emitted
no standalone zero-write attachment. Full-page captures contain sticky-header
offsets, and individual mobile table views show only the current horizontal
scroll position. They do not certify complete modal geometry or every column
in one image. No new issue was found in the inspected changed states.

This final log update is the only change after the frozen build and candidate
inputs. The BFF bundle retains its production origin/session requirements;
synthetic legacy fixtures do not certify a real API or authentication exchange.
Shared adoption, final interface reconciliation, current-head checks and
independent whole-branch review remain open. No merge or deployment has been performed.

## Request detail and decision hierarchy

Member request detail removes the generic header description and repeated state
badge. Submitted-value explanations, the dedicated state/date area and the
administrator response remain. Administrator detail removes the choose-action
Decision subtitle while retaining the lower decision state after the long
applicant block, submitted-versus-current comparison, open metadata and risk
signals (REQ-030, REQ-031, REQ-036, REQ-038 and REQ-040).

Resolution review keeps the target, state, selected provisioning options,
overrides, cleared-value markers and complete outbound text. The reason field's
required/optional label and inline validation remain; the duplicated reason-gates
list is removed. Action consequences already explained by the modal are omitted
from the review for registration approval, denial and correction. The explicit
account-change approval and ignore Impact remain. English and Czech footer
wording describes conditional Tasks progress without claiming every decision
queues or naming backend identifiers. Parent props, action gates, ownership,
payloads, query behavior and pending/uncertain recovery are unchanged.

Retained request views were reconciled against 53 unchanged request source and
renderer files and 227 unchanged request-prefixed catalog values per language.
The fresh baseline used the recorded namespace bundle on 5202 and passed six
cases without retries: Czech member registration/change detail and the two
opposite-applicant-language correction presets on desktop/mobile. Actual
inspection covered four member PNGs and 12 review scroll captures. The review
captures show its top, cleared values and full outbound text/footer at different
scroll positions; they do not show the whole modal at once. Retained English
member and administrator views supply their stated composition and recovery
evidence. An earlier blank member frame is excluded, and the earlier mobile
long-content crops retain their limits.

All 62 existing focused cases passed across five suites, preserving payload,
owner, provisioning, reason, queue and recovery checks. Complete strict
compilation passed for all three selected browser specs, and the literal i18n
audit passed with 8,399 keys per language. The locked terminology revision
remains `a65a4dfeb92a59df4a80a737a20bcbf8558793ff`; the lead supplied the exact
two-key English/Czech footer wording. Application typecheck passed in 56.194
seconds.

The standard BFF build passed in 24.133 seconds and the explicit legacy fixture
build in 24.688 seconds from the same frozen source, fixture, dependency and
toolchain inputs. Both complete 382-file output trees are retained alongside
the namespace, Mail and earlier outputs and receipts. Build metadata reports
`786bf091219b` with local changes. The existing 5202 preview's index, every local
asset referenced by it and build-info matched the legacy output. No service
registration or restart was performed.

The registered legacy candidate passed all 23 unique cases across five jobs
without retries, with exact before/after fixture hashes. Actual inspection
covered all 32 prepared English/Czech desktop/mobile PNGs, 13 existing trace
frames and four crops derived from the long mobile layout PNGs. Member views
retain submitted values, state/dates and the administrator response. Admin views
retain applicant details, initially open technical metadata, risk signals and
the lower Decision state. Correction review scroll views retain the target,
state, selected overrides, explicit clears, complete outbound text in the
applicant's language and the exact conditional Tasks wording in the UI language.
Approval frames retain selected provisioning options and disabled pending
controls; rejection remains visible beside the actions. Comparison and recovery
frames retain clear/no-change/empty-current distinctions, the unavailable-current
warning and the uncertain-outcome retry warning and confirmation.

Separate review scroll positions do not certify the whole modal in one image.
Approval crops still stop above the complete lower Review; common composition
and unchanged props provide the recorded reuse. Long mobile and trace viewport
crops retain their limits, including partial English member registration and
response content. Two inspected transition frames add no lower-review proof.
The uncertainty scenario uses a viewport 320 CSS pixels wide within the desktop
project; its warning and confirmation frames apply to that width. No new issue
was found in the inspected changed states.

This final log update is the sole project-file change after the frozen build and
candidate inputs; its original and final hashes are recorded separately. The
source, fixtures, dependencies and complete output trees remain unchanged, with
honest original build metadata. The BFF bundle retains its production origin
and session requirements; synthetic legacy fixtures do not certify a real API
or authentication exchange. Lifecycle, shared adoption, final interface
reconciliation, current-head checks and independent whole-branch review remain
open. No merge or deployment has been performed.


## Shared lifecycle hierarchy

The shared lifecycle panel omits ordinary active-state reassurance beneath its
state badge and beneath the administrator's state selector. The editor also
omits the generic account-specific introduction. State values, expiration and
reminder dates remain. Suspended, deletion and unknown-state explanations,
snooze eligibility and the after-expiration warning, reason, destructive
confirmation, permissions, locks and state-log actions are unchanged. The
shared props and generic user branch remain intact (REQ-023 and REQ-040).

Both administrator and member mutation rejections already render as one
persistent accessible alert inside the current modal. Actual views show the
retained expiry/reason or custom reminder date and an enabled explicit retry.
The administrator editor title names the target; the member's enclosing VPS
heading supplies its target context. The snooze title does not repeat the
hostname. This existing notification path is preserved without a second local
alert or provider change. Existing success wording and action-state tracking
remain unchanged; no new synchronous/asynchronous outcome claim is introduced.

The finite baseline has four unique passes: the original administrator desktop
case and three failed/unrun remainders. The first member fixture used a
nonexistent overview suffix and reached Not Found before requesting the VPS;
only that URL changed to the supported index route. The original failure is
retained separately and supplies no lifecycle behavior evidence. The original
bilingual renewal/reactivation/start cases and their payload assertions remain
unchanged. No production route, API, model, default or permission was altered.

Actual baseline inspection covered all 24 prepared successful English/Czech
desktop/mobile PNGs, two native member Overview frames and the retained admin
panel/editor frames. Panel state images preserve active, suspended, deletion and unknown
values and dates. Member views preserve the expiry warning and suspended snooze
restriction; editor views preserve target/reason, destructive confirmation and
rejected drafts. Original trace DOM snapshots confirm the local alert semantics.
Panel crops and modal scroll positions do not certify every part of every dialog
at once. The native member frames establish enclosing target context separately
from the lower rejection view.

All 11 existing focused component/payload cases passed across two files. Their
bodies are unchanged, preserving VPS/User history scope and exact state/date/
reminder payload contracts. Complete strict compilation of the changed existing
browser spec passed; its exact bytes remain unchanged after that receipt.
Browser-free candidate discovery selects four cases in the two finite scenarios.
No English/Czech catalog value changed; the earlier i18n audit applies to the
unchanged catalog inputs. No new tests mirror the removed reassurance.

Application typecheck passed in 58.343 seconds. The standard BFF frontend build
passed in 24.739 seconds and the explicit legacy fixture build in 24.386 seconds
from the same frozen source, fixture, dependency and pinned toolchain inputs.
Both complete 382-file output trees are retained alongside the eight earlier
request, namespace, Mail and account/finance trees and their original receipts.
Build metadata reports `2c55ec0bfd17` with local changes. The existing 5202
preview's index, every local asset referenced by it and build-info match the
recorded legacy output. No service registration or restart was performed.

The registered legacy candidate passed all four unique cases without retries,
with exact before/after fixture hashes. Actual candidate inspection covered all
24 prepared English/Czech desktop/mobile PNGs and two native member Overview
frames. Active reassurance and the generic editor introduction are absent.
State/date values, suspended/deletion/unknown explanations, edit/log actions,
destructive confirmation, reason, custom snooze date, after-expiration warning
and suspended snooze restriction remain. Both rejection views retain one local
alert beside the draft and explicit retry. Administrator titles name the target;
the member's enclosing VPS heading supplies its target context in the separate
native frames. Existing trace attachments record two identical payloads for each
explicit rejection/retry sequence, with no extra write.

Panel crops and current modal scroll positions retain their stated limits;
the member rejection crop does not itself show the hostname. No new issue was
found in the inspected changed states. The final log update is the sole project
file change after the frozen build and candidate inputs. Its original and final
hashes are recorded separately, with the original log retained. Source, fixture,
dependency and output graphs remain unchanged, including original build metadata.
The BFF bundle retains its production origin and session requirements; synthetic
legacy fixtures do not certify a real API or authentication exchange. Shared
adoption, final interface reconciliation, current-head checks and independent
whole-branch review remain open. No merge or deployment has been performed.
