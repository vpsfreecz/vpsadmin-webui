# Project work log

This is the versioned record of work on vpsAdmin WebUI Next (Clankerdev),
started on 2026-09-27 at the maintainer's request for a future handover.
It records decisions and evidence; it does not replace the product specification,
Git history, deployment runbooks, or issue tracker.

Dates below use Europe/Prague unless an explicit UTC timestamp is given.
Entries before the start date are selective retrospective summaries, not a
complete reconstruction of the project. Missing evidence is not a passing check.

## New changes

Record new changes in separate files under [docs/work-log](docs/work-log/README.md)
to avoid conflicts between concurrent PRs. Keep the historical entries below.
Follow-ups belong in the corresponding change file, not a shared status block.

## Reading and maintaining this log

- Read the latest entries before starting work. Add an entry with each meaningful
  change, investigation, review outcome, deployment, or blocker.
- Record the request, what changed and why, PR/commit references, verification,
  deployment status, and a concrete next step or known limitation.
- State whether browser evidence used synthetic API fixtures, a real isolated
  API, or anonymous public endpoints. Do not describe fixture tests as live
  lifecycle certification.
- Append dated follow-ups for merge/deployment outcomes; retain earlier entries
  as history. A prepared PR is not a deployed change, and one green CI run does
  not establish release readiness for unrelated work.
- Link durable repository/CI evidence. If evidence exists only in an operator's
  local files, identify that limitation without publishing private paths or data.
- Do not store credentials, session tokens, personal data, private screenshots,
  or raw production responses. This log does not grant deployment authorization
  or enable autonomous scheduled development.


## 2026-09-30 - Integrate approved PRs 1 through 8 for three sites

The maintainer explicitly authorized merging all eight WebUI PRs and deploying
one release to newadmin.vpsfree.cz, clankerdev.vpsfree.cz and dev.crucio.cz.
The integration retains the original commits and authors. Conflict resolution
unions every adopted E2E source, updates exact coverage counts, retains all work
logs, and combines the compact console shell with the creation-progress banner.
Resolved structural exceptions remain removed. Formatting uses the existing
pinned Prettier version. The original checkout's pending instructions are untouched.

Preflight found newadmin at 534caa83 and both older sites at 156a7c04. The older
BFF services require migration from environment secrets to systemd credentials
for the current canonical source; existing values and session stores must be
preserved. The dev root filesystem is full, so staging and evidence use /data.
The newadmin release follows the separate configuration repository and confctl.
Checks and deployment receipts will be appended after actual completion.

## 2026-09-30 — Profile-change review layout

See the [per-change work log](docs/work-log/2026-09-30-change-review-layout.md)
for the full-width comparison, embedded metadata, decision placement and checks.
Prepared for review; not merged or deployed.
