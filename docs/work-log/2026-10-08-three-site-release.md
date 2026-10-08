# October WebUI fixes: three-site release (2026-10-08)

The maintainer authorized merging all ten discussed PRs and deploying the latest
combined release to dev.crucio.cz, clankerdev.vpsfree.cz and newadmin.vpsfree.cz.
Scope: PR19, PR24–29 and PR31–33. This includes network availability, stable
payment QR images, accessible review errors, mobile focus and pagination fixes,
stronger CI fixtures, incident creation context, all overview IP addresses, and
direct payment links from member details. No API/database changes are included.

## Preparation

Each selected PR head has green CI and browser checks. The integration preserves
all feature commits/authors. Conflicting requirements and workflow sections are
combined; E2E manifests retain the union of all adopted tests (43 checked,
211 deferred). The final combined candidate must pass checks before promotion.

Read-only preflight found newadmin and clankerdev on clean `78a723f7` and dev on
clean QR-fix release `9d560424`. Newadmin is generation 8. Dev's root is full;
all isolated staging remains on /data. No credential, session store or API
configuration changes are planned. Dev is the first deployment/test target,
followed by clankerdev and the scoped newadmin confctl target. Existing release
pairs/generation will be retained for rollback.

This entry records preparation, not completed deployment. Results follow once
verified. Browser fixtures do not certify real API mutations or physical devices.
