# 2026-09-30 — Deploy the approved eight-PR release

The maintainer explicitly requested merging WebUI PRs 1–8 and deploying them to
newadmin.vpsfree.cz, clankerdev.vpsfree.cz and dev.crucio.cz. All eight PRs were
merged on 2026-09-30 at 19:00:44 UTC, retaining their commits and authors.

## Included changes

| PR | Result |
| --- | --- |
| [1](https://github.com/vpsfreecz/vpsadmin-webui/pull/1) | Expanded, labelled desktop navigation; mobile drawer retained. |
| [2](https://github.com/vpsfreecz/vpsadmin-webui/pull/2) | Remove password reset from public navigation. |
| [3](https://github.com/vpsfreecz/vpsadmin-webui/pull/3) | Keep personal account data scoped to its owner. |
| [4](https://github.com/vpsfreecz/vpsadmin-webui/pull/4) | Fit the VPS console and keyboard into the viewport. |
| [5](https://github.com/vpsfreecz/vpsadmin-webui/pull/5) | Restore missing IP/DNS global-search matches and scrolling checks. |
| [6](https://github.com/vpsfreecz/vpsadmin-webui/pull/6) | Correct private IPv4 availability for staging VPSes. |
| [7](https://github.com/vpsfreecz/vpsadmin-webui/pull/7) | Show accepted VPS detail while creation continues. |
| [8](https://github.com/vpsfreecz/vpsadmin-webui/pull/8) | Align account-change review with registration layout. |

The deployed application revision is
`718cf7596eb8b11a796268a73c1f2e0a02a98450` on all three hosts. This subsequent
receipt is documentation only; it does not change the deployed revision.

## Integration and verification

Conflict resolution preserves the complete work logs, unions adopted E2E
coverage, and combines the compact console layout with the creation banner.
The first integration candidate, `9af8590`, failed CI after an incorrect conflict
resolution truncated layout/log content. The full three-way content was restored
and checked before main was updated. That candidate was never deployed.

The final exact revision passed:

- [CI 36760494754](https://github.com/vpsfreecz/vpsadmin-webui/actions/runs/36760494754).
- [Desktop/mobile E2E 36760498777](https://github.com/vpsfreecz/vpsadmin-webui/actions/runs/36760498777).
- Pinned Linux `nix develop` / `npm run ci:pr`: 1,643 unit tests, 57 BFF tests,
  222 script tests, types, lint, audits and production build.
- 38 additional targeted desktop fixture cases for the sidebar, preferences,
  owner scope, console, cold-start search, private IPv4 and VPS creation.
- Newadmin Nix frontend/BFF build plus `provenance`, `source-contents` and
  `package-contents` checks; confctl dry activation and all seven deployment
  health checks.

After activation, all three public origins passed auth/health smoke checks and
anonymous desktop/mobile Chromium checks. The six browser runs verified the
exact clean build SHA, config schema, environment-specific API origin, anonymous
session fields, rendered content, deep-link loading, no page errors and no
horizontal overflow. Actual screenshots and sanitized results are retained in
operator evidence. Newadmin's running BFF package metadata separately matched
the frontend revision; its CSP retains the console/heatmap frame origins without
adding the console to `connect-src`.

## Deployment and recovery

Newadmin used the existing configuration repository and confctl target
`cz.vpsfree/vpsadmin/int.vpsadmin-webui1`. The single generated input update
[ee99382c](https://github.com/vpsfreecz/vpsfree-cz-configuration/commit/ee99382c8c448a15347052a6964030f838cb0381)
changes only the WebUI pin and was pushed to configuration `master` after
successful deployment. Generation 5 replaced generation 4. The existing
[newadmin operations runbook](https://github.com/vpsfreecz/vpsfree-cz-configuration/blob/master/docs/operations/newadmin-webui.md)
remains the deployment/recovery entry point.

The two older hosts received the same reviewed build artifact and matching BFF
runtime dependencies. Their BFF services now load the three existing secrets
through systemd credentials; the old values and live session stores were
preserved. Nginx now routes `/config.json` to the BFF. Staging and runtime
configuration validation preceded the paired frontend/BFF switch. Existing static
assets were retained for open tabs. No backend/database migration was required.
Dev keeps its isolated test API and loopback OAuth token/revoke routes in
`legacy-test` mode; the two public API sites use production mode.

Retained rollback material includes newadmin generation 4 (previous source
`534caa83a5f97d2b40b4a126886649b14dc9e8d3`) and the paired frontend/BFF,
nginx configuration and environment files for the older sites (previous source
`156a7c043e543b5f4a51fc962d16e31bd6eaa00f`). Restore the matching runtime and
configuration together, retaining current session files and signing secrets.
Private paths and activation receipts are in the operator handoff, not this log.

## Limits and follow-up

Browser regression cases use synthetic fixtures; live checks were anonymous.
Interactive login, authenticated console/heatmap use and real VPS lifecycle
operations were not performed in this deployment. This is not full live beta
certification.

The dev root filesystem was already full. Inactive retained releases/backups
were moved to its large data filesystem with compatibility symlinks; active
releases and other contributors' processes were preserved. The root filesystem
still has only about 269 MiB available and needs separate capacity cleanup.
Dev's pre-existing self-signed certificate/SAN issue remains; HTTPS verification
was relaxed only for that development origin. Public TLS checks passed normally.

Other checkouts' pending changes were preserved. Autonomous development and
scheduled issue runners remain paused.
