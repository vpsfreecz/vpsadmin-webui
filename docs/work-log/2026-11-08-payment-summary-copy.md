# Concise payment summary copy

The second original queued maintainer request removes the member Payments page
introduction, the default monthly-amount explanation and the payment-identifier
help sentence. Use the concise `VS / ID` reference label in Czech and English;
the shared administrator member-payment label follows the same catalog key.
Remove unused catalog entries instead of leaving invisible translated strings.
StatCard already supports an omitted description, so no shared component change
is needed. The numeric member reference, monthly amount, paid-until status,
history, API-provided instructions, copy actions and QR rendering remain intact.

Scope: REQ-052, presentation only. Main47b6992 and its published SDK0.4 transport
remain authoritative; no backend, wire shape or payment mutation is changed.
Localization procedure and both pinned guides read at vpsAdmin revision
`a65a4dfeb92a59df4a80a737a20bcbf8558793ff`. The effective production API reference
`b83b26e1ba1c8e869ae3ffbcb5801ed071c3844e` has byte-identical guides.

Read-only KB impact review uses the retained contracts snapshot
`f97785c2c265172a4c78893e0673034fde56e4dd`:
`member.payment-instructions.open` binds legacy Edit profile / Payment instructions
navigation and the Czech informace:platby page. This change alters React summary
copy, not those navigation landmarks, action or banking instructions. No managed
payment-summary screenshot concept was found in that snapshot. This is bounded
impact inspection, not a fresh full external KB contract or publication claim.

Verification: pinned ci:quick passes; existing payment model/HTML unit tests pass
35/35; working build passes in 24.2s. Clean c09 before captures pass 8/8 and the
focused working build passes 16/16 browser cases: CS/EN, light/dark, desktop
Chromium/mobile WebKit captures plus the original history lookahead, HTML
localization/sanitization and touch-safe instruction-copy regressions. Synthetic
values and a fixed clock; reference/amount/status stay visible, leading zeroes
survive copying, removed copy is absent and 320px containment passes. Desktop and
mobile implementation screenshots were visually inspected and shown during work.

The baseline is the exact main-compatible integration package; focused after
captures use the main-based working build, so their surrounding navigation is not
claimed as a final paired preview. Matching release-package and actual paired
activation/live checks remain required in the integration handoff. No merge or
newadmin production activation is authorized.
