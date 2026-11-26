# OOM filter page reset in the integrated preview

Requirement: REQ-046. During the maintainer-requested Playwright acceptance audit,
changing the cgroup filter after Next fetched the first page but retained page 2
in the address. Chromium and mobile WebKit reproduced this on deployed D975.
The real-control regression comes from our existing main-target PR283, with the
current preview's stronger exact-filter assertions retained.

The integrated preview retains its pending-navigation filter snapshot bridge.
Its filter URL writer now removes from_id and writes page=1 atomically, instead
of racing the shared pagination hook's reset. URL hydration still follows browser
Back/Forward and does not reset visited pages. No API, owner or request contract
changes are required. No UI text or layout changes.

Status: prepared, not yet qualified or deployed. Existing PR283 is the focused
main-target review; this preview integration does not merge it or include other
contributors' pending work. Original audit failures are preserved separately
from replacement evidence. Complete checks and exact revision receipts must be
recorded after execution.
