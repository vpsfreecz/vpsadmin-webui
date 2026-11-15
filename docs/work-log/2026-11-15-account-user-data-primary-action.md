# ACC-09 account follow-up

Keep one primary Create template entry in the filter bar for both empty and populated lists. Remove the redundant empty-state entry and its unused list callback. Preserve editor validation, existing filter/query/owner policy, creation payloads, deploy/delete guards and the existing readable length error.

The maintainer approved the exact current TODO proposal on 2026-11-14.
Existing draft PR239 is retained with its original history and scope; no colleague PR150 changes are imported.

Baseline: actual dev frontend79dfeea, synthetic own-account/member-administrator data, Chromium and mobile WebKit, Czech dark and English light. The full text of Request change and both recipient Copy controls already work in that release; preserve those results rather than claim a new fix.

Source-specific browser checks cover named help, layout and unchanged callbacks. Fixtures prove UI contracts, not live permissions, browser-native MFA hardware, clipboard integration outside the harness or physical Safari/display behavior. No real accounts, devices, VPSes or migrations are changed.

Locked terminology source: a65a4dfeb92a59df4a80a737a20bcbf8558793ff. Read the locked Czech guide and localization procedure. The separate KB contract has API/PHP inputs and no React source input; this UI-only change does not justify repinning an unrelated API feature. Existing semantic labels/routes remain; external KB screenshot freshness is not certified.

Prepared locally. Full quick checks, relevant tests, clean Nix/browser outputs, original exact-head CI and paired preview acceptance remain pending and will be recorded when completed. No merge, production/newadmin deployment, backend activation or whole-queue readiness is claimed.

Working qualification before commit: full repository ci:quick, relevant existing
unit tests and native build passed. 122 source-bound targeted browser cases
passed across Chromium, mobile Chrome and Linux mobile WebKit with max2workers,
zero retry/failure/flaky/skip. The cumulative count is a union of the task
cohorts and is not an additional unique-behavior claim. Exact committed checks,
clean Nix/browser, original hosted CI and paired/protected delivery remain
separate gates. Original local failures and corrections are preserved in the
private task report; no check, assertion or budget is weakened.
