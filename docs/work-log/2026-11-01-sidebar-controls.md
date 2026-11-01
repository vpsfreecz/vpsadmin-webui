# Authenticated navigation controls

Prepared on 2026-11-01. Requirements: REQ-004, REQ-006, REQ-010, REQ-012.
Status: verified review candidate; not merged or deployed.

## Request and implementation

The maintainer requested a single navigation area instead of two menu bars:
search replaces the top logo, Tasks/session/account move into navigation, and
vpsAdmin branding moves directly above About. The desktop sidebar retains its
256px width and role-specific destinations. Mobile keeps only the drawer trigger
above the page. Short landscape/desktop windows also use the drawer, keeping
all destinations reachable. Controls have labelled 44px touch targets and fit
long logins. Search and account popovers fit their navigation column, with
viewport-bounded scrolling and wrapping for long results.

The session indicator links to the actual inactivity control in profile security,
including Never expires. The target waits for the settings panel and focuses the
input, without changing the account. Repeat hash navigation remains supported.

Search retains its debounce, abort handling, owner scope, keyboard selection,
loading/errors and full command palette. Only one instance of search and account
controls mounts; mobile navigation closes before opening Tasks or the palette.
Account choices use the shared clipped-popover positioning so the lower options
remain scrollable in short desktop windows and mobile drawers. No API, permission,
authentication, session-expiry or task-storage changes.

## Verification

Initial compiled-build checks: 15/15 across Chromium, mobile Chrome and mobile
WebKit, using member/admin fixtures, Czech/English and light/dark themes. The
follow-up adds short-viewport account checks and captures at CSS resolution.

`ci:quick` passed after extracting the mobile trigger from the oversized shell;
no structural budget exception was added. Production dependency audit reports
zero vulnerabilities. Script tests passed 232/232 and BFF tests 58/58 after
installing the isolated BFF dependencies and supplying the runner's rsync path.
The first attempts lacked these test prerequisites; they are not product fixes.

A full unit run under concurrent browser load had 1958 passes and two failures
in untouched IP lookup/interface tests (an initial-selection assertion and a 5s
timeout). Both complete affected files subsequently passed 36/36 with two workers;
the bounded full rerun then passed 1960/1960 in all 309 files. A broad PR browser run was intentionally
stopped after 39 successes to focus on the navigation changes; it is not a pass
of the complete PR suite. The first targeted navigation run exposed an introduced regression: closing the
navigation on every location key also closed it during filter URL normalization.
The fix closes on path changes or explicit navigation instead. Both failing
workflow variants and three short-window checks passed 5/5. The subsequent
navigation regression passed 119 checks, with 16 intentional platform skips
(touch-only vs mouse-only); no retries. Final width/height polish and compiled
build acceptance are recorded below.

### Final review source

- `ci:quick`: passed, including application/tooling/E2E/BFF TypeScript,
  localization, structural, overlay, mutation, CSP and documentation audits.
- `npm run build`: passed for the BFF production runtime.
- `npm test -- --maxWorkers=2`: 1960/1960 in 309 files on the final source.
- Compiled production-build acceptance: 48/48 navigation/account/session/scope
  checks across Chromium, mobile Chrome and mobile WebKit; 26/26 desktop search
  checks; 14/14 real first-touch/cold-search checks in the two mobile browsers.
  All use zero retries. This final compiled check includes the short-window
  drawer, bounded full-width popovers and the query-update regression.
- Production dependency audit: zero vulnerabilities; dependencies unchanged.
- Thirteen touched deferred browser specs adopted into strict TypeScript,
  plus the new navigation helper and spec; no deferral hash refreshed.

Evidence is retained under
`/data/webui-browser-runner/evidence/sidebar-controls-20261101/`:
`review-source-final.log`, `compiled-final.log`, `stable-navigation.log`,
`configured-tests-build.log` and `production-audit.json`. Earlier failed and
interrupted runs remain available, including `navigation-regression.log` and
`unit-failure-followup.log`. All runtime source files matched between the local
review checkout and remote build checkout before publication.

### Implemented screenshots (synthetic fixtures)

These show the compiled application, not a mockup or a deployed live account.
Desktop captures are 1440 × 1000; mobile Safari captures use CSS resolution.
The isolated source archive has no Git metadata, so its footer reports the
version as unavailable; these captures do not establish deployment provenance.

- [Member desktop, light](images/2026-11-01-sidebar-controls/desktop-light.png).
- [Administrator desktop, dark](images/2026-11-01-sidebar-controls/desktop-admin-dark.png).
- [Member mobile WebKit, light](images/2026-11-01-sidebar-controls/mobile-webkit-light.png).
- [Administrator mobile WebKit, dark](images/2026-11-01-sidebar-controls/mobile-webkit-admin-dark.png).
- [Focused session setting](images/2026-11-01-sidebar-controls/session-setting.png).

 Playwright runs on
the development machine at admin.crucio.cz, with isolated fixtures and no live
account changes. Browser fixtures are not a live API authorization audit.
Touched older browser specifications are adopted into strict TypeScript coverage
instead of refreshing deferred hashes. Existing assertions follow the relocated
controls while preserving single-click/tap, focus and viewport checks.

Terminology reference: locked vpsAdmin input
`a65a4dfeb92a59df4a80a737a20bcbf8558793ff`; both localization procedures and
the Czech guide were read. Existing localized strings are reused. The separate
KB contracts/capture repository is unavailable in this workspace; external KB
navigation/screenshots are not certified by these tests.
