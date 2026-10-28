# Dev-only mobile touch follow-up preview

Date: 2026-10-28. Status: prepared, activation pending. REQ-010/012/051/063.
The maintainer requests mobile Safari investigation, a focused fix PR and its
deployment to dev.crucio.cz. Main and production remain outside this scope.

## Selected source and contract

PR99 head: `3a453543ea000730f4f657920951d9f56767d06d`. It contains only
user/node popup bounds, touch regression coverage and documentation.
Preserve already-previewed PR97 `f4305412` and PR98 `7dc259c7`; no other
PR/input/API work is included. The preview merge resolves only shared work-log
and adjacent requirements prose, retaining the new lookup contract and Tasks
no-pinning requirement. No application-source conflict.

Observed paired running dev revision before preparation:
`3f77b8f5720aa821c85e6676228a8880338066e2`. Recheck under the existing
deploy lock; retain that pair for rollback. Keep settings, sessions, credentials,
nginx/systemd configuration, other services, VMs and separate dev API intact.
Use clean matching Nix frontend/BFF artifacts built under isolated /data space.
Require exact PR99 CI, combined checks and candidate settings preflight before
activation; verify auth/runtime, anonymous browsers and served-bundle fixtures
after activation. No npm installation in a deployed release or global GC.

## Evidence boundaries

The [feature investigation](2026-10-28-mobile-safari-first-tap.md) records
48 passing deployed touch/workflow checks, 20 passing additional actual-touch
Tasks/Transactions checks and the specifically reproduced footer occlusion.
It does not identify every intermittent physical iPhone tap failure.
Fixture sessions/API are browser-local, with no authenticated live mutation.
Record actual CI, artifact paths, runtime pin and post-deploy results below.
