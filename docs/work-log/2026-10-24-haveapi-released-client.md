# Released HaveAPI async client adoption

## Request and implementation

This entry records the original 0.30.1 adoption and R2 correction. The
[0.30.2 refresh](2026-10-26-haveapi-0302.md) records the current dependency and
its separate verification.

Adopt the published `haveapi-client@0.30.1` npm release for ordinary WebUI
requests. The final production adapter and controlled-XHR fixture work is
carried from Jakub Skokan's `8772bab21cd8739bf4672cdf4976aea2a6e59de3`,
reconciled with current main `5a2d2bdc3ad7a827038f877d75959916528db844`.
The obsolete pilot and local archive dependency are superseded. Original source
history and earlier checks remain historical evidence; they are not new release
verification. Current main's node overview tests, member administration contracts
and expanded typed browser scope are preserved.

The installed `AsyncClient` owns transport, serialization and wire validation.
WebUI keeps live per-request credentials, language, public/authenticated isolation,
BFF renewal, bounded read retry and mutation non-replay. `HaveApiError` retains
API/protocol `AsyncError` causes and their validated receipts for diagnosis.
Abort, timeout and transport failures retain their distinct classes and uncertain
mutation behavior. Domain results, pagination and action-state requirements stay
unchanged. No BFF implementation or UI wording changes are included.

Requirements: REQ-007, REQ-011, REQ-012, REQ-046 and REQ-059. See
[API contracts](../design/API_CONTRACTS.md#production-haveapi-client),
[dependency provenance](../design/HAVEAPI_CLIENT.md) and
[packaging](../design/PACKAGING.md). The lock adds only HaveAPI and its exact
XMLHttpRequest transport; registry integrity and the release's SLSA subject/source
mapping are recorded. Nix keeps its normal registry dependency cache.

## Verification and limits

The locked Node 24.21.0/npm 11.19.0 environment installed the real package and
its bundled declarations. Installed-package typecheck and the initial domain
adapter suite passed (45 files, 324 cases); the final cause/timeout follow-up passed 62 focused cases (overlapping that
initial suite). Six package-source tests passed, including rejected
artifact substitutions and missing transport integrity. Design inventory/audit,
structural audit, E2E core types and scoped lint/format passed after formatting
the expanded E2E config. The full `ci:quick` gate passed, production dependency
audit found zero vulnerabilities, and npm verified 409 registry signatures and
101 attestations. Root dependency prefetch completed with six existing bundled
optional-package URL warnings; the frontend hash was updated. The coverage union includes main's previously adopted
specs plus public overview; no deferred exception or structural allowance was
added.

These are source, declaration and controlled-XHR fixtures, not live API/OAuth,
backend authorization, task-completion or deployment proof. Full unit tests,
production build, Nix package checks and desktop/mobile application workflows
follow independent review of the committed deliverable. Earlier pilot results
remain scoped to their original source/artifact identities.

## Status and recovery

Prepared for independent review; not merged or deployed. There is no schema or
persisted-format migration, coordinated node update or API deployment order.
Restore the matching prior frontend/BFF release for application rollback and
retain the BFF session store and credentials. Existing PR74 is the related review
thread; publishing this new branch does not authorize rewriting its old head.

## Review correction: contradictory rejection receipts

Final review identified that a non-2xx HTTP status combined with a validated
`status: true` envelope was rejected by the adapter but treated as definitive
rejection by shared mutation guards. The classifier now preserves that
contradiction as an uncertain outcome, retaining the actual HTTP status,
envelope and library cause/receipt. It cannot renew or replay the request.
Actual-package 401/403/422 regressions check the diagnostics and no-renewal/
no-replay behavior; shared-guard regressions check duplicate submission remains
blocked while genuine `status: false` rejections release protection. This
correction changes no wire decoder, dependency pin or persisted format.
