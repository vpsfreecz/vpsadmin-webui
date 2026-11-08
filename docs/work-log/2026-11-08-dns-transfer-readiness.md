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
0.4.0 lacks these additions. The feature artifact is committed SDK `a888031e19dea5354aac320f2d291902e45f3bad`,
generated from API `2656c876aab1966ae2498447d2ac0e23283b3af7` with raw schema
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


## Final-source provenance refresh

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
