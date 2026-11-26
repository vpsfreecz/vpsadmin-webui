# Accepted TODO integration on the published SDK — 2026-11-26

Requirements: REQ-046, REQ-060–064, REQ-068; individual behavior requirements
and accepted review results remain linked from the preserved work-log entries.

## Source and release scope

The maintainer requested preparing the accepted work for release while preserving
Aither's current changes. This candidate starts at main
`e311b1c0af0f50fa4c6f6ce83c514c1a866eb042`, including Aither's
`b09d8dfd2605cb0733bc62ee9225bc295a9acf24` and the accepted dashboard fix.
It merges the already qualified accepted-TODO integration
`dea60d69a038da2a5a101cdbb419f03c8fcb797a`, whose tree was published in
[PR334](https://github.com/vpsfreecz/vpsadmin-webui/pull/334).
The earlier 93-original-PR merge receipt remains historical evidence.
Ordinary merge ancestry retains the original focused heads and authors.

This is preparation, not a merge to main or production activation. The five
held PRs258/306/316/323/324 and the separately unmapped PRs are not implicitly
approved by the accepted batch. Existing cumulative previews include additional
review work; their full source is not a production release manifest. Preserving
those already deployed preview changes requires a separately described cumulative
preview revision, without silently adding them to this candidate or rolling them
back on the preview hosts. The final handoff must distinguish both revisions.

## Integration decisions

Current generated SDK bindings, validated output shapes, action receipts, capability
checks and fail-closed ownership/lifecycle handling take precedence over older
transport assumptions. The existing administrator incident Overview, History,
policy filters and notice summaries remain available alongside the accepted
readability controls. Mail recipient presentation keeps an unknown destination
unknown; extraction into a shared presenter does not invent primary/role delivery.
Export read failures retain read-retry feedback, while a successfully read foreign
dataset retains the distinct owner mismatch. Main's scoped host-address assignment
contract and current VPS resource/status model remain in place.

Accepted component extraction, reference/quota semantics, accessible controls,
contextual operation navigation and pending-filter fixes remain represented.
Recent OOM history is retained together with readable diagnostic links. Existing
transaction payload assertions use the current structured input/output contract.
Both browser project selections and the independent Access recovery/visual cases
are retained; no gate or test selection is dropped to resolve a conflict.

Strict E2E coverage is the union of adopted sources. Changed deferred sources are
promoted instead of updating protected hashes. Five inherited structural exceptions
meet their existing removal conditions and are removed. Five small reviewed
source changes retain their existing allowances, tightening one to its actual
count. No new exception, increased budget or `as any` allowance is introduced.
The DNS model change additionally accepts the canonical wildcard record name `*`;
its existing validation checks remain required.

Localization uses the locked vpsAdmin terminology guide
`a65a4dfeb92a59df4a80a737a20bcbf8558793ff`. Both complete guide files were read.
Catalog merging preserves current incident keys and distinct accepted additions.
The approved Show operations wording and combined CPU/RAM guidance remain in
both locales. Duplicate catalog keys are not resolved by silently dropping a
whole current-main catalog.

## Published dependency and evidence boundaries

The manifest and lock retain registry `vpsadmin-typescript-client@0.6.0`,
resolved from the published npm tarball, with HaveAPI0.32.0 and integrity
`sha512-bokNqgJIg7+tFkMBafXyWly9I4MtMK3o3HY9RWVbXMMvttuUUoL35U0Me2xdFAp5R9Mnmy9YZz/b80g+zvFwjw==`.
There is no local/Git dependency override or restored generic legacy API caller.
Backend compatibility/capability checks remain separate from published type support.

Initial main Nightly failures and their repair are recorded in the focused
[full browser repair](2026-11-26-nightly-browser-contracts.md) when integrated.
The first combined-source diagnostics exposed eight TypeScript errors and stale
structural source hashes; their original logs were retained before correction.
Corrected product TypeScript diagnostics are clear. Full E2E type coverage,
complete qualification, source-bound browser evidence and hosted CI remain
required gates before release.

Builds and evidence stay under local `/data`, with remote builders and hooks
disabled. The agent must not access build.vpsfree.cz through any path. Preview
permission covers dev.crucio.cz and clankerdev.vpsfree.cz only; Clanker uses the
production API, so its acceptance stays anonymous read-only or intercepted fixtures.
Production/configuration activation and builder-dependent commands remain operator
actions. No API activation or TODO approval-field write is part of this integration.
