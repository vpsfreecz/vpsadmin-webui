# Generated TypeScript client migration

Requirements: REQ-005, REQ-007, REQ-011, REQ-012, REQ-054, REQ-056, REQ-060,
REQ-061, REQ-068.

The maintainer requested full generated SDK use for vpsAdmin operations and removal
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

Source development began against SDK `383e8556208f330472961077cce4dcb546231c8a`
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
internal output descriptors. The verified successor SDK
`b650f21fa83c314b3c21aaf62f0d9dda2b08befd`, generator
`172c752ef65792de177279956917259d2c3f9b37`, replaces the installed source candidate.
Its archive SHA-256 is
`8907e6bcfb013df86b9d1600db42ba724b2300a1cb866ebf05e2019aa24c537c`
and integrity is
`sha512-3GUpjTRa6hYPiIBRzumFM/MQ/tOu49yVvAW7o2CECSrZ/Ic5vObtwF0EqVT7wNDXPOVMfph+54eEZAM59Utngg==`.
Every installed archive file matches; public declarations are unchanged. The old
archive and its receipt are retained as source-development evidence. The final
provenance refresh uses SDK `99ee06654ef956a09b52749f4cd02d1435362087`
and generator `eea3ae5e82c3db23d5f5bc9f1a5e7784117c4e1b`. Its archive SHA-256 is
`f3bb42d0392fb738f5c70fe1415cc8742ab943a31c2ed2a85af5ccbd385d831f`, with integrity
`sha512-6Q74ddIgGzeav9mvPubc33g5Sd+Ni7ZOLtKnNVzP/sW1Cxmw59nLiib50H27HBYc0UgoVfjlxuqH0WmX7hR3jw==`.
All 1,360 installed archive entries match. Relative to the accepted b650 artifact,
only generator commit provenance changes; generated sources, all 1,352 built
modules and dependency inputs are unchanged. The maintainer directed that the SDK
remain unpublished. The final distributable WebUI dependency/lock/hash is
unresolved; source verification with this archive does not establish a package
delivery mechanism. The existing SDK package has no supported unpublished-source
installation path: built distribution files are not tracked and there is no
prepare hook. No new delivery mechanism is introduced. This source may receive
scoped committed review against the verified candidate; it is not a clean-checkout,
CI/Nix-package or ready-for-use claim. No registry publication, release tag or
default-branch integration is authorized by this migration.

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

## Verification and status

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
The final manifest/lock pin, dependency hash, final committed review and subsequent
whole-branch checks remain outstanding. No live API operation was used by W. The config.ts documentation correction required
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
- Public correction tokens and all three correction dropdowns use anonymous SDK
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
The combined application compiler and required quick audits pass. The adopted
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
They use the actual HaveAPI 0.32 runtime and installed verified SDK. The 23-call
public/member/admin matrix covers descriptions, identity, template eligibility,
count/limit/from_id, user-scoped settings persistence/deletion and API
validation/authentication errors. Four pure safety/child-shutdown tests and JS/Ruby
syntax checks pass; the existing test:scripts command now also selects these
nested pure tests. No database/server/matrix run has occurred.

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

A fresh verification utility owns this later run. Bootstrap/matrix deadlines are
10/5 minutes; the first mismatch stops the matrix and closes the fixture's stdin.
The fixture stops Puma before native TestDb cleanup. Success evidence appears
after child shutdown and contains provenance/call counts without credentials or
response values. Dependency/service failures stop for diagnosis without installs,
stubs or automatic retry. This proves only the stated isolated DB-backed SDK/API
contracts; deployed servers, OAuth/BFF, browser behavior and asynchronous VPS
worker completion remain outside its evidence.
