# Kerrycek experimental UI integration branch

Maintainer decision, 2026-11-02: keep UI changes since the last approved
production release on the separate `kerrycek-021126` branch, with focused PRs
and development previews on dev/clankerdev. Production promotion remains a
separate explicit decision. This setup does not deploy a new application.

## Source and PR scope

Create the integration branch from `bb351fed`, the documentation follow-up to
clean preview source `4dec43bb9b6451df81053a1768d1190b7d67c916`, based on production
`70bd11d983e7dfd11f99604791ad68562807ee2e`. Its only UI feature deltas are our
PR123 theme controls, PR124 public overview/news and PR125 sidebar controls.
Those combined changes are already tested and deployed to dev as recorded in
[the paired preview receipt](2026-11-01-public-sidebar-dev-preview.md).

Main at inspection is `63d484fc`; it has additional API-client changes which are
not selected for this preview. Do not merge main or colleague PRs implicitly.
Held DNS PR116/117 are not included. No history rewrite, no repository default
branch change and no edits to colleagues' worktrees/PRs.

Keep the original PR123/124/125 numbers, source branches and review history;
convert them to drafts to stop treating them as ready main-branch candidates.
Their UI deltas are already included in the integration branch. Retargeting the
old PRs would not create clean incremental reviews because their ancestry also
contains newer main changes. Instead, new feature branches start at
`kerrycek-021126` and explicitly use it as their PR base:

```sh
git switch -c dev/<feature> origin/kerrycek-021126
gh pr create --repo vpsfreecz/vpsadmin-webui --base kerrycek-021126
```

Retain the current explicit review/merge workflow. Do not automatically merge
PRs. A later production release requires a fresh comparison with the running
production revision and a separately approved selected release.

## CI and host inspection

Add only `kerrycek-021126` to the standard CI push branch allowlist. Pull request
CI and smoke jobs already accept PRs into this branch without modification.
Keep broad smoke policy and all checks/assertions unchanged. No deployment hook
is introduced.

Read-only public provenance/config inspection on 2026-11-02:

| Host | Frontend revision | API | Role |
| --- | --- | --- | --- |
| newadmin.vpsfree.cz | `70bd11d9` | `https://api.vpsfree.cz` | Production; unchanged |
| clankerdev.vpsfree.cz | `70bd11d9` | `https://api.vpsfree.cz` | Permitted UI preview host; production data |
| dev.crucio.cz | `4dec43bb` | `https://dev.crucio.cz` | Existing combined preview; isolated test data |

Build metadata alone does not prove a BFF process version; no application is
promoted during this branch setup. Future deployments must recheck both frontend
and actual BFF process, settings, active work and rollback under the host lock.
Run state-changing tests against dev or intercepted fixtures. Leave clankerdev's
API/OAuth settings unchanged unless a separate setup is explicitly selected.

## Verification and outcome

Created and published `kerrycek-021126` at `bb351fed`; GitHub API read-back
confirms its exact ref. PR123/124/125 are now drafts at their original heads,
with their bases/reviews/history retained. Other PRs remain unchanged. The
policy/CI follow-up changes only instructions, operational documentation, the
work log and the standard CI push allowlist.

Remote pinned-runner checks passed: design documentation/inventory audit
(173 documents, 76 requirements, 257 routes, 64 API modules) and both existing
Playwright workflow-contract checks (2/2). `git diff --check` passes, and source
comparison with the tested dev release confirms no runtime or dependency changes.
Evidence: `/data/webui-browser-runner/evidence/kerrycek-021126/branch-setup-checks.log`.
The branch push CI runs after publication of the allowlist change; this record
does not anticipate that run's result.

No new application build or deployment was performed. Public metadata/config
inspection confirms production and clankerdev remain on `70bd11d9`, dev remains
on `4dec43bb`, and the two API boundaries in the table above are unchanged.
