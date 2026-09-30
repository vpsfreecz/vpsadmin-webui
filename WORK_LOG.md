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


## 2026-09-30 - Keep personal account views scoped to their owner

**Request / reason:** header Account / Sessions showed every user's sessions to
an administrator, which looked like foreign logins to their own account. The
maintainer requested checking adjacent account pages as well (REQ-040).

**Findings / change:** Sessions and Metrics omitted the admin owner filter.
Pass the authenticated ID only for administrators; regular/support users retain
the API-enforced scope, including the metrics API's ban on explicit user input.
Keep personal metrics copy distinct from another user's administrative dossier.
Session ID searches now inherit the existing owner check. Namespace and map
personal deep links also lacked an owner check: verify it before mounting detail
queries/actions. Other account tabs use explicit IDs/scoped paths; user-data's
independent API contract issue remains REQ-042. Dedicated user administration
remains available and is tested separately.

**Contract:** inspected the pinned vpsAdmin API resources at
`a65a4dfeb92a59df4a80a737a20bcbf8558793ff`. No API change, new role or catalog text.
**Verification:** pinned Node 24.21.0 / npm 11.19.0 on the Linux scratch
workspace: `ci:quick` and production build passed (existing large-chunk warning).
Seven session/metrics model unit tests and 16 E2E coverage-harness tests passed.
Fourteen new owner-scope browser scenarios passed; after adding the exact header
Account navigation and improving screenshot scroll position, the eight affected
cs/en desktop/mobile scenarios passed again. Twelve adjacent-account scenarios
passed (profile, SSH/session actions, mail, security, MFA and namespace edits).
The existing metrics browser suite also passed all six desktop/mobile cases.
Screenshots/logs are retained in the operator handoff and were shown during work.
A first broad invocation included a desktop-table-only SSH test in the mobile
project, where its hidden-table expectation failed; its intended desktop run
passed, and new scope scenarios explicitly handle both rendered layouts.
The new browser spec is adopted into strict E2E coverage with explicit inventory
expectations updated; no check was bypassed. Final E2E typecheck passed.
**Status:** prepared on `dev/account-personal-scope`, not merged or deployed.
Browser tests use synthetic users; no production session/token was changed.

## 2026-09-29 - Send verified OAuth session identity to the provider
