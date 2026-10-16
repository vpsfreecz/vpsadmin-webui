# Selected evening release — 2026-10-16

The maintainer authorized deploying our PRs #49, #50, #51, #52 and #55 to
newadmin.vpsfree.cz, clankerdev.vpsfree.cz and dev.crucio.cz. Other contributors'
PRs #53 and #54 are explicitly excluded. The API is unchanged.

The integration branch starts at main b9358c81, above the running clean
4c4b715f release. It preserves the five PR histories. The two independent E2E
adoptions are reconciled as 55 adopted and 204 deferred files. PR51's stale
structural exception was reviewed and corrected before integration.

This is preparation, not deployment evidence. All three targets must retain
paired rollback artifacts and receive the exact approved clean revision after
checks pass. Configuration channel updates are authorized directly without a
separate configuration PR. Dev staging must use /data because its existing root
filesystem is full; its pre-existing TLS mismatch remains a dev-only exception.
