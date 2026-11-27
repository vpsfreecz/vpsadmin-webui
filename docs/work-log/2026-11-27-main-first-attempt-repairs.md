# Main release: original first-attempt failures — 2026-11-27

PR336 targets main and retains both the accepted work and Aither's cleanup/SDK
changes. Its first integrated head `2bc5faf176ec1a6fb9a4ee1ca3d9edd3271c8543`
received 19 successful check conclusions, but inspection of the original logs
found two tests passing only after retry. The strict release gate blocked merge.
Original logs, annotations and trace archives remain under
`/data/webui-browser-runner/verification-20261103/release-main-merge-20261127-1310`
and `release-main-ci-repair-20261127-1405` beside it. No CI rerun, assertion,
retry setting, timeout, skip or budget change is used to hide these failures.

## Cursor history (REQ-046)

The mobile WebKit namespace pagination trace returned to the first-page URL
while rows26–50 remained rendered and no first-page request was made. Next had
advanced local cursor state before React Router published its URL; native Back
returned to the last committed cursor, leaving the URL effect's dependencies
unchanged. A deterministic unit regression fails the previous implementation
(expected page1, received page2), without browser timing or an API fixture.

Observe native popstate within the current pathname, non-pagination query and
page-size scope. Restore the visited cursor without writing history, preserving
the forward stack. Other routes, filters and page sizes remain owned by normal
router hydration. Keep existing pending navigation/filter/normalization guards.
The regression and three route/filter/page-size guard cases pass after repair;
all23 targeted pagination/OOM semantics tests pass. Existing namespace browser
Back/Forward, terminal-page, cursor, write-count and overflow assertions remain.

## Password keyboard precondition (REQ-028)

The original mobile Chrome native focus journal shows
`shell.blocking_progress.loading.close` still owned focus when the generated
password toggle was focused. The focus trap correctly redirected that attempt
to the global blocking request dialog. Its retirement left focus on the body;
waiting for the toggle assertion could not itself focus the toggle again.

Wait for all dialogs to retire immediately before the existing native focus
operation at each viewport. Keep visible-scroll setup, focus-visible, Tab and
Shift+Tab, masking, dimensions and exact mutation-count assertions unchanged.
This repairs test setup; it does not permit keyboard focus behind a live modal.

## Release verification boundary

The old head's complete local quick/script/BFF/unit/build/Nix and compiled145
checks remain historical evidence. The changed clean head needs full checks and
fresh compiled-artifact coverage, including these original browser scenarios on
their failing engines, before one coherent push to this same PR. Monitor every
original hosted job log, including green jobs' flaky summaries. Merge only the
qualified exact main/head tree. Production activation remains maintainer-owned;
all assembling stays on dev.crucio.cz under /data with remote builders disabled.
No production or preview activation, API, SDK, catalog or secret changes.
