# Backup Center detail navigation — prepared

Approved BAK-05 `0c6d44640d50433d`, human revision333, REQ-048.

The existing Center Open links discarded their source tab/filter. VPS-dataset
details then had no active member menu; NAS detail switched to NAS. Preserve
only URL presentation context, mark the existing Backups item and provide a
fixed in-app return. Keep that context on detail tabs and reload. Direct member
VPS dataset URLs highlight VPS; direct NAS and administrator behavior remains.

Whitelist Center tab, q, dataset, intent and existing backup_snapshot_* keys;
exclude arbitrary redirect, API owner and action keys. No API, BFF, gate, role,
request, payload, menu structure or dependency change. NAS-14's broader models
remain for the maintainer to choose. Existing CS/EN nav.backups wording is used;
locked terminology input a65a4dfeb92a59df4a80a737a20bcbf8558793ff and both guides
were read. KB contracts currently pin the separate legacy PHP interface; no
React KB screenshot certification or production KB write is claimed.

Pre-commit pinned native full ci:quick, production build, explicit touched-file
ESLint and 46 targeted units passed in both source copies. The new public E2E
file is strictly typed and explicitly selected in mobile WebKit. Private final
focused8 and additional overview/plans8 passed with zero retries, page errors or
writes; they overlap the earlier 32 passing configurations. Final clean-package
44-case acceptance and hosted six-check/paired/protected delivery remain gates.

The initial private run (2 pass/7 fail/1 interrupted/26 unrun) invented a
requirement to transfer detail-tab-local page/limit parameters. Its correction
then had32pass/4fail: workspace return correctly retained the pre-existing auto
backup_snapshot_page=1. Tests now capture the settled exact Center URL. All old
runs/traces remain; these were new assertion mistakes, not fixed product bugs.
Only our exact Playwright controller was interrupted. No runtime change was
made to accommodate either incorrect assertion.

Further verification is in progress. The exact clean A4DE deployed bundle reproduced the
lost backlink/query and VPS missing-menu state in four desktop Chromium/mobile
WebKit fixture configurations, zero errors/writes/retries. Initial exploratory
captures precede list settlement; the second settled baseline is the comparison
source. Candidate tests cover Center downloads and workspace entry, reload,
detail tabs, keyboard return, member/admin-My/support-My, CSdark/ENlight, direct
NAS/VPS/admin links and URL input boundaries. Fixtures do not prove live API
permissions, OAuth or physical Safari. Prepared only, no activation or done claim.


## Clean-package route race and corrective verification

The first clean F182 bundle passed42/44 but failed two EN mobile-WebKit NAS
returns (member/support-My). A departing dataset page could normalize its old
pagination query after the browser already navigated to Backup Center, replacing
the destination tab/filter. This is a real product race; the correct assertions
and both original traces are retained. F182 is not eligible for activation even
if its focused hosted head passes. This differs from the earlier new assertion
mistakes described above.

Add an optional navigationPathname ownership check to the existing keyset hook,
enabled only by dataset snapshot/download pages. Once browser navigation leaves
the path owning those params, automatic normalization and explicit pagination
must not write its query to the new page. Other hook callers retain their
existing behavior. Preserve dataset request/payload/gate code and its default
pagination semantics. The regression reproduces an old page normalizing after
browser history has moved and fails before the guard. Keep current-path normal
pagination and the existing pending-filter/cursor tests. Four rapid-return browser
configurations add three deliberate immediate tab/keyboard-return cycles each;
the final finite matrix is48 configurations with no test retries.

The first guard edit used a different optional-property spelling from the
regression and remained red. Aligning the implementation and its two callers to
the declared navigationPathname contract fixes that edit; no assertion was
weakened. Corrective native, source, clean-package and hosted checks are pending.
No API deployment, live mutation, final task completion or preview activation.


## Hosted keyboard-return failure and deferred focus

Original focused head64453000 was not qualified: Chromium665 pass/2 failed/4
flaky, mobile Chrome609 pass/1 failed/4 flaky, WebKit315 pass/1 flaky/2 old skips.
One failure was the existing storage-section contract still demanding bare Open
hrefs; both exact expected links now include the approved Center context and
settled snapshot pagination. Existing storage/owner/API assertions remain.

A new deterministic unit test establishes that the deferred route-focus frame
can override a destination control focused after navigation. Before correction,
nine tests pass and that test fails with main-content holding the control's
focus. Controlled-frame browser regressions reproduce the same lost Backups
link focus in actual clean16CE bundles; natural instrumented12 cases passed,
so this is scheduling-order proof rather than a claim every natural run fails.
Preserve destination focus claimed before the deferred frame; keep normal main
focus, scroll, fragment, POP and superseded-navigation behavior. The corrected
unit suite passes10/10. Six new browser configurations hold only the deferred
frame and require the link to remain focused, Enter to return to the exact
Center URL and the filter to survive. Natural cases keep their original checks.

Fresh human333/current BAK05 approval, both6F47 runtimes, API22adc and protected
BAK09/10 were checked. Full finite81-case three-profile verification, native checks,
new exact-head hosted six checks and cumulative recomposition on actual6F47
remain required. Old16CE/F182 bundles are not eligible for deployment. No API
writes, preview activation, completion, merge or approval is claimed.
