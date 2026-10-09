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
