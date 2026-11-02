# Generated TypeScript client migration

Requirements: REQ-005, REQ-007, REQ-011, REQ-012, REQ-054, REQ-056, REQ-060,
REQ-061, REQ-068.

The maintainer requested full generated client use for vpsAdmin operations and removal
of duplicated request contracts. The shared boundary now accepts the complete
RequestSpec and preserves RequestResult, while keeping WebUI auth/language,
renewal, public isolation, action-state evidence and uncertain-write policy.
Generated outputs are narrowed into domain models without a second wire decoder.
Local ClientInputError and post-dispatch ApiOutputError have separate semantics.
Anonymous discovery failures retain their original receipt/error as cause without
claiming that the requested operation was dispatched.
All domain adapters now call generated operations; the legacy generic wrapper,
single-namespace projection and their obsolete tests have been removed. Shared
error/count/receipt helpers live in apiErrors. The final source import/call scan
finds no remaining legacy call path, including public operations and consumers
outside the API directory.

## Source preparation and dependency evidence

Source development began against generated client `383e8556208f330472961077cce4dcb546231c8a`
from generator `7cffd0b6b6959abf5b5af810ba81004b8defc13c`. The immutable
0.3.0 archive has SHA-256
`e067ba78b54871c83e6bda1c4ab8a12e0575bb990a88fb39090e92fa3532e6f6`
and npm integrity
`sha512-JGSZJBHsWveI0e4hFuFv6KyBI6SZoRdIwxQ07kBTCJilpmD2VMi6IH2aG//HYlzr9cItIeghop0zcxAenMVR0g==`.
Both digests and every extracted package file were checked against the archive.
The root lock graph was restored with npm ci after no-save npm installation
re-resolved unrelated installed dependencies; exact archive bytes were then
installed into node_modules alongside the locked HaveAPI 0.32.0 peer. No local
archive path was written to a committed manifest/lock. This is an unpublished
source-development candidate, not a distributable dependency or runtime acceptance.
Foundation review required a selectorless explicit-help rejection and smaller
internal output descriptors. The verified successor generated client
`b650f21fa83c314b3c21aaf62f0d9dda2b08befd`, generator
`172c752ef65792de177279956917259d2c3f9b37`, replaces the installed source candidate.
Its archive SHA-256 is
`8907e6bcfb013df86b9d1600db42ba724b2300a1cb866ebf05e2019aa24c537c`
and integrity is
`sha512-3GUpjTRa6hYPiIBRzumFM/MQ/tOu49yVvAW7o2CECSrZ/Ic5vObtwF0EqVT7wNDXPOVMfph+54eEZAM59Utngg==`.
Every installed archive file matches; public declarations are unchanged. The old
archive and its receipt are retained as source-development evidence. The final
provenance refresh uses generated client `99ee06654ef956a09b52749f4cd02d1435362087`
and generator `eea3ae5e82c3db23d5f5bc9f1a5e7784117c4e1b`. Its archive SHA-256 is
`f3bb42d0392fb738f5c70fe1415cc8742ab943a31c2ed2a85af5ccbd385d831f`, with integrity
`sha512-6Q74ddIgGzeav9mvPubc33g5Sd+Ni7ZOLtKnNVzP/sW1Cxmw59nLiib50H27HBYc0UgoVfjlxuqH0WmX7hR3jw==`.
All 1,360 installed archive entries match. Relative to the accepted b650 artifact,
only generator commit provenance changes; generated sources, all 1,352 built
modules and dependency inputs are unchanged. The maintainer directed that the generated client
remain unpublished, then authorized temporary support for refining unpublished
candidates. The root now uses the verified archive through the ordinary relative
file dependency described in [packaging](../design/PACKAGING.md#temporary-unpublished-sdk-input).
The compact provenance and npm-generated lock identify the exact bytes. No generated client
source build, release tag, default-branch integration or publication is involved.

## Copy and visible control impact

Shared catalogs contain only the lead-approved diagnostics for settings-path
configuration, removed stale URL text filters, HelpBox language filtering/clearing
and paid-until clearing. Domain owners activate these in their own controls;
adding catalog entries alone changes no displayed control. Locked terminology was
resolved via Nix to vpsAdmin `a65a4dfeb92a59df4a80a737a20bcbf8558793ff`.
There is no legacy PHP source pin or screenshot claim for this React transport
change. Actual React control changes and their rendered cs/en checks must be
recorded with the corresponding domain edits. Existing preference sync error
handling remains the settings-configuration presentation boundary.

## Initial verification and status

Prepared source only; no merge, publication, deployment or database migration.
The initial foundation checks passed before broad domain conversion:
25 focused policy/binding/output tests use spies at the runtime seam;
17 configuration tests also pass (42 total). Full TypeScript checking, scoped ESLint,
Prettier, catalog parity (8,370 keys per language) and the design inventory/audit
(68 API modules, 162 documents) pass. Output-narrowing cases prove receipt
preservation and uncertainty. The exact b650 successor passes 109 shared/legacy focused checks across eight
files (7.85 seconds), including actual HaveAPI controlled-XHR decoding and policy.
The network owner also reports 36 network tests (six actual-XHR cases, 8.61
seconds) and 12 NetworksPage cases (14.01 seconds), all passing on that successor.
Null metadata is a protocol failure; its original envelope/data/status remain in
the error.result receipt. An initially incorrect fixture expectation was corrected
after inspecting that established contract. The VPS owner reports nine focused files passing all 142 tests and full current
typecheck exit zero on b650. The generated-backed list view guards positive safe
row IDs and preserves optional/null fields and partial associations; malformed
relations remain post-dispatch output failures. Generated inputs retain
count=false/limit=0. Canonical Start success includes vps:{} and action metadata:
HaveAPI inherits output{}, ok! defaults to {}, and safe_output wraps the object.
The corrected fixtures distinguish missing namespace from missing action receipt;
no provider or executor workaround was needed. The architect independently
confirmed the same source chain.
At this initial checkpoint, committed review and whole-branch checks were still
outstanding. Later results appear in the verification campaign below.
No live API operation was used by W. The config.ts documentation correction required
adopting that deferred file into the existing scoped ESLint/Prettier coverage;
its mechanical formatting is included without configuration behavior changes.
The canonical KB workflow was read from the contracts repository; its current
control/pin model owns legacy PHP landmarks. No legacy pin is used as React UI
evidence. Domain-specific visible React control impact remains a separate check.

## Complete source conversion and visible corrections

Domain owners completed generated-backed models and input contracts without
invented defaults for absent associations. Public outage handlers may omit user;
admin scope changes require the actual user.id. Public news requires a real
localized message, while admin editing keeps independent English/Czech fields.
Public statistics use the declared cluster response namespace; the seven stale
browser fixtures were corrected without changing the cluster/public_stats route.
Public heatmap SystemConfig reads also use generated operations.

Source-backed controls now match the generated input contract:

- User-data, environments, locations and traffic drop unsupported text queries;
  OS-template admin filters also drop unsupported enabled/supported inputs. Stale
  URL filters reset with the approved explanation and preserve supported scope.
- Host-address assignment displays the actual parent interface, rechecks it before
  send and uses the path-only action. Missing/changed routes prevent submission.
  Unknown nested associations do not prove successful detach/reassignment.
- Clone descendants are unconditional; mount creation has no unsupported type or
  master selector, and update exposes only actual editable fields. Disk usage
  keeps current values without fabricated history points. State history displays
  the earliest 50 records without offset or continuation claims.
- User creation has no unsupported monthly-payment field. Populated paid-until
  dates cannot be cleared under the nonnullable update contract; valid dates and
  zero amounts remain supported. Reminder clearing submits the observed expiry
  through the existing lifecycle workflow. Sessions have no invented current
  marker, TOTP reads only recovery_code, and empty mail-recipient data has no
  fabricated role/primary fallback or copy target.
- Public correction tokens and all three correction dropdowns use anonymous generated client
  bindings even in an authenticated browser. Admin approval/template changes
  check actual eligibility; unrelated review outcomes retain their own rules.
- HelpBox unlocalized filtering and clearing a localized language are unavailable.
  Missing mailbox handler counts remain unavailable, and nonexistent transaction
  links are removed. Advisory edits preserve real revisions including zero,
  separate language notes and dirty drafts; child changes are sequential with
  completed/remaining intentions rather than an atomicity claim.

The lead supplied all new English/Czech wording using locked terminology. These
React control changes need reviewed rendered desktop/mobile checks in both
languages; the legacy PHP KB workflow is not evidence of their appearance.

Shared verification after wrapper retirement preserves meaningful policy tests:
the migrated call/renewal/transport batch passed 65 cases, error/policy coverage
passed 74 overlapping cases, and the final namespace/auth/receipt batch passed
35 cases on the exact refreshed artifact. Counts describe separate overlapping
batches and must not be summed. Domain owners supplied their focused source
evidence separately. The first combined source compiler snapshot after retirement
reported 57 diagnostics, chiefly incomplete test receipts and nullable partial
views. Owners corrected these without weakening receipts or inventing fields.
The pre-refresh combined application compiler and required quick audits pass. The adopted
mounts fixture also passes strict E2E typing after adding its actual dated mount
field and canonical empty dataset:{} mutation framing; 94 E2E files are checked
and 183 remain deferred. BFF checks pass (6 cases), as do 42 targeted tooling/
coverage/structural tests across five suites. The final structural
audit passes with 25 accepted inherited exceptions and no unaccepted, invalid or
aggregate failures. Resolved exceptions are removed and reduced allowances
tightened; the historical baseline is unchanged. These source checks do not
replace final package/review/browser checks.

The test-only [isolated API driver](../../scripts/integration/vpsadmin-sdk-contract.mjs)
and [Ruby fixture](../../scripts/integration/vpsadmin-sdk-contract.rb) reuse the
guarded schema-export Bootstrap/TestDb and all six plugins with Puma on loopback.
They use the actual HaveAPI 0.32 runtime and installed verified generated client. The 23-call
public/member/admin matrix covers descriptions, identity, template eligibility,
count/limit/from_id, user-scoped settings persistence/deletion and API
validation/authentication errors. Four pure safety/child-shutdown tests and JS/Ruby
syntax checks pass; the existing test:scripts command now also selects these
nested pure tests. These preparation checks preceded the real API runs recorded
below.

After committed quick checks and final independent review, resolve Node from the
WebUI's locked Nix shell and run in the API's existing `.#vpsadmin` shell. That
shell supplies pinned Ruby/Bundler/MariaDB without the deliberate Bundler overrides
of `.#api`. Stay outside bundle exec and do not inherit `BUNDLE*`, `DATABASE_URL`,
`VPSADMIN_TEST_DB*`, `MYSQL*`, `MARIADB*` or `RUBYOPT`. Do not clear unsafe caller
configuration to force acceptance; the driver discards only the shell's RUBYLIB
before its Ruby child. The driver refuses unsafe inherited configuration,
wrong/dirty API input, artifact/runtime mismatch and non-loopback endpoints.
With absolute checkout and receipt paths set in the three task variables:

```sh
migration_node=$(nix develop "$migration_webui_root" --command sh -c 'command -v node')
cd "$migration_api_root"
nix develop .#vpsadmin --command "$migration_node" \
  "$migration_webui_root/scripts/integration/vpsadmin-sdk-contract.mjs" \
  --api-root "$migration_api_root" --sdk-receipt "$migration_sdk_receipt"
```

A fresh verification utility owns the API run. Bootstrap/matrix deadlines are
10/5 minutes; the first mismatch stops the matrix and closes the fixture's stdin.
The fixture stops Puma before native TestDb cleanup. Success evidence appears
after child shutdown and contains provenance/call counts without credentials or
response values. Dependency/service failures stop for diagnosis without installs,
stubs or automatic retry. This proves only the stated isolated DB-backed contracts
between the generated client and API; deployed servers, OAuth/BFF, browser behavior and asynchronous VPS
worker completion remain outside its evidence.

<a id="temporary-sdk-package-verification"></a>

## Temporary generated client package verification

The approved input is the unchanged 337,414-byte
`vendor/vpsadmin-typescript-client-0.3.0-99ee06654ef9.tgz`; its archive size,
SHA-256/SHA-512 and source/generator/schema graph are recorded in
[the compact provenance](../../packages/vpsadmin-typescript-client-provenance.json).
The generated client's prior exact-archive checker evidence remains applicable. Pinned npm
generated the file dependency and lock from refreshed WebUI main
`63d484fc070dbee633d32624de545e834d483701`; all unrelated package records and
the BFF lock/hash are unchanged.

The existing frontend fetchNpmDeps hooks validate the source before projecting
only the generated client package entry out of the temporary remote-prefetch lock. The cache
receives the original lock bytes; the ordinary npm hook keeps its lock comparison
and offline installation. The existing source filter retains the archive and the
public install allowlist excludes it. Source-checker tests pass all 10 cases,
including missing/tampered archives, manifest/lock/revision mismatch and symlinks.

A fresh watcher ran clean npm ci (410 packages, 18.2 seconds), an installed ESM
export check (1.1 seconds) and four focused client/policy suites (38 tests, 10.2
seconds), all passing. The authorized dependency-cache hash probe used
`nix build --no-link --print-out-paths .#frontend.npmDeps` with lib.fakeHash and
reported the expected hash mismatch in about 10 seconds. Its actual output hash,
now recorded in frontend.nix, is
`sha256-utOpabPprstf97qzc/yre2O/EW36u6SsfS0o2Aas36k=`.
The real-hash cache build passed at
`/nix/store/6ri6jdfd2py0n3b2v0xwspxdsc1bwppl-vpsadmin-webui-frontend-1.0.0-npm-deps`;
its canonical package-lock.json compares byte-for-byte with the repository lock.
The refreshed quick gate passed every audit before stopping at six incomplete
receipt mocks in an upstream networking test. Its owner supplied the complete
receipts. The final typing tail then passed application/tooling checks, strict
E2E checking (100 checked, 182 deferred) and all six BFF cases in about 74 seconds.
Together with the retained install, FOD/cache-lock and audit results, this
completes the required quick gate for committed review.
These preparation results preceded committed independent review and the longer
checks recorded below.

## Final source review corrections

Independent review found no Blocking findings, two Important findings and two
Advisory findings; the temporary client packaging and history/migration boundary
were accepted. The bounded corrections retain structured partial CVE intentions
and the accepted parent identity for create/edit, prevent duplicate parent
creation after child failure, and let Review close the edit dialog and refresh
current detail without resetting stopped work. One generated-backed reference
validator now serves 11 operations domains. Sysctl history preserves unknown,
unavailable and explicitly unconfigured observations. Stopped bulk actions use
the approved review-required wording.

The exact lead-approved seven new keys and three replacements were inserted in
both catalogs after rereading locked terminology at
`a65a4dfeb92a59df4a80a737a20bcbf8558793ff`. The owner reports 55 focused cases
and a later overlapping 10-case path/copy batch passing, with rendered English/
Czech checks. These are synthetic tests, not browser or live API evidence.
Manual review updates the advisory detail hash at its existing 533-line allowance;
the historical baseline and all caps remain unchanged. The affected audit batch
passes: catalogs have 8,393 matching keys per language, structure agrees, inventory
lists 257 routes/73 API modules and 177 documents cover 76 requirements. Structural
audit retains 25 accepted exceptions with no unaccepted, invalid or aggregate
failures. The coordinated affected compiler and 26 Node validator cases then
passed before the corrections were committed. The lead accepted all four review
remedies.
The generated client archive, runtime, dependency graph and Nix cache inputs remain unchanged.

## Nix local-archive lock-fixer correction

The first full Nix graph on `1ab9853312a95b5448e99fd6f83f846453de17a5`
validated the canonical cache lock but failed in the pinned npm hook before npm
installation. Its upstream `--map-cache` inventories remote cache entries;
`--fixup-lockfile` then required an integrity map entry for the restored local generated client
and panicked with `dependency should have a hash`. Ordinary npm installation,
runtime tests and the Vite build remained passing evidence for their own scope;
they did not establish Nix package success.

The frontend now selects the existing npmConfigHook through npmHooks.override.
Its small prefetch adapter delegates all upstream calls and failures, extending
only a successful map-cache result through an explicit mode of the existing source
checker. The checker reuses actual archive/manifest/lock/provenance validation,
adds the original file resolved key with its recomputed SHA-512 integrity, and
preserves every remote entry. Matching entries are idempotent; conflicts or
invalid source bytes fail before writes. The upstream fixer, canonical lock,
archive, FOD hash, BFF hook and application inputs remain unchanged.

All 12 source-checker tests pass, including map preservation, idempotence and
failure cases with unchanged map/lock bytes. The actual pinned fixer passes on a
disposable canonical lock and explicit fixture map containing 478 remote entries
plus the verified generated client entry; the lock stays byte-identical (SHA-256
`585e8f48b194d8165731ca546fb709c94d531ee48224de9fff805416cb8b0f8e`).
This fixture map is not evidence of a remote cache build. The earlier realized
dependency-cache path was absent during the quick check; evaluation still selects
the same expected cache output/hash and the custom frontend hook, while BFF
selects its original hook. At this quick-check stage, full cache/hook/package
verification still awaited committed affected packaging review. No archive/lock
edits, dependency installs or application changes were used to repair the fixture
check.

## Verification campaign through 2026-11-02

The affected independent Nix adapter review completed all four lanes without
findings. The BFF tests, application tests and production build passed on
`1ab9853312a95b5448e99fd6f83f846453de17a5`: 58 BFF tests, 2,227 application
tests in 343 files, and the Vite production build (3,566 modules). Build metadata
identified that clean Git revision. The script batch retained 239 passing cases;
its one stale bucket expectation was corrected in the existing test, whose
focused rerun passed. Recursive exactly-once coverage still includes the nested
pure integration tests.

The real five-output Nix graph passed on immutable source
`7cad7ffb3a0a294c30349680e2eb4f80c63a3926`: frontend, BFF, provenance, source
contents and package contents. Both packages report schema 1, that exact commit,
`dirty: false` and provenance source `environment`. This exercised the actual
offline npm installation and lock fixer, and verified that the generated client archive stays
outside the public installed package. It supersedes the earlier package-build
failure for this source. It does not establish package provenance for a later
fixture or consolidated-history head; final-head Nix reconciliation remains
pending.

The third isolated API run passed all 23 calls with durable exit 0 in 62.664
seconds, using API `610a96f8ce523afbcd3e4374a70047dbe3264b0d`, generated client
`99ee06654ef956a09b52749f4cd02d1435362087` and HaveAPI 0.32.0. Its final
evidence records the generator/schema/tooling and six-plugin input graph after
native child shutdown. A separate exact-ownership check confirmed that its
Node/Ruby/DB processes, temporary database directory, sockets and listeners were
absent. The runner readiness correction registers the private channel early,
marks it close-on-exec before spawning TestDb, and consumes its newline-delimited
record without waiting for EOF. All seven pure tests passed; the affected
independent review completed all four lanes without findings before the third run.

The first two API attempts remain unsuccessful evidence. The first lost its
terminal observation; the second exited 1 after a readiness timeout. Normal
teardown was expected for the second attempt, but its cleanup remains externally
unconfirmed because no exact ownership tuple was retained. The third run's
cleanup proof applies only to that run. The passing matrix establishes the
bounded HTTP authentication/role, description, count/predicate and settings
contracts above. OAuth/BFF integration, browser behavior, deployed services and
asynchronous VPS worker completion remain outside that proof.

The final selected browser runs used clean WebUI
`1bfad6ce1846aef2d21bb6a58d4529a962e7aa97` with repository fixtures and the
pinned Nix Chromium environment. Core A passed all 124 cases across desktop
Chromium and mobile Chrome projects, with durable exit 0 after 451.347 seconds.
Separate bilingual B passed eight selected Czech/English template-editor and
request-review cases across those projects, with durable exit 0 after 43.806
seconds (Playwright's suite summary was 38.5 seconds). Each run retained its own
process identities; subsequent checks found all 22 recorded PIDs, their process
groups and the test-server listener absent. These are synthetic browser checks,
independent of the real API matrix.

The browser campaign corrected demonstrated stale fixtures without weakening
production guards: canonical resource namespaces and empty action framing,
nullable resource associations, numeric identities and advisory revisions.
The mobile profile case now asserts the visible responsive row. Changed deferred
specs were adopted as complete files into strict E2E coverage, reaching 104
checked and 178 deferred; original baseline hashes were preserved. Earlier
interrupted or failing browser attempts remain separate results. The abandoned
profile run proves only its two passing focus cases; its orphaned test server
was shut down and verified absent before the successful observed A run.

Six retained images from B were visually inspected: request details and risk
checks in Czech/English on desktop/mobile, plus the Czech desktop and English
mobile template editor. The English editor image is a sampled trace frame with
its label entered and content still empty; it is not an equivalent populated
capture of the Czech scene. The request images show full pages, so their stored
image dimensions must not be treated as CSS viewport sizes.

The existing [requirement evidence and visual references](../design/EVIDENCE_MATRIX.md)
remain the entry point for scene coverage. Passing the selected A/B cases does
not certify every changed control, unvisited scene, browser engine or physical
device. Bilingual HelpBox behavior and complete date/reset/filter coverage remain
unproven. Final history and final-head package reconciliation are pending. The
branch remains unmerged, the generated client remains unpublished, and this campaign introduces
no database migration or deployment.

## CI follow-up after branch publication

Core CI run [41366168908](https://github.com/vpsfreecz/vpsadmin-webui/actions/runs/41366168908)
passed all three jobs on published source
`14cfdcb6d2a3bc337fd445932fd38916b3dcd9ab`. The broader Playwright smoke run
[41366168907](https://github.com/vpsfreecz/vpsadmin-webui/actions/runs/41366168907)
on that same source ended cancelled. Each job's authoritative annotation reports
that it exceeded the existing 40-minute maximum. Its logs also contain real
assertion failures before cancellation: 32 Chromium, 35 mobile Chrome and 42
mobile WebKit case headings across 30 spec files. These headings are not terminal
suite totals. The jobs retained traces but no complete HTML report or final
passed/skipped/unrun counts, so complete execution coverage remains unknown.

Six ordinary repair commits after that published checkpoint end at
`4279c2384c2a9e74fd11f6b41e4a33686edeab23`. They correct the 30 observed leaf
specs and adopt the 14 edited deferred files into strict E2E coverage. Replies now
use their declared namespaces and field types; query assertions retain exact
pairs without imposing parameter order. The centered-dialog spec retains all 27
routes, covering the supported inline user-data filters and editor in place of
the removed Advanced control. Existing malformed-response, rejection, uncertain
outcome, permission and no-replay assertions remain. Production code, shared mock
behavior, dependencies and CI selection/time limits are unchanged. Published
history is retained.

The combined strict gate passed with 118 checked files, 164 deferred and zero
diagnostics. Original baseline hashes and sourceRevision are unchanged. Final
affected independent review of the committed repair boundary completed with
Blocking 0, Important 0 and Advisory 0, including the complete branch-history and
migration assessment. It found no database or persisted-format migration.

Local selection maps the original 109 project-specific failure headings to 100
cases: WebKit-origin cases run in mobile Chrome for fixture/touch acceptance,
with nine overlapping headings deduplicated. The user-data route maps to its new
supported-editor title. The initial news filter selected five cases: the two
mapped Czech/English positive cases plus three existing role-visibility negatives.
It passed with durable exit 0 after 44.44 seconds (native summary: five passed in
42.1 seconds). The remaining 98 mapped cases passed in a separate operation with
durable exit 0 after 457.546 seconds (native summary: 98 passed in 7.6 minutes).
Both operations tested clean source
`4279c2384c2a9e74fd11f6b41e4a33686edeab23` with retries disabled.

The five-plus-98 execution counts do not establish 103 distinct original CI
cases or actual WebKit-engine acceptance. The news run has bounded known-process,
root-group and listener absence evidence; no initial complete descendant tuple
was captured. The longer run retained 22 exact process identities, whose PIDs,
groups and test-server listener were subsequently absent. Both durable terminal
results passed. These later checks do not replace the earlier failed/incomplete
attempts or their recorded cleanup limits.

The existing [requirement evidence](../design/EVIDENCE_MATRIX.md) remains the
project entry point. The earlier A/B browser runs, API23 and immutable package
results retain their exact revisions and scope; the second API attempt's cleanup
remains externally unconfirmed. Final-head Nix/provenance verification and the
complete unchanged three-project CI browser matrix remain pending for the repair
candidate. Later unseen failures are not ruled out. The branch remains unmerged,
the generated client remains unpublished, and no deployment is claimed.

## Optional local client development and terminology

The maintainer requested an optional local generated client workflow while merged
code uses a released dependency. The [client guide](../design/HAVEAPI_CLIENT.md#optional-local-generated-client-development)
now documents an explicit build/pack snapshot, a no-save npm install with lock
writes and lifecycle scripts disabled, entrypoint/peer verification, focused
consumer checks and a forced Vite cache restart. It also documents `npm ci` and
another forced restart to restore the committed graph. The temporary install
ignores the lock for resolution, so other `node_modules` dependencies may change.
This procedure has not yet been exercised; its install/restore acceptance follows
committed affected review.

Building does not regenerate client source. Regeneration retains its exact
recorded HaveAPI HEAD guard. The existing 99ee archive remains the earlier tested
input, including its original README; later source-documentation corrections do
not change or relabel its bytes. No archive, generated source, runtime, manifest,
lock, provenance or Nix hash changes in this package.

A compatible published client must be selected before merging this migration.
No release version or publication approval is inferred. Until that separate
dependency transition, the committed relative archive and its Nix adapter remain
necessary. The optional npm procedure will remain usable after the registry
transition; Nix and the isolated API runner continue to verify committed inputs.

Introduced human prose, diagnostics and test descriptions now say "generated
client" or "generated TypeScript client for the vpsAdmin API". Internal filenames,
imports, flags and identifiers are unchanged. Original artifact names, exact
receipts, review reports and tested revision claims remain historical evidence.
Commit-message wording was reconciled separately with original trees and dates
preserved; this source/documentation follow-up adds no API or persisted-state
behavior and grants no merge, publication or deployment.
