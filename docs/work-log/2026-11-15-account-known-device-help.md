# ACC-07 account follow-up

Name the known-device search with its visible label and associate its always-visible help. Explain that filtering covers the current page, local changes refresh automatically and Refresh loads changes made elsewhere. Preserve owner scope, cursor recovery, polling intervals, device mutation confirmation and query invalidation.

The maintainer approved the exact current TODO proposal on 2026-11-14.
A new focused MFA draft will be prepared after local qualification; earlier PRs and colleague PR150 remain separate.

Baseline: actual dev frontend79dfeea, synthetic own-account/member-administrator data, Chromium and mobile WebKit, Czech dark and English light. The full text of Request change and both recipient Copy controls already work in that release; preserve those results rather than claim a new fix.

Source-specific browser checks cover named help, layout and unchanged callbacks. Fixtures prove UI contracts, not live permissions, browser-native MFA hardware, clipboard integration outside the harness or physical Safari/display behavior. No real accounts, devices, VPSes or migrations are changed.

Locked terminology source: a65a4dfeb92a59df4a80a737a20bcbf8558793ff. Read the locked Czech guide and localization procedure. The separate KB contract has API/PHP inputs and no React source input; this UI-only change does not justify repinning an unrelated API feature. Existing semantic labels/routes remain; external KB screenshot freshness is not certified.

Prepared locally. Full quick checks, relevant tests, clean Nix/browser outputs, original exact-head CI and paired preview acceptance remain pending and will be recorded when completed. No merge, production/newadmin deployment, backend activation or whole-queue readiness is claimed.

Known-device polling remains30seconds when visible and120seconds when hidden.
Manual Refresh is optional for checking external changes immediately; own
Forget and TOTP changes invalidate the relevant queries automatically.
The UI regression verifies these invalidations without changing any interval.

Working qualification before commit: full repository ci:quick, relevant existing
### Accepted integration evidence

unit tests and native build passed. 24 source-bound targeted browser cases

### Existing preview evidence

unit tests and native build passed. 122 source-bound targeted browser cases
passed across Chromium, mobile Chrome and Linux mobile WebKit with max2workers,
zero retry/failure/flaky/skip. The cumulative count is a union of the task
cohorts and is not an additional unique-behavior claim. Exact committed checks,
clean Nix/browser, original hosted CI and paired/protected delivery remain
separate gates. Original local failures and corrections are preserved in the
private task report; no check, assertion or budget is weakened.
