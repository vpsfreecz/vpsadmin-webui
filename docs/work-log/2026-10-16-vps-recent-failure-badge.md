# Show only recent VPS failures and link them to the chain

Requirement: REQ-074 (proposed). Prepared on `dev/vps-recent-failure-badge`
(PR #54), first from main `b9358c81`, then rebased on main `ba53e363`, `f2ad625d`
and `f3202feb`. Not merged or deployed.

Numbered REQ-074 because PR #51 proposed REQ-072 (now on main) and open #53
proposes REQ-073. The evidence matrix total and the E2E type-coverage counts are
shared with open #53; whichever merges later only needs those numbers
incremented. See "Rebases on main" below.

## Problem

A contributor's VPS list showed a red row with "Recent failed task #6536759"
on a running VPS. The chain was a Restart created on 2022-05-08; another VPS
showed a Clone from 2022-08-18 (#6607914). The list loads the newest 200
`failed` and 200 `fatal` transaction chains and marked every VPS named in their
concerns, with no age limit. Failed chains stay failed until an administrator
resolves them, so a member with few failures kept such a flag for years. The
badge was plain text, so the chain could only be found by copying its ID.

## Change

- A failed or fatal chain marks a VPS only when it was created within the last
  7 days (`RECENT_FAILURE_WINDOW_MS`). Older chains and chains without a
  parseable `created_at` are ignored. This applies to the badge, the danger row
  tone and the Failed state filter, which all use the same list.
- The window is evaluated at the latest completed fetch of the failed-chain
  query, successful or failed (`dataUpdatedAt`, `errorUpdatedAt`), rounded
  down to the minute. A cached failure therefore still expires while refreshes
  fail, and unchanged refetches within a minute do not rebuild the list rows.
  The query, its key, limits and refetch interval are unchanged; it moved into
  `useRecentVpsFailures`, which also keeps `VpsListPage.tsx` under 500 lines.
- The badge is now a link to `<basePath>/transactions/<id>` on desktop rows and
  mobile cards. The row's existing nested-link handling keeps a badge click
  or Enter from opening the VPS. The link title gives the API operation label
  and the chain's creation time (new `vps.list.state.recent_failure_title`,
  en/cs; "created"/"vytvořeno" as on the chain detail). The
  visible badge text is unchanged; the badge is underlined like the hostname
  link to show that it is clickable.

The 7-day window is a proposed default, not derived from usage data: it covers
a weekend or a short absence, while 24 hours could hide a failure before the
owner sees it and 30 days would keep a recovered VPS red for a month. The PR
asks the maintainer to confirm it or choose another length (one constant). Every VPS in a chain's concerns is
still marked (for example a clone source); the window limits how long that
lasts.

The vpsAdmin API at the locked revision
(`api/lib/vpsadmin/api/resources/transaction_chain.rb`) orders chain lists by
`created_at DESC, id DESC`, so the existing 200-chain limit returns the newest
failures, and `created_at` is the only timestamp a chain exposes. A burst of
more than 200 failed (or fatal) chains within 7 days in one administrator view
would still hide the older ones; that limit predates this change.

Czech wording follows the locked terminology revision
a65a4dfeb92a59df4a80a737a20bcbf8558793ff, read from GitHub at that revision
because Nix is unavailable locally.

## Verification and evidence

- `src/pages/app/vps/recentVpsFailures.test.ts`: window edge, just outside,
  2022, missing and invalid dates; expiry of cached data after failed
  refetches; minute rounding, including a failure created after the rounded
  evaluation time; newest chain first per VPS and shared concerns;
  missing query data; merge of failed/fatal pages.
- `vpsListSemantics.test.ts`: a recent failure still marks the row and filter;
  a 2022 failure leaves the row unmarked and outside the Failed filter.
- `e2e/specs/app/vps_list_row_click.spec.ts` gains two tests. Member view: the
  recent badge has the link, text and tooltip, the 2022 failure shows no badge,
  and clicking the badge opens the chain instead of the VPS. Administrator
  view: a fatal chain's badge links to `/admin/transactions/<id>` and Enter on
  the focused badge opens it. Editing the spec required its
  adoption into strict E2E TypeScript coverage (54 adopted, 204 deferred on
  the original base; 56/203 after the rebases below); it
  had no diagnostics and needed no other change. The spec passed 24/24 on
  Chromium and mobile Chrome.

Screenshots use E2E HaveAPI fixtures with invented hosts, not live data. One
VPS has a failure from three hours earlier, the other a 2022 failure and high
RAM:
[before desktop](assets/vps-recent-failure-20261016/before-vps-list-desktop.png),
[after desktop](assets/vps-recent-failure-20261016/after-vps-list-desktop.png),
[before mobile](assets/vps-recent-failure-20261016/before-vps-list-mobile.png),
[after mobile](assets/vps-recent-failure-20261016/after-vps-list-mobile.png).

## Limitations and follow-ups

- Real API responses were not checked against a live API; the fixtures use
  ISO 8601 timestamps, as HaveAPI datetimes and the existing date formatting do.
- The window counts from chain creation, not from the failure, because the API
  exposes no other chain timestamp. A chain that waited more than 7 days before
  failing is therefore not shown. A creation time ahead of the browser clock
  counts as recent; with minute rounding this also covers failures from the
  current minute when both clocks agree.
- The tooltip is not shown on touch devices; the chain detail gives the same
  information.
- Not in this change: the VPS detail header shows neither this badge nor
  RAM/Disk high (usage bars warn from 80 % in both views, while the list's
  RAM/Disk high badges start at 90 %). #57 adds the usage badges to the header
  and a draft follow-up adds this badge there.
- The chain detail shows a raw "object not found" error for these old chains.
  It comes from the API: listing a chain's transactions resolves each
  transaction's node, and members can only resolve active nodes
  (`Node::Show` restricts to `active: true`), so transactions on a retired node
  fail the whole request. This WebUI change leaves it as is.

## Review

Three independent static reviews (Claude Opus 5.5, GPT-6-Astra, GPT-6.1-Sol;
no tests run by reviewers) of the first commit: two approved with nits, one
requested changes. Applied: expiry no longer freezes at the last successful
fetch; minute-rounded evaluation avoids rebuilding rows on every refetch;
tooltip says "created" to match the chain detail; the record field is named
`latestRecentFailure`; a redundant comment was removed; administrator path and
keyboard activation are tested; API ordering and timestamps were checked in the
locked API source. Declined: excluding creation times in the future, since a
browser clock behind the server would then hide a fresh failure.

A second round over the amended commit: GPT-6-Astra and GPT-6.1-Sol approved,
Claude Opus 5.5 approved with nits. It noted that minute rounding makes the
declined `age >= 0` check a bug for failures from the current minute; a unit
test now pins that behaviour, and this round is recorded here.

## Rebases on main

Main gained the evening release (#49–#52, #55), including REQ-072 and another
adopted E2E spec. The first rebase (on `ba53e363`) only conflicted in the E2E
type-coverage counts, now 56 adopted and 203 deferred (main's 55/204 plus this
PR's adoption of `vps_list_row_click.spec.ts`). The evidence matrix merged
textually at 72 IDs but needed 73 (main's 72 plus REQ-074; REQ-073 stays with
open #53); it now lists REQ-072 before REQ-074 and drops a blank line that had
split main's REQ-072 row from the table. No application code conflicted.

Rebased again on main `f2ad625d` (#58 About credits, #59 payment guidance),
which edited main's REQ-072 evidence row. Only that evidence-matrix block
conflicted; it keeps main's REQ-072 row and this change's row in ID order. The
counters did not change.

Rebased once more on main `f3202feb` (deployment record), which edited the same
REQ-072 evidence row; resolved the same way.
