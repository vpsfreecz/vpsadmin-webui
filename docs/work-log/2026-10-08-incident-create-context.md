# Incident creation retains VPS context — 2026-10-08

Status: prepared on `dev/preserve-create-context`; not merged or deployed.
Requirements: REQ-046, REQ-051.

## Problem and change

The VPS menu already linked to a filtered incident list. Its New report link
lost the filter, leaving the VPS field blank. Carry the explicit VPS into the
new form and preserve the original list query for Back, Cancel and breadcrumb.
Direct create links retain their VPS when returning. Generic/owner-only lists
cannot infer a VPS and keep the field blank. Do not copy historical report fields.
Changing the VPS also clears an IP assignment selected for the previous VPS.
Only current-mode incident-list return paths are accepted.

## Verification

The deployed dev.crucio.cz bundle reproduced the missing VPS with a synthetic
admin session and API fixtures. Candidate verification and checks are recorded
below after completion. No real incident or notification is created by fixtures.
The API, BFF and shared deployed files are unchanged.

Related flows inspected: user detail to VPS list/create already carries owner;
dataset export creation fixes its dataset; dataset snapshots keep the dataset
in the route; DNS records keep their zone. Outage creation describes infrastructure
scope, not a per-VPS report, so a VPS list filter must not imply a broader node
outage. No unrelated runtime changes are included.

Completed checks:

- `npm run ci:quick` passed, including frontend/tooling/E2E/BFF type checks,
  design documentation, mutation, structural, localization and overlay audits.
- `npm run build` passed in the pinned Node 24 Nix environment.
- 14 context helper unit tests passed. Full `npm test` ran 1,733 cases: 1,732
  passed initially; one unrelated network-card rendering test exceeded its
  5-second budget under concurrent build/test load. Its entire 26-case file
  passed when rerun with two workers. No test timeout was increased.
- The E2E type-coverage script's 16 tests passed. The new spec is adopted into
  strict TypeScript coverage and runs in PR smoke for desktop/mobile Chrome and
  in the mobile WebKit project.
- Six context journeys passed in all three projects (18 checks): VPS list to
  incident creation/back/reload, generic and filtered incident lists, changing
  VPS without retaining an IP assignment, member to VPS creation, dataset to
  export creation, and zone to DNS record creation. Mobile actions use `tap()`.
- Existing incident direct-create, pending-cancel, rejected-submit/retry and
  permissions tests plus snapshot preflight passed on desktop and mobile;
  DNS CRUD passed on desktop (11 checks altogether). The old DNS CRUD test is
  desktop-specific: on mobile it asserts a hidden desktop row instead of the
  displayed card. The new zone-context test covers the mobile create journey.

Browser evidence uses dev.crucio.cz as the origin with synthetic session/API
responses. The deployed bundle first failed on the empty VPS field. For the
candidate run, only the test browser served local candidate HTML/assets,
including the freshness-check index; configuration still came from dev.
This is frontend fixture evidence, not certification against a real API.
Chrome ran on the isolated Linux workspace; WebKit ran on macOS with the same
Playwright 1.61.0 and built assets after the Linux WebKit harness could not open
a page. Synthetic desktop/mobile screenshots were captured and reviewed.
Neither production nor the shared dev release was changed.

Mobile follow-up PRs #27 (delayed dialog focus) and #29 (pending pagination
navigation) remain separate, open and CI-green at this review. They are not
included in this incident-context branch and are not yet production-deployed.
