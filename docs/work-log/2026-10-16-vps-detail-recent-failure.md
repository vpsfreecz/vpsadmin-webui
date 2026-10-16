# Show the recent-failure badge in the VPS detail header

Requirement: REQ-074 (proposed), extended to the detail header. Prepared on
`dev/vps-detail-recent-failure`, stacked on #54 (`dev/vps-recent-failure-badge`)
and #57 (`dev/vps-detail-usage-badges`), both rebased on main `f3202feb`; #54 is
merged into the #57 branch with a merge commit and this change follows it. Not
merged or deployed. The PR is a draft until #54 and #57 are merged; it will then
be rebased on main so that only this change remains, and this record will be
updated to that history.

## Problem

After #57 the detail header shows RAM/Disk high like the list, but not the
recent-failure badge: a VPS could be red in the list with "Recent failed task
#id" while its detail header showed nothing. The detail page loaded only the
VPS's 10 newest chains for lock state and had no failed-chain query.

## Change

- `useLatestRecentVpsFailure(vpsId)` asks the API only for that VPS's newest
  `failed` and newest `fatal` chain (`state`, `class_name=Vps`, `row_id`; one
  each) and applies the same 7-day window, evaluation time and per-VPS lookup
  as the list (`recentVpsFailures.ts` from #54). The list hook keeps its query
  key and limits; both share one internal hook.
- `VpsHeaderStateBadges` renders the existing `VpsRecentFailureBadge` after the
  usage badges, as in the list, with test ID `vps.header.recent_failure`.
- `VpsLayout.tsx` grows by 3 lines to 756, still below its 760-line size on
  main.
- The merge from #54 combines its failure badge with #57's usage badges in the
  list row and card; the register and evidence matrix keep both REQ-074 and
  REQ-075 (74 IDs with main's REQ-072; REQ-073 is reserved by open #53).

The locked API source (`api/lib/vpsadmin/api/resources/transaction_chain.rb`,
revision a65a4dfe) supports `state`, `class_name` and `row_id` together and
orders by `created_at DESC`, so one chain per state is the newest. No API,
route or text changes.

## Verification and evidence

- `e2e/specs/app/vps_header_system_summary.spec.ts` gains a `@smoke
  @smoke-mobile` test: a VPS with a fatal chain from two hours earlier and a
  2022 failed chain with a higher ID shows the recent one in the header (text,
  `/app/transactions/<id>` link, tooltip, no overflow); the requests are exactly
  `failed`/`fatal` with `class_name=Vps`, the VPS ID and `limit=1`. When the
  fixture's chain becomes old, the badge disappears after the next refresh. On
  `/admin`, the badge links to `/admin/transactions/<id>` and Enter opens it.
  With `vps_list_row_click.spec.ts` (list badges after the merge), the specs
  passed on Chromium and mobile Chrome (`--workers=2`). This spec also runs in the
  untagged `mobile-webkit` PR CI job; WebKit is not installed locally.
- Unit tests in `src/pages/app/vps` passed after the merge (185).

Screenshots use E2E HaveAPI fixtures with an invented host (95 % RAM, failure
three hours earlier), not live data; "before" is #54 + #57 without this change:
[before desktop](assets/vps-detail-recent-failure-20261016/before-vps-detail-header-desktop.png),
[after desktop](assets/vps-detail-recent-failure-20261016/after-vps-detail-header-desktop.png),
[before mobile](assets/vps-detail-recent-failure-20261016/before-vps-detail-header-mobile.png),
[after mobile](assets/vps-detail-recent-failure-20261016/after-vps-detail-header-mobile.png).

## Limitations

- The detail adds two small requests per VPS detail refresh (tier A interval).
- The compact console header still shows only the runtime badge.
- Real API responses were not checked against a live API.

## Review

Three independent static reviews (Claude Opus 5.5, GPT-6-Astra, GPT-6.1-Sol;
no tests run by reviewers) of the first commit approved with nits. Applied: the
header test now proves the absence of an old failure after the badge was shown
(the chain ages out and the badge disappears on refresh) instead of asserting
absence right after the requests; it asserts `limit=1`, the VPS scope for both
states, that a recent chain wins over an old one with a higher ID, and the
administrator link with keyboard activation; the product design and REQ-074
wording now name the detail header; this record no longer states counters that
depend on other open PRs. Reviewers noted that upstream main has moved and #54
conflicts with it; the stack is rebased after the remaining work is prepared.

## Rebases on main

After #54 and #57 were rebased on main `ba53e363` (evening release #49–#52,
#55), this branch was rebuilt: the rebased #57, a merge of the rebased #54
(the same code resolution as before; the evidence matrix now lists REQ-072,
REQ-074 and REQ-075 and maps 74 IDs; E2E coverage 56 adopted, 203 deferred),
and this change cherry-picked on top (one evidence-matrix row conflict, kept
with the detail-header evidence). No application code changed in the rebase.

The stack was rebuilt the same way on main `f2ad625d` (#58 About credits, #59
payment guidance), whose only overlap with this stack was main's REQ-072
evidence row; the VPS code and counters are unchanged.

It was rebuilt once more on main `f3202feb` (deployment record), whose only
overlap with this stack was again main's REQ-072 evidence row.
