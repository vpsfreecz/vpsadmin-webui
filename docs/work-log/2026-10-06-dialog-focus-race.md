# Preserve focus selected before a deferred overlay callback

Prepared, not merged or deployed. Requirement: REQ-010.

During the CI audit, PR24 run 37526966911 was green but its mobile keyboard
navigation scenario needed a retry. Its first attempt opened the navigation
drawer, focused the VPS link and pressed Enter; the drawer closed while the URL
remained `/app`. The delayed initial-focus callback unconditionally focused the
first control (Close), even after focus had already moved to the link.

A deterministic unit regression reproduces this focus theft without changing
timings or weakening the browser assertion. Preserve focus already within the
topmost active trap. Default focus from outside, nested dialogs, Tab wrapping
and redirecting escaped focus remain covered. The existing route-focus browser
test is unchanged and will be repeated on mobile without retries.

Regression evidence: the new unit suite failed 2/4 on the unchanged stack,
then passed 4/4 with the guard. Twenty mobile browser repetitions without
retries and complete CI are in progress; final evidence is linked in the PR. No API, UI text or deployment changes.
