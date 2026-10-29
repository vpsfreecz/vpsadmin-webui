# VPS network confirmation cleanup — 2026-10-28

Status: prepared for review; no merge/deployment. REQ-010/REQ-011/REQ-050.
Extract the duplicated enable/disable confirmation presentation from the large
VPS network page into a typed, presentation-only component. The page retains
permission/busy gates, mutation snapshots, locks, exact target references,
request handlers, errors and reset/retry behavior. Disabling still requires its
existing reason field; enabling does not acquire one. All translated keys,
accessible dialog text, test IDs, confirmation context and layout are unchanged.
No new interaction or backend behavior is introduced, and no structural or
quality budget is raised. One exclusive dialog mode replaces the two independent flags, and mutation
snapshot types move into the existing network model. The parent loses 77 lines
and its grown-over-500 exception is removed, without changing the baseline; this is a small separation
of concerns, not a claim that its remaining large mutation controller is solved.

Promote the existing rejection/retry editor scenario into the PR desktop/mobile
selection and the mobile WebKit project. It exercises both toggle directions
and the existing address/PTR/ownership editors. No tests are weakened. Additional
relevant network/destructive/uncertainty cases are checked on the dev runner.
The editor spec is adopted into strict E2E type checking rather than refreshing
its deferred hash. Verification: ci:quick, the network-model unit tests and production build pass.
The existing editor/rejection scenario passes on desktop Chromium, mobile Chrome
and mobile WebKit with zero retries. The first extraction correctly
failed the structural gate, then the further cleanup removed that exception. Because this is a nonvisual refactor, existing synthetic
network views remain the visual contract; live VPS creation is separately
blocked by dev's pre-existing mailer/NoOp queue and must not be claimed verified.
