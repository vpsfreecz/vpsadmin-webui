# Readable user creation validation

Approved TODO UX-04 d5847413b2b70eae / REQ-010 continuation.

On the exact current ddb8381e fixture build, required-login validation in
UsersCreateModal has 14px regular danger text on the dialog surface. Its actual
background is transparent, so the effective dialog background must be used:
dark contrast is 3.121474:1; the light password-mismatch sample is 6.470045:1.
Original screenshots, traces and the corrected composited-background observer
are retained under todo-admin-user-shell-finite-audit-20261109 on /data.
An earlier private observer measured transparent background as black; its
contrast values are excluded, while its layout observations remain attributed.

Change one error class list to semantic foreground, medium weight and a 2px
leading danger border. Preserve local validation, messages, state, fields,
pending behavior, cancel, payloads and API calls. The source error container
also displays server errors, so the same readable treatment applies there.
The focused branch includes the already delivered PR243 OOM prerequisite;
that dependency is not a new fix. Current integration must retain the removed
monthly-payment creation field and all other delivered SDK/API behavior.

Preparation only. Pinned checks, current prototype, clean Nix packaging,
exact-head six CI, paired preview activation and TODO evidence are not yet
accepted. Synthetic intercepted tests do not certify live permissions, real
account creation, OAuth, physical Safari or a weaker physical display.

Pinned quick/type/design/structural/build checks and1939 existing unit tests
pass. Current-preserving dirty prototype32/32 passes64 width/focus samples;
24 validation/server-error contrast samples have minimum11.746504:1 with
500 weight/2px marker. Sixteen expected intercepted create requests include
held pending and rejected503; no live writes. Two current prototype desktop
and mobile originals were opened. Clean Nix/exact CI/paired delivery pending.
