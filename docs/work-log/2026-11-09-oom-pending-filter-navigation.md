# Preserve OOM filters during pending router publication

Prepared as a release-blocker correction for approved UX-03/04; REQ-046.
Not merged or deployed. The blocker was found while verifying PR241.

The exact PR241 CI trace shows a filtered OOM API request using `/system.slice`
while Next rewrites the browser URL to the older `/preserved.slice` and drops
all other exact filters. A clean current 1bb fixture run with 6x Chromium CPU
throttling reproduced 4 failures in 8 executions. Diagnostic-only instrumentation
then reproduced 2/2 and showed Next's closure with new local filter values,
old router params and an already updated browser URL. This is a product race,
not evidence of a real authenticated API failure.

Let callers provide applied navigation params to the keyset hook. Explicit
pagination and page-size changes use this snapshot; automatic normalization
and URL hydration continue using router params. OOM reuses its existing filter
serialization for URL writes and explicit navigation. No window-location
fallback, API, permission, role, filter, presentation or locale changes.
Other callers retain their existing behavior.

Two deterministic Next/page-size regressions fail before the fix, alongside 4
passing existing pending-navigation/history tests. All 6 pass with the prototype.
The existing browser scenario now checks every exact URL filter after Next,
retaining all API and Back/Forward checks. The current-preserving dirty prototype passed 8/8
identical slowed browser
executions with no retries, including API filters, exact URL and Back/Forward.
The modified browser spec is fully adopted into strict E2E typing, retaining
the immutable baseline and other deferred entries. Only required record-index
accesses are corrected; PR150 accessibility changes remain excluded.
All 18 focused hook, pagination UI and OOM semantics tests pass. The full
fixture OOM scenario passes 12 cases across Chromium and mobile WebKit.
Pending clean integration, clean Nix and CI verification.

PR150's overlapping OOM hunks concern inline errors, toast/header copy and test
typing. Those changes were inspected and are excluded here. No duplicate focused
pagination-race PR was found in the current open-PR inventory.

Private durable evidence: `/data/webui-browser-runner/verification-20261103/
todo-oom-navigation-race-20261109/actual-acceptance-report.md` on the dev host.
Fixtures do not certify live permissions, physical Safari or final user review.
