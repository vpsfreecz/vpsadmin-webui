# Administrator incident-policy overview and history

## Request and scope

The maintainer approved an administrator Incidents entry with Overview as its
menu destination, existing Reports and new History in PHP and React, plus a
shared daily-report summary. This React change implements only its navigation,
pages and generated-API consumers under REQ-051. It starts at integrated
`4499f90fe11df0e4df6f23e5fa54829e2254ec1b`; merged PR115 stays historical, and
this change is tracked in [PR333](https://github.com/vpsfreecz/vpsadmin-webui/pull/333). No backend, policy-engine, BFF, schema or
migration change belongs to this repository package.

## Behavior and compatibility

The admin sidebar opens `/admin/incidents/overview`. Bare `/admin/incidents`
remains Reports, preserving filters and old links; existing new/detail/member and
per-VPS routes remain unchanged. Only actual administrators see the new tabs.
Permission-filtered actions and required fields/metadata gate new endpoint calls.
There is no handwritten SDK substitute, raw HTTP fallback or per-VPS fan-out.

Overview displays all currently counted matched VPS/policy pairs across policies,
including stopped VPSes and counts below thresholds. Server ordering, counts,
remaining values and actual restrictions/outcomes are authoritative. History
preserves saved values and original identities; current action/email outcomes
can be newer. A completed warning does not prove a physical stop, and a shared
stop is not multiplied by policy rows. SMTP acceptance, suppression, queueing,
failure and uncertainty remain distinct. Offset paging and URL filters are
endpoint-local; existing shared keyset behavior and colleague PR307 are untouched.
The echoed cutoff fixes count arithmetic, not mutable settings/ownership/outcomes.
Refresh obtains a new cutoff. Outstanding-now history has no lower date bound.

## Initial verification with the development SDK

Initial implementation and verification used generated
`incident_policy_exposure.index` and `incident_policy_evaluation.index` operations
from development SDK `0.6.0`,
packed from `aed11d01c0d1436293f45a1a4e83d88421375bc1`. Artifact commit
`b619eb8324bfe80c7b225f698fb83efe97639c83` provides the 348079-byte archive with
SHA-256 `9cba02754bec157616c66207312f44312e9af36fe5deb05e8e68585615e17ca9`.
At that checkpoint, the manifest, lock, frontend cache hash and provenance
selected that artifact.
Backend `74c0af3aef3ec9124ca89ce7669ccd9b99633495` supplied the schema export;
prior `0.5.0`/`de4df3d` provenance remains historical.

The full application typecheck and 111 focused tests passed. Coverage includes
actual SDK/XHR routes and serialization, false and null values, partial Resource
references, HTTP and envelope receipts, capability denial, administrator/member/
support boundaries, server ordering, URL filters, offset paging, empty results
and cutoff handling. An initial Refresh test caught a redundant request using
the old cutoff. The corrected controller anchors the initial result once and
obtains a new cutoff on Refresh. Focused strict typing and eight controller tests
passed after naming the anchor callback as a hook dependency.

Ordinary offline `npm ci` installed the selected archive. All 1390 installed SDK
files matched its bytes, and installed dependency versions matched the new lock.
Only the root SDK selection and its package record changed in the lock; other
dependencies and the BFF graph stayed unchanged. An earlier no-save installation
had changed unrelated local versions. The locked tree was restored before final
checks. Session evidence retains the original failed typing, test, lint and
focused-check setup results alongside their corrections.

I18n and design-documentation audits passed after the new API reader was added
to domain coverage. Independent final review covered all four required lanes at
HIGH depth and the complete two-purpose range through `c27d70db`, with no React
source findings. Later browser checks exposed a cutoff race: the URL could update
before React replaced the pager handler. Controls now stay disabled until React
commits the echoed cutoff. Twenty focused view/controller tests, affected strict
typing, lint and diff checks passed for this correction.

Four EN/CS administrator flows at desktop and mobile widths passed. A separate
batch passed the member, support and missing-capability cases. Together they cover
paging, Apply, browser Back, Refresh, direction-only History, outstanding period
controls, old Reports navigation and denial without new endpoint reads. Initial
assertions for a bare policy label and an inner forbidden marker were corrected
to match the actual policy link and outer administrator guard. The original
failures remain in session evidence; there was no single final seven-case run.

Visual inspection led to width and spacing fixes in the two new desktop tables:
local wrapping, column widths, small cell padding and top alignment. Shared
TableCard/CSS and mobile cards are unchanged. Two capture-only EN/CS desktop
cases passed the final geometry checks. The four accepted mobile captures and
flow/gating results retain their original scope. The
[initial synthetic views](screenshots/2026-11-24-admin-incidents/README.md) show
reviewed `c27d70db*` with these narrow source and fixture corrections, before the
successor commit. They do not show a deployed release.

The finite localhost Playwright runs and their Vite children used registered
session services and exited naturally. Failed and exited registrations remain;
no service stop or session lifecycle action ran. Passing cases had no page
exceptions or external requests. Two optional localhost config-script probes per
case produced 404/aborted-request diagnostics. These checks used intercepted API
responses, with no real API, database or account access. No frontend, system or
VM build, deployment or live mutation ran in this verification scope. A published
registry SDK replacement was required before merge and is recorded below. There
is no database migration; earlier verification keeps its stated scope.

Locked terminology revision:
`a65a4dfeb92a59df4a80a737a20bcbf8558793ff`.

## Follow-up: compact administrator views

After inspecting deployed `ef6c72f4f626822e34934229170195f6d8091764`, the maintainer
requested less information on screen, removal of the explanatory banners and a
clearer History page. The follow-up is a separate presentation commit on that
baseline.

Overview shows four columns: VPS and policy, two count lines, status and the latest
outcome. Mobile cards use the same order. Details holds the other facts and links.
History leads with time, incident report, VPS and policy, then separates the saved
decision and counts from the current action and email outcome. It leaves unrecorded
reasons unknown and distinguishes a completed request from a confirmed shutdown.
More filters preserves current values and opens for active refinements. Font sizes
and shared components remain unchanged.

The API readers, models, capability gates, URL handling and cutoff controls are
unchanged, as are the SDK, dependency locks, frontend dependency hash and BFF.
There are no migrations. Terminology follows the locked vpsAdmin revision
`a65a4dfeb92a59df4a80a737a20bcbf8558793ff`.

This follow-up is not yet deployed. Independent review of `d92652cb` found no
React issues. The [compact-view gallery](screenshots/2026-11-24-admin-incidents-compact/README.md)
shows the accepted desktop spacing and mobile layout with synthetic data.

Focused verification for this follow-up: 37 view/filter/page/controller tests,
strict typing of the changed presentation and tests with real transitive imports,
i18n and design-documentation audits, focused lint, formatting and diff checks.
The earlier full application typecheck and 111-test batch retain their original
source scope; they were not replayed or relabelled for this presentation change.
After review, all four English/Czech desktop/mobile browser flows passed across
two batches. The first batch passed both English cases, then stopped because a
test expected an English shutdown reference in Czech. Correcting that assertion
allowed both Czech cases to pass. The flows cover keyboard-operated Details,
advanced filters, active URL values, reload, Back, paging, Refresh and Reports
navigation. The three unchanged authorization cases retain their earlier evidence.

A final spacing adjustment adds 12 px vertical padding to cells in these two
desktop tables. Two capture-only cases verified both languages afterward; they
did not repeat the interaction tests. The tables fit the 990 px content area at
1280 px, with four Overview columns and three History columns. Mobile documents
fit 390 px. The selected captures show `d92652cb*` because the fixture and final
spacing changes were not committed when captured.

The browser cases reported no page exceptions or external requests. Each capture
case retained two optional configuration probes returning 404 or being aborted;
the interaction cases retained four because they also reload. One capture watcher
returned incomplete before the result files appeared; the parent verified the
original command's successful result without rerunning it. These are local fixture
checks. Live acceptance follows the authorized dev-cluster update.

## Published SDK adoption

The manifest now pins registry `vpsadmin-typescript-client@0.6.0`. The npm-generated
lock, SDK provenance and frontend cache hash select the same verified release.
The 348076-byte registry archive has SHA-256
`f4ea2206e80798f001cd16942c99fab1c3c4bcaccac707ea3ca841b65efd1f3d` and matches
artifact 14950321045 from
[release run 45455308941, attempt 1](https://github.com/vpsfreecz/vpsadmin-typescript-client/actions/runs/45455308941/attempts/1).
Parsed registry provenance binds its digest to source
`aed11d01c0d1436293f45a1a4e83d88421375bc1`, tag `v0.6.0` and the release workflow.
Cryptographic signature verification was not performed. The
[client contract](../design/HAVEAPI_CLIENT.md#generated-vpsadmin-typescript-sdk)
retains the exact release integrity and generation-input references.

Pinned npm generated the lock, and ordinary `npm ci --ignore-scripts` installed
the release. All 1390 installed SDK files match the registry archive. Only the
root SDK dependency and its lock record changed; the HaveAPI `0.32.0` peer,
other dependency records and the BFF graph remain unchanged. Prefetching this
lock produced frontend cache hash
`sha256-yAOJrTTzxZeveFPN7kCFHA/0t0r+G2aoz2hqSL19+iI=`.

The published archive has the same member names and file contents as the earlier
348079-byte development archive. Its generated metadata file has mode `0644`
instead of `0600`. Earlier browser and 111-test evidence keeps the development
input named above. Registry adoption resolves the published-SDK prerequisite;
it does not certify a new application deployment or repeat those earlier checks.

After registry adoption, all 101 affected SDK, administrator, routing and wire
tests passed across ten files. The complete required `npm run ci:quick` chain
also passed, including audits and application, tooling, end-to-end test and BFF
typing. These results are separate from the historical 111-test batch. Prefetch
retained the six documented bundled WASI dependency warnings. This batch did
not run a package build, browser check or live verification.
