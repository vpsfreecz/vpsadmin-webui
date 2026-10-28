# Dev-only mobile touch follow-up preview

Date: 2026-10-28. Status: deployed and verified on dev; PRs remain open. REQ-010/012/051/063.
The maintainer requests mobile Safari investigation, a focused fix PR and its
deployment to dev.crucio.cz. Main and production remain outside this scope.

## Selected source and contract

PR99 head: `8cbb35952255068f59e45a4a57ee1d7197c96da5`. It contains only
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

The initial candidate `31e9dd27` was staged but never activated: exact-head
CI rejected the two Linux WebKit resize setup cases. The trace and follow-up
are recorded in the feature work log. Preserve the strict first-touch assertion,
wait for resized dialog/popup visibility before the one scroll, and build a
new clean candidate containing the test-only correction. Runtime source has
not changed. Dev remains at `3f77b8f5720a` until the updated exact head passes.


## Development-machine execution preference

The maintainer requests browser acceptance on the development machine against
`https://dev.crucio.cz` when feasible, instead of their MacBook. Subsequent
browser runs in this task execute on `admin.crucio.cz`, which serves dev.
Use task-owned `/data/webui-browser-runner` checkouts, dependency/cache/image
storage and results outside serving releases. The host README records the
runner entry point and evidence boundaries. Prefer this runner for subsequent
dev acceptance; record a reason if a workstation fallback is necessary.

The isolated runner uses official Playwright 1.61.0 Noble image ID
`753f831a898523662c36011748ba0729b59838745d577c61c91287fe1778bfe1`,
matching the repository browser package, with the locked Nix Node 24.21.0/npm
11.19.0. It drops capabilities, uses no-new-privileges, mounts only runner data
and read-only Nix store, limits affinity/workers to two and installs no container
daemon or host OS upgrade. All large image data is on `/data`. A task-local
registry policy is visible only in a private mount namespace; global host
configuration, services, VM storage and credentials are not changed.

Before activation, remote Linux runs passed three small-screen navigation
checks, 24 cold-document member/admin and cs/en checks (three navigations each),
and 12 checks holding the actual TransactionChainsPage chunk until the drawer
closed and loading state appeared after one raw tap. The last probe's first
version failed six WebKit setup assertions: it incorrectly required cached
module scripts to be fetched again on a second document. Retained traces show
successful navigation. Fresh independent contexts passed all 12 without tap
retries. The exploratory probes remain in the task-owned runner, not the
application or a claim of real OAuth coverage. Intermittent physical iPhone
menu behavior is still not reproduced and is not claimed fixed by PR99.

## Exact activation

All six required checks passed on PR99 `8cbb3595`, including Linux WebKit.
CI runs: [browser matrix](https://github.com/vpsfreecz/vpsadmin-webui/actions/runs/40618085929)
and [required checks](https://github.com/vpsfreecz/vpsadmin-webui/actions/runs/40618085934).
PR97/98 exact heads also retain six successful checks each. No PR was merged.

Combined preview `91ac3f64cb9244deb20a520c3108c30c15e58b59` passed ci:pr
(226 script, 57 BFF, 1,893 unit tests and build) and 105 source browser checks
with 26 device-mismatch skips before the execution preference was changed.
Clean Nix frontend/BFF plus provenance, source-contents, package-contents and
module-eval checks passed on the development machine. Packages:

- Frontend `/nix/store/ixacyz2z88b71z0lrwkqb3hxibq5n4g3-vpsadmin-webui-frontend-1.0.0`
- BFF `/nix/store/04512d3m24zcxhafs5vihrg74l9xaby1-vpsadmin-webui-bff-0.1.0`

Activated matching portable copies under
`/data/webui-mobile-touch-final-20261028/releases/91ac3f64cb9244deb20a520c3108c30c15e58b59`
after manifest/provenance/service-credential preflight and nginx validation.
The existing deploy lock rechecked running `3f77b8f5720a`; both frontend and BFF
were switched as a pair with automatic rollback to that revision on failure.
Runtime cwd, health, metadata, retired credential-variable absence and unchanged
nginx/systemd hashes passed. The other BFF unit remains active.

Real anonymous remote Chromium/mobile Chrome/mobile WebKit checks passed:
revision, separate dev API origin, About provenance, public menu first taps,
language switches, admin denial, no horizontal overflow/JS errors and JS MIME.
The auth endpoint smoke passed. Production sites remain `2d361c571eac`.
Remote served-bundle acceptance passed 105 cases with 26 intentional device
mismatch skips, then 36 independent cold-menu/held-chunk cases in WebKit and
mobile Chrome. All use zero retries. Together these protect lookup geometry,
keyboard/Escape, first-touch navigation, task inspection/polling, compact history,
transaction identity/pins/percentages, rejection/cancellation and responsive
workflows. API/session data remains synthetic; this is not a live member/admin
permission audit or physical iPhone certification. No further menu runtime
change is justified by these passing scenarios.

Final read-only inspection confirms frontend metadata and running BFF cwd both
match `91ac3f64`; the other BFF is active. Evidence and probe traces are retained
under `/data/webui-browser-runner/evidence/mobile-touch-20261028`, with final
browser results under the served harness's `e2e/deployed-results` and
`e2e/deployed-menu-results`. The runner README records the pinned invocation.
The earlier staged `31e9dd27` remains unused; its failed CI is not counted as a
successful deployment. No main merge or production update was performed.


Implemented deployed-bundle captures below were taken by the Linux runner on
dev at `91ac3f64`, using browser-local synthetic users/API responses:

- [Mobile WebKit lookup](assets/mobile-touch-dev-20261028/lookup-mobile-webkit.png)
- [Desktop lookup](assets/mobile-touch-dev-20261028/lookup-desktop.png)
