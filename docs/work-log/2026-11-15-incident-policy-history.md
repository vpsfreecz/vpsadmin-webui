# Runtime incident policy history and unknown current limits

Historical implementation record. The unreleased UI/API described here is
superseded by [the generic policy revision](2026-11-17-generic-incident-policies.md).
Its checks and captures retain only their original source scope.

The maintainer authorized the runtime policy implementation. This React package
extends REQ-051 on existing incident history/detail and VPS surfaces. It adds no
dashboard, rule editor, action controls, BFF route or second notification sender.

The additional unknown-status option is sent only after the new evaluation
capability is detected; older summary APIs retain their supported filters.
Current live counts remain visible when site Ruby policy makes current limits
and status unknown. The card and list indicator do not turn null into zero,
clear status or a historical threshold. Configured mode/stop permission is
described as permission, not a guarantee of a future action. The last selected-type
evaluation is explicitly dated history, with only the API-provided authenticated
incident link. The existing status filter adds `unknown`, retaining owner scope,
combined filters, synchronous URL updates and canonical pagination reset.

Read-only notice metadata identifies warnings and confirmed stops independently
of pending/queued/sent/failed/uncertain/suppressed mail. SMTP success does not prove
inbox delivery. Ordinary reports and old APIs retain their previous presentation.
Unsafe/missing trigger references stay absent; no owner-history reconstruction,
administrator MailLog or private delivery-error details are used.

The API owns qualification, policy evaluation, owner/epoch privacy and action/mail
outcomes. React continues to use the generated SDK and shared transport/narrowing.
The generated development candidate uses packed source
`05c443c43d22cbd67422f53414f022c3a9ac072b` and the SDK-owned immutable HTTPS
artifact commit `3b98b045684528d0c38cc2abfef012ebf75e3e5a`, generated from API
`1a0935b2f0ed0c31d00d645922b88396dbdb2c7c` / schema SHA-256
`efff42fbd937ae5c6cc8c0f75c19cf28cc3f95382576cfd175f48e74e1ef97b7`.
The ordinary npm lock changes only that input; package/runtime versions remain
unchanged. Final type/build acceptance uses these generated members. A published registry SDK containing these members is
required before WebUI merge. Any Ruby policy, even a constant observation-only
file, requires compatible readers first; keeping the static absent-file fallback
avoids sending unknown values to unverified older clients. No React migration.

The initial six-file focused runtime run passed 88 tests. It covers unknown
limits/status without historical substitution, evaluation none/recorded/error,
old-API hiding, scoped links, warning/outcome versus six mail states, malformed
output and null preservation through actual SDK/XHR. These results do not certify
the pending new generated declarations, a real backend, browser appearance or
mail delivery. After the accepted copy and old-summary capability guard changed,
the four affected rendered/model/filter files passed 67 cases. Against the final canonical SDK, application types, eight focused files / 107
tests, E2E core types (206 checked / 108 deferred), design docs and standard Nix
dependency prefetch passed. The first typecheck failed only on test dictionary
index types; precise catalog/case types fixed it without changing emitted test
JavaScript or assertions. No later checks ran in that failed batch. The temporary
private no-save SDK installation drifted unrelated dependencies; no checks used
that tree. Ordinary HTTPS lock adoption and npm ci restored the canonical graph
before the successful final batch. Longer build/browser and independent final
review remain pending;
the previous package's hosted/Nix/browser receipts retain their original scope.

The locked terminology reference is vpsAdmin
`a65a4dfeb92a59df4a80a737a20bcbf8558793ff`. The lead completed the required English/Czech pass over all 29 changed keys per
locale; exact accepted strings are used. Pending actions are checked against
current settings before execution, in addition to new-event evaluation. Existing external KB
contracts certify legacy PHP, not React. The KB owner receives the list/detail/
navigation impact; no external KB change or new screenshot certification is claimed.
Nothing is merged or deployed. Publication waits for combined independent source
review because the existing workflows automatically run browser suites.
