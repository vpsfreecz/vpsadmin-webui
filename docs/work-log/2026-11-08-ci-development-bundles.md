# Prepared development modules for CI — 2026-11-08

REQ-009. The first dictionary-only optimization passed the smaller main-based
CI selection but integrated661a again timed out at40min in Chromium and WebKit.
The linked user failure42477336973 remains a distinct, already fixed fixture
preferences issue in215. Both preview promotions were correctly blocked by the
independent final collector; EAE remains the actual paired runtime.

The replacement prepares unchanged application modules with the pinned Vite
compiler in a separate NODE_ENV=development process, preserving dynamic imports
and ReactDEV/StrictMode. Rollup's experimentalMinChunkSize150000 merges small
chunks without changing executed entry side effects; this is pinned tooling and
CI-only. Vite serves the prepared HTML/assets, with pre-transform disabled for
those already prepared assets. Normal development/HMR and production do not use
this path. No dependency, application source, API or production runtime changes.

The initial prepared graph passed all UI assertions and both React probes but
missed the experimental fewer-than60request target (98–99). Coalescing small
chunks fixes that fanout: same synthetic four-case trace-on probe now37–38requests
versus221–222, render7.1–8.7s versus9.8–12.4s on the shared pinned runner. Six
probe cases PASS;51actual-wrapper source cases PASS4.2min across Chromium,
mobileChrome and mobileWebKit versus the prior48-case5.7min. These are scoped
measurements, not a claim that the complete CI selection already passed.

The probe is a separate CI-only entry sharing the application's actual React
vendor chunk. It checks DEV=true/PROD=false/development mode and two render/effect
executions. All existing assertions, selection, budgets, two-worker limit and
failure diagnostics remain. No sharding or extra browser capacity. Two Node
contracts verify shared React, generated asset boundaries, traversal/API fallback,
HTML/probe serving, parent environment isolation and opt-out in normal development
and production. The first contract assumed a source-named manifest chunk; the
corrected check follows the actual manifest graph, retaining its initial failure.
New E2E coverage is adopted into strict typing. Source/production checks and
same-head full CI outcomes are recorded with the prepared revision and PR.

Root storage received the user's renewed explicit cleanup request: native
unreachable Nix GC freed6GiB with pinned profiles/configuration roots,10VMs and
service processes preserved. Root now has about11GiBfree; growing state is ondata.
No production/newadmin activation, PR approval or merge is authorized.

Reference: https://rollupjs.org/configuration-options/#output-experimentalminchunksize

Local source quick checks (including strict adopted E2E and tooling), all243script tests and the normal production build PASS. The source remains prepared; full exact-head CI and paired activation are still required.
