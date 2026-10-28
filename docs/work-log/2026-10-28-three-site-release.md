# Reviewed Tasks, Transactions and mobile release — 2026-10-28

Status: prepared; merge and three-site activation are explicitly authorized.
The maintainer confirms the mobile preview works and requests merging our PRs
and deploying everywhere. Selected scope is PR97, PR98 and PR99 only. Aither
PR74 and ETNyx PR63 remain excluded and untouched. No API, OS, database,
credential, infrastructure-policy or unrelated input update is authorized.
Requirements: REQ-010, REQ-012, REQ-051, REQ-063 and REQ-068.

| PR | Exact selected head | Behavior |
| --- | --- | --- |
| 97 | f43054125a9499e28bf3858a67325ee6d5acd217 | Compact Tasks history/inspection, no Tasks pinning, progress percentages. |
| 98 | 7dc259c79a0ba82188718b8b5d85fae164147369 | Member/admin columns, compact item rows/expansion, failure and pin tints, stable pin height and percentages. |
| 99 | 8cbb35952255068f59e45a4a57ee1d7197c96da5 | Lookup choices remain within clipping panels and viewport, preserving first-touch selection. |

Each exact head has six successful required CI checks. Main before preparation
is `9113caa0915b2908373ecd616f8f752e779ed4c9`. The integration branch retains
all selected original commits/authors and their dev-preview documentation.
Its application tree matches the maintainer-tested clean dev `91ac3f64cb92`.
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
