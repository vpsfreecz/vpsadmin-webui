# 2026-09-30 — Maintainer review and release workflow

Initially recorded only in the local instruction checkout on 2026-09-30.
Published to the canonical repository on 2026-10-02; the dated account below
describes the original preparation, before the subsequent deployment.

**Request / reason:** the maintainer confirmed that assigned changes should
continue as individual reviewable PRs, followed by an explicit merge instruction
and an agreed deployment. Future conversations need the same boundaries without
reconstructing this discussion.

**Change:** record the workflow in `AGENTS.md` and link it from the design
handbook. Distinguish focused application commits from a single site input
update for a completed release. Preserve the operator-provided confctl commands,
require verification of the approved revision before deployment, and require
pushing the configuration update so other operators retain the deployed pin.
An instruction that explicitly includes merge and deploy does not need repeated
confirmation; review approval alone does not authorize either action.

**Maintainer follow-up:** use descriptive `dev/...` task branches; the local
instruction branch is now `dev/review-release-instructions`. Add explicit
shared-repository rules for checking upstream/overlapping PRs, preserving other
contributors' work and rechecking merge/deployment state. Keep documentation and
the work log current during every task. The old repository and
`clankerdev.vpsfree.cz` remain available; their future use is undecided. Using
`dev.crucio.cz` for new-repository previews is a proposal, not a completed
transition or permission to change servers.

**Verification / limits:** diff inspection and `git diff --check` passed.
`audit:active-docs` passed (1,352 files) using cached Node 24.19.0. The design
audit passed its link/requirement checks but could not complete inventory
generation because this fresh checkout has no installed TypeScript dependency.
The pinned Nix toolchain is not available on this host; a full locked audit
remains pending. The deployment commands are recorded from the operator's
message, not exercised or independently certified in this change.
No application behavior, server, configuration repository, automation, merge,
or deployment was changed.


## 2026-10-02 publication follow-up

The workflow is now in the canonical `AGENTS.md` and linked from the handbook.
The preview transition and deployment-command verification were completed in
the [three-site release](2026-09-30-three-site-release.md). The
[documentation review](2026-10-02-deployment-documentation.md) closes the earlier
missing-dependency audit gap and records remaining operational limits. The
original local checkout and its pending changes were preserved.
