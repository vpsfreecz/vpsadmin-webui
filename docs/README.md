# Documentation

Start with the English [design and requirements handbook](design/README.md).
It explains product scope, requirements and acceptance, interaction design,
architecture, API contracts, workflow behavior, decision history, verification,
operations and handover. It is self-contained within this repository.

- [Requirements register](design/REQUIREMENTS.md): current intent, source, status.
- [Generated inventory](design/IMPLEMENTATION_INVENTORY.md): routes and API adapters.
- [Per-change work log](work-log/README.md): current changes and release evidence;
  the [root log](../WORK_LOG.md) retains history.
- [Operations](design/OPERATIONS.md): deployment, environment boundaries and rollback.
- [Three-site release](work-log/2026-09-30-three-site-release.md): the completed
  2026-09-30 deployment, exact revisions and verification limits.
- [Documentation map](CANONICAL_DOCS.md): active versus historical sources.

Update requirements/design when their meaning changes and record rationale and
checks once in the per-change log.
Run `npm run docs:inventory` after route/adapter changes and
`npm run audit:design-docs` before review. The handbook explains evidence limits;
this documentation does not certify every live workflow or approve a release.
