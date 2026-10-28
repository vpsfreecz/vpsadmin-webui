# Dev preview of Tasks and transaction table follow-ups

Date: 2026-10-28 (Europe/Prague). Status: prepared; activation pending.
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

## Preparation and limits

Run combined quality/unit/build and targeted desktop/mobile browser checks,
then build exact clean matching frontend/BFF packages in isolated /data space.
Preserve current settings, credentials, sessions, OAuth routing, separate dev API,
other services and VMs. Verify candidate settings using systemd credentials,
retain paired rollback, then activate under the existing deployment lock with
automatic paired rollback on failure. No site configuration or API update.

Record actual package/provenance, activation and post-deployment checks below.
Served-bundle fixture evidence must be distinguished from anonymous live checks
and authenticated API authorization. No live destructive mutation is required.
