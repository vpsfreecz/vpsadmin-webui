# Approved October 19 release integration

The maintainer authorized merging and deploying our approved WebUI PRs after
successful CI, followed by verification on newadmin, clankerdev and dev.crucio.
The release contains PRs #68, #69, #70, #71, #72, #73 and #75. Other contributors'
open PRs #63 and #74 are excluded. The previous running revision on all three
origins was `7860521f30826c3886c89c35e8ab6f4e082e0a4b` during preflight.

## Integration

Each selected head passed all six GitHub checks before integration. The release
branch preserves original commits and authors with merge commits. Conflicts
only concerned concurrent work-log entries, additive WebKit spec selections,
and the strict E2E adoption test counts. All entries and test selections are
retained. The combined inventory contains 67 adopted and 198 deferred sources;
no compiler or browser gate is weakened.

The combined local `npm run ci:quick` passed, including strict E2E coverage.
The integration PR runs the complete required CI against the combined candidate.
The pending deployment must use one matching immutable frontend/BFF revision,
retain rollback, preserve live sessions and keep dev's separate API routing.
Newadmin requires its scoped confctl input update, build and activation. The
configuration repository receives one channel update and no release artifacts.

Requirements: REQ-060–064 and REQ-068–069. At preparation time this is an
integrated candidate, not evidence of a completed deployment. Verification and
actual deployed provenance will be recorded after those operations succeed.
