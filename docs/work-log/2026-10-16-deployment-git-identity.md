# Deployment commit identity — 2026-10-16

Historical record of one maintainer-specific correction, not a shared identity
policy. The 2026-10-19 instruction update requires each contributor to use their
own configured Git identity; preserve other contributors' original authorship.

The maintainer reported that generated configuration commits were attributed to
`System administrator <root@build.vpsfree.cz>`. The builder had no configured Git
identity, so Git inferred the shared operating-system account. Local commits
also used an inferred machine-local email. Existing historical commits confirm
`Michal Janoušek <kerry@kerrycze.net>` as the maintainer's intended identity.

Configured explicit repository identity in the local WebUI, configuration and
vpsAdmin checkouts. On the shared builder, enabled worktree-specific configuration
and set identity only in this task's configuration worktree. Verified both author
and committer. Added mandatory identity preflight to the instructions and release
procedure, including generated confctl commits; do not set root's global identity.

The maintainer explicitly authorized rewriting exactly the last two configuration
commits. Prepared equivalent commits preserving their trees, messages and dates,
retained a local bundle backup, then pushed with a lease on the exact old master.
No other commits were rewritten; no files, input revisions or runtime changed.

| Original | Corrected |
| --- | --- |
| `9105d416f1a5c7df55d6d7f49bb94aa83659b1b5` | `28acc2bd69a428a4bcb175efbddd7d8e6220459c` |
| `0bc45716f64e095dc38281537d24d157c7023826` | `d3e822db5d7845a298c1a752d6fee07c14b844fe` |

GitHub's commit API confirms both corrected commits belong to `Kerrycek`, with
Michal Janoušek as author and committer. Historical deployment receipts keep the
original IDs as evidence of the actual deployment; this table records their
replacement. Existing checkouts on the old chain need reconciliation before
another push; do not merge the obsolete author-only chain back into master.

Validation: empty file diff for both replacement trees; exact lease push passed;
GitHub author/account verification passed. The task's clean builder checkout was
moved to the replacement revision; other active checkouts were preserved.

The maintainer subsequently asked about `ae98e9db`, an earlier root-attributed
input bump. Its correction would also change the hashes of seven intervening
Jakub Skokan commits and the two corrected release commits. After reviewing that
scope, the maintainer chose to leave the older commit unchanged. No broader
rewrite was pushed; master remains `d3e822db` after the two-commit correction.
