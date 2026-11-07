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

The complete omitted-filter survey found three more desktop mismatches: host
addresses, IP assignments and live-network filters had 36px fields beside the
VPS lookup at 44px. Keep that lookup intact and match adjacent fields and Clear
locally to 44px. Query normalization, read-only support and owner policy remain
unchanged. Four other omitted legacy filters already matched and are untouched.

## Adapting to current main

The preceding focused evidence describes the experiment-based PR198. In the
release integration, main has removed unsupported user-data free-text search and
Advanced/help controls. Those controls are not restored. Retain main's format-only
filter, match Copy/Clear/Create to its 36px desktop reference, preserve shared
44px touch targets and wrap the action group. Namespace/map controls remain 44px.
The adapted role/query cases exercise the real format filter, assert no unsupported
query is sent and the removed controls are absent, retain keyboard/copy/Clear/320px
checks, and preserve all namespace help/advanced scenarios. Final source checking
covers 192 E2E leaves; the seven runtime changes pass a syntax-tree comparison
that excludes only className/size and insignificant JSX whitespace. No request,
permission, handler or API behavior changed. Final packaged evidence is pending.
