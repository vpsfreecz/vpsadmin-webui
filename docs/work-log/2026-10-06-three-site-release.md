# Mobile interactions and localized transactions: three-site release

The maintainer authorized merging, deploying and testing the work from this
conversation on 2026-10-06. The selected candidate integrates PR20 (BFF
proxy-addr patch), PR21 (mobile interactions/forms) and PR22 (API transaction
labels and UI language negotiation). PR23 holds the integration and preserves
original feature commits/authorship. The unrelated network feature PR19 is
outside this release. No API, database or credential change is included.

## Preparation

Read-only preflight found newadmin on clean `02ac0c7de1a588dbb14a18e652fe3f7e9b45cc51`
(NixOS generation 7), and clankerdev/dev on paired
`f123a7fb825437034a764a8a5654032a481a8476`. These are the expected rollback
releases; recheck before activation. Existing credentials and sessions remain.
Dev has no free root space; all staging uses `/data`. Newadmin has ample space
and hosts the scoped NixOS build in an isolated configuration checkout.

The E2E adoption conflict was resolved by retaining both feature inventories:
34 checked files and 216 deferred. Initial integration CI caught formatting
of the merged lint/E2E manifests; corrected with pinned Prettier. Browser suites
and combined source verification run before promotion. No failed candidate
has been activated. Configuration will receive one final generated WebUI input
update through confctl, scoped to the existing UI host.

Status: candidate preparation and verification in progress. Exact deployment,
CI, browser evidence and rollback results are recorded after completion.
