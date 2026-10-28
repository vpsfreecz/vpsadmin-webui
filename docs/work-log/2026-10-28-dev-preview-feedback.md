# Dev preview refresh: percentages and pinning feedback

Date: 2026-10-28 (Europe/Prague). Status: deployed to dev only. Clean paired runtime revision:
`3f77b8f5720aa821c85e6676228a8880338066e2`. Later documentation commits
do not change this pin.
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

## Completed checks and activation

- All six GitHub checks passed on each exact selected head before activation:
  [PR97 CI](https://github.com/vpsfreecz/vpsadmin-webui/actions/runs/40610177292),
  [PR97 browsers](https://github.com/vpsfreecz/vpsadmin-webui/actions/runs/40610177295),
  [PR98 CI](https://github.com/vpsfreecz/vpsadmin-webui/actions/runs/40610178903),
  [PR98 browsers](https://github.com/vpsfreecz/vpsadmin-webui/actions/runs/40610178937).
  No failed/cancelled/pending check was treated as success. Both PRs remain open.
- Combined ci:pr passed: quality/docs/security/localization/type checks, 226
  script, 57 BFF and 1,893 unit tests (305 files), plus production build. The
  existing chunk-size advisory remains. Strict E2E coverage is 86 checked files.
- Combined source Playwright checks passed 72/72 across desktop Chromium, mobile
  Chrome and mobile WebKit, including cs/en, account isolation, focus/inspection,
  cancellation/polling, known terminal percentages, equal pinned-row heights,
  failure priority, exact payload copying and chain/item navigation.
- Exact clean x86_64-linux Nix frontend/BFF, provenance, source/package contents
  and module-evaluation builds passed. Frontend output:
  `/nix/store/v96bfwcyb6vx4s072rwhga4r7w66s1r8-vpsadmin-webui-frontend-1.0.0`.
  BFF output:
  `/nix/store/w7gvbgcxzav23jccnl9a6pf5439m88a3-vpsadmin-webui-bff-0.1.0`.
- Staging verified matching full clean metadata, file manifest, portable runtime
  and BFF dependency loading. Candidate config/session validation used actual
  systemd credentials and required the separate dev API origin. nginx -t passed.
- Activation ran only after the exact 12 green GitHub checks, under the existing
  dev deploy lock with expected-previous-revision and published-preview guards.
  The paired pointers and BFF process cwd/metadata match `3f77b8f5720a`. nginx
  and systemd config hashes are unchanged; retired secret environment variables
  remain absent. Existing sessions, credential values and settings were retained.
- Another 72/72 checks passed against the actual HTTPS-served candidate bundle.
  This harness supplies only browser-local synthetic BFF sessions/API responses
  and blocks direct versioned API traffic. It is not live authenticated API proof.
- Three unmocked anonymous contexts (desktop Chromium, mobile Chrome and Safari)
  passed full revision/clean flag, dev API origin, About/commit link, denied admin
  access, viewport, JS error and script MIME/status checks. Auth endpoint smoke
  passed. Dev uses its existing TLS exception; public sites use normal TLS.
- Both production origins still report `2d361c571eac`. Main was not merged or
  deployed. No API, dependency, VM, site-configuration or configuration-repo pin
  changed. No cleanup/GC ran. Root has about 5.1 GiB free; /data about 850 GiB.

## Rollback and review

Retained matching previous release:
`/data/webui-preview-20261028/releases/08154f07c9bd5d30d2628a79c3410f0f6d61bf83`.
Current release and private activation receipt are below
`/data/webui-preview-feedback-20261028`. Restore both recorded pointers under the
existing dev lock and restart BFF if needed; do not restore old session files.
No rollback was necessary. The two feature PRs remain separate and unmerged.

Review <https://dev.crucio.cz/app/transactions>,
<https://dev.crucio.cz/admin/transactions> and Tasks in the top-right.
Actual deployed-bundle captures use synthetic fixtures only:

- [Tasks desktop](screenshots/2026-10-28-dev-preview-feedback/tasks-desktop.png)
- [Tasks mobile Safari](screenshots/2026-10-28-dev-preview-feedback/tasks-mobile-safari.png)
- [Member transactions](screenshots/2026-10-28-dev-preview-feedback/member-transactions.png)
- [Individual items](screenshots/2026-10-28-dev-preview-feedback/items-desktop.png)
- [Member mobile](screenshots/2026-10-28-dev-preview-feedback/member-mobile.png)
