# 2026-10-02 — Publish and finish the deployment documentation

**Request:** put the documentation in the new repository and check that the
handover is complete. This is a documentation/publication and read-only
verification task; it does not deploy another application revision.

**Findings:** the September release receipt was already published, but maintainer
review/release instructions were still only in a dirty local checkout. README,
the handbook and requirement statuses continued to describe delivered work as
planned or pending. The operations page still said the newadmin runbook was being
prepared, and old deployment entry points did not flag the credentials cutover.

**Changes:** publish the agreed shared-development and review/release rules;
retain the original instruction record as dated history. Link the release receipt
from entry points and update only statuses supported by that receipt. Document
newadmin's actual confctl workflow, exact-revision check, configuration push,
paired provenance and rollback. Link the authoritative site-owned runbook rather
than copying its private settings into the application repository. Add a manual
older-host release/recovery guide and mark incompatible old provisioning steps
as historical. Preserve the original source checkout's unrelated pending changes.

**Read-only checks on 2026-10-02:** all three origins returned clean full revision
`718cf7596eb8b11a796268a73c1f2e0a02a98450`, health `ok`, config schema 1 and
anonymous session fields. Newadmin/clankerdev still select `api.vpsfree.cz`; dev
selects its separate API. Configuration `master` at `b164a3b7` still pins that
application revision. No WebUI PRs were open at inspection time. Dev BFF/nginx
were active. Dev root free space was about 152 MiB; capacity cleanup and its
existing certificate/SAN problem remain open.

**Validation:** passed `npm run env:locked` (Node 24.21.0/npm 11.19.0),
`npm run audit:design-docs` (19 documents, 70 requirements, unchanged inventory
of 256 routes and 64 API modules) and `npm run audit:active-docs` (1,364 files)
inside the pinned Linux Nix shell. Added local links/anchors, requirement-table
structure and `git diff --check` passed. This closes the original instruction
checkout's missing-TypeScript audit gap. Only Markdown files changed; application
tests were not repeated for this documentation-only update.

**Completion boundary:** source-contained instructions, public release evidence
and navigation can be handed over from the new repository. Credential/access
transfer remains private. The older-host release is documented as a manual
operator procedure; the one-time September migration helper is not a general
release tool. Interactive live OAuth/frame acceptance, real lifecycle
certification and independent beta/security assurance remain explicit separate
gates. No automation was resumed and no service, pin or secret was changed.
