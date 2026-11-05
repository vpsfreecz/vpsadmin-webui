# Task and transaction detail content, 2026-11-05

## Scope and behavior

This continuation addresses OP10 through OP13 and findings F005, F006 and
F011 through F014. It changes seven presentation sources. The delivered
transaction-list and inspector composition remains in place.

Action detail shows identity, operation, state, category, severity, visibility
and timestamps in its header. Its details retain count and percent, the current
or failed step, related chain, differing backend label and cancellation
eligibility. Exact repeated fields and the second progress bar are omitted.
The unchanged backend-data serialization is available in a native disclosure
after related transactions. Track, pin, dismiss, cancel and reload behavior
remain unchanged.

Action history uses a neutral row surface and omits the redundant progress bar
only when both `finished === true` and `status === true`. Count and percent
remain visible. Active, failed and unknown rows retain their existing emphasis;
finished alone does not establish success. Only the default normal-severity and
user-visibility badges are omitted. Categories, nondefaults, differing raw
operation names, timestamps, scope and row actions remain. The two owned action
callers pass their available translator to the existing badge helper.

Transaction detail shows identity, operation and state once in the header. Its
native information disclosure retains diagnostic timestamps, duration, type,
priority, done/success values, progress, target references and dependency links.
The retained top error now has exact Copy. Input, output, raw JSON and distinct
extra fields remain available through their existing readers and Copy controls.

`TransactionDebugSections` accepts optional `showErrorText`, which defaults to
true. Only standalone transaction detail opts out of its duplicate error block.
It still passes the original `errorText`, so extra-field deduplication remains
exact. Inline and step consumers retain their default error and Copy behavior.
The inspector supplies no raw prop; this change does not invent one.

Invalid filter input remains local to each of the three owned list callers.
The action list uses the existing input error prop; chain and item lists expose
their current errors through a local atomic alert. Only the matching global
invalid-filter toast is omitted. Parsing, chips, scope, keyset pagination,
queries and recovery remain unchanged. Chain refresh warnings use exactly
`q.isError && rows.length > 0` with the existing merged rows, leaving one initial
error without rows and a warning alongside retained rows. Item cached-error
behavior is unchanged.

The only catalog addition is `transactions.tx.section.result`: English
`Result`, Czech `Výsledek`. The raw `rollback_needed` value is unchanged.
Terminology follows locked vpsAdmin revision
`a65a4dfeb92a59df4a80a737a20bcbf8558793ff`. API operation labels remain
authoritative. No unused keys are removed.

## Baseline evidence and limits

The baseline uses the retained O3 frontend input graph of 1,157 files and its
complete 383-file legacy output at the isolated fixture service. That output
retains its original `7d0bfd795253+dirty` metadata. The clean checkout served
elsewhere was unsuitable because its two transaction-list parents differed.
Source equivalence does not turn the retained output into a new clean build.

Ten distinct bounded baseline cases completed: five passed and five reached
their declared final soft assertions after captures and recovery. The original
batch reported two passes, six failures and two unrun cases. One hard failure
came from a synthetic successful-cancel response without the SDK's
`action_state` namespace. The fixture-only correction to `{ action_state: {} }`
preserved the original empty payload, target, rejected first attempt, two manual
attempts, no automatic retry and dialog-close assertion. Only that failed case
and the two unrun cases reran; all three passed. Seven already-complete
baselines were retained without replay.

Actual inspection covered 45 PNG files, including 39 prepared views and six
original failure images, plus three native trace frames. Twelve earlier offline
native frames remain separate provenance. Evidence includes action detail,
mixed action history, local filter errors, chain initial failure and retained-row
refresh, failed item top/error Copy, loaded chain steps and failing inline
payloads. The chain header's Queued state and 1/2, 50% progress remain distinct
from its failed child. Default supplied raw is established only for callers that
supply it.

The narrow 390 CSS-pixel supplemental views resize a Chromium desktop project;
they are not mobile-project executions. Separate selected mobile-project views
cover their stated cases. Viewport crops and internal payload scrolling limit
the bytes visible together. Assertions complement those images. No-chain and
read-error branches remain source-only unless the retained exact consumer proves
them. The locked API describes authenticated `action_state.cancel`
(`/action_states/:id/cancel`) as unimplemented; synthetic UI rejection/retry
does not prove real cancellation support. This limitation does not describe
`migration_plan.cancel`.

## Verification checkpoint

All 46 focused component/model cases across nine existing files passed: 42
retained cases in eight files and four cases in the existing action-detail
suite. The latter exercises the action disclosure and the real standalone,
inline and step diagnostic consumers, including exact error/Copy, input/output,
extra-field deduplication and supplied raw. An initial run exposed two new test
assertion problems: whitespace normalization of serialized JSON and an ambiguous
error selector also matching readable output. Exact text comparison and selection
of the standalone error block corrected them. Only the four-case file reran;
the eight successful unchanged files were retained.

The main source pass then caught three unsupported `exact` properties in new
role-query options. String accessible-name matching is already strict in the
installed Testing Library. Removing only those ignored options preserved the
scoped selectors and every assertion, payload and Copy guard. The affected
four-case file passed again; this result supersedes its earlier results and
leaves the 46 unique-case total unchanged. Application typecheck had not launched
before this correction.

The private strict compile covers all six complete selected E2E specs. It,
scoped source/test formatting, whitespace, the original-assertion preservation
check, i18n parity and structure, and scoped helper lint passed. All 285 original
fixture assertions and original test names remain; original direct-item payload
constants and the delivered successful-940 inspector case are preserved.
Locked-toolchain validation and direct native esbuild verification passed.
Browser-free discovery selected ten unique candidate cases in seven jobs.

Application typecheck passed in 52.976 seconds. The standard BFF frontend build
then passed in 24.681 seconds, followed once by the explicit legacy frontend
build in 25.361 seconds. All source, fixture, tooling and installed-dependency
maps matched before and after both builds. Each complete 383-file output tree
is preserved, alongside the original O3 tree and a copy of the prior served
output. Both new outputs retain honest `5e0ee1974729+dirty` metadata. The Vite
chunk-size advisory remains in both logs. These results do not certify backend
or Nix packages.

## Actual candidate inspection

All ten selected candidate cases across seven jobs passed, with zero retries
and stable fixture hashes. They ran against the matching legacy bundle after
the parent verified the served bytes. This is separate from the ten baseline
cases and their five passing/five fully reached gap results.

Inspection opened all 37 prepared PNG files and one necessary native trace
frame of the opened transaction-information disclosure. Seven recorded
attachments and the ten test traces complement those images. There were no
failed, timed-out or unrun candidate cases.

The known-success action row retains 2/2 and 100% without its redundant bar or
success-tinted surface. Active 0/3, 0% and failed 1/3, 33% rows retain their
bars, nondefault badges and controls. The finished/null-status row keeps its
legacy color and Done/Hotovo badge; this package does not classify that outcome
as successful. The two owned action callers show Czech Hotovo. The standalone
item's existing Done badge in Czech is unchanged; these results do not establish
complete locale coverage.

The action backend disclosure follows related transactions, opens by keyboard
and retains exact serialized data. Failed standalone detail retains one top
error summary with Copy, while its opened diagnostic disclosure retains
metadata and links. Default step/inline errors and Copy, distinct extras and
input/output remain intact. The Czech inline result reads Výsledek with the
unchanged `rollback_needed` data. The inspector still supplies no raw prop.
The standalone chain remains Queued with 1/2, 50% progress while child 702 is
failed and child 701 is waiting.

Initial chain failure shows one error and no refresh warning. After Retry,
pinned row 981 and system row 980 remain available during a failed refresh and
recover afterward. Item Retry and filter recovery preserve chain 981 and the
valid type 9001 scope. Both language attachments record six chain reads, four
item reads and no writes. Local live DOM contains the matching invalid-filter
message; hard assertions confirm the matching global toast is absent. Images
alone do not prove screen-reader announcement behavior.

The cancel fixture records two explicit requests to action 123 with the original
empty action payload: a rejection followed by manual retry with the correct
response namespace. The dialog closes while the action header remains Running.
Its unrelated related-transactions namespace error limits that fixture; the
separate completed action and standalone chain supply loaded-consumer evidence.
This remains synthetic recovery, subject to the authenticated cancel API limit
recorded above. Copy assertions use a fixture clipboard stub rather than
operating-system clipboard integration.

Mobile-project views use a 393 by 727 CSS-pixel touch viewport with Czech dark
UI settings. The additional 390 by 844 views resize the desktop project.
Viewport and internal-reader crops do not show every payload byte or system row
at once; the Czech system row below the prepared crop is supported by its DOM
guards and the English view. The native frame is a recorded reduced-resolution
image. No-chain and deliberate read-error recovery remain source-only within
this bounded selection. No new capture or passing-check replay was needed.

The original build-time log and source packets remain frozen separately. This
final outcomes update is the sole post-build documentary delta; runtime source,
fixtures, dependencies, compiled outputs and their metadata are unchanged.

This presentation change preserves API payloads, query/cache policy, role and
route guards, permissions, cancellation/tracking state and persistent data.
It introduces no schema or migration and requires no data conversion for
rollback. Independent whole-series review and final-head verification remain
separate delivery work. No merge or deployment has been performed.
