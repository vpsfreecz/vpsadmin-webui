# Selected evening release — 2026-10-16

The maintainer authorized deploying our PRs #49, #50, #51, #52 and #55 to
newadmin.vpsfree.cz, clankerdev.vpsfree.cz and dev.crucio.cz. Other contributors'
PRs #53 and #54 are explicitly excluded. The API is unchanged.

The integration branch starts at main b9358c81, above the running clean
4c4b715f release. It preserves the five PR histories. The two independent E2E
adoptions are reconciled as 55 adopted and 204 deferred files. PR51's stale
structural exception was reviewed and corrected before integration.

This is preparation, not deployment evidence. All three targets must retain
paired rollback artifacts and receive the exact approved clean revision after
checks pass. Configuration channel updates are authorized directly without a
separate configuration PR. Dev staging must use /data because its existing root
filesystem is full; its pre-existing TLS mismatch remains a dev-only exception.

## Verification and deployment evidence

The selected runtime is `2d089660638c8885fdd023b2537235df0c95b84b`, assembled in
[integration PR56](https://github.com/vpsfreecz/vpsadmin-webui/pull/56).
It contains the five approved PR histories; neither PR53 nor PR54 is an ancestor.

The failed [earlier PR51 CI](https://github.com/vpsfreecz/vpsadmin-webui/actions/runs/38906659506)
was a stale structural-debt record for the reviewed three-line About route
addition. Commit `fc750b75` refreshed that record without disabling the check.
Both the corrected PR and combined candidate pass all six required checks.
Every selected PR head and unchanged main were rechecked before main was
fast-forwarded at 21:59 CEST. GitHub confirmed PR49–PR52, PR55 and PR56 merged.

[Required CI](https://github.com/vpsfreecz/vpsadmin-webui/actions/runs/38956473672)
passed. [Browser CI](https://github.com/vpsfreecz/vpsadmin-webui/actions/runs/38956473992)
passed 505 desktop Chromium, 447 mobile Chrome and 109 mobile WebKit scenarios;
one mouse-only WebKit scenario was intentionally skipped. No retry-only passes
were reported.

The locked Nix development shell passed all quick audits/type checks, 1,829 unit
tests in 298 files, 226 script tests, 57 BFF tests and the production build.
Nix frontend/BFF builds plus provenance, source-content and package-content checks
passed. The older-host artifact has 1,171 manifest entries and SHA256
`f8fccb878f29bc7bb57dc19ae451d9c56662dda6c72f448d1c1d610b735c72b3`.

### Deployed dev browser checks

The focused suite ran against the actual dev frontend in desktop Chromium,
mobile Chrome and iPhone WebKit. It covers all four UI changes, QR images,
individual payment clipboard values in both languages, default/cleared/custom
hostnames, export mount snippets and the quiet build footer/About page.
Initially 95 scenarios passed and one additional WebKit instrumentation test
failed: its override of `navigator.locks.request` did not hold the intended gate,
so the fixture create completed before the test tried to edit the pending form.
Pinning the instrumented LockManager on `navigator` in the temporary test runner
made this scenario pass. This was a runner-only adaptation; deployed application
code was unchanged. This scenario is outside the repository's normal WebKit
project selection; the other hostname scenarios passed on WebKit unchanged.

Another 28 first-touch scenarios passed on mobile Chrome and WebKit, with two
mouse-only desktop-height cases intentionally skipped. They cover navigation,
account/tasks, focused-input search selection, filter suggestions, cancelable
failed confirmations and a scrolled form.

These tests use synthetic BFF/HaveAPI responses; fallback real API requests are
blocked. They do not certify real VPS creation or other mutations. Mobile browser
emulation does not certify physical devices. The temporary runner adapts BFF
bootstrap fixtures without changing deployed JavaScript.

[Sanitized browser result](assets/release-20261016-evening/dev-browser-results.json).
Deployed dev screenshots with synthetic data:

| Scenario | Desktop | Mobile WebKit |
| --- | --- | --- |
| Individual payment copies | [capture](assets/release-20261016-evening/payment-copy-chromium.png) | [capture](assets/release-20261016-evening/payment-copy-mobile-webkit.png) |
| Export mount copy placement | [capture](assets/release-20261016-evening/export-layout-chromium.png) | [capture](assets/release-20261016-evening/export-layout-mobile-webkit.png) |
| Empty hostname placeholder | [capture](assets/release-20261016-evening/hostname-default-chromium.png) | [capture](assets/release-20261016-evening/hostname-default-mobile-webkit.png) |

### Deployment outcome

All three targets serve the same clean runtime `2d089660638c8885fdd023b2537235df0c95b84b`.
Frontend provenance and the running BFF package/process were verified separately.
Dev and clankerdev retain unchanged nginx/systemd configuration hashes, private
credentials and live session stores. API code was not changed.

| Site | Outcome | API origin |
| --- | --- | --- |
| dev.crucio.cz | Canary, paired activation, auth smoke and deployed browser checks passed | dev.crucio.cz |
| clankerdev.vpsfree.cz | Paired activation, auth smoke and public browser checks passed | api.vpsfree.cz |
| newadmin.vpsfree.cz | NixOS generation 13, all seven confctl health checks, auth smoke and public browser checks passed | api.vpsfree.cz |

Nine independent anonymous browser contexts used real public config/session/API
endpoints across the three sites. Revision checks, CS/EN switching, mobile menu
navigation, news and About deep links, overflow checks and zero JavaScript page
errors passed. [Sanitized results](assets/release-20261016-evening/public-results.json).
Public newadmin captures: [desktop](assets/release-20261016-evening/newadmin.vpsfree.cz-desktop.png),
[mobile Chrome](assets/release-20261016-evening/newadmin.vpsfree.cz-mobile-chrome.png),
[mobile WebKit](assets/release-20261016-evening/newadmin.vpsfree.cz-mobile-webkit.png).

Newadmin was built and dry-activated, then switched using
`confctl deploy --yes --dry-activate-first --enable-auto-rollback
cz.vpsfree/vpsadmin/int.vpsadmin-webui1 switch`. The active system is
`/nix/store/qgagqsv23cv2x215id8j6snv5k4046r5-nixos-system-vpsadmin-webui1-26.05.20261015.26f4107`.
Closure review showed the application-only update; no other host was deployed.
Its running BFF is from
`/nix/store/la13vi7v6mglmxsdsr1iixr7q3jdv90z-vpsadmin-webui-bff-0.1.0`.

The generated configuration commit
[`9105d416`](https://github.com/vpsfreecz/vpsfree-cz-configuration/commit/9105d416f1a5c7df55d6d7f49bb94aa83659b1b5)
updates only the WebUI input from `4c4b715f` to this release. It is pushed directly
to configuration master, as authorized. Because the build host had no HTTPS
push credential, the exact generated commit was transferred by Git bundle and
pushed using the existing local authenticated remote after verifying ancestry.
No shared dirty checkout was altered.

### Recovery and limits

Dev and clankerdev retain the paired `4c4b715f` release and private promotion
receipts. Newadmin retains generation 12 at
`/nix/store/8355pmqk1y8m5q25b86d3rafs41a41lc-nixos-system-vpsadmin-webui1-26.05.20261015.26f4107`.
Inspect the current state before using the documented rollback procedure and
preserve live refresh-token sessions. Automatic rollback was enabled for NixOS
activation; older-host promotion restores both pointers on failed health checks.

Dev's pre-existing full root filesystem and TLS mismatch remain. All new dev
staging used /data; TLS exceptions were limited to dev. Authenticated production
login and real lifecycle/storage mutations were not performed. Other contributors'
PR53, PR54 and the newly opened PR57 remain unmerged and undeployed. This completion
entry and its screenshots are documentation only and do not require a runtime
redeploy or another channel update.
