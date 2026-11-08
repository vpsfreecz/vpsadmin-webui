# Affected-outage error readability — 2026-11-08

Approved TODO UX-04 `d5847413b2b70eae` and UX-03 `7c773db80dfa673c`, REQ-010.

Actual EAE dark mobile WebKit evidence at `/admin/outages/42` shows small red
secondary-read errors directly on ordinary blue resource cards; the labelled
reduced-contrast simulation makes the weak separation especially apparent.
The source colors are danger239/68/68 on surface31/57/89, approximately3.1:1
relative-luminance contrast. This source calculation and visual inspection are
not a complete WCAG or physical-display certification.

Only `OutageAffectedTables` changes: use the existing semantic danger Alert,
localized `common.error` title and its readable body, with a local test ID.
Keep original error formatting, independent loading/populated/empty branches,
requests, role visibility and API behavior. No global semantic token change.

New strictly adopted Playwright coverage checks all three errors for CS/EN,
light/dark and admin/support, actual body/background contrast, long text at320px,
and zero writes. Include the spec in the existing mobile WebKit selection.
Source/fixture tests do not certify live API permissions or OAuth.

Verification is pending source checks and actual browser execution at this
preparation stage. Exact focused PR, clean Nix provenance, six exact-head CI
checks and paired-preview guards remain required before activation. Preserve
current preview contents if another authorized release advances while this fix
is prepared. No merge, production/newadmin activation or scheduler change.

Locked terminology guide: vpsAdmin input
`a65a4dfeb92a59df4a80a737a20bcbf8558793ff`; existing Error/Chyba catalog entries
are reused unchanged. No menu/navigation name changes; external KB screenshot
freshness is not certified by these local fixtures.
