# Four explicitly selected production fixes

On27November the maintainer explicitly requested including the four previously preview-only logical fixes in the production candidate, with production deployment to happen together later. This extends the selected93-PR scope with PR310(console lifetime),311(migration acceptance),330(shared-window BFF sessions) and332(IPv4 rejection reasons). Existing draftPR336 is updated; no main merge, production/API activation or builder access is authorized by this preparation.

## Integration and preserved contracts

Cherry-pick the ten original focused commits with their original authors and source trailers. Preserve current SDK0.6.0/HaveAPI0.32.0, transport namespaces, request bodies, API error identity and current shared layouts. Resolve documentation conflicts by retaining existing accepted requirements and adding only the selected behavior. Keep every existing WebKit/project selection and strict lint coverage adoption; do not restore obsolete deferred-source exemptions.

The console's read-only validity action uses the published generated `vps.console_token.show` member and current result narrowing. Current protocol failures use the canonical error model rather than legacy envelope spelling. The moved lifecycle test retains POST/GET/DELETE assertions and the SDK's nested console_token payload. Auth tests import the current API error module. Initial local preflight caught the literal old haveApiCall/removed-haveapi-module references before any push; original failure output is retained externally. The corrected implementation matches the already qualified cumulative preview for the four feature surfaces without importing its unrelated held features.

Migration receipts preserve frozen scheduling payloads and distinguish accepted, completed, missing-receipt and uncertain outcomes. Read-only console validity never silently replaces a live session. Healthy BFF login reuse preserves session identity/lifetime while explicit reauthentication remains available. IPv4 exhaustion uses the known server reason while retaining receipt/uncertainty and duplicate-write safeguards.

Affected requirements: REQ-007, REQ-011, REQ-020, REQ-028, REQ-060 and REQ-061. Localization procedure and complete Czech terminology guide were read at locked vpsAdmin revision a65a4dfeb92a59df4a80a737a20bcbf8558793ff; the flake input remains unchanged. Existing reviewed Czech/English messages are preserved. No SDK/API/flake/config dependency bump is included. Main's newer backup cleanup/SDK0.7 and held258/306/316/323/324 remain outside this candidate.

## Verification status

Prepared, not yet newly CI-qualified or deployed. Run complete exact-head quick/script/BFF/unit/build checks and relevant original browser scenarios before one coherent update to PR336. Verify every final hosted check and original job log, including flaky attempts, and current packaged frontend/BFF provenance. Existing dev/clanker cumulative dca73b6e already contains these fixes and preserves additional preview work; do not replace it with this narrower production candidate. Fixture browser acceptance is not authenticated production API evidence. The original newadmin paid-until complaint remains unreproduced/uncertified.

Update the maintainer-only exact-source deployment/rollback handoff after final qualification. All growing local build/browser/evidence data stays under/data and builders/hooks remain disabled. The maintainer personally executes any later builder deployment. No human TODO approval/comment/manual-completion fields are changed.
