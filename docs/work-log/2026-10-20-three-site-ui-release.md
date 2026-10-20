# 2026-10-20 — Three-site UI refinement release

Status: merged and deployed to newadmin.vpsfree.cz, clankerdev.vpsfree.cz and
dev.crucio.cz. Runtime: `1092ea48d20e49e31fd3ef2fa82880f769d302d1`.

The maintainer explicitly authorized deploying only our work (Kerrycek). The
release integrates [PR #77](https://github.com/vpsfreecz/vpsadmin-webui/pull/77)
(VPS resource summary), [PR #78](https://github.com/vpsfreecz/vpsadmin-webui/pull/78)
(compact IP actions) and [PR #79](https://github.com/vpsfreecz/vpsadmin-webui/pull/79)
(advisory table spacing), through
[release PR #80](https://github.com/vpsfreecz/vpsadmin-webui/pull/80).
PRs #63 and #74 are excluded. Original authors and commits were preserved;
WORK_LOG.md was the only integration conflict and all entries were retained.
No API, database schema or production credential change is included.

## Verification

- All six required checks passed on each original PR head and the combined
  runtime revision before main was fast-forwarded. Combined runs:
  [nonbrowser/build](https://github.com/vpsfreecz/vpsadmin-webui/actions/runs/39414661959)
  and [browser](https://github.com/vpsfreecz/vpsadmin-webui/actions/runs/39414661916).
- Combined `npm run ci:quick` passed using the local Node 24 fallback.
- Targeted source browser tests: 55 passed, 2 existing skips. Built Nix artifact
  browser tests: 31 passed, 1 existing skip. These use synthetic API fixtures.
- Nix frontend/BFF builds and provenance, source-content, package-content and
  module-evaluation checks passed on the build host.
- Newadmin: `confctl build`, dry activation and switch with automatic rollback
  enabled passed; all seven confctl health checks passed. Active generation:
  `/nix/store/c4lvzwxj7c56m4gnc34z6sqw2cb57aa6-nixos-system-vpsadmin-webui1-26.05.20261019.f3a73bc`.
- Older hosts: candidate config validation, paired frontend/BFF promotion and
  BFF restart/health checks passed. Existing sessions and credentials retained.
- All three live frontend and BFF revisions match the clean runtime above.
  Anonymous auth endpoint smoke checks passed. Public Playwright checks passed
  in desktop Chromium, mobile Chromium and mobile WebKit on each site (9 cases),
  including locale, navigation, news/about, revision and no JavaScript errors.
- Real dev API acceptance passed on desktop Chromium and iPhone WebKit: advisory
  table padding/Open navigation, IP actions/history/edit and VPS resource summary.
  Existing controlled admin/member sessions survived deployment. Temporary
  unpublished data was deleted, owned test accounts relocked, sessions closed
  and temporary credential/storage-state files removed.
- Newadmin CSP retains the console/heatmap frame origins and payment QR source.
  Dev retains its separate API; public sites retain api.vpsfree.cz.

## Configuration and rollback

One generated `confctl inputs` commit updates only flake.lock in
vpsfree-cz-configuration: `6e79db5ab5e3b4e35ba3db1c1c8b94c4b833abd2`.
It pins the exact runtime above. No deployment receipts or screenshots were added
to that repository. Publication uses the operator workstation because the build
host has no GitHub push authentication; the generated commit is transferred
unchanged and pushed with normal fast-forward protection.

All sites retain the previous paired runtime
`b9f47f06e0877eb4a160053c413c4b87dd4a3d55`. Newadmin's previous generation is
`/nix/store/z1rpbh54ajjdd8wcdb0zc518549lw70z-nixos-system-vpsadmin-webui1-26.05.20261018.8ce7336`.
Use the [operations guide](../design/OPERATIONS.md) and
[older-host procedure](../operations/older-hosts.md); preserve live sessions on
rollback. Private operator receipts and test artifacts remain outside Git.
This later documentation-only record does not change the runtime pin.

## Limits and separate finding

Production authenticated login/recovery and console acceptance were not repeated;
public smoke checks do not certify those workflows. Dev uses its pre-existing
certificate exception. The API was not updated by this release.

Before upgrading the dev frontend, creating a controlled unpublished advisory on
the previous frontend succeeded, but adding its CVE failed. The dev API revision
`fb2f51222503a45f2e5a42af505f719e44279ed0` requires
`expected_content_revision` for SecurityAdvisoryCve creation; the frontend's CVE
reconciliation adapter does not supply it. This existing compatibility issue is
outside these three visual PRs and remains unresolved. Production mutation
behavior was not tested or inferred from that dev result. The test draft had no
CVE or affected objects and was removed during cleanup.
