# Account control presentation

Approved UX-03 reviewVersion `7c773db80dfa673c`, REQ-010/073.

The rendered desktop member profile had 44px smart fields beside 32px help,
advanced and copy actions in shared user-data and namespace/map lists. The
user-data create action was 36px. Local classes now match these filter actions
to 44px and let their groups wrap. Namespace and map searches collapsed to
the help icon at 320px; the shared search field now takes a full mobile row. The personal change-request action no longer
shrinks beside the explanatory paragraph, which wrapped its Czech label into
two lines inside a 36px button at 1440px. No global component or palette change.

Owner/query/role policy, API/BFF, text and dependencies remain unchanged.
Existing namespace structural debt is reviewed/rebound with unchanged line
counts, allowances, owners and removal conditions; no new exception.

Verification is in progress. Source checks and the focused fixture browser
regression cover supported query owners, matching dimensions, keyboard help
and focus return, advanced open/cancel, exact copied URL, clear and 320px.
Account presentation coverage additionally checks populated rows, open/edit
forms, mock rejections, both languages/themes, keyboard focus and explicitly
labelled grayscale/reduced-contrast simulation. This is not live permission
proof or physical Safari/weaker-display testing. No live objects created.

Prepared for focused draft review and paired previews after required checks.
No merge, production deployment or claim that all UX-03/04 scope is complete.
Actual checks, revisions and preview outcomes will be appended after execution.
