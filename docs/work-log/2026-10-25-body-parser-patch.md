# BFF body-parser security patch

Date: 2026-10-25. Requirements: REQ-068 (immutable packages), REQ-064 (record).
Prepared separately from the transaction presentation task on
`dev/bff-body-parser-patch`, based on main `5a2d2bdc`. Not merged or deployed.

## Reason and scope

The existing BFF lock resolves Express 4.22.3's body-parser to 1.20.6.
The production audit now fails for
[GHSA-27r3-jxmh-p828](https://github.com/advisories/GHSA-27r3-jxmh-p828),
published on October 22. It describes an uncaught decompression-stream error
from trailing bytes after a compressed request, potentially terminating a
process. The patched 1.x release is 1.20.9. This record does not certify the
exploitability of any deployed instance, and no live exploit was attempted.

A targeted `npm update body-parser --package-lock-only --ignore-scripts --prefix bff`
updates only body-parser 1.20.6 to 1.20.9. Its qs requirement changes from
~6.15.1 to ~6.16.0; the existing override already locks qs 6.16.0, so no other
resolved dependency version changes. Manifest constraints, parsing middleware,
proxy trust, authentication, runtime code, frontend lock and API are unchanged.

The separately generated BFF dependency hash is
`sha256-mzGG5zmGm6m4yQEy2xUT3vyi8bOVqPzzZbZLDdkndKQ=`.
The owning package and packaging guide are updated together.

## Verification

- Node 24.21.0/npm 11.19.0 matches the locked runtime. Local Nix unavailable;
  use its pinned prefetch tool in isolated `/tmp` source on the dev build host.
  No serving directory, system configuration or live service was modified.
- Fresh `npm ci --omit=dev --prefix bff` succeeds.
- `npm audit --omit=dev --audit-level=high --prefix bff` reports zero
  vulnerabilities after the patch (one high before).
- `npm run test:bff`: all 57 tests pass.
- `prefetch-npm-deps bff/package-lock.json` in the locked Nix shell produces
  the hash above. `nix build .#bff --no-link` succeeds on x86_64-linux in
  that isolated source. No live service is started.
- Ten package source/content checker tests pass, as do the design-doc audit
  and full `npm run ci:quick`. The built BFF output is
  `/nix/store/bps7gcmigxfy6lrr82q7nizzh2av6css-vpsadmin-webui-bff-0.1.0`.
  Only sample Git hooks are present; contributor identity was verified in the
  actual checkout before committing.

GitHub CLI currently has an invalid token; authenticated SSH Git is usable.
Prepare review branches and retry PR publication through the overnight task.
No merge or deployment is authorized.

## 2026-10-27 — Published review and qs follow-up

PR #88 is now published after GitHub CLI reauthorization. Its initial required
checks, build and browser-script regression passed. The older authentication
and zero-audit statements above are dated receipts, not current status claims.
GitHub then published GHSA-6pq8-jhm2-2vcw for qs through 6.16.0. Update the
existing BFF override to 6.16.1; body-parser stays 1.20.9 and all other resolved
package versions stay unchanged. The separately prefetched BFF hash is now
`sha256-pifjCWQ5ShvtQw1V3bAlmutW43nPi93hDVW8Q4HuVMw=`.

The new fresh production install/audit reports zero vulnerabilities, all 57 BFF
tests pass, and the advisory's non-callable-toString stringify input no longer
throws. Full source, package and CI verification is tracked in the
[CI baseline repair](2026-10-27-ci-security-baseline.md). No deployment.

The complete x86_64-linux frontend/BFF build and provenance/source/package checks
now pass in the isolated clean source checkout. The earlier shared-disk blocker
was resolved by the separately authorized cache cleanup. No service files or
active deployment were replaced.
