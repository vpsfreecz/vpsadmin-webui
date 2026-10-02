# 2026-09-30 — Match profile-change review to registration

## Request and implementation

The maintainer requested the same layout as registration: approval below the
request, not in a narrow sidebar. The requested/current comparison now uses the
full content width. Initially expanded technical metadata is inside that card,
followed by the full-width decision card and its existing compact queue preference.
No request states, payloads, permissions or approval side effects were changed.

Metadata rendering and its field helper were extracted into a shared component
used by both request types. This brings RequestDetailPage below its structural
budget; the resolved exception was removed rather than enlarged. REQ-030 and the
workflow catalog record this layout. No UI copy or API adapters changed.

## Verification and status

Prepared on `dev/account-change-review-layout` from main `534caa8`.
- `npm run ci:quick`: passed (type checks, lint and required audits).
- `npm test -- src/pages/app/admin/Request`: 65 tests in nine files passed.
- `npm run build`: passed; the existing large-chunk advisory remains.
- Temporary visual capture: four cs/en desktop/mobile checks passed, confirming
  equal card widths, decision below details, metadata inside the details card,
  actions below the queue preference, and no page-wide horizontal overflow.
  The comparison table retains its existing local horizontal scroll on phones.
- Existing desktop request-operation/missing-owner browser regressions: all
  41 Chromium cases passed.
- The first expanded run also included desktop-only tests on mobile. Three
  such cases failed on hidden desktop-list controls before the changed detail.
  One was reproduced with the unchanged main RequestDetailPage. After all desktop
  cases completed, that overly broad run was stopped and the mobile-tagged cases
  plus both change-comparison cases were selected explicitly: all 18 passed.
  Tests/selectors and CI gates were not weakened.
- No declared commit-hook framework or custom hooks path was found.

Reviewed synthetic screenshots: [Czech desktop](screenshots/change-review-desktop-cs.png)
and [Czech mobile](screenshots/change-review-mobile-cs.png).

Checks used the existing pinned Node 24.21.0 runtime/dependencies in an isolated
`/data/webui-change-review-20260930` scratch checkout on the dev host. No packages
were installed into deployed services; no shared service was changed.
No real request was approved/rejected; browser evidence uses synthetic fixtures.
Not merged or deployed. Existing review regressions and temporary visual capture
cover this layout change; API behavior is unchanged.

## Deployment follow-up (recorded 2026-10-02)

[PR #8](https://github.com/vpsfreecz/vpsadmin-webui/pull/8) was merged
on 2026-09-30 and deployed in `718cf7596eb8b11a796268a73c1f2e0a02a98450`
to newadmin.vpsfree.cz, clankerdev.vpsfree.cz and dev.crucio.cz. See the
[release receipt](2026-09-30-three-site-release.md) for exact CI and deployment
evidence. The earlier prepared status is historical; fixture checks are still
distinct from authenticated live workflow certification.
