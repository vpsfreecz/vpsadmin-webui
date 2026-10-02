# vpsAdmin WebUI repository instructions

This repository is the canonical source for the new React WebUI and its OAuth
BFF. Its history comes from `Kerrycek/clankerdev`; keep that history and its
authors intact. The separate `vpsfreecz/vpsadmin` repository owns the API and
the legacy PHP interface. A WebUI task does not authorize backend changes.

## Required procedures

Before changing English or Czech UI text, catalogs, BFF error pages, or other
localization behavior, read [Localization](docs/agent-instructions/localization.md)
in full. It resolves the vpsAdmin terminology guide from this repository's
locked flake input and requires recording the revision used. For other product
behavior, read [the design handbook](docs/design/README.md), relevant rows in
[the requirements register](docs/design/REQUIREMENTS.md), and [the work log](WORK_LOG.md).

## Development and checks

### Shared development and continuous documentation

- Name new task branches `dev/<short-descriptive-name>` (for example,
  `dev/console-layout` or `dev/ip-search`), as requested by the maintainer.
  Do not rename colleagues' branches or rewrite existing published history to
  impose this naming convention.
- This is a shared repository, not a single-developer workspace. Before starting
  a change, inspect the checkout, worktrees and relevant open PRs, and fetch the
  current upstream state. Build on the current main unless the task explicitly
  depends on another branch. Avoid duplicating a colleague's work.
- Keep independent tasks isolated. Preserve colleagues' uncommitted changes,
  commits, authorship and active processes. Do not reset their checkout,
  force-push their branches, or include their unrelated changes in your PR.
  Resolve integration conflicts by understanding both changes; if their intended
  behavior conflicts, obtain a decision rather than silently discarding either.
- Recheck the PR head, current main and CI before a requested merge. For a
  deployment, recheck the running revision and any active deployment as well;
  another contributor may have changed them since the last check. Never replace
  a newer or unrelated release using stale local deployment assumptions.
- Maintain English documentation throughout the task, in the same PR as the
  change. Update affected requirements, design rationale, API/workflow contracts
  and operations guidance as applicable. Record what changed, why, relevant
  decisions, verification and limitations in a dated `docs/work-log/` entry,
  with PR/commit references when available. Keep prepared, merged and deployed states distinct;
  append actual review/deployment outcomes instead of anticipating success.
  Preserve other contributors' log entries when resolving documentation conflicts.
- For visual changes, show screenshots during the work as well as in the final
  review handoff. Include desktop and mobile views where relevant and say
  whether they use synthetic fixtures or a deployed environment. Capture the
  implemented UI; do not present a mockup as implementation evidence. Avoid
  personal data, credentials and authenticated production details in captures.
- Read the current repository's instructions at the start of each task. Old
  Clankerdev handoffs are historical context, not authority to replace current
  documentation or undo a colleague's changes.

### Toolchain and verification

- Enter `nix develop` for the pinned Node 24 development toolchain. Use `npm ci`
  for the root project and, when changing the BFF, in `bff/`. Do not install
  dependencies on a deployed host.
- Use `npm run typecheck`, `npm test`, `npm run build`, and the relevant audit and
  script/BFF commands for the change. Browser fixtures do not certify a real API.
- Regenerate `npm run docs:inventory` when routes or API adapters change. Run
  `npm run audit:design-docs` for design-documentation edits and review the prose
  for accuracy; the audit checks links and inventory, not meaning.
- Do not commit `dist/`, `assets/`, `.vite/`, `node_modules/`, credentials,
  generated auth files, or private server backups. Keep changes scoped and
  record meaningful work, decisions, checks and limits in `WORK_LOG.md`.
- Before committing, check for a declared hook framework and run its hooks. Do
  not bypass a declared hook. Keep commits focused and document verification in
  the work log or review notes.

## Deployment and review boundaries

### Maintainer workflow (agreed 2026-09-30)

1. Implement assigned tasks as focused commits and separate reviewable PRs per
   logical change in `vpsfreecz/vpsadmin-webui`. Include relevant test evidence
   and screenshots for visual changes. Update an existing relevant PR rather
   than duplicating it. Unrelated fixes do not belong in one application commit.
2. Present the PRs to the maintainer, who may approve, reject, or request changes.
   Wait for an explicit merge instruction before merging. Review approval and
   passing CI alone are not merge or deployment instructions.
3. Deploy only after the maintainer explicitly requests the selected release.
   A single instruction may authorize both merge and deployment; honor its
   stated scope without asking again. Do not include other pending changes.
4. Newadmin deployment uses the separate `vpsfree-cz-configuration` repository.
   The older hosts follow the operations guide's separate procedure. Record
   one input/pin update for a completed release or fix, which may contain several
   approved application PRs. This does not require squashing unrelated fixes
   into one application commit. Avoid repeated shared pin updates while debugging.
5. Before deployment, read the current configuration repository instructions,
   verify the selected source revision and required checks, and prepare rollback.
   After deployment, verify the running release and push the corresponding
   configuration update so another operator cannot inadvertently downgrade it.
   Report the revision, checks, and any limitations.

The operator supplied these commands for use from the configuration repository:

```sh
confctl inputs channel update --commit vpsadmin-webui
confctl deploy cz.vpsfree/vpsadmin/int.vpsadmin-webui1
```

The update command follows the channel's current main and creates the input
commit. Check that its resolved revision is the approved release before deploying;
do not silently deploy additional changes that reached main in the meantime.
Confirm the current site configuration and tooling before using these commands;
the [operations guide](docs/design/OPERATIONS.md) links the site runbook and
completed release evidence. A past deployment does not certify a new candidate.

This workflow does not resume autonomous development, scheduled checks, or the
AI issue runner. Continue only the work authorized by the maintainer.

### Repository and infrastructure boundaries

- New application work belongs in `vpsfreecz/vpsadmin-webui`. The old
  `Kerrycek/clankerdev` repository remains available for history and outstanding
  work; do not archive it, close its PRs, or port them wholesale without review.
- `newadmin.vpsfree.cz`, `clankerdev.vpsfree.cz` and `dev.crucio.cz` received
  the canonical repository's release on 2026-09-30. See the dated
  [release receipt](docs/work-log/2026-09-30-three-site-release.md), then inspect
  live provenance before any update. Dev retains its separate test API.
  Do not retire, redirect or repurpose the older hosts without instruction.
- The reusable NixOS module belongs here; newadmin's host configuration and
  site runbook belong to `vpsfreecz/vpsfree-cz-configuration`. One frontend and
  one BFF process run on one VPS; the legacy PHP UI remains available.
  A local source checkout is not evidence of the currently deployed revision.
- `deploy/` contains historical instructions and scripts for the Clankerdev
  hosts. Do not use them for the new VPS or resume the paused AI issue runner.
  Do not change servers, databases or secrets as part of an application edit.
- Prepare reviewable feature changes; do not merge, publish a new default branch,
  or deploy without the relevant explicit direction. A review or passing test
  does not authorize any of those actions.
- Keep `docs/design/` and `WORK_LOG.md` current in the same change. Reference
  affected requirement IDs in a review description. Record whether evidence is
  source inspection, a fixture, a real isolated API test, or deployment proof.
