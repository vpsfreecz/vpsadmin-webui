# Console and navigation improvements: release preparation (2026-10-09)

The maintainer explicitly authorized merging PR35, PR36 and PR37 and deploying
all three sites, including newadmin.vpsfree.cz. The integration retains each
feature branch and its authors:

- [PR35](https://github.com/vpsfreecz/vpsadmin-webui/pull/35), `b726d919`:
  console lifecycle, root-password and rescue controls. Both toolbar rows share
  a starting column while retaining compact content-width desktop buttons.
- [PR36](https://github.com/vpsfreecz/vpsadmin-webui/pull/36), `2a9f8d82`:
  explicit administrator-view reminder when searching in the personal view.
- [PR37](https://github.com/vpsfreecz/vpsadmin-webui/pull/37), `1e4f08ed`:
  distribution metadata next to the owner in the VPS header.

Integration preserves all browser coverage, including the mobile WebKit union.
The strict E2E inventory now checks 47 files with 209 deferred. The combined
runtime passed `npm run ci:pr` in the pinned Node 24 shell, including 1,770 unit
tests in 296 files, script/BFF tests, audits, types and production build.
The final candidate must also pass GitHub checks before production promotion.

All three live sites were verified on clean paired release `e21d95c4` before
preparation. Newadmin is generation 9. Dev's existing full root filesystem
requires staging on /data. The previous paired releases and NixOS generation
are retained for rollback. The configuration baseline is `065ade419`; only the
WebUI input will be updated, and only the WebUI host will be deployed.

This entry records preparation, not completed deployment. Actual revisions,
checks and deployment outcomes will follow. Browser fixtures do not certify
real lifecycle mutations or physical devices. No API or credential change is
part of this release.

## Dev canary and combined verification

The candidate is `babdd7fb5b0533a2bbc4e2f683fb6f9a248fd7c7`, reviewed in
[integration PR38](https://github.com/vpsfreecz/vpsadmin-webui/pull/38).
Pinned checks passed: 1,770 unit tests, 226 script tests, 57 BFF tests, required
quick checks and production build. The 1,168-file older-host archive has SHA256
`eeb0e088f3ac460d3ba99f33cf6c1f4b20e539a32b9b48305dbfe847942584b5`.

Dev activated the matching frontend/BFF first; runtime config, both provenance
records, preserved service/nginx configuration hashes and auth smoke passed.
Against deployed JavaScript, 121 focused scenarios passed in desktop Chromium,
mobile Chrome and iPhone WebKit. Another 26 device-specific scenarios were
intentionally skipped. These cover first-touch interactions, console lifecycle
confirmation/password/rescue behavior, compact 32px desktop buttons and aligned
row starts, session/iframe preservation, console viewport, search scope reminder,
and distribution metadata in Czech/English and admin/personal views. Requests
used synthetic BFF/HaveAPI fixtures, with real API routes blocked. No real VPS
was started, stopped, restarted or put in rescue mode by these tests.

Three anonymous browser contexts also passed against dev with its real public
runtime configuration: public rendering, language switching, navigation, deep
links, no horizontal overflow and no JavaScript page errors.

Deployed dev screenshots with synthetic API fixtures:

| Scenario | Desktop | Mobile WebKit |
| --- | --- | --- |
| Compact aligned console controls | [capture](assets/release-20261009/console-desktop.png) | [capture](assets/release-20261009/console-mobile.png) |
| Search-scope reminder | [capture](assets/release-20261009/search-desktop.png) | [capture](assets/release-20261009/search-mobile.png) |
| Distribution metadata | [capture](assets/release-20261009/distribution-desktop.png) | [capture](assets/release-20261009/distribution-mobile.png) |

During newadmin preparation, the initial transport bundle was found to reference
an outdated local configuration branch. Its build was discarded before any
activation. Preparation was repeated from verified `065ade419`, generating input
commit `ae670dc0`; only the WebUI input changed. The generated commit and exact
parent were independently inspected before promotion.

The current-baseline newadmin build and its provenance/source/package checks
passed. `confctl deploy ... dry-activate` passed without changing the running
generation. Closure comparison retains the current system package versions;
only WebUI changes. The candidate system is
`/nix/store/likl39588mz6pj3gqh1s1cw846z09g4i-nixos-system-vpsadmin-webui1-26.05.20261008.7c8764b`.

## Completed merge and deployment

PRs [35](https://github.com/vpsfreecz/vpsadmin-webui/pull/35),
[36](https://github.com/vpsfreecz/vpsadmin-webui/pull/36),
[37](https://github.com/vpsfreecz/vpsadmin-webui/pull/37) and
[38](https://github.com/vpsfreecz/vpsadmin-webui/pull/38) merged at 14:12 CEST.
Immediately before fast-forwarding main, all selected heads, ancestry, current
main and every PR's six passing checks were revalidated. GitHub confirmed all
four PRs as merged. No feature history was rewritten.

The exact release passed [CI](https://github.com/vpsfreecz/vpsadmin-webui/actions/runs/37926787895)
and [browser CI](https://github.com/vpsfreecz/vpsadmin-webui/actions/runs/37926787813):
462 desktop Chromium, 403 mobile Chrome and 64 mobile WebKit tests passed, with
one intentional mouse-only WebKit skip. No flaky/retry-only passes were reported.

All three sites received paired clean frontend/BFF revision
`babdd7fb5b0533a2bbc4e2f683fb6f9a248fd7c7`:

| Site | Result | API origin |
| --- | --- | --- |
| dev.crucio.cz | Canary activation, 121 focused browser scenarios and auth smoke passed | dev.crucio.cz |
| clankerdev.vpsfree.cz | Paired activation, runtime verification and auth smoke passed | api.vpsfree.cz |
| newadmin.vpsfree.cz | Generation 10 at 14:13 CEST, seven confctl health checks and auth smoke passed | api.vpsfree.cz |

Configuration commit [`ae670dc0`](https://github.com/vpsfreecz/vpsfree-cz-configuration/commit/ae670dc0d4a5d43adf9560da1a6a0a35925cd2e5)
was published to master after successful activation. It updates only the WebUI
input from `e21d95c4` to the release. No other host was deployed. API/backend,
credentials, signing secrets and live session files were unchanged.

## Final public browser verification

Nine anonymous contexts (desktop Chromium, mobile Chrome and iPhone WebKit on
each site) passed after deployment. They verified the exact clean revision,
correct API origin, public rendering, language switching, responsive navigation,
SPA deep links, no horizontal overflow and zero JavaScript page errors.
On newadmin, CZK/EUR QR generator images decoded at 740 x 740 under the actual
CSP in all three browsers using synthetic payment parameters. Console and
heatmap frame-source allowances were present. These probes did not mock response
headers, documents, public runtime configuration or session endpoints.

[Sanitized results](assets/release-20261009/results.json) and captures:

| Site | Desktop | Mobile Chrome | Mobile WebKit |
| --- | --- | --- | --- |
| Newadmin | [capture](assets/release-20261009/newadmin.vpsfree.cz-desktop.png) | [capture](assets/release-20261009/newadmin.vpsfree.cz-mobile-chrome.png) | [capture](assets/release-20261009/newadmin.vpsfree.cz-mobile-webkit.png) |
| Clankerdev | [capture](assets/release-20261009/clankerdev.vpsfree.cz-desktop.png) | [capture](assets/release-20261009/clankerdev.vpsfree.cz-mobile-chrome.png) | [capture](assets/release-20261009/clankerdev.vpsfree.cz-mobile-webkit.png) |
| Dev | [capture](assets/release-20261009/dev.crucio.cz-desktop.png) | [capture](assets/release-20261009/dev.crucio.cz-mobile-chrome.png) | [capture](assets/release-20261009/dev.crucio.cz-mobile-webkit.png) |

Newadmin's BFF package metadata and actual process command independently match
the frontend's release. The NixOS system, nginx and BFF are active. The older
hosts' paired pointers and BFF working directories were checked independently
from their frontend provenance.

## Recovery and limits

All three sites retain paired `e21d95c4` for rollback. Newadmin retains generation
9 at `/nix/store/xifd6v1f598fjjlhaczmmrar9p9lqnpk-nixos-system-vpsadmin-webui1-26.05.20261008.7c8764b`.
Its active generation 10 is the candidate system recorded above. Older-host
private receipts retain both previous symlinks and configuration hashes. Follow
the [operations recovery procedure](../design/OPERATIONS.md) and recheck live
state before recovery. Preserve current refresh-token session files.

Dev's pre-existing full root filesystem and certificate/SAN exception remain;
staging used /data and only dev checks relaxed TLS verification. Browser
emulation does not certify physical devices. Authenticated production login and
real console/lifecycle mutations were not performed. This receipt is a
documentation-only follow-up; it does not require another runtime deployment.
