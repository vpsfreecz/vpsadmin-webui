# Cover overlay notifications and actual deployment completion

Prepared, not merged or deployed. Requirements: REQ-011, REQ-012, REQ-058.

Full CI found six failures not covered by the previous PR smoke selection.
Maintenance and user-data tests looked for urgent notifications in the old
background toast viewport even though these now render inside the active dialog.
Assert visible errors in the corresponding dialog while retaining draft, retry,
exact readback and durable uncertainty-lock assertions.

The user-data action-state mock returned a bare object containing `status: true`.
The fixture harness interpreted that as an envelope, so the UI received null
instead of a completed action state. Return the actual resource envelope. Make
the test observe a pending progress panel, then supply a finished state, require
that it was read, and only then assert panel removal. This prevents an empty-DOM
assertion passing before the lazy progress component has even mounted.

Promote all six cases to desktop/mobile PR and broad smoke gates and adopt all
three specs into strict TypeScript. No product code, API or deployment changes.
Validation is recorded in the PR with focused and complete CI results.
