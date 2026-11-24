# Accepted TODO PR integration — 2026-11-24

The maintainer explicitly requested merging the PRs whose current TODO outcomes
were accepted, and confirmed Merge rather than closing without their changes.
Human revision544 selected93 existing PRs:92 target `kerrycek-021126`, while
[PR227](https://github.com/vpsfreecz/vpsadmin-webui/pull/227) targets `main` and is
qualified separately against Aither's current main and published SDK0.6.0.
This integration preserves the92 experimental PR heads and their authors through
ordinary merge commits. It does not change their target to main or constitute a
production release. PR222 is already merged into the experimental target; that
actual target merge was incorporated without changing the composed tree.

PRs258,306,316,323 and324 have mixed, requested-change or newly unreviewed outcomes
and remain excluded. The17 other unmapped open PRs are also excluded. No held PR
head is an ancestor of this integration. A prerequisite OOM-filter commit shared
with held258 is already explicitly included by accepted257/296; no258-specific
feature is added. The exact selected heads, current acceptance bindings and Git
ancestry evidence are recorded in the private operational merge receipt.

## Reconciliation

Preserve both sets of acceptance criteria, work-log sections, strict browser type
adoptions and browser selections. Do not refresh deferred hashes, increase debt
allowances, weaken assertions, add retries or remove tests to make integration
pass. Preserve reviewed structural allowances when composing independently
accepted presentation changes; record exact composed source hashes separately.

Meaningful overlapping source resolutions retain:

- ErrorState action priority from222 and control size from273.
- Account lifecycle timestamp validation from280 and reminder layout from284.
- Namespace form alignment from241 and readable row errors from242.
- Selected NAS parent validation from260, shared advanced fields from269 and
  configured-quota semantics from270.
- Both complete networking identity/host-filter browser suites and both complete
  account timestamp/reminder-layout suites.
- Pending filter navigation and departed-route ownership checks together in
  keyset pagination; backup return context and scoped download detail links.
- The extracted TasksFilter and DatasetHeader while retaining existing search,
  selection, context, locking, action and help behavior. The obsolete BackupCenter
  StatCard import is removed after the approved extraction; held306 is excluded.
- Export ownership/snapshot guards and wrapped Cancel/Create actions, with314's
  typed duplicate-export feedback above those actions.
- DNSSEC unknown/read-error states from325, authoritative source explanations
  from326, inherited TTL and wrapping from earlier accepted work, and optional
  internal record IDs from327.
- Readable lifecycle action text with299's reveal/focus behavior.

This is reconciliation of accepted behavior, not a new product decision. Relevant
requirements and original focused verification remain in the merged design and
work-log entries. The task receipt lists every manual conflict resolution.

## Localization

Both repository localization instructions and the locked vpsAdmin terminology
guide were read before composing locale changes. Guide revision:
`a65a4dfeb92a59df4a80a737a20bcbf8558793ff`.

Existing accepted Czech/English keys are preserved; independent key additions are
combined. Two identical dataset identity key/value definitions from independent
accepted changes are deduplicated without changing either translation. No API compatibility or SDK prerequisite is inferred from UI fixtures.

## Verification and delivery boundary

Prepared locally. Exact integrated quick checks, script/BFF/unit suites, native
production build and affected isolated browser regressions are required before
publishing. GitHub checks on the final integration head must complete successfully
before merging. Actual check outcomes and original-PR merge readbacks belong in
the PR and operational receipt; preparation is not a passing check or merge.

No TODO approval/comment fields, API, preview services, configuration pins or
production deployments are changed by this merge task. The active previews keep
their separately verified73a4bd03 release. No access to the prohibited builder,
including indirect Nix builders, is used. This experimental branch must not be
deployed over the newer preview's API/transport basis.
