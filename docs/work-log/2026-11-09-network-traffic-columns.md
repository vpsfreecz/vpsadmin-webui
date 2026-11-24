# Administrator traffic-table columns

Authorized UX-03 7c773db80dfa673c / UX-04 d5847413b2b70eae presentation
audit reproduced cramped table headings and touching totals at320px on exact
preview96b4b144, using synthetic long Czech names and traffic data.

Use the existing720px medium table minimum and local cell padding. The
existing TableCard scroller contains the width; desktop retains its full
container. Preserve data, year/month filters, cursor paging, scope, roles and
API contracts. No shared table CSS or localization changes. REQ-010 applies.

The existing networking-surface browser regression now checks320px document
containment, separated header cells and an actual usable local scroll.
Verification is pending. A prepared branch is not a deployed result. Both
broad TODO tasks remain partial. No production, approval or merge action.

Pinned focused quick/type/design/strict-browser checks and build pass.
The same existing regression fails on the actual96b package in both engines
and passes on the dirty current96b prototype with only this local layout
change. These are intercepted fixtures, not clean-package or deployment
evidence. Fresh clean Nix, exact CI and paired preview gates remain.
