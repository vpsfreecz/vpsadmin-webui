# Stabilize the metrics-token browser fixture clock

During the authorized PR9–16 release, desktop smoke CI began failing after
2026-10-03 12:00 UTC: the fixture's active token was last used on July 5 at noon,
so it had crossed the product's 90-day stale threshold. Earlier same-day runs
passed. The application is correct; the test depended on the wall clock.

Set the browser clock to July 6 at noon for this spec, matching its fixture
creation timeline. Keep normal timers running and preserve all active/stale,
unused, token masking and revocation assertions. Adopt the complete spec into
strict E2E checking. No application, API or runtime configuration is changed.

Verification: all six desktop/mobile browser cases passed, as did strict E2E
type checking in the integrated candidate. Explicit fixture field types and
bracket property access resolve the previously unchecked spec diagnostics.
This is a release-validation repair, not a change to the 90-day product policy.

## Deployment follow-up — 2026-10-03

Merged and deployed to all three WebUI sites in clean release `f123a7fb`.
See the [completed release receipt](2026-10-03-three-site-release.md) for
exact provenance, CI results, runtime verification, rollback and limitations.
