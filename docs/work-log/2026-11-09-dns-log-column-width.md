# Bounded DNS log columns — 2026-11-09

The approved UX-03/04 presentation audit found a REQ-010 layout defect. A clean
083d diagnostic with valid DNS labels of 63, 63 and 45 characters measured a
1,273 px name column and only 94 px for change details. Local table scrolling
prevented document overflow but left the JSON squeezed into a thin strip.
Original screenshots, metrics and eight intercepted diagnostic cases remain in
the local DNS owner/record integration evidence folder.

Bound the desktop name cell, wrap the complete name and reserve 16 rem for change
details. Keep local horizontal scrolling at narrower desktop widths. Mobile
cards, values, filters, queries, pagination and transaction links are unchanged.
There is no localization, API, BFF or dependency change.

Pinned source `ci:quick` and the production build passed. After correcting fixture
preferences, final strict E2E type and formatting checks passed. The regression
covers CS/EN, both themes, member/admin aliases and desktop widths of 768, 1024
and 1440 px; each case also checks mobile cards at 390 and 320 px. Chromium and
mobile WebKit passed all 24 corrected cases in 1.3 minutes. The old clean 083d
build fails the new column bound. Four implemented original images were reviewed.
Full names, JSON, links, measured columns and zero writes are checked.

The initial 24 cases failed because the fixture saved intercepted UI preferences
remotely. Explicit local preferences corrected the setup. The zero-write guard,
timeouts, retries and origin constraints were retained. All failed artifacts
remain available. The prototype uses source-equivalent 13a dirty metadata; it is
not clean Nix or deployed evidence. Exact CI and clean paired preview gates are
still pending. Neither broad task is complete. No live permission, OAuth,
physical-display, physical-Safari or whole-WCAG acceptance is claimed.
No merge, production, newadmin, held DNS work or model choice is included.
