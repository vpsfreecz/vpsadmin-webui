# Sidebar settings order — 2026-11-08

The maintainer requested the settings gear immediately before logout in the
signed-in account row (REQ-004, REQ-010). Move the existing preferences button
after the account button and before the logout link in DOM order, keeping their
handlers, labels, sizing and popup behavior. Keyboard order follows the visible
account → settings → logout sequence. No CSS reordering or new controls.

Update the existing sidebar browser suite to measure account/settings/logout
positions and equal icon heights, retain compact spacing, follow keyboard focus,
and exercise preferences, Escape, account navigation and session controls in
Czech/English, member/support/admin views, desktop/mobile and short viewports.
All mutation handlers are intercepted fixtures. Screenshots use synthetic users;
no live account/session mutation or logout is required. Pinned Node24 quick/type checks, all2,344 unit cases and production build
passed. All18 existing sidebar scenarios passed across Chromium/mobile Chromium/
mobile WebKit, two workers, zero retries. The updated geometric/keyboard checks
passed for member/support/admin fixtures in Czech/English and both themes,
including the320px drawer and short viewport. Desktop/mobile captures show the
implemented controls with synthetic data. Packaging and paired preview activation
are separate receipts; no newadmin deployment or merge is authorized here.
