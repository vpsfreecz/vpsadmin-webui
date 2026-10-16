# Three-site release preparation — 2026-10-16

The maintainer authorized merging all eight open WebUI PRs and deploying the
combined release to dev.crucio.cz, clankerdev.vpsfree.cz and newadmin.vpsfree.cz.
The API is unchanged. Configuration channel updates may be committed and pushed
directly without a separate PR, as explicitly instructed by the maintainer.

## Selected application changes

- #40: compact search scope reminder only after an empty result.
- #41: dashboard node heatmaps.
- #42: Nodes navigation and routes restricted to administrator view.
- #43: compact public news.
- #44: independent Czech and English news fields.
- #45: inline or saved initialization templates for VPS creation/reinstallation.
- #46: full-width export hosts and vertically stacked mount examples.
- #47: export owner filtering and navigation from member detail.

Integration starts from main `cce681424b866f6a51cbc0a1e4daa226ed33fc07`.
Merge commits retain the feature histories. Shared documentation and browser
configuration are reconciled to preserve both export changes and all adopted
browser tests. Heatmap tests use `/admin/nodes` after the access restriction.
The combined strict E2E manifest contains 53 adopted and 205 deferred files.

## Preparation and rollback

No target has been updated at this stage. Required checks and the combined
production build must pass before promotion. The older hosts retain release
`babdd7fb5b0533a2bbc4e2f683fb6f9a248fd7c7` as their paired frontend/BFF rollback.
Newadmin currently uses NixOS generation 11, with the current configuration
channel pointing to `cce681424b866f6a51cbc0a1e4daa226ed33fc07`.
Revisions will be rechecked immediately before each activation.

Dev's root filesystem is full; staging uses `/data`. Its existing test API,
credential files and sessions are preserved. Dev also retains its existing TLS
certificate mismatch. Tests using synthetic browser fixtures will be identified
separately from live endpoint checks.

Actual build, CI, deployment and verification results will be appended after
completion. This preparation record is not evidence of deployment.

## Completed verification and merge

The exact release is `4c4b715f3a42b9f236273f1e4705b9fe5755fb23`, reviewed in
[integration PR48](https://github.com/vpsfreecz/vpsadmin-webui/pull/48).
All six required checks passed on every selected PR and the combined source.
Immediately before merge, all nine heads, ancestry and unchanged main were
verified. Main was fast-forwarded at 13:38 CEST; GitHub confirmed PR40–PR48 merged.

[Required CI](https://github.com/vpsfreecz/vpsadmin-webui/actions/runs/38892977096)
passed audits, types, production build, 1,810 unit tests in 297 files, 226 script
tests, 57 BFF tests and Chromium script regressions.
[Browser CI](https://github.com/vpsfreecz/vpsadmin-webui/actions/runs/38892977157)
passed 489 desktop Chromium, 431 mobile Chrome and 101 mobile WebKit tests;
one mouse-only WebKit test was intentionally skipped. No retry-only passes
were reported.

The pinned Nix development shell independently passed the required quick checks,
script/BFF/unit suites and production build. The builder initially lacked Python
for the deployment-smoke script tests; rerunning the suites with Python supplied
by the same pinned nixpkgs succeeded. No application change was needed.
Nix frontend/BFF packaging and provenance, source-content and package-content
checks passed. The older-host artifact contains 1,170 manifest entries and has
SHA256 `e117cf9ea6d5afe4afa41c58fd7c57e1224f9362960e7cabcb9b9b2817657ed9`.

## Deployment outcome

All three sites serve the same clean release, with frontend and running BFF
provenance verified independently:

| Site | Outcome | API origin |
| --- | --- | --- |
| dev.crucio.cz | Canary activated; paired pointers, process cwd, configuration hashes and auth smoke passed | dev.crucio.cz |
| clankerdev.vpsfree.cz | Paired activation; process cwd, configuration hashes and auth smoke passed | api.vpsfree.cz |
| newadmin.vpsfree.cz | NixOS generation 12 activated at 13:39 CEST; all seven confctl health checks and auth smoke passed | api.vpsfree.cz |

Newadmin was built and dry-activated before its final
`confctl deploy --yes --dry-activate-first --enable-auto-rollback
cz.vpsfree/vpsadmin/int.vpsadmin-webui1 switch`. The active system is
`/nix/store/8355pmqk1y8m5q25b86d3rafs41a41lc-nixos-system-vpsadmin-webui1-26.05.20261015.26f4107`.
Closure review showed the WebUI change and Nix 2.34.8 → 2.34.9 from the already
updated configuration baseline; no other host was deployed. Its BFF package is
`/nix/store/hgdkx5gmbb7nf4gmpc4hsrm7y6n3fgwr-vpsadmin-webui-bff-0.1.0`.

The generated configuration commit
[`ae98e9db`](https://github.com/vpsfreecz/vpsfree-cz-configuration/commit/ae98e9dbf05cd3f6b2d0c32255a4cb2d58c3865b)
updates only `vpsadminWebui` from `cce68142` to the release. It was pushed directly
to master after verification, as authorized. API code, credential values and
live session files were unchanged. Shared dirty checkouts were preserved.

## Deployed browser evidence

Against the actual dev build, 197 focused scenarios passed in desktop Chromium,
mobile Chrome and iPhone WebKit; 16 device-specific scenarios were intentionally
skipped. They cover all eight changes and first-touch navigation, search,
confirmation dialogs and scrolled forms. These tests use synthetic BFF/HaveAPI
responses with fallback API requests blocked; they do not certify real VPS or
export mutations. The temporary runner adapts BFF bootstrap fixtures without
changing deployed JavaScript. [Sanitized result](assets/release-20261016/dev-browser-results.json).

Nine separate anonymous browser contexts used real public runtime, session and
API endpoints on the three sites. All passed revision/API-origin checks, public
rendering, language switching, mobile navigation, news deep links, horizontal
overflow checks and zero JavaScript page errors.
[Sanitized results](assets/release-20261016/public-results.json).

Deployed dev screenshots with synthetic data:

| Scenario | Desktop | Mobile WebKit |
| --- | --- | --- |
| Export hosts and stacked mount examples | [capture](assets/release-20261016/export-layout-chromium.png) | [capture](assets/release-20261016/export-layout-mobile-webkit.png) |
| Export owner filter | [capture](assets/release-20261016/export-owner-chromium.png) | [capture](assets/release-20261016/export-owner-mobile-webkit.png) |

Public newadmin captures: [desktop](assets/release-20261016/newadmin.vpsfree.cz-desktop.png),
[mobile Chrome](assets/release-20261016/newadmin.vpsfree.cz-mobile-chrome.png),
[mobile WebKit](assets/release-20261016/newadmin.vpsfree.cz-mobile-webkit.png).

## Recovery and limits

Dev and clankerdev retain paired `babdd7fb` releases and private promotion
receipts. Newadmin retains generation 11 at
`/nix/store/170bj31wn03rwzwgjyhxljjzmjz0vkwk-nixos-system-vpsadmin-webui1-26.05.20261012.7993f34`.
Use the documented recovery procedure after inspecting current state; preserve
live refresh-token sessions. Automatic rollback was enabled during activation.

Dev's existing full root filesystem and TLS certificate mismatch remain. Staging
used `/data`, and only dev browser/endpoint checks relaxed TLS verification.
Browser emulation does not certify physical devices. Authenticated production
login and real lifecycle/storage mutations were not performed. This completion
entry and its evidence are documentation only and require no runtime redeploy.
