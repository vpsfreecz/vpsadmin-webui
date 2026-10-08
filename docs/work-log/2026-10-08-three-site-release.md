# October WebUI fixes: three-site release (2026-10-08)

The maintainer authorized merging all ten discussed PRs and deploying the latest
combined release to dev.crucio.cz, clankerdev.vpsfree.cz and newadmin.vpsfree.cz.
Scope: PR19, PR24–29 and PR31–33. This includes network availability, stable
payment QR images, accessible review errors, mobile focus and pagination fixes,
stronger CI fixtures, incident creation context, all overview IP addresses, and
direct payment links from member details. No API/database changes are included.

## Preparation

Each selected PR head has green CI and browser checks. The integration preserves
all feature commits/authors. Conflicting requirements and workflow sections are
combined; E2E manifests retain the union of all adopted tests (43 checked,
211 deferred). The final combined candidate must pass checks before promotion.

Read-only preflight found newadmin and clankerdev on clean `78a723f7` and dev on
clean QR-fix release `9d560424`. Newadmin is generation 8. Dev's root is full;
all isolated staging remains on /data. No credential, session store or API
configuration changes are planned. Dev is the first deployment/test target,
followed by clankerdev and the scoped newadmin confctl target. Existing release
pairs/generation will be retained for rollback.

This entry records preparation, not completed deployment. Results follow once
verified. Browser fixtures do not certify real API mutations or physical devices.


## Verified candidate and dev canary

The selected integration is `e21d95c450b2121e3e3afef0a6f794c5e7dfacca`,
reviewed in [PR34](https://github.com/vpsfreecz/vpsadmin-webui/pull/34).
The feature heads are retained as ancestors, without rewriting their authors.
Pinned Node 24 checks passed: `npm run ci:quick`, 1,770 unit tests in 296 files,
226 script tests, 57 BFF tests, documentation audit and production build.
The older-host archive SHA256 is
`ae3466ff7061a261fae424f48a35d767268a1668ab65d56f50cbe6621d79784f`.
Its 1,167-file manifest and both provenance records were verified before activation.

Dev activated the paired release first. Its auth endpoint smoke check passed.
Against the actual deployed JavaScript, 99 mobile Chrome/WebKit scenarios and
16 desktop Chromium scenarios passed. Two mouse-only checks intentionally skip
in touch contexts. Coverage includes first-tap navigation/search/filter selection,
viewport resize, editable rejection errors, migration error recovery, incident
context and return paths, related VPS/export/DNS creation contexts, cursor
pagination, network availability, every overview IP/copy button, member payment
links, and loaded QR node identity during scroll/session activity.

These authenticated UI scenarios used synthetic HaveAPI and BFF session fixtures;
real API routes were blocked. No actual member incident, payment, migration or
network change was submitted. The QR fixture supplies synthetic images and a
test image CSP; the separate anonymous public probe checks the real site CSP.

Deployed dev captures with synthetic API fixtures:

- All overview IPs: [desktop](assets/release-20261008/dev-fixture-all-ips-desktop.png)
  and [mobile](assets/release-20261008/dev-fixture-all-ips-mobile.png).
- [Prefilled incident](assets/release-20261008/dev-fixture-prefilled-incident.png).
- [Direct member payment links](assets/release-20261008/dev-fixture-member-payments.png).
- [Mobile QR images](assets/release-20261008/dev-fixture-qr-mobile.png).


## Completed merge and deployment — 2026-10-08

PRs [19](https://github.com/vpsfreecz/vpsadmin-webui/pull/19),
[24](https://github.com/vpsfreecz/vpsadmin-webui/pull/24),
[25](https://github.com/vpsfreecz/vpsadmin-webui/pull/25),
[26](https://github.com/vpsfreecz/vpsadmin-webui/pull/26),
[27](https://github.com/vpsfreecz/vpsadmin-webui/pull/27),
[28](https://github.com/vpsfreecz/vpsadmin-webui/pull/28),
[29](https://github.com/vpsfreecz/vpsadmin-webui/pull/29),
[31](https://github.com/vpsfreecz/vpsadmin-webui/pull/31),
[32](https://github.com/vpsfreecz/vpsadmin-webui/pull/32),
[33](https://github.com/vpsfreecz/vpsadmin-webui/pull/33) and integration
[34](https://github.com/vpsfreecz/vpsadmin-webui/pull/34) merged at 20:21 CEST.
PR19 was marked ready before integration. Main was fast-forwarded to the exact
checked candidate after rechecking every head, ancestry, current main and all
six passing checks. GitHub confirmed each selected PR as merged.

All three sites serve clean paired frontend/BFF revision
`e21d95c450b2121e3e3afef0a6f794c5e7dfacca`:

| Site | Activation and checks | API origin |
| --- | --- | --- |
| dev.crucio.cz | Activated first; 115 focused browser scenarios and auth smoke passed | dev.crucio.cz |
| clankerdev.vpsfree.cz | Paired pointer activation; runtime and auth smoke passed | api.vpsfree.cz |
| newadmin.vpsfree.cz | Generation 9 at 20:22 CEST; seven confctl health checks and auth smoke passed | api.vpsfree.cz |

The generated configuration input commit
[`ca794e30c`](https://github.com/vpsfreecz/vpsfree-cz-configuration/commit/ca794e30c39251456b0c3348d99bab79ac7b3d20)
was published to configuration master after successful activation. Only the
WebUI input changed. The current site baseline also updates systemd 260.4 to
260.5, glibc 2.42-84 to 2.42-100, OpenSSL 3.6.4 to 3.6.5, Perl 5.42.0 to
5.42.3, and expat, groff, libgcrypt, libmicrohttpd, libpcap, pcre2 and unbound.
The closure difference and dry activation were reviewed before switching.
Only the WebUI host was deployed. No API host, database, OAuth client,
credential values or session-store configuration was changed.

Older hosts verified the archive manifest, previous live revision, runtime
configuration, preserved nginx/systemd hashes, BFF working directory and health.
Their previous hashed assets and release pairs were retained. Newadmin used
scoped `confctl deploy --dry-activate-first --enable-auto-rollback`, with
matching Nix frontend/BFF builds and provenance/source/package checks.

## Final CI and public verification

The exact candidate passed [CI](https://github.com/vpsfreecz/vpsadmin-webui/actions/runs/37821047741)
and [browser CI](https://github.com/vpsfreecz/vpsadmin-webui/actions/runs/37821047764)
before merge and production promotion. Browser results: 451 desktop Chromium,
392 mobile Chrome and 40 mobile WebKit passed. One mouse-only WebKit check was
intentionally skipped; no flaky/retry-only passes were reported.

Nine anonymous browser contexts (desktop Chromium, mobile Chrome and iPhone
WebKit on each host) passed after deployment. Checks covered the exact clean
revision, correct API origin, real public overview rendering, Czech/English
switching, responsive navigation, SPA deep-link HTTP routing, no horizontal
overflow and zero JavaScript page errors. On newadmin, the real CZ/SK QR
generator images decoded at 740 x 740 under the actual document CSP in all
three browsers, using synthetic amount/variable-symbol parameters. Console and
heatmap frame-source allowances were also verified. No response or document
headers were mocked in these anonymous probes.

[Sanitized public results](assets/release-20261008/results.json) and captures:

| Site | Desktop | Mobile Chrome | Mobile WebKit |
| --- | --- | --- | --- |
| Newadmin | [capture](assets/release-20261008/newadmin.vpsfree.cz-desktop.png) | [capture](assets/release-20261008/newadmin.vpsfree.cz-mobile-chrome.png) | [capture](assets/release-20261008/newadmin.vpsfree.cz-mobile-webkit.png) |
| Clankerdev | [capture](assets/release-20261008/clankerdev.vpsfree.cz-desktop.png) | [capture](assets/release-20261008/clankerdev.vpsfree.cz-mobile-chrome.png) | [capture](assets/release-20261008/clankerdev.vpsfree.cz-mobile-webkit.png) |
| Dev | [capture](assets/release-20261008/dev.crucio.cz-desktop.png) | [capture](assets/release-20261008/dev.crucio.cz-mobile-chrome.png) | [capture](assets/release-20261008/dev.crucio.cz-mobile-webkit.png) |

## Recovery and limitations

Newadmin retains generation 8 / `78a723f7` at
`/nix/store/17djsaqvchg53b3aq3h14k7rvbq3iqp2-nixos-system-vpsadmin-webui1-26.05.20261006.b253099`.
Active generation 9 is
`/nix/store/xifd6v1f598fjjlhaczmmrar9p9lqnpk-nixos-system-vpsadmin-webui1-26.05.20261008.7c8764b`.
Clankerdev retains paired `78a723f7`; dev retains paired `9d560424`.
Private deployment receipts record previous pointers. Follow the
[operations recovery procedure](../design/OPERATIONS.md), check live state first,
and preserve current refresh-token session files.

Dev's full root filesystem and certificate/SAN exception predate this release;
staging used /data and TLS verification was relaxed only for dev browser/auth
checks. New authenticated production OAuth login, physical-device behavior,
console/heatmap interaction and real API mutation workflows were not certified
by the anonymous/fixture tests. This does not establish a permanent no-error
guarantee. The receipt is a documentation-only follow-up; it does not change
the approved runtime source or require another deployment/input update.

The final pinned-shell documentation audit passed: 85 documents, 71 unique
requirements, 256 routes and 64 API modules. `git diff --check` passed.
