# Complete filter-chip labels at narrow widths

Continue approved UX03 `7c773db80dfa673c` and preserve the bounded UX04 correction
in existing draft PR264. The actual8c residual audit found eight clipped
address/prefix labels at320; staged9aa still contains `min-w-0 truncate`. Full
values survive in the URL and advanced fields, but the selected-filter label
should remain readable without opening a dialog.

Replace label truncation with wrapping and prevent the removal button from
shrinking into the label. Keep labels, tones, callbacks, role/query/API/BFF
contracts and compact desktop/coarse-pointer minima unchanged.

Extend the existing strict source regressions for native/320/768 widths, full
text-range bounds, independent target bounds, retained address/prefix/marker
while other filters are removed, and three actual table/card rows: assigned
odd/even and unassigned warning. Keep the4.5 composited-text threshold.
These are intercepted fixture sessions, not live permissions or OAuth proof.

The first extended negative diagnostic also tried removing the address+prefix
chip itself. On unchanged clean9aa it removed only prefix while address stayed
in the URL/chip. Preserve that failure/trace as a separate functional finding;
this presentation change deliberately leaves both original setTextParam calls
unchanged. Whole IP consumer acceptance remains open. Do not claim that compound
callback as verified or silently change its contract in this style correction.

Evidence/task: /data/webui-browser-runner/verification-20261103/
todo-ip-chip-wrap-20261110. Broad UX03/04 remain partial with11 UI consumers.
Original PR264 ba6 CI flake and blocked9aa staging remain historical; new exact
CI, clean package and paired/TODO guards are required before any activation.
No merge/production/newadmin, scheduler or user-decision changes.

Working-source verification: pinned ci:quick/build passes for focused112/175
and integrated219/102 coverage. The unchanged bounded regression fails all8
cases on clean9aa because full address text exceeds its allocated label bounds
at320, then all8 pass on the working integrated source. Existing4.5 contrast,
query and interaction assertions remain; exact clean-package/CI/delivery still
require their own evidence. The original extra compound-removal diagnostic is
retained separately and does not certify that unresolved callback.
