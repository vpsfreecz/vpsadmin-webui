# NAS and dataset filter dimensions

Continue the approved UX-03 proposal 7c773db80dfa673c with a local correction
to the shared dataset list. The desktop smart input is 44px high while help,
advanced filters, copy and clear use 32px controls. Match the existing VPS and
transaction filter pattern: 44px controls and consistent button typography,
with a square help trigger and a minimum 44px advanced trigger. Keep chips
below the row and wrap actions on narrow screens.

Scope is /app/nas, /admin/nas and the administrator dataset list. No wording,
API, dependency, permission, owner, primary-pool, search, URL, pagination or
mutation changes. No held DNS work or global Button/FilterBar changes. Keep
UX-03 partial and retain the existing evidence for VPS and transactions.

Browser verification uses synthetic data in Chromium and mobile WebKit, in
CS dark and EN light. Check rendered geometry, active-chip alignment, keyboard
order, help and advanced dialog open/close, NAS/general filter visibility,
owner/role query parameters, exact copied URL and clearing. Permit only the
existing initial UI preference persistence; assert no dataset or other writes.
Before/after captures use the same clean baseline/candidate data and viewport.
Fixtures do not certify live API authorization or physical mobile hardware.
Check and deployment outcomes are recorded in the PR and local release record
after execution; this document describes a prepared change, not a production
release.

Local verification: both branches pass ci:quick and seven existing dataset-list
model tests. Twelve baseline and twelve changed-working-build Chromium/mobile
WebKit scenarios pass with the same fixtures (CS dark / EN light, member NAS,
admin NAS and admin datasets). The full geometry/keyboard/dialog/copy/clear
flow passes. TypeScript E2E coverage and design documentation audits pass.
Exact clean-package verification, public CI and activation remain separate
release gates. The initial browser checks needed corrections to the help
dialog title, retained pagination parameters and expected initial UI preference
persistence; no product behavior was changed to satisfy those assumptions.
