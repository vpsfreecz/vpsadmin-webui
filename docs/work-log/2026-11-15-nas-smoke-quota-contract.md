# Align the NAS smoke test with the approved quota contract — prepared

The assistant-run final deployed-dev regression on cumulative `9d7daaf8` found
an obsolete assertion in `nas_smoke.spec.ts`: its fixture omits quota/refquota,
yet expected a percentage bar computed from used/(used+available). REQ-048 and
approved NAS-07/NAS-08 require numeric usage without an invented percentage.
The original failing report remains in the private final-dev audit evidence.
Existing draft PR270 is updated; there is no new application feature.

The replacement assertion keeps the numeric usage, owner row, primary-role query,
includes=user, advanced filter and navigation checks. It explicitly requires
both named limit rows to remain unknown, without a percentage, infinity or bar.
The complete existing capacity matrix continues to assert positive explicit
limits, zero/unlimited values, missing measurements and matching severity.
No numeric budget or positive-limit assertion is weakened.

Both mobile project names select cards. Legacy detail Show fixtures now use the
SDK's named dataset response while preserving every dataset field. Payload,
owner-selection exclusion, management navigation, empty/error and filter-clear
assertions remain. The whole smoke spec is adopted into strict TypeScript,
removing its deferred entry instead of changing a frozen hash or adding a waiver.
The missing-limit scenario joins PR smoke and mobile smoke selection, and the
whole file joins mobile WebKit's explicit file selection.

No src/, API, BFF, dependency, translation, role or mutation behavior changes.
The focused source begins at `41840f89`; cumulative integration may adapt only
the accessible link locator to NAS-06's already-approved mobile name prefix,
retaining the same dataset ID and destination. Focused and cumulative proofs
must identify their actual artifacts separately. All fixtures are synthetic;
they do not certify live permissions, backend timing or physical Safari.

Prepared only. Exact focused quick checks, native build, clean frontend/browser
proof and all six original new-head CI are required before preview inclusion.
No merge, production/newadmin/API deployment or builder access is authorized.
