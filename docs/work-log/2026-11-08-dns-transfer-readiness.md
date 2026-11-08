# Secondary DNS readiness and retained IP diagnostics

## Scope and behavior

REQ-049/050: expose the source-bound DNS readiness API while preserving the
ordinary controls, cursor pagination, TSIG secret scrubbing and mutation receipts.
BIND serving remains a separate observation. Aggregate direct checks and path
details show pending evidence when `evidence_current` is absent or false; peer
success never substitutes for user-primary readiness. Diagnostic kinds distinguish
transfers, probes and legacy historical attempts.

Missing-primary detection uses an independent filtered existence query without
the displayed page's cursor. An explicit parent allocation owner and null
interface enable the owned-detached warning; unavailable expansion is unknown.
An older backend retains historical diagnostics and ordinary DNS controls, with
new readiness unavailable. The [API contract](../design/API_CONTRACTS.md#secondary-dns-transfer-evidence)
describes the lasting data and capability rules.

The current main baseline is `47b6992e28c16585aa6247bd75413637a7ca6388`.
Open PR116/117 contain separate DNS-kind/DNSSEC and preview IP work; this
candidate does not import those branches. Their DNS catalogs and shared docs
need ordinary conflict reconciliation if integrated later. The selected locked
terminology source is vpsAdmin `a65a4dfeb92a59df4a80a737a20bcbf8558793ff`.
The main lead reviewed the English/Czech wording under the workspace writing
procedure before commit.

## SDK dependency and compatibility

The candidate needs generated primary-path operations, transfer aggregates,
`zone_status`, `evidence_current` and diagnostic `legacy` kind. Registry SDK
0.4.0 lacks these additions. The feature artifact is committed SDK `440f0170f211ea2a2fd0acce0def6bc88f541b57`,
generated from API `68a36237b0bad9625fb25965bd415e801ddccf4c` with raw schema
SHA-256 `46317b52cbb73ddb54973e5227a9a274bc74f76834eb8e4ead3f2266cf46a972`.
The declared file dependency and integrity are reproducible after the
[exact sibling preparation](../design/HAVEAPI_CLIENT.md#dns-readiness-development-candidate);
[the development receipt](../../packages/dns-readiness-sdk-candidate.json) binds
the archive/source inputs. No handwritten SDK or
untyped transport replacement is used. Merge requires a separately authorized
published SDK and matching final manifest, lock, provenance and packaging hash.
Publication alone does not establish backend capabilities.

There is no frontend persisted-format/database migration. Rolling back the UI
restores its previous matching frontend/BFF artifacts. Backend producer/consumer
cutover and audit-preserving schema migration belong to the API's runbook.

## Verification and remaining evidence

Clean `npm ci` with the declared development input passed. Whole-app typecheck,
all `ci:quick` checks, `ci:tests` and the required BFF-mode build passed. The unit
suite passed 350 files / 2290 tests; the focused actual-generated-SDK/wire/model
selection passed 51 tests. The Vite build completed with its existing large-chunk
warning. These are npm development-candidate checks; isolated Nix packaging is
blocked by the sibling SDK input until a published release is selected.

Preliminary rendered member fixtures passed in English/Czech on desktop Chromium
and Pixel 5 mobile Chromium. The four implemented
[captures](images/2026-11-08-dns-transfer-readiness/) use synthetic data, dirty UI
source at baseline `47b6992e28c16585aa6247bd75413637a7ca6388` plus this change,
the original declared SDK archive from clean `13985ec7` and a registered local
Vite preview. The final-source refresh below proves its runtime equivalent. They show
serving with failed direct checks and a successful peer event, stale prior
success, retained detached allocation and legacy history. The same fixture also
checks recovery at the unchanged serial, missing primary and re-add pending.
No production credentials or live tenant data are used.

The downloaded generic Chromium initially failed to launch on NixOS before any
page rendered (`stub-ld`, exit 127). Native Chromium 154.0.8037.57 from locked
nixpkgs `5e2305d577ca00acbba631b05cb1094d172b29f3` resolves that setup failure.
The preliminary capture fixture's missing DNS-record-log response was filled in
before the retained final captures, avoiding an unrelated recent-transactions
fixture error. The final history description explicitly includes BIND events,
readiness checks and historical attempts; this lead-reviewed copy-only correction
was checked with catalog audits and refreshed captures. Broader member/admin browser tests and isolated real-API/DNS
compatibility remain after final committed-deliverable review.

This is a prepared implementation candidate, not merged or deployed. The
published SDK dependency gate remains unresolved; the temporary file dependency
must be replaced before default-branch merge. No SDK publication, deployment,
production KB write or backend migration execution is reported. KB technical
impact is coordinated with the separate legacy/KB package.


## Earlier provenance refresh

The final reviewed API `2656c876aab1966ae2498447d2ac0e23283b3af7` exports the
same schema and tooling-lock bytes. Export provenance changes only the API
source revision. Regeneration compares the complete 680-file owned set unchanged.
The refreshed clean SDK archive changes only `schema/provenance.json` and
`tools/generator.json`; all 1360 compiled JavaScript/declaration files are
byte-identical to the captured candidate. The archive runtime-set SHA-256 is
`17d56f47ca9b66892031df4df6edc9d29df22708b888ddfcd03231820a0ac70f`
(sorted archive path, NUL, bytes, NUL). Source UI, approved copy and fixtures are
unchanged; the existing full test/build/capture evidence is retained for that
unchanged runtime boundary. New-archive package/strict-consumer and actual
installed-entrypoint checks verify the refreshed input. No new release is implied.


## Guarded real-API acceptance preparation

The existing ten-case readiness browser fixture passed at UI `c6e8d6eb` with the
refreshed SDK on native Chromium and mobile Chromium. This covers member/admin,
English/Czech and old-capability behavior with synthetic responses. No new
screenshots are needed for unchanged visible output. The first attempt stopped
before rendering because the previously substituted browser path had disappeared;
the successful run keeps native Chromium available through the locked Nix shell.

The existing `scripts/integration/vpsadmin-sdk-contract.{mjs,rb}` harness is
updated from historical API610a96f8/HaveAPI0.32.0 to the exact final API2656 and
HaveAPI0.32.2 exporter tooling. It retains the original generic contract checks,
unsafe-environment and source guards, receipt/archive/runtime identity checks,
private credential descriptor, mounted loopback API and native TestDb recovery.
A bounded additional DNS matrix covers path Index/filter/currentness, the declared
absence of path Show, history Index/Show owner/legacy visibility, readiness counts,
serving, nested owned-detached allocation and the no-primary existence query.
It seeds only synthetic records in the harness-owned temporary database and
starts no real DNS worker. Successful HTTP decoding does not prove BIND behavior.

Run the bounded driver only after its committed changes pass affected review,
inside a newly registered `dev-session service run` operation. The existing
registered preview is never started, rebound or stopped by this driver. Optional
`--ui-base-url http://127.0.0.1:4198` adds one unmocked member browser visit using
only the synthetic fixture's Basic identity; it starts no UI service, uses no
route interceptors and records browser evidence separately from SDK HTTP calls.
The ordinary internal stdin completion joins the Ruby/Puma fixture and its native
TestDb recovery before success is reported; it does not run session lifecycle
commands or schedule background cleanup. Production URLs and inherited database,
Bundler or credential overrides remain refused.

Preparation checks and execution outcomes are recorded separately. No real-API
execution result is claimed by this preparation change; live service compatibility,
OAuth/BFF and real node publication remain distinct proof boundaries.


Independent harness review found one verification gap (H1): a zone-filtered member
history query could not establish Index tenant isolation, and hidden history had
no positive fixture. The narrow correction adds a hidden-server legacy row,
asserts the exact permitted IDs in unfiltered member history, and includes admin
positive Index/Show controls plus member hidden Show denial. Existing foreign
and unbound cases remain. The lead accepted this narrow remediation; guard tests
and syntax checks pass. Real execution remains a separate evidence checkpoint.

The first isolated run completed all 44 SDK assertions (23 generic and 21 DNS),
then the optional browser view timed out. Native fixture completion removed its
processes and temporary database. Source inspection found that Basic authentication
does not register `Authorization` in HaveAPI's CORS allowlist. The synthetic fixture
now registers that exact header for its existing loopback preview request; product
API and browser policy are unchanged. Static wait identifiers and bounded HTTP
status-class/path-kind counters preserve diagnostic boundaries without logging
URLs, request values or errors containing credentials. The initial timeout alone
does not establish its precise cause or a browser pass.

After independent review and the accepted narrow fixture correction, the bounded
retry passed at `a1c552e7`: all 44 SDK HTTP assertions, including 21 DNS assertions,
and one unmocked English member DNS view against isolated API `2656c876` with SDK
`a888031e` and archive SHA-256 `d1c33755…`. The browser observed 16 API requests
and responses, including seven DNS requests, all successful with none failed;
automatic CORS preflight traffic is not separately counted. The original path,
detached-allocation, history and serving assertions remained intact. Ordinary
stdin completion joined the fixture and removed its temporary database; native
process and cgroup observations confirmed quiescence. The existing registered
preview remains running. This proves the bounded synthetic API/browser contract,
not real BIND operation, OAuth/BFF, production compatibility or merge readiness.


## Final source and development archive

The final API source is `68a36237b0bad9625fb25965bd415e801ddccf4c` and the development SDK source is
`440f0170f211ea2a2fd0acce0def6bc88f541b57`. The final raw schema and exporter lock match the tested packet;
provenance changes only `source.revision`. Actual pinned regeneration/checking
preserved all 680 owned source files, and the clean-source archive preserves all
1360 JavaScript/declaration files. Only its two provenance records differ.

Fresh installation of the declared final archive passed its entrypoint, schema,
runtime and actual generated DNS-call checks, a strict installed-type consumer,
application typecheck, nine harness guard tests and 39 selected SDK/wire/model
tests. Documentation and whitespace checks passed. The earlier broader test,
build and browser evidence is reused only for the verified unchanged inputs.

The harness updates only its explicit API/SDK revision pins and matching positive
receipt fixture. All H1/CORS/authentication, waits, assertions and diagnostics are
unchanged. The successful 44-call HTTP matrix and 16-request browser view literally
ran API `2656c876`, SDK `a888031e` and UI `a1c552e7`, as recorded above. The final
API differs only by smoke-test source/registration, with all seven recorded API
runtime/bootstrap/fixture input hashes unchanged. Final source equivalence does
not mean the prepared final harness was executed against `68a36237`.

This mechanical refresh retains the reviewed WebUI base `47b6992e`. Observed
upstream main `64c0adfe` contains unrelated application, wording and tooling
changes. Rebasing, resolving those changes and performing affected verification
and review remain separate prerequisites before integration. The declared local
SDK still requires sibling preparation; registry SDK, hosted CI and Nix packaging
gates remain open. No new browser run, release, merge or deployment is claimed.
