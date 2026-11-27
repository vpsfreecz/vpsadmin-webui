# Make VPS diagnostic links recognizable — 2026-11-18

DIA-02 / REQ-051. The maintainer delegated the remaining model choices to
best judgement. Keep the existing Diagnostics card and use standard secondary
link buttons instead of small filter-like chips. Preserve all three existing
VPS-context destinations and the surrounding overview/recent-report behavior.
No new navigation section, API request, mutation or permission change.

Use existing CS/EN catalog wording. Locked terminology reference
is vpsAdmin a65a4dfeb92a59df4a80a737a20bcbf8558793ff; both guides read.
Focused checks, browser tests, CI and paired preview are pending separately.
Browser cases cover CS/EN, member/admin and desktop/mobile keyboard/touch
behavior with isolated API/session fixtures, not live account permissions.

The first native browser matrix showed the original overview omitted the
diagnostics card for administrators. Make the three actions visible in both
member and full-administrator overviews. Retain the support admin-view
exclusion,so the new card does not advertise administrator rule controls to
a read-only role. Expanded18-case matrix includes that negative scope guard.
Original failed traces/logs remain available; nothing was pushed yet.
