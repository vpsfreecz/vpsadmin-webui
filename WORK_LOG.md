# Project work log

This is the versioned record of work on vpsAdmin WebUI Next (Clankerdev),
started on 2026-09-27 at the maintainer's request for a future handover.
It records decisions and evidence; it does not replace the product specification,
Git history, deployment runbooks, or issue tracker.

Dates below use Europe/Prague unless an explicit UTC timestamp is given.
Entries before the start date are selective retrospective summaries, not a
complete reconstruction of the project. Missing evidence is not a passing check.

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


## 2026-09-30 - Remove password reset from public navigation

**Request / reason:** the maintainer wants a simpler public entry page; password
recovery is reached through sign-in rather than a separate index shortcut.

**Change:** remove the recovery link from the shared public desktop header and
mobile menu. Preserve sign-in destinations, locale controls, the configured
provider recovery URL and the login-required/expired-session recovery action.
Record the intent in REQ-054 and the public workflow. This independent change
uses `dev/public-login-recovery` and does not include the sidebar PR.

**Verification / limits:** in the locked Linux Nix shell (Node 24.21.0),
12 focused PublicLayout/password-recovery unit tests, `ci:quick`, production
build and six existing public-overview/theme/language browser cases passed.
Four additional screenshot checks passed for cs/en on desktop/mobile, showing
sign-in without a reset shortcut. These use synthetic API fixtures, not live
provider or email delivery tests. Screenshots/logs are retained in the operator
handoff; the build keeps its existing large-chunk warning. No new wording or
catalog changes; localization reference is the locked vpsAdmin revision
`a65a4dfeb92a59df4a80a737a20bcbf8558793ff`, resolved through Nix on Linux.
Existing unit expectations are updated to require sign-in and reject the old
shortcut, even when a recovery URL is configured. No recovery email is sent.
No server/API change, merge or deployment. Public-navigation KB screenshots
may need regeneration; external KB contracts are not certified here.
