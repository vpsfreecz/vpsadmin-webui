# CI locale module requests — 2026-11-08

REQ-009 and the fixture verification contract. Integrated preview793f had9/10
checks pass; mobileWebKit run42487086466 reached its40-minute job bound with619
selected cases. Completed results showed no assertion failure or retry; retained
artifacts contained396PNG/116JSON and no failed trace/video. This is a runtime
failure, not evidence that the interrupted suite passed.

The suspected cost is repeated HTTP loading of hundreds of small locale modules
in fresh browser contexts. Prepare the exact current catalog roots as two ES
modules in a separate ViteCLI process, then opt the CI fixture server into a loader
for the two resolved catalog roots (including compatibility imports). Normal development and production use their
original source paths. React remains in Vite development/StrictMode; no test,
worker, timeout, retry, request assertion or API contract is removed or changed.
No dependencies or locale values change. A complete source-versus-bundle parity
contract and configuration isolation check pass. Controlled browser probes pass4/4 before and4/4 after, with253 catalog requests
reduced to3 and complete value parity. Individual render timings on the shared
host vary; full exact-head CI must prove completion within the unchanged bound.
The first48-case cold-start check had47PASS/1first-page setup timeout; retain
its trace and use an explicit readiness endpoint after common module warmup.
No assertion timeout is extended. The corrected48-case source check passes across Chromium/mobileChrome/WebKit,
using the real repository web-server command, unchanged90s/15s budgets and
zero retries. The initially imported version guard treated hostargv as a version;
run that CLI guard in its own process as well. Earlier failed attempts are kept
as setup diagnostics. Full exact-head CI is still pending.

Vite7 documents the many-module request cost in its dependency pre-bundling
guide. Merely listing local source paths in optimizeDeps.include is ineffective
for relative imports (upstream issue23430), so this explicit fixture-only catalog loader
has an observable request-level contract. Terminology remains selected by locked
vpsAdmina65a4dfeb92a59df4a80a737a20bcbf8558793ff; no visible wording changes.

Prepared only; no merge or production/preview activation is implied.
