# Mobile interactions and localized transactions: three-site release

The maintainer authorized merging, deploying and testing the work from this
conversation on 2026-10-06. The selected candidate integrates PR20 (BFF
proxy-addr patch), PR21 (mobile interactions/forms) and PR22 (API transaction
labels and UI language negotiation). PR23 holds the integration and preserves
original feature commits/authorship. The unrelated network feature PR19 is
outside this release. No API, database or credential change is included.

## Preparation

Read-only preflight found newadmin on clean `02ac0c7de1a588dbb14a18e652fe3f7e9b45cc51`
(NixOS generation 7), and clankerdev/dev on paired
`f123a7fb825437034a764a8a5654032a481a8476`. These are the expected rollback
releases; recheck before activation. Existing credentials and sessions remain.
Dev has no free root space; all staging uses `/data`. Newadmin has ample space
and hosts the scoped NixOS build in an isolated configuration checkout.

The E2E adoption conflict was resolved by retaining both feature inventories:
34 checked files and 216 deferred. Initial integration CI caught formatting
of the merged lint/E2E manifests; corrected with pinned Prettier. Browser suites
and combined source verification run before promotion. No failed candidate
has been activated. Configuration will receive one final generated WebUI input
update through confctl, scoped to the existing UI host.

Preparation above records the pre-deployment state. The completed outcome follows.


## Completed outcome — 2026-10-06

PRs [20](https://github.com/vpsfreecz/vpsadmin-webui/pull/20),
[21](https://github.com/vpsfreecz/vpsadmin-webui/pull/21),
[22](https://github.com/vpsfreecz/vpsadmin-webui/pull/22) and
[23](https://github.com/vpsfreecz/vpsadmin-webui/pull/23) were merged at 22:03 CEST.
Main was fast-forwarded to the exact checked integration commit, retaining the
original authors and commits. All three sites now serve clean paired frontend
and BFF revision `78a723f7d8c609e05f9de7189ff35416747bafdc`.

| Site | Result | API origin |
| --- | --- | --- |
| dev.crucio.cz | Paired release activated first; canary checks passed | dev.crucio.cz |
| clankerdev.vpsfree.cz | Paired release activated; service and auth checks passed | api.vpsfree.cz |
| newadmin.vpsfree.cz | NixOS generation 8 at 22:10 CEST; seven health checks passed | api.vpsfree.cz |

The generated configuration input commit
[`ddf51c27`](https://github.com/vpsfreecz/vpsfree-cz-configuration/commit/ddf51c27ac8dc8b9b55d1e78bf67830c8e6a8a56)
was published to configuration master after activation. It changes only the
WebUI input. The existing site baseline also brings cpupower 6.18.54 to 6.18.55,
perf-linux 7.2.8 to 7.2.9, and the NixOS version/date update. These closure changes
were reviewed before activation. This deploy targets only the WebUI host; no API
host, database, OAuth client, credential or session-store change was performed.
The effective site API source input remains `b4ef8535a629ee8c9cd753afecdb05e0895d0eea`;
it is separate from the application's terminology-source pin.

## Verification

- Exact final revision [CI](https://github.com/vpsfreecz/vpsadmin-webui/actions/runs/37521416680)
  and [browser CI](https://github.com/vpsfreecz/vpsadmin-webui/actions/runs/37521416734)
  passed before merge and activation. Browser results: 423 desktop Chromium,
  364 mobile Chrome, and 28 mobile WebKit passed; one desktop-only check was
  intentionally skipped on WebKit. No retry-only passes were reported.
- Pinned-toolchain integrated verification: `npm run ci:quick`, 1,719 unit tests,
  226 script tests, 57 BFF tests, and production build passed. Production
  dependency audits passed; the BFF runtime contains proxy-addr 2.0.8.
- Matching Nix frontend/BFF builds and provenance/source/package checks passed.
  Scoped dry activation passed. Deployment used `--dry-activate-first` and
  `--enable-auto-rollback`; all seven confctl health checks passed.
- `deploy/smoke-auth-endpoints.sh` passed on all three public origins. Running BFF
  metadata/process paths were checked separately from public frontend provenance.
  Older-host nginx/systemd hashes stayed unchanged and live credentials/sessions
  were retained. Dev alone used its existing TLS certificate exception.
- 61 focused tests passed against the deployed dev JavaScript in mobile Chrome
  and mobile WebKit, with two desktop-only skips. These cover first-tap navigation,
  delayed search chunks, filter selection, viewport/keyboard resize, registration
  correction, migration error recovery, incident back-navigation, payment QR,
  and Czech/English transaction labels/language switching. API and session
  responses were synthetic browser fixtures; external real API routes were
  blocked. No production mutations were submitted. The temporary runner required
  its lockfile and BFF session fixture in addition to the normal source harness.

## Public browser evidence

Nine anonymous contexts (desktop Chromium, mobile Chrome and iPhone WebKit on
all three hosts) passed against the real public overview: exact clean revision,
API origin, Czech/English switching through the responsive navigation, SPA
HTTP routing, no document horizontal overflow, and zero JavaScript page errors.
On newadmin, both real CZ/SK generator images decoded at 740 x 740 under the
actual document CSP in all three browsers, using synthetic amount/variable-symbol
parameters. Console and heatmap frame-source allowances were also checked.
No document, headers or QR responses were mocked in this public probe.

The probe was corrected to use the actual public overview route and mobile
menu language controls; `/login` is not an application route. The initial probe
results were discarded and every context was rerun. This was a verification
harness correction, not a product change.

[Sanitized results](assets/release-20261006/results.json) and public captures:

| Site | Desktop | Mobile Chrome | Mobile WebKit |
| --- | --- | --- | --- |
| Newadmin | [capture](assets/release-20261006/newadmin.vpsfree.cz-desktop.png) | [capture](assets/release-20261006/newadmin.vpsfree.cz-mobile-chrome.png) | [capture](assets/release-20261006/newadmin.vpsfree.cz-mobile-webkit.png) |
| Clankerdev | [capture](assets/release-20261006/clankerdev.vpsfree.cz-desktop.png) | [capture](assets/release-20261006/clankerdev.vpsfree.cz-mobile-chrome.png) | [capture](assets/release-20261006/clankerdev.vpsfree.cz-mobile-webkit.png) |
| Dev | [capture](assets/release-20261006/dev.crucio.cz-desktop.png) | [capture](assets/release-20261006/dev.crucio.cz-mobile-chrome.png) | [capture](assets/release-20261006/dev.crucio.cz-mobile-webkit.png) |

## Recovery and limitations

Newadmin retains generation 7 / clean revision
`02ac0c7de1a588dbb14a18e652fe3f7e9b45cc51`. Its active generation 8 is
`/nix/store/17djsaqvchg53b3aq3h14k7rvbq3iqp2-nixos-system-vpsadmin-webui1-26.05.20261006.b253099`.
Both older hosts retain their previous paired
`f123a7fb825437034a764a8a5654032a481a8476` releases and private pointer receipts.
Use the [operations recovery procedure](../design/OPERATIONS.md), recheck live
state first, and preserve current refresh-token session files.

Dev's full root filesystem and certificate/SAN issue predate this release and
remain outstanding; its build/staging files were placed on `/data`. Unrelated
files and services were preserved. New authenticated production OAuth login,
console/heatmap interaction and real mutation workflows were not certified by
these anonymous/fixture checks. The initial confctl self-copy lacked forwarded
SSH access and was retried with the existing agent before activation; no private
key or credential was copied into a repository.

This receipt is a documentation-only follow-up and does not change the deployed
source or require a second input update.

The final documentation audit passed in the pinned remote development shell:
72 documents and 70 requirements, with the inventory at 256 routes/64 API
modules. `git diff --check` passed. The local audit attempt lacked the project's
TypeScript dependency; its result was superseded by the pinned-shell run.
