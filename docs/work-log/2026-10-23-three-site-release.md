# 2026-10-23 — Member administration release

Status: combined candidate prepared; not yet merged or deployed.

The maintainer authorized merging and deploying only our PRs #81–#85 once
PR #81 CI passes. Targets are newadmin.vpsfree.cz, clankerdev.vpsfree.cz and
dev.crucio.cz. API PR #44 and other contributors' pending PRs are excluded.
No API, database, credential or infrastructure behavior change is included.

The candidate preserves the original commits and integrates:

- #81: one calendar month from now when selecting member soft_delete, with
  month-end clamping and manual override before confirmation.
- #82: exact legacy named privilege levels and unknown-level preservation.
- #83: full-width wrapped transaction payload readers and original-value copy.
- #84: administrator password dialog, cryptographic generation, explicit copy,
  next-login reset and optional session logout through the existing user API.
- #85: selected-member account/system communication contacts with prominent
  custom recipients and explicit primary-email fallback/error states.

Integration retains all locale keys, tests and documentation from each PR.
Shared strict E2E roots are combined; the existing structural-debt exception
tracks the actual smaller combined overview and reviewed source hash rather
than discarding any action. The CI count correction from #81/#82 is retained
once. No test or check is disabled.

Read-only preflight found paired runtime
1092ea48d20e49e31fd3ef2fa82880f769d302d1 on all three sites. The exact previous
generation/pointers will be rechecked under deployment locks and retained for
rollback; existing credentials and live session stores must be preserved.
Configuration publication will contain one generated input commit and no
tracked deployment reports or screenshots in vpsfree-cz-configuration.

Verification and deployment results are pending. Synthetic fixture tests do
not certify live API behavior; production mutation tests are not authorized.
