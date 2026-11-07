# Main and approved preview integration — 2026-11-07

The maintainer requested a release candidate for newadmin, then explicitly asked
to adapt our UI changes to Aither's current main, give his behavior priority,
deploy the verified integration to both preview hosts, and test it thoroughly.

## Source and compatibility

Production was clean `babe51421bd1df61a548e7b2f047053df14ff3eb`;
both previews were clean `594337ab62a9cf4a054ecf9f9775b693f1ec20bf`.
Main `47b6992e28c16585aa6247bd75413637a7ca6388` adds the SDK release prerequisite
documentation beyond production. Production and preview had 52 and 91 commits,
respectively, after their common ancestor. Deploying preview unchanged would
lose production client migrations and API/fixture corrections.

The isolated candidate starts at current main and integrates the preview history.
It preserves main's HaveAPI 0.32.0 and published SDK 0.4.0, request policy,
guarded advisory writes and canonical wire fixtures. Public overview advisory
summaries now use the generated anonymous operation and the same domain narrower.
Picker names use the API's canonical `name` field. Missing status/telemetry values
remain unknown; unsupported historical disk telemetry is not fabricated.

SDK 0.4.0 does not declare `payer_account`, `expiration_change` or
`include_expiration_changes`. The maintainer's explicit precedence decision
means the candidate retains main's payment contract: the extra payer-account
row and manual-expiration event extension are held until a matching published SDK
and compatible backend exist. Their original preview history and backend data
are preserved. Ordinary payment history, account updates, review, permissions
and pagination remain. No hand-written SDK descriptor or dependency override is
introduced. This is a release scope limitation, not proof those features work.

Terminology remains bound to locked vpsAdmin
`a65a4dfeb92a59df4a80a737a20bcbf8558793ff`.

## Verification and state

Initial typechecking found stale imports, old API mocks, nullable values and
unsupported preview fields. Those errors were corrected without weakening strict
compiler settings. Required ci:quick checks passed, including strict application/tooling/E2E/BFF
types and audits. All 240 script tests and 58 BFF tests passed. The complete
unit run initially found one public URL parameter-order assertion, now corrected
to the SDK serializer. Packaged browser and live checks remain in progress.
The first served-package probe lacked synthetic BFF boot replies; its failed
startup is retained as harness evidence, not an API capability result.

No newadmin production activation or shared main merge has occurred.
The exact final source, test results, paired preview receipts, rollback and
remaining release gates will be appended after verification.

## Latest verified preview filter batch

The concurrently authorized TODO worker verified and deployed clean
`f41af18b1de10126149ebd5d17c0f0c0c5102247` on both previews while this
integration was being prepared. The candidate preserves that history too.
Its 22 runtime files are checked against the already integrated main: only
JSX className/size attributes differ (excluding insignificant JSX whitespace).
Conflicts on Environments/Locations/OS templates retain main's filter behavior;
removed unsupported free-text and OS flags are not resurrected. The OS template
browser case now exercises the supported Advanced dialog instead of a removed
search-help control. Existing structural limits are retained and retired
exceptions removed. The union checks 188 strict E2E leaves with 113 deferred.

The first immutable browser snapshot also exposed old preview assertions for
mount type/default-map and old public-stat response namespace. These are being
aligned to the generated contract; original failures remain in the audit logs.
No compiler setting, timeout or retry budget was relaxed.
