# Console sliding lifetime — prepared 2026-11-14

Direct maintainer request FORUM-372-23 / REQ-020. The original Create response
expires after 60 seconds, while router traffic revalidates every 15 seconds
and renews backend expiration by 60 seconds. Legacy PHP keeps its iframe.
The React parent instead removed the terminal at the original timestamp.

Keep that iframe mounted and read the existing ConsoleToken Show action every
15 seconds. Show neither creates nor extends a token. Only an authoritative
403/404, a different returned token, or an already expired fresh response hides
the frame. An unavailable/malformed check warns and leaves router enforcement
in charge; it never starts a replacement loop. Explicit revoke and confirmed
replacement retain their existing mutation and uncertainty safeguards. Cached
entry and full reload still use at most one bounded Create, which may return
the existing backend token. Reconnect only reloads the current frame.

Terminology: locked vpsAdmin a65a4dfeb92a59df4a80a737a20bcbf8558793ff.
The cumulative preview uses SDK0.4.0 ConsoleToken Show; this focused base
retains its existing haveApiCall transport for the same GET path and response.
No new backend or SDK support is required. No backend permissions, lifetime, router cache or feed changes.

Verification:25 targeted unit tests and source/strict-browser typing, i18n,
design, lint, structural and API-barrel checks pass. The refined synthetic
console/power/support cohort passes59 tests with0retries; its first cohort
had50passes and1 ambiguous Czech Overview locator, fixed by scoping the
probe to the console header. These are fixtures only. Separate actual dev
legacy/new comparison is underway using new isolated accounts63/64, VPS75,
dataset87, namespace/map14; normal lifecycle cleanup is mandatory.

Further acceptance: synthetic
Playwright renewal, reconnect/navigation/reload, authoritative denial and
uncertain validation in CS/EN desktop/mobile; separate actual dev legacy/new
console comparison using new disposable objects and cleanup. Accelerated
fixtures are not live console or permission evidence. Exact focused PR CI,
clean builder-free Nix outputs and guarded paired previews are still pending.
No merge, deployment or completion is claimed. KB impact: console status and
lifetime explanation change; legacy navigation IDs/renderer remain unchanged.


Full focused quick checks exposed the existing VPS adapter test crossing its
500-line structural limit after adding Show assertions. Move its complete
console-token lifecycle case to a dedicated typed test file, retaining every
POST/GET/DELETE path, payload and token assertion without changing budgets or
CI checks. Original failure evidence is retained; rerun the complete focused
quick command and relevant tests/builds before the next push.


## Real isolated dev verification and cleanup — 2026-11-14

Both desktop Chromium and Linux mobile WebKit kept the same iframe/token
through75 seconds wall time beyond Create's original deadline. Router output
continued, with one initial token POST and no DELETE/replacement during renewal.
Reconnect and navigation reused the token; reload made one bounded Create that
returned that same valid token. Explicit UI revoke produced Show404; the router
rejected the old token after its normal revalidation interval. After a deliberate
new session and75 seconds away from the console, read-only Show at25/50/75 seconds
returned200/200/404; the router rejected the expired token. Re-entry created one
new token without deleting the already expired one. No virtual clock or synthetic
API/router in this cohort. It used clean cumulative22c static HTML/assets as a
browser overlay on dev with actual OAuth/API22adc/router/guest; it is not evidence
of a deployed preview. Earlier incomplete overlay probes are retained separately;
the final harness includes matching root HTML for the unchanged freshness guard.

The deployed48cc baseline reproduces premature removal after75 real seconds in
both engines while server renewal continues. Real legacy PHP authenticates and
creates its iframe, but dev's SAMEORIGIN/frame-ancestors policy blocks that iframe
from the separate admin origin. A same-origin parent fixture used the actual
PHP-generated console URL and continued real router traffic. The policy was
preserved; unmodified deployed legacy-page parity remains a stated limitation.

Only new isolated accounts63/64 and VPS75/dataset87/node101 were used. Normal
API deletion chain474 completed10/10; namespace/map14 were released by475.
Both accounts are closed/demoted, authentication and sessions/tokens disabled,
original budgets restored, old credentials rejected and browser credentials
removed. Historical closed accounts were not reopened. Root-only ownership
ledger is sanitized; the hard-deleted VPS audit row is intentionally retained.
No production, Clankerdev, existing user VPS or API activation was involved.

Full focused quick checks,25 relevant unit cases in3files and production build
pass after the test extraction; cumulative quick checks also pass after formatting
its edited e2e config. The original failed CI log is retained. Exact final-head
CI and guarded paired activation/readback remain required; no merge/deployment
or direct-task completion is claimed here. Durable evidence and practical limits:
`/data/webui-browser-runner/verification-20261103/todo-console-expiry-20261114/actual-acceptance-report.md`.

The original mobile CI also exposed the viewport fixture's missing read-only
Show handler. Its default fallback produced the new validation warning, so it
was not the intended connected-layout scene. Supply matching namespace-correct
POST/GET responses, require a successful validation and no warning, and retain
all original fit/scroll/keyboard bounds. Adopt the edited fixture into strict
checking and verify all console specs in all three browser profiles before the
coherent follow-up push. Original failed mobile logs remain retained.
