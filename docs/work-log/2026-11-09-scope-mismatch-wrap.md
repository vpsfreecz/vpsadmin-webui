# Wrap long dataset identity messages

Approved UX-03 7c773db80dfa673c / REQ-010 continuation.

A finite fixture audit of the clean 8c2d2120 preview found two identity messages
that overflow narrow layouts: the staff My-view ownership-mismatch paragraph
and the dataset management identity hint reached after expansion redirects.
Desktop measurements were 532 px and 424 px respectively at a 320 px viewport.
The latter contained a 390.953 px text fragment inside a 254 px hint. Mobile
WebKit also reproduced both failures. Normal detail headings already wrapped.

Add overflow-wrap:anywhere to those two existing text elements. Preserve full
values, translations, ownership checks, owner hints, safe admin routes,
query/hash, Back destinations, management fields, actions and API contracts.
The shared card remains usable by its existing callers; held DNS work is outside
this change. The explicit PR243 dependency is already in both current previews.

Pinned quick checks (including type, design and structural audits) and the
production build passed. Four meaningful 320 px regressions were appended to
an existing strictly checked browser file: both dataset/NAS aliases, full label
and inner text containment, exact mismatch navigation and focus. All eight
Chromium/mobile WebKit executions fail on clean 8c2d2120 and pass on a dirty
current-preserving prototype with only these two runtime transforms. A separate
24-case fixture subset covering CS dark/EN light, admin/support My-view
mismatches and four expansion-redirect aliases also passes on that prototype.
Those fixtures are not live permissions or API mutation evidence. Existing
finite-audit observer mistakes about busy-label text and first-read stale data
are corrected separately; they are not product fixes in this change.

Evidence is retained under the private todo-scope-mismatch-wrap-20261109 and
todo-dataset-shell-finite-audit-20261109 task directories. The prototype does not
provide clean Nix acceptance. Focused draft CI, clean integration, paired
activation and protected TODO publication remain required. Both active previews
remain on clean 8c2d2120, containing the separate PR253/254 fixes. No merge,
production deployment or broad UX-03/04 completion is claimed.
