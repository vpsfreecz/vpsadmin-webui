# Approved PRs 9–17: completed three-site release

The maintainer explicitly requested merging and deploying all work from this
conversation to newadmin.vpsfree.cz, clankerdev.vpsfree.cz and dev.crucio.cz.

The candidate combines PR9 (registration reason presets), PR10 (migration feedback
and options), PR11 (transaction operation names), PR12 (migration node picker),
PR13 (maintainer handbook), PR14 (incident width), PR15 (payment QR codes), and
PR16 (stale application review queue). All original commits and authors are
retained. The overlapping requirement rows combine transaction and incident
behavior, and E2E adoption lists are united rather than choosing one branch's
coverage. No backend/API/database migration is included.

PRs 9–15 passed their original GitHub checks. The first PR16 full browser run
exposed an older smoke spec still asserting the removed queue count. That spec
was corrected in PR16 and all four request/payment desktop/mobile cases passed;
its new CI run is pending. The integrated candidate must pass its own checks
before promotion.

Read-only preflight found all three sites still running clean revision
`718cf7596eb8b11a796268a73c1f2e0a02a98450`. Dev's root filesystem has only about
53 MiB available; release staging stays on its spacious data filesystem.
Newadmin and clankerdev have ample free space. Existing credentials and live
sessions will be retained. The prior matching frontend/BFF and NixOS generation
are the rollback targets; historical pre-cutover helpers are not rerun.

Preparation above describes the pre-deployment state. The completed outcome
is recorded below.


## Completed outcome — 2026-10-03

PRs [9](https://github.com/vpsfreecz/vpsadmin-webui/pull/9),
[10](https://github.com/vpsfreecz/vpsadmin-webui/pull/10),
[11](https://github.com/vpsfreecz/vpsadmin-webui/pull/11),
[12](https://github.com/vpsfreecz/vpsadmin-webui/pull/12),
[13](https://github.com/vpsfreecz/vpsadmin-webui/pull/13),
[14](https://github.com/vpsfreecz/vpsadmin-webui/pull/14),
[15](https://github.com/vpsfreecz/vpsadmin-webui/pull/15),
[16](https://github.com/vpsfreecz/vpsadmin-webui/pull/16) and the necessary
CI-only [17](https://github.com/vpsfreecz/vpsadmin-webui/pull/17) were merged
at 13:38 UTC. Main was fast-forwarded to the tested integration revision,
preserving every original commit and author. Legacy PR528 and PR530 are
represented by the reviewed ports in PR12 and PR13; the old repository's PRs
were not closed or modified by this release.

All three sites then received the same clean application revision
`f123a7fb825437034a764a8a5654032a481a8476`:

| Site | Deployment result | API |
| --- | --- | --- |
| newadmin.vpsfree.cz | NixOS generation 6, seven confctl health checks passed | api.vpsfree.cz |
| clankerdev.vpsfree.cz | Matching frontend/BFF pointers activated; service healthy | api.vpsfree.cz |
| dev.crucio.cz | Matching frontend/BFF pointers activated; service healthy | dev.crucio.cz |

The generated configuration commit
[`b66c929b`](https://github.com/vpsfreecz/vpsfree-cz-configuration/commit/b66c929bb7c202ad31bd8994a691ade14c40ebf0)
was published to configuration master after successful activation. It changes
only the WebUI input in `flake.lock`, based on `2a3e6a97`. Exactly one final input
update was published. The earlier candidate pin remained private and was never
activated. The existing configuration baseline also brought OpenSSL 4.0.2 to
4.0.3 and a NixOS version/date update; these were reviewed before dry activation.
No API, database, OAuth client or credential change was introduced.

## Verification and CI repairs

- Pinned Node 24.21.0/npm 11.19.0 `npm run ci:pr`: 1,699 unit, 226 script and
  57 BFF tests passed, along with types, audits and production build on the
  integrated product source. The final CI-only follow-up does not alter runtime
  source, public assets, BFF, packages or the flake lock.
- 124 focused product browser cases passed across desktop/mobile, including
  registration presets, migration lifecycle, transactions, incidents, payment
  QR images, queue navigation and returning through browser history. Six
  metrics-token cases passed after the fixture clock repair.
- Final exact-revision [CI run](https://github.com/vpsfreecz/vpsadmin-webui/actions/runs/37125725768)
  and [full browser run](https://github.com/vpsfreecz/vpsadmin-webui/actions/runs/37125727609)
  succeeded before merge/activation. Mobile: 336 passed. Desktop: 418 passed
  immediately and one dataset snapshot pagination test passed on retry. The
  retained failing-attempt trace is CI evidence of that intermittent test;
  this release does not claim to have fixed it.
- PR16 corrected an older smoke assertion that still expected the removed
  remaining-queue count. The next run exposed an unrelated date-dependent
  metrics token fixture: its fixed last-used date crossed 90 days at noon UTC
  on 2026-10-03. PR17 fixes the test clock while preserving working timers and
  explicitly types the fixtures. No failed candidate was activated.
- Final Nix frontend/BFF builds and provenance/source/package checks passed.
  Dry activation passed, followed by all seven deployment health checks.
- Auth endpoint smoke passed on all three origins. Six anonymous Chromium
  contexts (1366px desktop / 393px mobile) checked exact clean revision,
  config schema/API separation, anonymous session shape, assets, SPA deep links,
  absence of horizontal overflow and page errors. Newadmin's console/heatmap
  frame CSP passed. Dev alone used the existing certificate exception.

The [sanitized browser results](screenshots/2026-10-03-release/results.json)
and reviewed captures are from the deployed public pages, without authenticated
production details:

| Site | Desktop | Mobile |
| --- | --- | --- |
| Newadmin | [capture](screenshots/2026-10-03-release/newadmin.vpsfree.cz-desktop.png) | [capture](screenshots/2026-10-03-release/newadmin.vpsfree.cz-mobile.png) |
| Clankerdev | [capture](screenshots/2026-10-03-release/clankerdev.vpsfree.cz-desktop.png) | [capture](screenshots/2026-10-03-release/clankerdev.vpsfree.cz-mobile.png) |
| Dev | [capture](screenshots/2026-10-03-release/dev.crucio.cz-desktop.png) | [capture](screenshots/2026-10-03-release/dev.crucio.cz-mobile.png) |

## Recovery and limits

The retained previous paired application revision is
`718cf7596eb8b11a796268a73c1f2e0a02a98450` on every host. Newadmin's rollback is
NixOS generation 5; its new system is
`/nix/store/jpwfiwa9b6b6zrp00f72r535n07lpxf9-nixos-system-vpsadmin-webui1-26.05.20261002.774debe`.
Older hosts retain their previous frontend and BFF pointers in private receipts.
Existing credentials and session storage were retained; no session backup was
restored. Older-host nginx and systemd configuration hashes stayed unchanged.
Follow the [operations recovery procedure](../design/OPERATIONS.md)
and inspect current state before any rollback.

Authenticated production mutations, new real OAuth login, console/heatmap
interaction and complete live API workflow certification were not performed.
Fixture E2E and anonymous checks do not establish those outcomes. A transient
HaveAPI server error reported by the maintainer recovered before this deployment,
while the previous release was still running; its exact cause was not confirmed.

Dev's pre-existing nearly full root filesystem (about 53 MiB free at preflight)
and certificate/SAN issue remain outstanding. All release staging/builds there
used `/data`; unrelated files and services were not removed or changed.

This receipt and requirement-status updates are documentation-only follow-up
commits. They do not change the deployed application revision or require another
configuration input update. The final `npm run audit:design-docs` passed
(66 documents, 70 requirements); `git diff --check` also passed.
