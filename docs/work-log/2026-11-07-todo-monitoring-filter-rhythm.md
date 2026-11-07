# Monitoring filter dimensions · 2026-11-07

The maintainer requested continued implementation of approved TODO UX-03,
review7c773db80dfa673c. Under REQ-010 and REQ-073, match monitoring filter help,
ordering, advanced, copy and clear to the 44px smart field. This uses five
local class changes only. No text, API, dependency, role or navigation change.

The fixture browser matrix checks CS/dark and EN/light, member/admin/My/support,
control geometry, keyboard dialog/focus, advanced values, owner scope, ordering,
exact copied URL, clear preserving ordering and 320px overflow. Existing duration
pagination coverage is retained. These are synthetic fixtures, not physical
Safari or a new live API authorization audit. UX-03 remains partial.
Exact validation and preview activation follow after execution; this is not
merge or production approval.

Both branches passed `npm run ci:quick`. The clean prior artifact and changed
working build each passed 16 Chromium/mobile WebKit checks across CS/EN
and member/admin/My/support scopes. Exact package and CI checks precede preview
activation. Existing unit coverage is unchanged for this local styling change.
