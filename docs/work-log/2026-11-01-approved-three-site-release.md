# Approved WebUI release excluding DNS PR116 — 1 November 2026

Status: completed; selected histories merged and all three sites verified. The maintainer
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

## Verified candidate and main integration

The published runtime is clean `70bd11d983e7dfd11f99604791ad68562807ee2e`.
It passes ci:quick, 230 script tests, 58 BFF tests, the production build, all
1,930 unit tests and six Nix frontend/BFF/provenance/source/package/module
checks. The first unit run passed 1,929 tests with one LookupCombobox option
arrival timeout during concurrent builds. All three examples in that file then
passed separately, followed by the complete unchanged 1,930-test suite with
one worker. No application assertion, debounce or test timeout was weakened.

The exact immutable package passes 150 targeted browser examples across desktop
Chromium, mobile Chromium and mobile WebKit, with zero retries; 18 cases are
explicitly inapplicable to their pointer/device configuration and skipped.
Coverage includes numeric-owner search, bounded primary-location pagination,
VPS-first routing, synchronous ownership verification/mismatches, package dates
and bulk removal, bounded account menus, responsive transaction details, network
confirmation feedback and first-touch navigation. Browser data is synthetic.
The first HTTP loopback attempt was rejected by the required HTTPS bootstrap.
A Python TLS staging server then caused Chromium resource retry failures;
the same unmodified artifact passes behind an isolated loopback nginx instance.
These harness failures are retained in evidence rather than hidden as UI passes.

Integration PR121 is based on independently advanced main f2765d3f, preserving
its HaveAPI client and XHR fixture. Only the appended ownership tests were
adapted to that fixture. Recomputed merged frontend npm hash is
`sha256-TlJjsHvAx/4mNyWUfOa6OguUg4kgwK7aHw6KjhUIkRo=`. The clean integration
b867de20 passes ci:quick, 232 script tests, 58 BFF tests, 1,960 unit tests,
a production build and all six Nix checks. This integration is not the deployed
runtime: main's new HaveAPI changes remain excluded from release 70bd11d9.

Fresh production-only npm audits of both source variants and their BFF report
zero findings. A new moderate minimatch globparts amplification advisory,
[GHSA-g3hv-75wg-m249](https://github.com/advisories/GHSA-g3hv-75wg-m249), affects
the development linter tree with 12 propagated package findings. It is not in
the deployed production dependency trees. Do not repeat the historical PR105
zero-full-tree result as a current claim; no broad npm downgrade or unrelated
unreviewed dependency update was included in this release.

Dev was activated as the canary after all runtime gates and all 84 original PR
checks passed. Its matching frontend/BFF is now 70bd11d9; metadata policy,
anonymous session redaction, cross-site session and GET logout denial passed.
Anonymous desktop/mobile Chromium/mobile WebKit checks passed for build identity,
API separation, About, first-tap menus/language, assets, JS errors and admin
route denial. Its full served-feature acceptance is still running. Main PR121
and production activation remain pending until the corresponding gates finish.


## Completed review, activation and publication

All 84 exact-head original checks and six integration checks passed before
[PR121](https://github.com/vpsfreecz/vpsadmin-webui/pull/121) was merged as
`1a7fed69a7dedd642b70aef1784f766b43a9fd32`. Its tree exactly equals reviewed
b867de20. All 14 selected original PRs are marked merged. The dependent PR110,
113, 114 and 118 were recognized after normal fast-forward updates of their
own already-integrated base branches to retained approved commits; no history
was rewritten and no additional application commit was introduced. PR63, 74,
115, 116 and 117 remain open and unmerged. The source/runtime distinction above
is intentional: independently merged HaveAPI work remains on shared main but
is not newly released to these sites.

| Site | Actual clean frontend and BFF | Served fixture checks | Real public contexts |
| --- | --- | --- | --- |
| dev.crucio.cz | 70bd11d983e7dfd11f99604791ad68562807ee2e | 150 passed, 18 device-inapplicable skipped | 3 passed |
| clankerdev.vpsfree.cz | 70bd11d983e7dfd11f99604791ad68562807ee2e | 51 passed, 3 device-inapplicable skipped | 3 passed |
| newadmin.vpsfree.cz | 70bd11d983e7dfd11f99604791ad68562807ee2e | 51 passed, 3 device-inapplicable skipped | 3 passed |

All served browser checks ran on the development machine, with zero retries.
The production subset covers the same release's owner search, primary-location
pagination, VPS-first assignment and owner readback, member package dates/bulk
removal, bounded account controls, transaction detail layout, network rejection
feedback and first-touch navigation. Public checks use real endpoints and no
member session; fixture feature checks intercept API responses and cannot
certify live write permissions. No production VPS/IP/package mutation was used.
Auth endpoint smoke and exact metadata/session/cross-site/logout checks pass on
all three origins. Metadata Cache-Control has one host-appropriate no-store
policy (BFF-owned on newadmin, nginx-owned on older hosts), and CORP/nosniff are
singular. Correct same-origin fetch metadata is required for session reads;
missing or cross-site context is rejected. The helper was aligned to those
existing host contracts, rather than relaxing an application guard.

The dev pair preserves the API, supervisor and unrelated kra BFF process IDs
and configuration hashes. Clankerdev changes only its paired release pointers
and nine metadata proxy hide directives; existing CSP/routes/secrets remain.
Both older hosts retain exact paired rollback pointers and compatible sessions.
Newadmin dry activation and automatic-rollback deployment pass all seven host
health checks. The actual new system is
`/nix/store/bdnycsva2wqknkqn4whx55vbfs4mcki2-nixos-system-vpsadmin-webui1-26.05.20261019.f3a73bc`,
generation `2026-11-01--18-44-33`; prior system 9zk8ahwk remains the rollback.
Actual frontend is 63c9z269 and BFF 4ni341aa; matching clean source metadata and
running process paths were checked, not merely the configured symlinks. All
BFFs run without retired credential environment variables. Live signing secrets
and session stores were retained. Existing OS/API inputs were not upgraded.

The private deployment basis is generated config commit babfc001 over the
verified live host basis. One WebUI-only generated input commit,
[bd76e7b3](https://github.com/vpsfreecz/vpsfree-cz-configuration/commit/bd76e7b3c7eef6e4a36ad0a679b6764ffc50fff2),
was published normally on current configuration master after verification.
All other current-master lock nodes are byte-equivalent. No release receipt,
screenshot or browser result was committed to the configuration repository.
Only this final receipt is added to WebUI documentation; it does not change the
runtime source or require another application deployment.

The temporary loopback staging servers were stopped after verification; their
isolated evidence remains under the owned /data release/runner directories.
The first unit/harness failures above remain recorded. The existing offline dev
DNS/storage queue and prior actual NFS/payment/refresh/hardware-passkey limits
remain untouched. This release is verified software deployment, not a blanket
claim that all API permissions or physical Safari devices are certified.
