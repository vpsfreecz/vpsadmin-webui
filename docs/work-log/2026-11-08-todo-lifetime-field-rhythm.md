# Lifetime editor field dimensions — 2026-11-08

Approved TODO UX-03 (`7c773db80dfa673c`), requirement REQ-010. The rendered
administrator VPS lifetime editor on source `2ef667e` has 36px desktop date
inputs beside 32px Clear buttons. Mobile WebKit already matches at 44px.
The exact administrator probe passed 8/8 cases and retained observed geometry;
the measurement establishes the desktop mismatch.

Use the shared medium Button size for the two VPS date-clearing actions
and the selected-user reminder Clear action. This matches 36px desktop inputs while preserving 44px coarse minima,
labels, roles, validation, null/omitted date semantics, reason and save/confirmation
handlers. Card header/log and other standalone compact actions retain their size.
No API, BFF, dependency, route or wording change.

The existing CS/EN expiration/reactivation browser scenario now uses dark/light
themes and asserts all four field/action heights whenever the editor opens.
Original renewal, clear-reminder, clear-expiration, payload and power checks
remain. A private matrix separately covers power summaries/drafts, lifetime
editor/clear/log and denied role/mode paths. Intercepted synthetic responses do
not prove live permissions/SSO or physical Safari/display behavior.

Both source `ci:quick` checks pass with the pinned Node 24.21.0/npm 11.19.0
and previously installed matching fixture dependencies. A bounded source check
confirms the runtime difference is exactly two size attributes. No hook framework
is declared. Clean Nix packages, exact packaged browsers, focused draft PR,
exact-head CI and guarded paired preview are pending at this writing.

Broad UX-03/04 remain partial; this component does not close the finite application
acceptance matrix. The separate completed storage audit passed 40/40 cases and
40 observed states at the unchanged `2ef667e` source.


## Selected-user reminder follow-up

A separate mounted administrator dossier probe confirms the same 36px input / 32px
Clear mismatch, with both controls 44px on mobile WebKit. All four CS dark / EN
light cases pass their presentation/clear checks on original `2ef667e`, without
submitting any user update. Include that single existing button size in the same
focused follow-up, preserving reason, preset, date, permission and save handlers.
The overview page remains 775 lines; its reviewed debt hash/rationale changes
without increasing the allowance, changing ownership or weakening removal criteria.
An additional source browser test measures the pair, clears the reminder through
mouse/touch, verifies the empty local draft/disabled Clear and observes zero user
writes. This adds no public route, API adapter, dependency or UI wording.

The first VPS-only cumulative package `04e4686e` passed four clean Nix outputs and
an exact 20/20 browser batch, including four original expiration/reactivation
payload workflows and 16 administrator presentation cases / 40 observed states.
Its artifact, measurements and images retain that revision. The combined follow-up
needs fresh matching outputs, exact affected browsers and exact-head CI before
paired activation; earlier successful checks cannot authorize the updated head.
