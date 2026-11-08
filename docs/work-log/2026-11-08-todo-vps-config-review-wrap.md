# Wrap long configuration review values — 2026-11-08

Approved UX-03 / UX-04, REQ-010 and REQ-023. Actual ce3 rendered populated
resolver/map drafts reproduced horizontal overflow at 320px: Chromium343px and
mobile WebKit328px. Both original failed cases and screenshots are retained.
The long valid synthetic IPv6 makes min-content review tracks wider than the
available value box; the field selection itself fits before the review opens.

Let the inner review grid shrink and let before/after value text wrap anywhere.
Keep the complete address and labels; no ellipsis, hidden overflow or mutation
change. This shared ChangeRow appears in both page review and confirmation.
No live operation is submitted. The synthetic actor fixtures are not permission,
quota, OAuth, physical Safari/display or whole-app accessibility proof.

Source checks, exact-package browsers, CI and paired previews are pending.
The preceding news action change has its own focused draft PR210; the cumulative
candidate preserves it but this feature PR contains only configuration wrapping.
