# Bound account-menu width on narrow screens — 2026-10-28

Status: prepared review candidate; no merge or deployment. REQ-010/040.

Action-state breakpoint verification exposed a separate global header defect:
at768px, a longer admin account label extended the document to779px. The
account menu and other controls should remain reachable, including with
unbroken long login names and the administrator scope badge.

Let the account group/button shrink within available space, keep the icon's
touch target, truncate the displayed login to a bounded width and defer the
redundant role text until the wider desktop breakpoint. Existing click behavior, identity, accessible action label, scope and session
timeout remain unchanged. The full login value remains intact in account data.
Escape now dismisses the account popover and restores trigger focus; the trigger exposes its expanded state. No translations or catalog text changed.

A dedicated strictly typed PR regression exercises ordinary member, admin
personal view and admin view at320/390/640/768/1024/1280px. It checks document
bounds, first activation, menu visibility/bounds and dismissal in Chromium,
mobile Chrome and mobile WebKit. The exact original-source reproduction used the API-valid63-character unbroken
login and measured640px viewport/825px document. The initial broader probe
also exposed missing Escape dismissal. Both failures are retained. Final
Chromium/mobile Chrome/mobile WebKit checks passed9/9, zero retries, covering
54width/role/browser combinations. All8HeaderHarness unit tests, ci:quick,
production build, strict E2E and documentation/format gates passed. No
assertion or test timeout was relaxed. Synthetic implemented header captures
are attached to browser results, including768px and1280px views.
