# Full-width export management and stacked mount examples

Requirement: REQ-048. The maintainer requested a readable NAS export detail:
fstab, systemd and NixOS examples under one another, and allowed hosts in a
proper table instead of the narrow sidebar shown in the supplied screenshot.
Prepared on `dev/export-detail-layout` from `cce681424b866f6a51cbc0a1e4daa226ed33fc07`.
Not merged or deployed.

## Changes

- Detail sections now follow the same full-width flow: summary, allowed hosts,
  then mount instructions. This removes the 360px sidebar that previously forced
  even desktop host rows into the narrow-screen layout.
- The existing responsive host table keeps address, mode, flags and actions in
  columns on desktop. Narrow screens retain labeled rows and touch-sized actions.
  Automatic all-VPS access retains its notice and disabled Add host action.
- Mount command, fstab, systemd and NixOS examples stack at every viewport size.
  Each keeps its copy action, original generated text and local code overflow.
  Temporary snapshot exports still omit persistent configuration examples.
- Extracted mount presentation into `ExportMountInstructions` and removed the
  obsolete structural exception for `ExportDetailPage`; no baseline/budget was
  raised. API calls, permissions and mutation behavior are unchanged.
- No user-facing wording changed. Existing Czech/English labels are reused.

## Verification

- Node 24.21.0/npm 11.19.0 match the pinned toolchain. Nix is unavailable locally;
  `npm ci` was used with the matching Node runtime, without host deployment.
- `npm test`: 1,794 tests in 296 files passed.
- Focused Playwright export suites: 20 tests passed. Fixtures cover
  320/390px mobile and 1024/1280/1440/1920px desktop, long IPv6 addresses, host
  edit/delete dialogs, cancellation/rejected deletion, all-VPS access, snapshots,
  vertically ordered equal-width code blocks, and exact clipboard contents.
- The updated export layout spec is adopted into strict E2E type coverage and
  the mobile WebKit project. Desktop Chromium and mobile Chrome are also tested.
- Czech dark-theme full-page desktop/mobile screenshots are attached to the
  Playwright report by the all-VPS scenario. They use documentation-range IPs
  and synthetic fixture data; they are not production/live API evidence.
- `npm run ci:quick`, `npm run build` and `npm run audit:design-docs` passed.
- `npm run test:scripts`: 226 tests passed; `git diff --check` passed.
- No declared commit-hook framework or configured hooks path was found.

The KB navigation contract reviewed in the preceding task targets legacy PHP
sources, which this presentation change does not edit. This PR does not publish
KB screenshots or certify the live wiki. Next step is maintainer PR review.
