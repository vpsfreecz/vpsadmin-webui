# Generic incident policies in a VPS tab

The maintainer requested incident details in their own VPS tab, a concise overview
warning only when relevant, and usable current limits. This REQ-051 revision
replaces the unreleased selected-policy card and callback-unknown presentation.
The backend declares limits and records policy memberships only at source creation;
React discovers policies and never runs or reconstructs matching logic.

The Incidents tab preserves the normal app/admin and originating-owner context.
Each compact policy section uses API metadata and has two rows showing counts,
periods and limits, with history and timestamps collapsed. Per-policy nullable
limit overrides and the one shared shutdown permission have separate forms. The
secondary inheritance control changes only its local draft. Both forms retain
confirmation, preflight, durable protection against uncertain writes and exact
readback. Overview and list warnings link to the tab when a threshold is reached;
other resource and action errors remain visible. Ordinary incident detail shows
the scoped historical collection without presenting saved limits as current ones.

The owning [API contract](../design/API_CONTRACTS.md#generic-incident-policies)
describes capability, membership, configuration-error and history boundaries.
Policy keys and labels come from metadata; history retains saved labels for retired policies.
No memory-specific UI branch, rule editor, BFF route or frontend enforcement is
introduced. This is a pre-release schema/interface replacement, not an old-feature
migration or production rolling-upgrade claim. There is no React migration.

The completed typed wiring uses the verified G3 development archive from SDK
artifact commit `3cb7cf838a607bbafab207307e11626e57cdec8c`, packed source
`d9d6d53dd0a2fb3b736b912123731bc78d69289e`, API
`5aa1df7b51fc22c9d35a2d7f6aec889afa54b303` and schema SHA-256
`997045d31c26e2dde0a9ddcadd842ce15e767b52b006bdb02731e5eb08de4f00`.
The archive is 345015 bytes, SHA-256
`b00e1e457dec33419505a286cf3dd5c937aa982ab4b3e7e6fca1b0fdf47dee20`.
The application uses its generated resource methods and serialization without a
copied model or transport shim. Manifest, npm-generated lock, provenance and
prefetched frontend dependency hash agree. The BFF graph is unchanged.

Pinned-Nix verification passed full application typing; 12 focused files with
98 tests; E2E core typing; lint, format, locale parity/structure, design docs,
structural and component-contract audits, UI strings and mutation audits; application build;
and dependency prefetch. The successful `nix develop --command npm run
audit:design-docs` checked 287 documents, 76 requirements, 268 routes and 75 API
modules. Initial type-guard, disposable E2E-config location, stale documentation
link and router line-budget failures are retained with their corrections in the
session evidence. The final router whitespace-only correction has identical
emitted JavaScript; this is an equivalence check, not an extra type proof.

Two implemented synthetic browser flows passed (2 passed, 0 failed, 0 skipped),
with one worker, no retries and a stop on the first failure: desktop English/admin
and mobile Czech/owner. [Four PNGs](screenshots/2026-11-17-generic-incidents/README.md)
show the generic tab and saved evaluation detail.
The admin flow also verifies nullable inheritance and the separate permission
write through actual generated SDK calls to intercepted responses. The current
source was an explicitly dirty draft atop `8ce6baac`; exact source/config/fixture
hashes are retained, so its displayed revision is not a clean-release claim.
The owned registered preview was stopped and port closure verified. The lead
reviewed all four images and accepted their synthetic layout and copy, then
completed the final documentation wording pass. This acceptance does not replace
independent review or verification against a real API.

A published registry SDK is still required before default-branch integration.
Final committed source review, Nix package verification and longer integration
remain separate gates. No merge, deployment or reset is claimed by this record.
Previous source/captures and failures remain historical evidence for their
original inputs, not current generic-view proof.

The terminology input is vpsAdmin
`a65a4dfeb92a59df4a80a737a20bcbf8558793ff`. The lead completed the final Czech and
English copy pass and checked the implemented desktop and mobile views. The external
KB owner receives the tab, overview, list and navigation impact; local UI fixtures do
not certify legacy KB captures, real backend enforcement or mail delivery.

## CI support read-only observer

At `d26cfea0`, PR smoke run `44223107994`, attempt 1, reported 965 passed
and one failed Chromium test out of 966. The support-account test reached its
final empty-write assertion, where its observer incorrectly counted nine successful
HaveAPI `OPTIONS` capability reads as mutations. All three retained attempts
contained only API GETs and those nine OPTIONS reads. The observer now follows
the existing GET/HEAD/OPTIONS read classification; every role/control assertion,
the empty-write assertion and the specific UI-settings PUT exception are intact.

The single affected Chromium case passed without retries after that one-line
correction. E2E core typing, the disposable config under the repository tooling
policy, changed-statement formatting and the documentation audit passed. Runtime
source, catalogs, SDK inputs and the accepted images are unchanged. The previous
package and media receipts retain their original source identity; a successor
cleaned-source/package identity needs its own allocated verification before
publication. No full-suite rerun, workflow dispatch, merge or deployment is
claimed by this follow-up.
