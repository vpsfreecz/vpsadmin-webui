# Keep signed-in status reading inside the application

## Problem and decision

The maintainer reported on 2026-11-07 that clicking Outages or Security advisories
removed the application sidebar and account/task controls and showed the public
return-to-app navigation. The supplied screenshot shows that public outage
layout, including a sign-in hint despite an authenticated session. The explicit
request authorizes fixing this behavior and the established two preview targets.

## Change

Read-only list/detail routes reuse existing status content under AppShell at
`/app/outages` and `/app/security-advisories`. Sidebar, dashboard, detail/back and
related-outage links keep application context. Support reads published advisories
under `/admin/status/` while existing administrator management remains protected.
Shared public status URLs redirect authenticated visitors to the matching reader,
keeping query/hash and router basename. Anonymous public URLs remain public.
The authenticated outage reader suppresses the irrelevant sign-in hint in both
languages without new catalog wording. Locked terminology input revision:
`a65a4dfeb92a59df4a80a737a20bcbf8558793ff`.

The coherent public route group and reusable literal reading-route array move to
`statusReadingRoutes.tsx`. The main router is now below500lines; its obsolete
exact-content structural exception is removed. Route inventory includes the new
module and is regenerated. No exception or budget increase is added.

## Verification and boundaries

Initial focused unit run:47passed across sidebar, public redirect and four status
pages. New routed browser coverage checks member, administrator My view, support,
existing administrator management, CSdark/ENlight, list/detail, reload, Back,
related links, shared query/hash URLs,320px overflow and zero status/VPS writes.
Browser and clean-package results are pending until recorded below; fixtures do
not prove real API permissions or physical Safari. Existing public/role-gate
regressions remain applicable. No API/BFF, dependency or production change.

Both dev.crucio.cz and clankerdev.vpsfree.cz are authorized preview targets;
Clankerdev reads production API, so live validation must remain anonymous and
read-only. Deployment requires all six checks on the focused PR head, exact
clean-package verification and current runtime/API/OAuth guards with rollback.
Current deployment has not yet been changed by this feature.

External KB navigation/screenshot impact needs review; the referenced separate
vpsadmin-kb-captures checkout is unavailable under the recorded workspace paths.
No external documentation is claimed updated by application tests.
