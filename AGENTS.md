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

- The NixOS module and site configuration for `newadmin.vpsfree.cz` are separate
  work. One frontend and one BFF process are planned on one VPS; the legacy PHP
  UI stays available. This source checkout is not a deployed release.
- `deploy/` contains historical instructions and scripts for the Clankerdev
  hosts. Do not use them for the new VPS or resume the paused AI issue runner.
  Do not change servers, databases or secrets as part of an application edit.
- Prepare reviewable feature changes; do not merge, publish a new default branch,
  or deploy without the relevant explicit direction. A review or passing test
  does not authorize any of those actions.
- Keep `docs/design/` and `WORK_LOG.md` current in the same change. Reference
  affected requirement IDs in a review description. Record whether evidence is
  source inspection, a fixture, a real isolated API test, or deployment proof.
