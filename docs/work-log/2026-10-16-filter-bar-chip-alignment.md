# Keep list filter controls aligned when filter chips appear

Requirement: REQ-073 (proposed). Prepared on `dev/filter-bar-chip-alignment`
(PR #53), first from main `b9358c81`, then rebased on main `ba53e363`, `f2ad625d`
and `f3202feb`. Not merged or deployed.

Numbered REQ-073 because PR #51 proposed REQ-072, which main now contains. See
"Rebases on main" below for the updated shared counters.

## Problem and change

A contributor reported that applying a filter on Transaction chains moved the
Advanced, Copy link and Clear filters buttons down next to the new
`id:…` chip instead of keeping them beside the search field. `FilterBar` aligns
its children to the bottom of the row (`items-end`). The chips and the ID lookup
hint were rendered inside the search column, so that column grew taller and the
buttons followed its new bottom edge (about 30 px lower on desktop).

The same structure existed on 18 lists: transaction chains and items, VPS,
datasets, DNS zones, action states, monitoring events, migration plans, nodes
(whose always-present "showing n of m" line shifted the buttons even without
filters), users, IP addresses, mail logs/recipients/mailboxes/templates, OS
templates, locations and environments.

`FilterBar` now accepts a `below` row, rendered as a full-width flex item after
the controls. These lists pass their chips and hints there, so the controls keep
the same position with and without active filters. The row has `min-w-0`, so a
long chip still truncates within the bar instead of widening it (the old search
column was bounded by its `w-full` width). Exports already renders chips as a
full-width bar item; networks, system configuration and resource packages show
them under their control row, and incidents and OOM reports after the bar. On
mobile, the chips now follow the wrapped control row instead of sitting between
the search field and the controls, so DOM, visual and focus order all run
search, controls, chips. On nodes, the "showing n of m" line now sits 8 px below
the controls (the bar's row gap) rather than 4 px below the search field.

Button sizes are unchanged. The Transaction chains Copy link button remains
32 px tall next to 36 px Advanced/Clear buttons; the contributor chose to keep
that out of this change. No API, text or route changes.

The `below` values are written compactly in files over 500 lines so no page
grows; those files already contain lines over the 120-column Prettier width.
In the structural debt ledger, the MonitoringEventsPage exception is removed
because the file is now under its removal threshold (1,107 ≤ 1,109 lines by the
audit's line metric). The two LocationsPage
exceptions record the new content hash and their allowance drops from 1,025 to
1,024 lines.

## Verification and evidence

- New `e2e/specs/app/filter_bar_chip_alignment.spec.ts` (`@smoke
  @smoke-mobile`) waits for the chips on Transaction chains and the VPS list.
  On desktop it asserts that every control's bottom edge stays within 1 px of
  the search field's bottom edge; on mobile, that the controls start below the
  search field. On both, the chips must start below the controls. A third test
  checks that a 200-character VPS filter chip keeps its remove button inside
  the bar without document overflow. The spec is adopted in the E2E type
  coverage inventory.
- The first desktop-only version of the alignment check failed against the
  unchanged components (30 px offset) and passed with the change. The final
  spec passed all 6 runs (3 tests on Chromium and mobile Chrome).
- `npm run e2e:pr` and PR CI select only `@pr-smoke` tags, so they do not run
  this spec; the broad smoke workflow runs it after merge. Before opening the
  PR, run it on both projects:
  `E2E_START_SERVER=1 node scripts/playwright.mjs test e2e/specs/app/filter_bar_chip_alignment.spec.ts --project=chromium --project=mobile-chrome`
  (add `--auto-system-chromium` where Playwright's bundled browser is missing).
- Screenshots use the E2E HaveAPI fixtures (fictional user and data) on
  Desktop Chrome and Pixel 5 emulation; they do not certify live API data or a
  deployment. Transaction chains with an `id:` chip, before and after:
  [desktop before](assets/filter-bar-20261016/before-transactions-desktop.png),
  [desktop after](assets/filter-bar-20261016/after-transactions-desktop.png),
  [mobile before](assets/filter-bar-20261016/before-transactions-mobile.png),
  [mobile after](assets/filter-bar-20261016/after-transactions-mobile.png).
  VPS list with a `q:` chip:
  [desktop before](assets/filter-bar-20261016/before-vps-desktop.png),
  [desktop after](assets/filter-bar-20261016/after-vps-desktop.png),
  [mobile before](assets/filter-bar-20261016/before-vps-mobile.png),
  [mobile after](assets/filter-bar-20261016/after-vps-mobile.png).
  A 200-character chip truncates inside the bar:
  [desktop](assets/filter-bar-20261016/after-vps-long-chip-desktop.png),
  [mobile](assets/filter-bar-20261016/after-vps-long-chip-mobile.png).
- Other affected lists share the component change; they were checked by source
  review and the unchanged unit/browser suites, not by individual geometry tests.
- `npm run ci:pr` passed on the final commit: all audits including design docs
  and structural budgets, typechecks, 289 script/BFF tests, 1,810 unit tests in
  297 files, and the production build.
- The 19 existing specs that touch filter bars, chips or clear-filter actions,
  run on both Chromium and mobile Chrome against the final commit: 220 passed,
  1 skipped, 9 failed. All 9 failures are on mobile Chrome in desktop-only
  `@smoke` tests (`nodes_issues_only_filter.spec.ts` and eight in
  `requests_operations_smoke.spec.ts`, which expect desktop tables); the same 9
  fail identically with unchanged main `src/`, so they are pre-existing.
- `npm run e2e:pr` equivalent with system Chromium (`--auto-system-chromium
  --no-artifacts`, because Playwright's bundled browser is not installed here):
  desktop 489 passed and 2 failed; mobile Chrome 430 passed and 1 failed. All
  three failures are in `user_namespace_filter_contract.spec.ts`, which this
  change does not touch. The same spec on unchanged main `b9358c81` failed 2 of
  its 18 desktop and mobile tests, different ones than on this branch, so this
  is pre-existing flakiness under local load, not a regression. This full PR
  smoke run predates the review round 1 changes; the targeted runs above cover
  the final commit.
- No configured hooks path or declared commit-hook framework was found.
- Nix is unavailable on this workstation; checks used the locked Node 24.21.0 /
  npm 11.19.0 runtime with `npm ci` in the root and `bff/`.

## Review

Round 1 (three independent static reviews, no test execution) found: the
desktop-only geometry test would fail on the mobile project; it measured the
controls before waiting for the chips and its last assertion did not catch the
bug; the new row could let a long chip overflow; the evidence matrix overstated
screenshot coverage; two small files gained their first over-120 lines; and the
work log had an inexact line count and description of other pages. All were
addressed as described above. A suggested shared chip-row component was not
adopted, because every extra import line would breach the structural budgets of
the larger pages.

Round 2: two reviewers approved without findings; the third approved with
nits. Addressed: the evidence matrix now limits the long-chip check to the VPS
list, the spec helper has a viewport-neutral name, and this log records how to
run the spec, which PR CI does not select. Not changed: a suggestion to wait
for list content before measuring, since nothing above the bar renders late on
these pages.

Round 3: two reviewers approved without findings; the third approved with one
nit, the missing `E2E_START_SERVER=1` in the run command above, now added.

Next step: contributor review, then a PR to `vpsfreecz/vpsadmin-webui`.

## Rebases on main

Main gained the evening release (#49–#52, #55), including REQ-072 and another
adopted E2E spec. The first rebase (on `ba53e363`) only conflicted in the E2E
type-coverage counts, now 56 adopted and 204 deferred (main's 55 plus this
PR's spec). The evidence
matrix merged textually at 72 IDs but needed 73 (REQ-072 from main plus
REQ-073); it now lists REQ-072 before REQ-073 and drops a blank line that had
split main's REQ-072 row from the table. No application code conflicted.

Rebased again on main `f2ad625d` (#58 About credits, #59 payment guidance),
which edited main's REQ-072 evidence row. Only that evidence-matrix block
conflicted; it keeps main's REQ-072 row and this change's row in ID order. The
counters did not change.

Rebased once more on main `f3202feb` (deployment record), which edited the same
REQ-072 evidence row; resolved the same way.
