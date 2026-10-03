# Approved PRs 9–16: three-site release

The maintainer explicitly requested merging and deploying all work from this
conversation to newadmin.vpsfree.cz, clankerdev.vpsfree.cz and dev.crucio.cz.

The candidate combines PR9 (registration reason presets), PR10 (migration feedback
and options), PR11 (transaction operation names), PR12 (migration node picker),
PR13 (maintainer handbook), PR14 (incident width), PR15 (payment QR codes), and
PR16 (stale application review queue). All original commits and authors are
retained. The overlapping requirement rows combine transaction and incident
behavior, and E2E adoption lists are united rather than choosing one branch's
coverage. No backend/API/database migration is included.

PRs 9–15 passed their original GitHub checks. The first PR16 full browser run
exposed an older smoke spec still asserting the removed queue count. That spec
was corrected in PR16 and all four request/payment desktop/mobile cases passed;
its new CI run is pending. The integrated candidate must pass its own checks
before promotion.

Read-only preflight found all three sites still running clean revision
`718cf7596eb8b11a796268a73c1f2e0a02a98450`. Dev's root filesystem has only about
53 MiB available; release staging stays on its spacious data filesystem.
Newadmin and clankerdev have ample free space. Existing credentials and live
sessions will be retained. The prior matching frontend/BFF and NixOS generation
are the rollback targets; historical pre-cutover helpers are not rerun.

Status: candidate prepared, not merged or deployed. Final verification and
activation results will be appended after completion.
