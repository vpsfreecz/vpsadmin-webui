# Preserve host address filters across deferred router renders — 2026-11-24 UTC

The sharded integration checks exposed a real navigation race in the existing
host-IP filter alignment regression. After entering an address, immediately
changing assignment could preserve `assigned=true` while dropping `addr`.
The old handler copied a rendered `useSearchParams()` value after browser
history had already advanced and before React Router committed its next render.
Retries sometimes passed; that does not resolve the user-visible lost filter.
The merge was held despite successful retried jobs, and original logs/artifacts
are retained in the operational evidence.

Read current search parameters from the owned browser URL when updating or
normalizing filters, while retaining rendered-parameter fallback for memory
routers. Resolve the browser path through `useHref` so a configured basename is
respected, and ignore stale handlers after leaving that route. Clear preserves
the latest allowed page size. Keep scope generations, PTR protection, existing
API filter names, permissions, pagination rules and all user-facing text.

Extract the unchanged filter view into `HostIpAddressFilters` to keep the page
within its existing400-line structural bound. Its DOM, labels, control dimensions,
test IDs, lookup behavior and actions remain unchanged; no budget is raised.

Two browser-router integration cases batch address/assignment changes before a
render, at root and `/webui`. Both fail on the old page with lost `addr`, then
pass after the fix. They also assert the final browser/router URL and API filters.
The original browser assertion requiring both values remains unchanged; do not
replace it with a wait that tolerates a lost filter.

Requirements: REQ-046, REQ-050 and REQ-061. Exact clean-head quick/script/BFF/unit,
production build and targeted original browser cases with zero retries remain
required before publication, followed by all final-head and postmerge CI. The
older259native cases/source-equivalence at e1/5bad are historical evidence only;
this product change requires new exact-source host-filter proof. No deployment,
API activation, human TODO decision change or prohibited builder access is used.
