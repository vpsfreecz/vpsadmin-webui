# Compact transaction history and chain steps

Date: 2026-10-25. Requirement: REQ-051. Status: locally verified candidate for review;
not merged or deployed. Branch `dev/transactions-readable-overview`, worktree
`/Users/kerrycze/git/vpsadmin-webui-transactions-overview`.

## Request and design

The maintainer finds Transactions hard to scan and prefers the legacy table
and chain detail. Prioritize the main transaction history, then keep Tasks
consistent. Preserve the modern interface's mobile access and clear failure
states. The legacy screenshots and `webui/pages/page_transactions.php` were
reviewed as input; this is a React-only change, not an API/PHP change.

- Chain history: compact aligned ID, creation time, user, affected object,
  action and state/progress columns. Secondary classification badges and repeated
  object/action links no longer consume several lines per entry. ID opens the
  chain. Object filter pivots and direct-object links, item-list shortcuts and
  pinning remain available. Narrow layouts fold metadata beneath the action,
  retaining named links and touch targets without horizontal table scrolling.
- The page summary is a single compact row. Active/error rows retain semantic
  colors; successful rows remain neutral. Backend-supplied operation and affected
  class labels stay authoritative. State labels use the active UI language.
- Chain detail: one concise summary with creation time, owner, session, progress,
  affected objects and current/failed step. Technical JSON is collapsed. The
  previous duplicated state/progress/label tiles are removed.
- Steps: chronological ID order, aligned node/VPS/state/duration, local search
  by ID/name/node/VPS, and all/error/in-progress filters. Expand a step in place
  for timestamps, priority, dependencies, and the readable input/output readers
  delivered in PR83; exact payload copying and inert HTML are retained.
  Bulk expansion and direct item navigation remain available. Indicate partial
  loaded step sets rather than implying the existing 500-item fetch is complete.
- Tasks: keep its existing interactions, use localized state labels, remove
  repetitive classification badges and completed progress bars, and use neutral
  surfaces for successful history so active work and errors remain distinct.

No mutation, API transport/adapter, authorization, refresh/polling, or chain-list
pagination behavior is intentionally changed. Existing owner/session guards and
system-activity collapsing remain authoritative. The detail search resets per
chain. URLs and API operation names retain their current contracts.

## Implementation and quality contracts

Extract the chain summary and step rendering into focused components. The main
chain-detail page drops below its oversized-page threshold; its reviewed debt
exception is removed instead of increasing a budget. Adopt the previously
untouched chain-detail Playwright spec and the new readability spec into strict
TypeScript; preserve the deferred-source baseline. Mobile WebKit now includes
the new readability scenario. Existing scrolling assertions are changed to
assert a fully fitting responsive table, while preserving navigation, state,
expansion, copy and overflow checks.

Locked terminology input: `a65a4dfeb92a59df4a80a737a20bcbf8558793ff`.
Both locked guides were read from the Nix input on the build host. The separate
KB contract maps legacy PHP pages; no legacy page, API commit or KB pin is
changed. The React workflow and requirement register are updated here.

## Verification status

Passed on the isolated task branch:

- `npm run ci:quick`: locked runtime check, documentation and quality audits,
  mutation/CSP checks and all strict typechecks (73 adopted E2E specs).
- `npm run ci:tests`: 226 script tests, 57 BFF tests and 1,869 unit tests in
  301 files. No failures.
- `npm run build`: production BFF-mode build. Vite retains its existing large-
  chunk warning; this change does not modify chunking or deployment.
- Targeted Playwright regression: 92 passed across Chromium, mobile Chrome and
  the selected mobile WebKit scenarios. Covers transaction chains/items cursor
  continuity, terminal pages, pins outside boundaries, personal/support scope,
  session filters, backend labels/language changes, chain/item deep reloads,
  polling termination, Tasks inspection and payload readers.
- After final density/spacing edits, 24 additional browser checks passed across
  Chromium/mobile Chrome/mobile WebKit: list/chain detail, authoritative labels,
  local step filters, chain navigation reset, partial sets, keyboard expansion,
  exact input copying and page/table overflow. Tested Czech/dark and English/light.
- After the expanded-row fix, 18 final chain/detail browser checks passed,
  including CSS breakpoint changes at 390/800/1050/1280px and mobile Safari.
- Reviewed implemented screenshots on desktop and mobile. Dedicated icon-size
  assertions prevent shared button padding from shrinking the pin glyph.

The new test feeds reverse-ordered steps and checks their chronological display,
filters errors and queued work, searches by ID, expands with Enter, copies the
original JSON payload byte for byte, and resets local filters when a different
chain opens through Tasks. A partial 3/600 fixture checks the incomplete-set
notice. Read-only checks reject writes to transactions/chains; the application's
existing UI-settings preference persistence is allowed separately.

The initial fixture run exposed unavailable browser binaries, obsolete assertions
requiring horizontal scrolling, a hidden redundant mobile Open icon, and an
ambiguous Copy selector. Installed the pinned browsers and changed those
assertions to verify the intended responsive navigation and input-copy contract.
No production failure was bypassed. Terminal chains no longer label a queued,
unexecuted transaction as the current step; the chain-ending caption does not
imply successful completion.

## Review captures

These show the implemented candidate with synthetic fixture data:

- [Desktop history](assets/transactions-overview-20261025/chromium-list.png)
- [Desktop chain](assets/transactions-overview-20261025/chromium-chain.png)
- [Expanded input/output](assets/transactions-overview-20261025/chromium-expanded.png)
- [Tasks panel](assets/transactions-overview-20261025/chromium-tasks.png)
- [Mobile chain](assets/transactions-overview-20261025/mobile-chrome-chain.png)
- [Mobile Safari expanded payload](assets/transactions-overview-20261025/mobile-webkit-expanded.png)

Limitations: these fixtures do not certify live API authorization or deployment.
No live dev/production service has been replaced for this review. The existing
500-step fetch remains bounded; the item-list shortcut provides paged access.
Timestamps retain the existing browser-locale/browser-timezone formatter.
A breakpoint sweep exposed an existing 800px shell-toolbar overflow: its user
menu extends to 851px when both active and failed task badges appear. A
separate detached clean-main checkout at `5a2d2bdc` reproduces 851px document
width with the same badges; with no tasks it fits at 800px. This is independent
of the transaction redesign. The transaction table itself fits at 390/800/1050/1280px.
This PR does not change the shared top bar; document-level overflow checks still
cover the regular desktop/mobile fixture viewports. The breakpoint sweep tests
table geometry explicitly rather than hiding a shell failure.

Visual review also caught a mobile expanded-row defect not detected by the
initial overflow-only checks: `colspan=7` created phantom columns when CSS hid
four of them. The step table now tracks its visible md/lg/xl column count with
media-query subscriptions, updates the span on resize and keeps the step-name
cell readable after expansion. Tests assert span counts, at least 100px for the
name cell and bounded row height across all three engines. A too-strict first
assertion measured the short English link's intrinsic text width; it now checks
the actual table cell, which is the layout contract.


All screenshots/test accounts are synthetic. No production data is captured and
no live infrastructure or transaction writes were performed. Local Node/npm
24.21.0/11.19.0 fallback matches the locked toolchain; local Nix is unavailable.

## Dependency and full-suite checkpoint

The root production audit reports zero vulnerabilities. The unchanged BFF lock
fails its high-severity audit for body-parser 1.20.6 (GHSA-27r3-jxmh-p828).
Prepare the independent `dev/bff-body-parser-patch` review branch first; stack
this presentation branch on that patch so both reviews retain focused diffs and
CI can evaluate a patched dependency graph. No parsing/API/authentication code
changes are included in the dependency patch.

Checkpoint at 2026-10-25 00:23 UTC:

- Published implementation `d644d140b5eb95740eb21ccf725504780ad74817`
  is stacked on independent BFF patch `6ebe859e640098788dcddb0b7f2483301a04c561`.
  Neither is merged. Both remote branch heads were verified after SSH push.
- A fresh BFF install in the stacked checkout, high-severity production audit,
  `ci:quick` and production build pass. Root production audit is also clean.
- Full `npm run e2e:pr` desktop: 540 passed, two failed out of 542. The payment
  help highlight timed out and one account-scope test could not find a session
  row. The run overlapped the unpublished local rebase/source-file refresh;
  this is a possible interference source, not a proven cause.
- Independent repetition of both entire affected specs against a separate,
  stable local server: **17 passed**, including both originally failing cases.
  No payment/account code or test assertion was changed. Do not describe the
  original full desktop attempt as passing. The full mobile part (484 cases)
  remains running in `/tmp/transactions-pr-smoke.log`; finalize that result in
  the next overnight checkpoint. Separate repetition log:
  `/tmp/transactions-full-failure-followup.log`.
- PR creation was attempted with the prepared BFF body and rejected by GitHub
  with HTTP 401. No PR exists yet and no remote CI was triggered; branch push
  alone does not trigger this repository's PR workflows. Prepared descriptions
  are `/tmp/webui-body-parser-pr.md` and `/tmp/webui-transactions-pr.md`.
- An isolated clone of the exact published candidate was used for Nix package,
  provenance/source/content verification. The frontend dependency fetch failed
  with **No space left on device** on dev's system disk. Therefore the full Nix
  frontend/package check is **not certified**. The earlier independent BFF
  package build passed. No serving files or services were replaced.
- Removed this task's two `/tmp` remote source directories. Default Nix liveness
  protection refused targeted removal of their cached source paths, so it was
  retained; no override or global garbage collection was used. The disk remains
  low (about 190 MiB available). Do not retry a large Nix build there without
  sufficient space or use this task as authorization to remove unrelated data.

Continue the authorized overnight verification; complete PR publication only
when authentication is available. Keep the BFF PR based on main and the UI PR
based on the BFF patch branch so their diffs stay independent.

## Overnight handoff

Heartbeat automation `no-n-kontrola-p-ehlednosti-transakc` returns to this chat
hourly through 2026-10-25 10:00 Europe/Prague (09:00 UTC after the clock change).
Continue this branch and document exact evidence. Do not merge or deploy.
GitHub CLI currently returns 401 for the stored Kerrycek token. SSH Git access
is valid for Kerrycek; check publication options after preparing the reviewable
candidate. The native browser fallback is also unavailable while the Mac is
locked. Public upstream reads confirm only unrelated PRs #63 and #74 are open.
Do not include them. Preserve colleagues' dirty main checkout.

## Overnight checkpoint — 2026-10-25 00:47 UTC

The full mobile PR suite completed with **484/484 passing** in 8.7 minutes.
Both complete desktop follow-up specs finished with **17/17 passing**. Preserve
the first desktop attempt's 540 passes/two failures above; its result has not
been reclassified as green.

A fresh `ci:tests` run on the committed stacked candidate is followed
sequentially by a complete, stable desktop PR-suite repetition, without source
edits while the browser run is active. Results are pending in
`/tmp/transactions-committed-tests.log` and
`/tmp/transactions-stable-desktop.log`. No new UI or unrelated fix is added.

Upstream main remains `5a2d2bdc`; both review branches are published. GitHub
REST authentication was rechecked and still returns 401. PR publication and
remote CI therefore remain blocked; no merge/deployment or Nix retry occurred.

## Overnight completion of local suites — 2026-10-25 01:50 UTC

The stable, complete desktop PR suite finished **542/542 passing** in 8.9
minutes, without source edits during that run. Together with the completed
**484/484 mobile Chrome PR suite**, both full PR smoke projects now have a
passing complete run. The earlier failed desktop attempt and 17-test follow-up
remain recorded above; this is an additional successful run, not a rewrite of
that evidence. Mobile Safari's dedicated transaction scenarios passed in the
focused checks; this does not claim the entire mobile WebKit project was run.

The committed candidate's repeated `ci:tests` also passed: 226 script tests,
57 BFF tests and 1,869 unit tests in 301 files. No assertions, source behavior
or unrelated payment/account code were changed to obtain these passes.
No more full-suite repetition is needed unless source changes or a new failure
provide a reason. Prepared PR descriptions have been refreshed with this status.

Publication remains the outstanding actionable boundary. Authenticated GitHub
REST still returns 401; public PR discovery confirms only unrelated #63 and
#74 are open, so no PR was silently created and no remote CI is certified.
Upstream main remains `5a2d2bdc`. Preserve both published review branches and
retry publication only if authentication is restored before the 10:00 deadline.
The full Nix frontend/package disk-space limitation remains unchanged.
No deployment, API/server change or live write occurred.

## 2026-10-27 — PR #89 CI security prerequisite

Carry PR #88's body-parser 1.20.9 and qs 6.16.1 baseline through an ordinary
merge commit, preserving this feature and all published history. The independent
review base is `dev/bff-body-parser-patch`; return to main after explicitly
approved security integration. No PR is merged into main and no deployment.

Integrated `ci:quick`, fresh root/BFF installs and the BFF production audit passed
locally; the audit reports zero vulnerabilities. The security candidate's full
Nix frontend/BFF and provenance/source/package checks also passed in isolation.
Remote CI on this new feature head is a separate pending result. See
[shared diagnosis and evidence](2026-10-27-ci-security-baseline.md).
