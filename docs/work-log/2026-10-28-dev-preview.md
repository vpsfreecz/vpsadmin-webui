# Dev preview of Tasks and transaction table follow-ups

Date: 2026-10-28 (Europe/Prague). Status: deployed to dev only. Clean runtime revision:
`08154f07c9bd5d30d2628a79c3410f0f6d61bf83`. Later documentation commits
do not change that runtime pin.
The maintainer requested both pending changes on dev.crucio.cz for review.
This does not authorize main merges or updates to either production host.
Requirements: REQ-010, REQ-012, REQ-051, REQ-063.

## Scope

Base main: `9113caa0915b2908373ecd616f8f752e779ed4c9`.
Selected original heads, all six CI checks green before integration:

- PR97: `7e6fe03bcc6f7505a8102efb8f71e4d63749ce75` — compact tracked Tasks.
- PR98: `41990ffd566e82a987a0907178f82798002b055d` — member owner column,
  pin/failure highlights and compact expandable individual transactions.

Both original commits are preserved in this isolated preview. Resolve shared
work-log/workflow/browser-list conflicts by retaining both features and every
strict/WebKit test entry. No application-source conflict. PRs #63/#74, the
unrequested API-input branch and other pending work are excluded.
Previous observed dev frontend/BFF: `2d361c571eac6ae4cd2e12140b013c0e3fadb926`.
The deployment helper must recheck that revision under the existing dev lock.

## Preparation contract and limits

Run combined quality/unit/build and targeted desktop/mobile browser checks,
then build exact clean matching frontend/BFF packages in isolated /data space.
Preserve current settings, credentials, sessions, OAuth routing, separate dev API,
other services and VMs. Verify candidate settings using systemd credentials,
retain paired rollback, then activate under the existing deployment lock with
automatic paired rollback on failure. No site configuration or API update.

Actual package/provenance, activation and post-deployment results follow below.
Served-bundle fixture evidence must be distinguished from anonymous live checks
and authenticated API authorization. No live destructive mutation is required.


## Completed verification and activation

- Both selected PR heads retained all six green GitHub checks and remained open.
  Main stayed at `9113caa0915b`. The published preview preserves both original
  commits and no excluded contributor work.
- Combined `npm run ci:pr` passed: quality/docs/security/i18n gates, 226 script,
  57 BFF and 1,893 unit tests (305 files), then production build. Strict E2E
  adoption contains 85 checked files; no source baseline/gate was weakened.
- Combined source acceptance passed 88/88 Playwright checks across desktop
  Chromium, mobile Chrome and mobile WebKit: tracked Tasks, inspection, pins,
  errors/cancellation/polling, owner isolation, completion feedback, member/admin
  transaction layouts, exact payload copy and chain/item cursor continuity.
- Full x86_64-linux Nix frontend/BFF builds, provenance, source/package-content
  and NixOS module-evaluation checks passed on the exact clean source commit.
- Frontend: `/nix/store/jv2mcz6i4bn1mqb6v8z0vkpaz56wdywg-vpsadmin-webui-frontend-1.0.0`.
- BFF: `/nix/store/912rikrdjb0snjn64k6q1y7gjay4j7hx-vpsadmin-webui-bff-0.1.0`.
- Candidate settings and session-store validation passed through actual systemd
  credential loading under webui-bff, with the dev API origin explicitly checked.
  nginx validation passed; paired pointer activation was guarded by the existing
  dev deploy lock and an expected-previous-revision check with automatic rollback.
- Frontend HTTP metadata, BFF metadata and process cwd match the clean runtime.
  Auth endpoint smoke passed. nginx, dev BFF and unrelated kra BFF are active.
  Unit/nginx hashes stayed unchanged, retired secret environment variables remain
  absent, and existing sessions/settings/credentials were preserved. The copied
  runtime has no absolute Nix-store symlinks. No API, VM or production deploy ran.
- Post-deployment acceptance passed another 88/88 checks against the actual
  HTTPS-served bundle, with synthetic BFF sessions and API responses installed
  only in the browsers. Real versioned API requests are blocked by this harness;
  it does not certify live authenticated API permissions/mutations.
- Three separate unmocked anonymous browser contexts passed: full clean revision,
  unchanged dev API origin, About/commit link, fitting layout, denied admin access,
  script status/MIME and no JS exceptions. Public-site metadata checks with normal
  TLS still report `2d361c571eac` on clankerdev and newadmin.

The initial served-bundle harness preflight failed before activation because its
synthetic recovery URL omitted the required public client_id query. Correct the
fixture to match the existing config schema; no app/bootstrap gate was changed.
The initial anonymous check then passed desktop/Chrome but expected the wrong
Czech sign-in heading in Safari. Match the two exact existing localized headings;
all three contexts then passed. Preserve the failed setup logs rather than
claiming those attempts succeeded. Dev alone uses its existing TLS/SAN exception.

## Rollback and review

Previous paired release remains under
`/data/webui-release-20261027/releases/2d361c571eac6ae4cd2e12140b013c0e3fadb926`.
The new stage and private activation receipt are below
`/data/webui-preview-20261028`. Restore both recorded pointers under the dev
lock and restart the BFF if rollback is needed; never restore old session files.
No rollback was needed. Root has about 5.3 GB free and /data about 850 GB; no
cache/data cleanup was performed in this deployment.

Review at <https://dev.crucio.cz/app/transactions> or
<https://dev.crucio.cz/admin/transactions>, and open Tasks in the top-right.
Only dev received PR97/PR98; main and both feature PRs remain unmerged. The
maintainer can approve the preview before a separately authorized production
release. No newadmin configuration pin or additional integration PR was created.

Actual deployed-bundle captures, all synthetic data:

- [Tasks, desktop](screenshots/2026-10-28-dev-preview/tasks-desktop.png)
- [Tasks, mobile Safari](screenshots/2026-10-28-dev-preview/tasks-mobile-safari.png)
- [Member transactions](screenshots/2026-10-28-dev-preview/member-transactions.png)
- [Individual items](screenshots/2026-10-28-dev-preview/items-desktop.png)
- [Member mobile view](screenshots/2026-10-28-dev-preview/member-mobile.png)
