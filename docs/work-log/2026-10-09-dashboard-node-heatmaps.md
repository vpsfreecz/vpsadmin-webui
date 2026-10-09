# Dashboard node heatmaps (2026-10-09)

The maintainer requested the public overview's heatmap action in the authenticated
Cluster status widget (REQ-025/026). The dashboard now reuses NodeHeatmapProvider
and NodeHeatmapButton in both member and administrator views, with a conditional
column on desktop and icon action on mobile cards. It preserves compact density,
status summaries and node navigation.

The same configured HTTPS URL, node/storage eligibility, maintenance exclusions,
localized labels and dialog are reused; frames load only on explicit activation.
Missing/failed configuration leaves the cluster information usable. There are no
API, catalog or deployment changes. Existing Czech/English heatmap labels remain
unchanged (locked terminology revision a65a4dfeb92a59df4a80a737a20bcbf8558793ff).

The existing heatmap browser suite now covers both dashboard views, cs/dark and
en/light, one-tap activation, lazy external loading, closing/focus return and
missing/failed configuration. It also joins the mobile WebKit project.
The changed E2E file is adopted into strict TypeScript coverage (48 adopted,
208 deferred), including the exact inventory assertions. The first check correctly
required that adoption; the JSON was formatted with pinned Prettier. No compiler
or coverage checks were relaxed.

The initial WebKit run exposed an existing test assumption: pointer/touch
activation does not focus native buttons on WebKit. The final test still checks
one-tap opening, then separately activates by keyboard and checks that closing
returns focus to the trigger. No shared modal behavior was changed.

Implemented screenshots use synthetic nodes and an intercepted external iframe,
not live cluster data: [desktop dark](../design/images/dashboard-node-heatmaps/desktop-dark.png),
[desktop light](../design/images/dashboard-node-heatmaps/desktop-light.png),
[mobile](../design/images/dashboard-node-heatmaps/mobile-dark.png) and
[mobile dialog](../design/images/dashboard-node-heatmaps/mobile-dialog.png).
The candidate runs in a separate preview with its own dependency cache on the dev
build host, through a localhost tunnel. The public dev site was not replaced.
Status: prepared, not merged or deployed; external KB captures not republished.


## Verification

- The pinned Node 24 `ci:quick` checks passed: audits, lint/format and all
  TypeScript projects, including strict E2E adoption. The script and BFF suites
  passed (226 and 57 tests).
- The initial unrestricted unit run passed 1,768/1,770; two unrelated IP UI
  tests reached their existing 5-second timeouts under concurrent test load.
  The complete unchanged suite passed **1,770/1,770** across 296 files with
  `npm test -- --maxWorkers=2`. No timeouts or assertions were relaxed.
- Playwright `node_heatmaps.spec.ts` covers 48 cases across desktop Chromium,
  mobile Chrome and mobile WebKit. The first complete run passed 44; four
  stopped during initial application loading. Their traces contain zero
  heatmap-configuration requests, so the new provider had not run yet. All four
  passed in a separate single-worker `--last-failed` run (36 seconds), without
  code or timeout changes. This is 44 first-pass + 4 verified reruns, not a
  claim of a single clean 48-case run. Trace artifacts remain local to the task.
- `npm run build` passed (existing bundle-size warning only).
- `npm run audit:design-docs` passed with screenshot references; `git diff
  --check` passed. No declared hook framework or enabled Git hooks was found.

Prepared review branch: `dev/dashboard-node-heatmaps`. Fixture evidence certifies
frontend routing, rendering and interaction; it does not certify the live
external heatmap service or an actual cluster backend.
