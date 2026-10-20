# 2026-10-19 — Compact IP inventory actions

## Change and rationale (REQ-050)

The maintainer approved the existing IP action icons but requested removing
visible labels and placing all four controls next to each other. The desktop
list and mobile cards now use one compact icon row for incidents, assignment
history, editing and VPS attach/detach. Localized titles and accessible names
remain. The desktop action column reserves space for the controls instead of
24% of the table. Touch controls keep a minimum 44px target; icons remain 20px.

This supersedes the labeled-action layout in the earlier IP inventory change.
Routes, permission checks, confirmations and API calls are unchanged.
No translation wording changes. The localization guide was already reviewed
at locked vpsAdmin revision `a65a4dfeb92a59df4a80a737a20bcbf8558793ff` in this
conversation. Local Nix is unavailable; checks use the Node 24 fallback and
root dependencies installed with `npm ci`.

## Verification

- Typecheck, 1,859 unit tests and production build passed. The existing
  large-chunk warning remains.
- All 22 applicable IP inventory Playwright cases passed in desktop Chromium,
  mobile Chromium and mobile WebKit; two existing desktop-only pagination cases
  are skipped on mobile. Coverage retains all four destinations, keyboard and
  first-tap navigation, accessible names and titles, and verifies empty visible
  labels, one-row alignment, compact gaps, 44px touch targets and no document
  horizontal overflow.
- The final column-width adjustment was checked again with the action/navigation
  case in desktop Chromium and mobile WebKit.
- Lint, scoped formatting, E2E core typecheck, design documentation and diff
  whitespace checks passed. No hook framework or custom Git hook path is declared.

Implemented UI with local synthetic fixtures (not live deployment evidence):

- [Desktop](../design/images/ip-actions-compact/chromium.png)
- [Mobile WebKit](../design/images/ip-actions-compact/mobile-webkit.png)
- [Mobile Chromium](../design/images/ip-actions-compact/mobile-chrome.png)

## Delivery

Prepared on `dev/ip-actions-compact`; not merged or deployed.
