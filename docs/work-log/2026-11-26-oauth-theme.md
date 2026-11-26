# Preserve theme through OAuth login

Requirement: [REQ-005](../design/REQUIREMENTS.md).
[PR335](https://github.com/vpsfreecz/vpsadmin-webui/pull/335). Prepared implementation;
not merged or deployed. The provider extension is documented in
[HaveAPI](https://github.com/vpsfreecz/haveapi/blob/master/doc/en/oauth-theme.md).

Public, expired-session and retry entry links now carry light/dark/auto plus
explicit return opt-in. React maps system to auto. Both BFF and legacy callbacks
apply returned preference only after authentication validation and successful
exchange. The BFF keeps its state-consumption, session-rotation and strict
session JSON boundaries. Error responses retain the initiating appearance.

A short host-only cosmetic cookie carries selected and initiating enums. The
head bootstrap reads it before paint; settings consume it once into memory,
merge only theme into the account record and retain the original comparison
snapshot. Missing-record behavior distinguishes an actual OAuth theme edit from
an unchanged login. Optional localStorage access is guarded, while the legacy
flow still requires saved session state. Entry and callback effects reuse their
own in-flight promise under React StrictMode to avoid duplicate attempts.

Focused unit and BFF tests cover enum bounds, direct/retry entry, response opt-in,
success/failure and replay boundaries, cookie attributes, prepaint with denied
storage, settings merge/retry, unchanged/changed missing records and StrictMode.
Quick checks passed in the pinned Nix shell: focused UI tests (74 cases across
seven files, followed by the nine-case callback rerun after its final tests),
63 BFF cases, root/tooling/E2E-core/BFF-core typechecks, the source-quality
and documentation/i18n/CSP/architecture audits, and 17 package-source/content/CSP
checker fixtures. The inline head-script hash is refreshed in the owning NixOS
module and deployment templates; the new helper is listed in the BFF runtime
manifest. Production remains unchanged.

Independent review covered the complete theme exchange and the narrow legacy
initial-preference correction. At `a28c59c6`, all four CI runs, the six immutable
package checks and the legacy build passed. Eight synthetic desktop/mobile
handoff checks passed and produced six captures.

The first real immutable UI/BFF/provider roundtrip passed. The next case, with
localStorage denied, exposed unguarded lock-display reads and legacy pin cleanup
in the authenticated shell. The correction guards those display and cleanup
paths while preserving the existing mutation-acquisition and persistence checks.
The focused layout and lock suite passed all 40 cases; legacy OAuth sessionStorage
validation is unchanged. Final review of this correction, rebuilt artifacts and
the remaining paired browser cases are pending. Fixtures do not certify a
production deployment.

No database migration, generated SDK or dependency lock change is needed.
The locked terminology guide revision is
`a65a4dfeb92a59df4a80a737a20bcbf8558793ff`.
