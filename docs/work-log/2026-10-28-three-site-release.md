# Reviewed Tasks, Transactions and mobile release — 2026-10-28

Status: prepared; merge and three-site activation are explicitly authorized.
The maintainer confirms the mobile preview works and requests merging our PRs
and deploying everywhere. Selected scope is PR97, PR98, PR99 and the subsequently requested PR101. Aither
PR74 and ETNyx PR63 remain excluded and untouched. No API, OS, database,
credential, infrastructure-policy or unrelated input update is authorized.
Requirements: REQ-010, REQ-012, REQ-023, REQ-051, REQ-063 and REQ-068.

| PR | Exact selected head | Behavior |
| --- | --- | --- |
| 97 | f43054125a9499e28bf3858a67325ee6d5acd217 | Compact Tasks history/inspection, no Tasks pinning, progress percentages. |
| 98 | 7dc259c79a0ba82188718b8b5d85fae164147369 | Member/admin columns, compact item rows/expansion, failure and pin tints, stable pin height and percentages. |
| 99 | 8cbb35952255068f59e45a4a57ee1d7197c96da5 | Lookup choices remain within clipping panels and viewport, preserving first-touch selection. |
| 101 | 548af8d6335ee1000cb9ac3dcb687e51601f906c | Accept an isolated synchronous admin preference, verify read-back and retain independent Sunday writes and other receipt guards. |

PR97/98/99 exact heads have six successful required CI checks. PR101 and the
updated combined integration require their own current-head checks. Main before preparation
is `9113caa0915b2908373ecd616f8f752e779ed4c9`. The integration branch retains
all selected original commits/authors and their dev-preview documentation.
Its initial application tree matched the maintainer-tested clean dev
`91ac3f64cb92`; PR101 adds the narrowly scoped acknowledgement correction
requested after the maintenance-page production report.
Current production observations remain `2d361c571eac`; recheck before promotion.

The dev receipt records combined ci:pr, 105 deployed fixture browser checks,
36 cold-menu/held-chunk checks and real anonymous runtime/auth checks, executed
on the development machine after the maintainer's preference was supplied.
The intermittent physical Safari menu symptom was not reproduced in fixtures;
the maintainer now reports it works on dev. Neither observation is an API
permission audit or universal physical-device certification.

Create one integration review to avoid sequential partial releases. Recheck its
exact head, main, selected heads and required CI before merge. Retain the tested
Git tree if the merge SHA differs. Build one exact clean paired release and
activate it on dev, clankerdev and newadmin with paired rollback. For newadmin,
use confctl and one generated WebUI input commit, preserving the deployed OS/API
pins. Publish only that pin patch on current configuration master; no deployment
receipts, screenshots or generated reports belong in that repository.

Repeat served-bundle synthetic feature acceptance and anonymous provenance,
config/auth, desktop/mobile and asset checks on all sites from the isolated
Linux browser runner. Preserve live sessions, secrets, configuration and other
services. Record actual CI, merge, package, runtime and publication outcomes
below after they occur, with fixture versus live limits explicit.


## Maintenance report added before activation

The maintainer explicitly requests fixing, merging and deploying the maintenance
report before this release. The API permits immediate DB-only saves for the
isolated admin-team preference; requiring a task produced a false missing-receipt
error and an uncertainty lock. PR101 preserves strict async/malformed-receipt
handling and verifies the exact submitted VPS boolean before confirming success.
Sunday-only requests are independently tested. Real production access remains
read-only and confirms Sunday is currently 02:00–05:00 on the reported VPS.

The earlier `be977e81` candidate passed all six CI checks and was built/staged,
including a successful newadmin dry activation, but was never activated or
published as a configuration pin. Its drafts are superseded by this combined
candidate. Only the final input-only configuration commit will be published.
The favicon request was explicitly cancelled and no favicon change is included.
