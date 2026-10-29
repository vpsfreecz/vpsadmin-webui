# OAuth provider and local navigation boundaries — 2026-10-28

Status: prepared review candidate; not merged or deployed. Scope: REQ-007,
REQ-040, REQ-059. No API, provider configuration or credential changes.

## Finding and change

A loopback-only reproduction with dummy credentials confirmed that the BFF's
bounded fetch followed an HTTP 307 and forwarded its POST body to a second
origin. The configured provider is trusted; exploitation would require that
provider or its routing to redirect the request. This is a conditional
credential-disclosure boundary, not evidence of an existing compromise.
Token exchange, refresh and revocation now reject every HTTP redirect, even
when a caller passes `redirect: follow`. Their timeout, body limit, abort,
OAuth state consumption and session queue contracts remain unchanged. Correct
provider token/revocation endpoints must return their response directly.
Browser navigation to the authorization endpoint remains unchanged.

The shared local-path helper also accepted backslashes/control characters.
The browser URL parser can interpret `/\\host/path` as a different origin.
The existing OAuth-next validator already rejects such a destination, but
impersonation return navigation uses the shared helper directly. Reject these
ambiguous characters before any basename concatenation. Valid local paths,
query strings, fragments and subpath deployments retain their representation.
No public unauthenticated path to overwrite the return preference was proven.

## Verification

A new real HTTP test uses two temporary loopback servers and dummy values.
It failed against the unchanged baseline (redirect target contacted), then
passed with the fix for 301/302/303/307/308 and an explicit follow override.
Unit cases exercise origin confinement for both root/subpath deployments.
Remote Linux verification: ci:quick, all 58 BFF tests, targeted auth/router
unit checks and production build passed. Exact counts and final candidate CI
will be appended after commit; these are not live provider exploit tests.
All browser execution belongs on the isolated dev runner. No production
requests, credentials or authenticated screenshots were used in reproduction.
