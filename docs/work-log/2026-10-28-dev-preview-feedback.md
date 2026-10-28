# Dev preview refresh: percentages and pinning feedback

Date: 2026-10-28 (Europe/Prague). Status: preparation only.
The maintainer requested another dev.crucio.cz preview after both feature PRs
pass GitHub CI. Main merges and production deployments remain outside scope.

## Selected changes and guards

- PR97 `f43054125a9499e28bf3858a67325ee6d5acd217`: remove pinning from Tasks
  (including inspection/background chains) and show known percentages.
- PR98 `7dc259c79a0ba82188718b8b5d85fae164147369`: show all known chain
  percentages and remove the Pinned row badge without changing row height.
- Start from the existing preview `a1de1547` and retain both original PR
  histories; both feedback merges applied without conflicts. No other PR,
  API input, dependency, auth or site-configuration change is included.
- Observed dev runtime before preparation: paired clean
  `08154f07c9bd5d30d2628a79c3410f0f6d61bf83`. Recheck under the existing
  deploy lock immediately before activation. Preserve that exact pair for
  rollback, plus settings, session state, credentials and existing hashed assets.
- Build exact clean frontend/BFF packages under isolated /data space. Check
  metadata/contents and candidate settings with the actual credential loader.
  Never install dependencies in a live release or replace another deployment.

Requirements: REQ-010, REQ-012, REQ-051 and REQ-063.
Both feature branches passed local ci:pr plus 32 Tasks and 30 Transactions
fixture browser checks. Before activation, require all six GitHub checks on
each exact head, combined source checks, matching clean Nix provenance and
package checks. After activation, check auth, anonymous real-browser behavior
and the served bundle with browser-only synthetic sessions/API responses.
Fixtures do not certify live authenticated API permissions or mutations.

Actual clean revision, artifacts, test outcomes and activation receipt will
be recorded after verification. Production and main stay unchanged.
