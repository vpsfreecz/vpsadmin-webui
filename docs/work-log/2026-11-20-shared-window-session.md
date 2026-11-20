# Reuse an authenticated browser session across windows

The maintainer reports that opening another browser window requires signing in
again and makes the first window lose its login. The affected hostname/profile
and original error remain unspecified; the reported complete flow is not yet
reproduced. This change addresses one demonstrated BFF cause (REQ-007).

Previously `/oauth/login` always started another provider authorization, reduced
the shared cookie to the pre-authentication lifetime and regenerated its session
ID after callback. The first window retained the old session identity. A healthy
login now returns to the requested safe local destination with its existing ID
and authenticated lifetime. Anonymous/failed-refresh sessions still authorize.
API rejection produces an explicit `reauth=1` link; the public header retains it,
allowing a truly rejected token to be replaced without a redirect loop. Callback
regeneration for fresh login, changed-identity guards and logout remain intact.
No cross-profile credential sharing is introduced.

## Verification state

Prepared, not deployed. A regression against the original BFF fails because an
already authenticated login URL redirects to the provider. The modified BFF's
18 server tests and 13 focused auth/public-header unit tests pass. Full quick
checks, 230 script tests, 60 BFF tests and 1,941 unit tests (310 files), plus the
native frontend build, passed before the final two additional BFF expiry cases;
the final exact-head check receipts will include those cases. The fake OAuth
provider and file session store are real local processes; they do not certify a
real provider or the user's reported deployment. The full quick checks, relevant
suites, exact build, browser evidence, CI and preview receipts will be recorded
when completed. No newadmin or API deployment is authorized.

## Pre-publication browser correction

Native HTTPS against the clean c063baa frontend, the actual BFF file store and
a fake OAuth provider passed shared-window reuse/logout in Chromium and mobile
WebKit. Its rejected-token cases failed: clearing query state also removed the
reauthentication reason before the public header rendered. Keep that reason in
AuthProvider state until a fresh document login, and add a unit regression for
clearing the rejected query. Original browser reports remain preserved. The
previous interception bridge is not acceptance evidence: mocked redirects and
Set-Cookie handling were unreliable, and were replaced by actual local HTTPS.

A final compatibility review scoped public-header auth URLs to explicitly
configured login endpoints. Without one, retain the standalone `/oauth/login`
default rather than inheriting AuthProvider's older PHP fallback. Added a
regression for this distinction before preview activation; the earlier staged
candidate remains unactivated and is superseded by the final candidate.
