# Action state filter dimensions · 2026-11-07

Continued approved TODO UX-03, review7c773db80dfa673c, under REQ-010/073.
Match help, visibility choices, ordering, advanced, refresh, copy and clear to
the 44px smart field using local classes. Preserve taxonomy, permissions,
search, ordering, pagination, dialogs and cancellation. No API or text changes.

The browser matrix checks both languages and themes, member/admin/My/support,
long Czech labels, desktop Chromium and mobile WebKit, geometry, dialog/focus,
keyboard visibility selection, exact link copy, refresh and clear retaining order.
Existing keyset and taxonomy scenarios remain relevant regression coverage.
These are synthetic intercepted fixtures, not live API permission evidence or
physical Safari. UX-03 remains partial pending the finite application audit.
Validation and preview activation are recorded after execution.

Both branches passed `npm run ci:quick` after correcting the new E2E
registration to the required adopted inventory and explicit TypeScript roots.
The first failed quick logs remain in private evidence; checks were not weakened.
The exact previous clean artifact passed all 32 browser scenarios. The changed
working artifact is being verified with the same matrix. Clean package/CI gates
remain mandatory before any paired preview activation.
