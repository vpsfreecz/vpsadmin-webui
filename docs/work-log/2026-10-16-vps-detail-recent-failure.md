# Show the recent-failure badge in the VPS detail header

Requirement: REQ-074 (proposed), extended to the detail header. Prepared on
`dev/vps-detail-recent-failure` (PR #63). First stacked on #54 and #57; after
both were merged (main `7860521f`, 2026-10-18) the branch was rebuilt on main
as this single commit. Not merged or deployed. The combined review of
2026-10-18 covered only non-draft PRs, so this draft was not part of it.

## Problem

After #57 the detail header shows RAM/Disk high like the list, but not the
recent-failure badge: a VPS could be red in the list with "Recent failed task
#id" while its detail header showed nothing. The detail page loaded only the
VPS's 10 newest chains for lock state and had no failed-chain query.

## Change

- `useLatestRecentVpsFailure(vpsId, interval, enabled)` asks the API only for
  that VPS's newest `failed` and newest `fatal` chain (`state`,
  `class_name=Vps`, `row_id`; one each) and applies the same 7-day window,
  evaluation time and per-VPS lookup as the list (`recentVpsFailures.ts` from
  #54). The list hook keeps its query key, limits and interval; both share one
  internal hook.
- The detail refreshes this query at the tier B interval (15 s visible, 60 s
  hidden) and disables it on the console route, whose compact header has no
  badge. That is 8 extra requests per minute for a visible detail, none on the
  console.
- `VpsHeaderStateBadges` renders the existing `VpsRecentFailureBadge` after the
  usage badges, as in the list, with test ID `vps.header.recent_failure`.
- `VpsLayout.tsx` grows by 4 lines to 757 (753 on main, 760 before #57).
- The register and evidence matrix extend the existing REQ-074 row with the
  detail header. The matrix intro now states 75 register IDs (main still said
  73 after #53, #54 and #57 added REQ-073 to REQ-075).

The locked API source (`api/lib/vpsadmin/api/resources/transaction_chain.rb`,
revision a65a4dfe) supports `state`, `class_name` and `row_id` together and
orders by `created_at DESC`, so one chain per state is the newest. No API,
route or text changes.

## Verification and evidence

- `e2e/specs/app/vps_header_system_summary.spec.ts` gains three tests with a
  fatal chain and a 2022 failed chain with a higher ID. A member on `/app`
  sees the recent one in the header (text, `/app/transactions/<id>` link,
  tooltip, no overflow); the failure requests are exactly `failed`/`fatal` for
  the VPS with `limit=1`. With Playwright's clock, 10 s later the detail's
  chain list has refreshed but the failure query has not; after 2 more
  minutes it refreshes and the unchanged chain, created just under 7 days
  earlier, ages out. On `/admin`, the badge links to
  `/admin/transactions/<id>` and Enter opens it. On `/app/vps/<id>/console`,
  no failure query is sent while the chain list refreshes. With the previous
  tier A interval and no console gating, the member and console tests fail.
  Only `class_name=Vps` failure requests are recorded, so other state-filtered
  chain queries on the detail do not affect the test.
- Unit tests in `src/pages/app/vps` passed after the merge (185).

Screenshots use E2E HaveAPI fixtures with an invented host (95 % RAM, failure
three hours earlier), not live data; "before" is #54 + #57 without this change:
[before desktop](assets/vps-detail-recent-failure-20261016/before-vps-detail-header-desktop.png),
[after desktop](assets/vps-detail-recent-failure-20261016/after-vps-detail-header-desktop.png),
[before mobile](assets/vps-detail-recent-failure-20261016/before-vps-detail-header-mobile.png),
[after mobile](assets/vps-detail-recent-failure-20261016/after-vps-detail-header-mobile.png).

## Limitations

- A visible detail adds 8 small requests per minute (2 per tier B refresh).
- A member can list only chains they started (`restrict user` in the locked
  API), so a failure in a chain started by an administrator, such as a
  migration, shows no badge to the member, in the list or the detail.
- When two recent failures disagree between ID and creation order, the badge
  picks the higher ID (inherited from the list in #54). Chain IDs and
  `created_at` both follow insertion, so this needs a server clock change.
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

After #53, #54 and #57 were merged into main (`7860521f`, maintainer's merge
commits `67b78052`, `23eabf20`, `5a00e659`), the stack's own merge of #54 into
#57 became redundant. The branch was reset to main and only this change was
cherry-picked. The VPS code and specs are identical to the previous tip
`1c4c0f7f`; the only conflict was the REQ-073/REQ-074 rows of the evidence
matrix, which keep main's REQ-073 row and this change's REQ-074 row.

Checks on the rebuilt branch: `npm run typecheck`, `npm run audit:design-docs`
(75 requirements), `npm test` (1,854 tests in 300 files) and
`vps_header_system_summary.spec.ts` with `vps_list_row_click.spec.ts` on
Chromium and mobile Chrome (36/36, `--workers=2`) passed. WebKit is not
installed locally.

## Second review round

After the rebuild on main, three independent static reviews (Claude Opus 5.5,
GPT-6-Astra and GPT-6.1-Sol, high reasoning; no tests run by reviewers) found
no correctness bug. Astra and Sol approved with nits; Opus requested changes
for load only. All three measured the cost at 24 extra requests per minute for
a visible detail at tier A, also on the console route where the badge is not
rendered, and found that neither the list cache (200 chains per state) nor the
detail's 10 newest chains can replace the scoped query. Applied: tier B
interval and no query on the console; the tests above (member session,
clock-driven expiry, request counts, console, narrower request recording);
the product design excludes the console header; the member visibility limit
is documented. Not applied: Opus's alternative that also merges failures from
the detail's 10 newest chains to allow the slowest tier (2 requests per
minute) needs more code and tests, so the smaller change was chosen; sorting
recent failures by `created_at` (inherited, see Limitations).

Checks after these changes on main `7860521f`: `npm run ci:pr` (audits, 289
script/BFF tests, 1,854 unit tests, build) and
`vps_header_system_summary.spec.ts`, `vps_list_row_click.spec.ts` and
`vps_console_page.spec.ts` on Chromium and mobile Chrome (54/54) passed.
WebKit runs only in PR CI.

