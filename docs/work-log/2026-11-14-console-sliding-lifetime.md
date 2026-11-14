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
