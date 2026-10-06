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
