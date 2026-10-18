# Show the list's usage badges in the VPS detail header

Requirement: REQ-075 (proposed). Prepared on `dev/vps-detail-usage-badges`
(PR #57), first from main `b9358c81`, then rebased on main `ba53e363`, `f2ad625d`
and `f3202feb`. Not merged or deployed.

Numbered REQ-075 because PR #51 proposed REQ-072 (now on main) and open PRs
propose REQ-073 (#53) and REQ-074 (#54). The evidence matrix total is shared
with #53 and #54, and REQ-074 is inserted at the same place in the register.
#54 also edits the same list row/card badge lines and `vpsListSemantics.test.ts`;
whichever of #54 and this PR merges later needs a small additive merge there
(both badge sets and both tests are kept, as in the stacked follow-up branch).

## Problem

A contributor compared the VPS list with the detail of the same VPS: the list
row showed Running, Active, RAM high and a failure badge, while the detail
header showed only Running and Active. The detail header rendered runtime,
object state and lock badges only; the RAM/Disk high rule
(`usageRiskVariant`: from 90 % of the allocation, danger from 98 %) existed
only in the list.

## Change

- `vpsUsageRisks(vps)` in `vpsListSemantics.ts` is the single rule for both
  views (numeric API values only, as before).
- `VpsUsageRiskBadges` renders the RAM/Disk high badges in desktop rows,
  mobile cards and the detail header, with test IDs
  `<prefix>.ram_high`/`.disk_high`. Labels reuse the existing catalog keys, so
  no text changes.
- `VpsHeaderStateBadges` now holds the detail header badges (runtime or
  Creating, object state, usage, Busy/Working). Badge order matches the list.
  `VpsLayout.tsx`, which is over the 500-line budget, shrinks by 7 lines.

Usage bars still turn amber from 80 % (`usageSeverityFromRatio`, shared by
datasets, nodes, user resources and gauges), in the list as well as the detail.
The contributor chose to keep that: the bar colour is a gradual cue and the
badge is the alert. Only the badge rule is unified.

The recent-failure badge is not part of this change. It needs the 7-day
window from #54 and will follow in a separate PR that depends on #54 and this
one.

## Verification and evidence

- `vpsListSemantics.test.ts`: below/at 90 %, danger at 98 %, zero allocation,
  non-numeric values, and the list record still using the rule.
- `e2e/specs/app/vps_header_system_summary.spec.ts` gains a `@smoke
  @smoke-mobile` test: on the `/app` and `/admin` routes (administrator
  account; the header depends on the route, not the role), a VPS at 92.8 % RAM
  and 98.6 % disk shows visible RAM high (warn) and Disk high (danger) badges
  in the list layout of the project (rows or cards) and in the detail header
  without overflow; a VPS at 85 % RAM shows neither. In PR CI it runs in the
  `mobile-webkit` job (untagged `e2e:touch:webkit`, which includes this spec);
  the Chromium and mobile Chrome PR jobs select `@pr-smoke`, so there it runs in
  broad smoke after merge. WebKit is not installed locally, so the WebKit
  result comes from PR CI. The spec was
  already in strict E2E type coverage. With `vps_list_row_click.spec.ts` as a
  regression check, 30/30 passed on Chromium and mobile Chrome (`--workers=2`).
  A first run with default workers on a host with a load average above 200
  timed out in two existing tests, which then passed unchanged.

Screenshots use E2E HaveAPI fixtures with an invented host (95 % RAM), not live
data:
[before desktop](assets/vps-detail-usage-badges-20261016/before-vps-detail-header-desktop.png),
[after desktop](assets/vps-detail-usage-badges-20261016/after-vps-detail-header-desktop.png),
[before mobile](assets/vps-detail-usage-badges-20261016/before-vps-detail-header-mobile.png),
[after mobile](assets/vps-detail-usage-badges-20261016/after-vps-detail-header-mobile.png).

## Limitations

- `used_memory` comes from `osctl ct top` on the node (vpsAdmin
  `libnodectld/lib/nodectld/vps_status.rb` at the locked revision); whether it
  includes page cache is defined by vpsAdminOS and was not checked, so a high
  value may be cache. The API clears it while a VPS is stopped
  (`api/lib/vpsadmin/supervisor/node/vps_status.rb`), so a stopped VPS shows
  no RAM high badge. Not checked against a live API.
- The compact console header still shows only the runtime badge.

## Review

Three independent static reviews (Claude Opus 5.5, GPT-6-Astra, GPT-6.1-Sol;
no tests run by reviewers) approved with nits. Applied: the register and
product design now claim only RAM/Disk badge parity; the E2E test picks rows or
cards by Playwright project instead of viewport width, checks visibility and
tones on the list as well, covers the administrator view and the calm VPS's disk
badge; the list record and `vpsUsageRisks` share one numeric-value helper.
Checked in the locked API source: a stopped VPS has no `used_memory`, so the
suspected stale RAM badge cannot occur. Declined: moving the helper to a
separately named module, which two reviewers found acceptable as is.

A second round over the amended commit: all three approved with nits. Applied:
the Disk high badge's visibility is now asserted too; the CI note above is
corrected (the reviewer found the untagged `mobile-webkit` PR job); the test
description names the routes and account accurately.

## Rebases on main

Main gained the evening release (#49–#52, #55), including REQ-072. The first
rebase (on `ba53e363`) had no textual conflict, but the evidence matrix kept 72
IDs, which would have been wrong after merge: it is now 73 (main's 72 plus
REQ-075), lists REQ-072 before REQ-075, and drops a blank line that had split
main's REQ-072 row from the table. `vps_header_system_summary.spec.ts` is still
in the `mobile-webkit` PR job. No application code changed in the rebase.

Rebased again on main `f2ad625d` (#58 About credits, #59 payment guidance),
which edited main's REQ-072 evidence row. Only that evidence-matrix block
conflicted; it keeps main's REQ-072 row and this change's row in ID order. The
counters did not change.

Rebased once more on main `f3202feb` (deployment record), which edited the same
REQ-072 evidence row; resolved the same way.
