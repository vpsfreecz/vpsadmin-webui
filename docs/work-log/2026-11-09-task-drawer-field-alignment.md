# Tasks drawer filter dimensions — prepared

Approved TODO UX-03 `7c773db80dfa673c`, REQ-010. In the actual clean
95ba30538 package, a filled Tasks drawer filter renders its input at 36 px and
Clear search at 32 px on desktop, with a 2 px top-edge offset. Four desktop
member/admin-view CSdark/ENlight scenarios reproduce the mismatch. Four
mobile WebKit cases already render both controls at 44 px. All eight preserve
clear-query behavior and have no API writes. This is fixture presentation
evidence, not live permissions or physical Safari proof.

Change only the Clear search Button size from sm to md. The adjacent Input
already uses md. Keep text, filtering, task/transaction requests, role scope,
drawer behavior, auth, BFF and API unchanged. The explicit existing PR243
dependency is already deployed; it prevents the old focused base from
reintroducing its known independent OOM pagination race in CI.

Baseline evidence: todo-appshell-chrome-audit-20261109 under the private
/data/webui-browser-runner/verification-20261103 runner. Source-only until
current-preserving prototype, focused checks, clean package and exact CI
are complete. No activation, production deployment, merge or approval.

Focused pinned ci:quick and production build pass. Baseline8 collected
scenarios and both actual desktop/mobile CSdark originals reviewed; four
desktop mismatches are expected defects, not acceptance. Clean current
integration, exact dimensions/clear behavior and CI remain prerequisites.
