# Request review queue state after returning through history

**Request / reason:** An approved application still displayed a claim that 48
applications remained after revisiting its detail. The detail trusted the
`reviewQueueActive` history flag and counted the saved list-page IDs, including
the current application, independently of their current backend state.

**Change / decision:** Remove the numeric queue claim in both languages. The
saved IDs support sequential navigation, but are neither a live queue count nor
the total number of waiting applications. Show the compact next-request checkbox
only for an awaiting request opened in queue mode, after its current-state fetch
finishes. Refetch the detail on every mount, including browser-history return.
Reconsidering an already-resolved request returns to its list instead of silently
resuming an obsolete queue. Normal decisions on awaiting requests retain the
chosen next-request preference and the existing per-candidate state preflight.

**Requirements:** REQ-034, REQ-035 and REQ-038; see the updated requirements and
workflow contracts. No API, backend, deployment or other open PR is changed.

**Localization:** Read the terminology guide and localization procedure from
locked vpsAdmin revision `a65a4dfeb92a59df4a80a737a20bcbf8558793ff`.
Only the misleading remaining-count key is removed from English and Czech. The
administrator-only behavior does not change member-facing KB navigation.

**Verification:** `npm run ci:pr` passed with the pinned Node 24.21.0 / npm
11.19.0 toolchain in an isolated test directory: all audits and type checks,
222 script tests, 57 BFF tests, 1,648 unit tests and the production build.
The build retains the existing large-chunk advisory. Component regressions cover resolved and
pending-correction states with an old 48-item history snapshot, plus the awaiting
preference. Browser regressions cover Czech and English history return after
another administrator resolves a request, supported reconsideration, and normal
sequential review with opting out. Fixtures are synthetic; they do not certify
real API mutations. The touched browser spec is adopted into strict E2E type
checking (21 adopted, 224 deferred); its existing fixture inference errors are
fixed without changing the fixture behavior.

Browser verification passed for 9 desktop and 8 mobile scenarios, including
both language variants of the new history regression. Executed against
`e2e/specs/admin/requests_operations_smoke.spec.ts` using the pinned Playwright
wrapper, with `--grep "history return|sequential review|successful detail review|resolved|queue"`;
mobile additionally uses `--grep-invert "advanced filters"`. Test accounts and
API responses are fixtures; no real registration was changed.

**Status:** Prepared for review; not merged or deployed.

Synthetic implementation screenshots (decision card after history return):

- [Desktop](screenshots/2026-10-03-request-review-queue/desktop.png)
- [Mobile](screenshots/2026-10-03-request-review-queue/mobile.png)

The first history regression needed to wait for the list to render before going
Back, otherwise rapid navigation could be batched without unmounting the detail.
A broader browser selection also mistakenly ran the existing desktop-only
advanced-filter test on mobile; it expects the hidden desktop table row and fails
there. Its desktop run passes. The supported selection excludes that case on
mobile; no unrelated product behavior or existing test assertions were changed.

## Release preparation follow-up

The full GitHub smoke run found a second queue spec still asserting the removed
numeric label. Updated that expectation to verify the active preference and
actual next-request navigation. Adopted the spec into strict E2E checking
(22 adopted, 223 deferred), including an explicit incoming-payment fixture body
type. The earlier targeted run did not include this independent smoke spec.
The corrected spec passes all four desktop/mobile request and incoming-payment
cases; strict E2E type checking also passes.
