# Request error announcements after the mobile dialog change

Prepared, not merged or deployed. Requirements: REQ-010, REQ-011, REQ-058.

The maintainer requested investigation of broad smoke run
[37523496452](https://github.com/vpsfreecz/vpsadmin-webui/actions/runs/37523496452)
and all current CI failures. Both request failures reproduce on main
`5d85374`: rejection and failed preflight display text inside the dialog but
lose the former toast alert semantics. CI snapshots confirm the message exists;
`getByRole('alert')` correctly cannot find an accessible alert.

Give only the dynamic request resolve error an explicit alert role. Static informational/risk panels retain their existing semantics.
Strengthen both browser assertions to require a visible alert inside the dialog
and an enabled Cancel button. Include these existing cases in both desktop and
mobile PR and broad smoke gates so this regression is caught before merging.
The preflight case still verifies that no mutation or uncertain lock is created.

Focused Chromium and mobile Chromium regression: 4/4 passed using synthetic
API fixtures and the pinned Nix Node toolchain. Complete CI results follow. API, backend,
translations and deployment configuration are unchanged.

## Validation follow-up

Prepared as [PR25](https://github.com/vpsfreecz/vpsadmin-webui/pull/25).
Final wrapper-based implementation passed all four desktop/mobile request
scenarios; the combined focused run with the network fixes passed 8/8.
`npm run ci:quick` passed in the pinned Nix toolchain. GitHub nonbrowser CI,
production build, browser script regressions and mobile WebKit also passed
for `c09692e`; the longer Chromium suites were still running at this entry.

Full combined validation (PR24 QR fix, PR25 and PR26) uses isolated branch
`dev/ci-audit-validation`, revision `e26371f`:
[required checks](https://github.com/vpsfreecz/vpsadmin-webui/actions/runs/37528155288),
[PR browsers](https://github.com/vpsfreecz/vpsadmin-webui/actions/runs/37528159745),
[broad smoke](https://github.com/vpsfreecz/vpsadmin-webui/actions/runs/37528164531),
[full nightly](https://github.com/vpsfreecz/vpsadmin-webui/actions/runs/37528168221).
Those runs were dispatched, not yet complete when this entry was written;
see their final outcomes and the PR review summary. No merge or deployment.
