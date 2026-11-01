# Approved WebUI release excluding DNS PR116 — 1 November 2026

Status: prepared; no current main merge or activation claimed. The maintainer
approves all this chat's pending PRs except PR116 and requests deployment to
newadmin.vpsfree.cz, clankerdev.vpsfree.cz and dev.crucio.cz. DNS remains for
separate product review. Existing colleague PR63/74/115 are excluded.

## Approved source and boundaries

Retain the audit preview PR112 and approved original histories:

| PR | Original exact head |
| --- | --- |
| 102 | 3af0ae9b17904a96f7f3139deeb40fa7cfa93274 |
| 104 | 51c1fb6c59696916ef974c35e03b4ba0ab94aa71 |
| 105 | b723721725aef9fcb0e053490cad95b872548d94 |
| 106 | 135e2031f00d89cd7d524bf3af5ecd2f29d80d4f |
| 107 | dea423a3817c2752d77e3d74ccf373669058171a |
| 108 | 698fd549c29fc60b8691945d2e28d50406b45461 |
| 109 | 2895f24f024011a29feeb55077f5b269ca4f4f0f |
| 110 | 39ee1e6259bcd0395fc13f1b36dd57bde3252ce4 |
| 111 | a175c6a5e1513b871d0cd422abbe9573e53c61de |
| 112 | 455ea11f71a0783cd8ac1788e4ed1cc445c540c8 |
| 113 | e90be4264cce5a4acec4cb68d299245a95f7e468 |
| 114 | 6328f65be793cb483df797ac32efd375d9cc7c8a |
| 118 | a5c3aff088c4575c7de2c3091cb0a1336e66dfa1 |
| 119 | ffa6b5e99d2444492d7dea5461785aef8d95f144 |

All six GitHub checks passed at each selected original head before preparation.
PR112 is the cumulative audit integration/receipt, not an extra feature. PR117
contains PR116 and must not be used as the release source or merged wholesale.
The approved candidate starts at prior main 40653dff and retains these heads;
DNS source/catalog files are verified byte-identical to 40653dff. PR116's head
94fb440c and its new help component are absent. No substitute DNS wording fix
is included while that review is held.

Current main advanced independently to f2765d3f with three Jakub Skokan commits
adopting the released HaveAPI client. None is deployed on the inspected sites:
production reports clean 606a02c19f32 and dev reports clean f1cd437d7cbd. These
three unapproved new release changes are excluded from the application runtime
candidate. Preserve them on shared main when integrating our approved histories;
never force-push, revert or discard the colleague's work. The eventual main
merge wrapper may therefore have a different tree from this approved exact
release source. Pin the reviewed published runtime revision explicitly using
confctl, instead of silently following current main.

Configuration master also advanced independently (including OS/API inputs and
the new HaveAPI WebUI pin). Build the application-only deployment against the
verified currently running host configuration basis, retaining live OS/API pins.
Publish one generated WebUI-only input update on current configuration master,
preserving its concurrent changes. Recheck actual live state and active locks
before promotion; never overwrite another deployment based on stale snapshots.
No configuration-repository receipt, screenshot or test output is permitted.

## Preparation and verification plan

Build exact clean matching Nix frontend/BFF and provenance/source/package/module
checks on the development machine. Keep installs, builds and browser evidence in
isolated /data directories. Run combined quality, script/BFF/unit/build checks
and targeted desktop/mobile Chromium/mobile WebKit acceptance, then test served
bundles and real anonymous runtime/auth/wire behavior on each origin separately.
Fixture roles do not certify actual cross-member API permissions or DNS publish.
No production resource mutation is included in acceptance.

Validate candidate BFF configuration with existing systemd credentials; preserve
secrets, live sessions, callbacks, unrelated services and current nginx settings.
Apply only the metadata header correction required by PR108 on the older public
host. Retain exact paired rollback releases and the current newadmin generation;
use dev as canary, then the public older host and confctl-managed newadmin with
dry activation and automatic rollback. Source and deployment heads must be
rechecked immediately before activation/publication.

Root initially had only about 600 MiB free. The old native Playwright cache was
copied to /data, every entry/content verified, and its original path preserved by
a symlink before removing only the verified duplicate. This freed 1.58 GB while
retaining all cached browsers and links; the active container runner is separate.
No global Nix GC, generations, VM disks, shared queue or service state was deleted.

The existing offline dev DNS node and queued own zone11/chain406 remain outside
this release. Prior audit limits for positive NFS/payment/refresh/passkey/TLS
certification remain explicit. Record actual completed checks, runtime revision,
main merge, activation, rollback and published pin below after they happen.
