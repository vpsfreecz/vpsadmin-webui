# WebUI Next OAuth BFF

This is a **minimal backend-for-frontend** service used only for OAuth2:

- Starts OAuth login (`/oauth/login`)
- Handles OAuth callback & exchanges code for tokens (`/oauth/callback`)
- Stores access/refresh tokens in a server-side session (keeps `client_secret` secret)
- Exposes one public runtime object as `/config.json` and as a compatible
  `/config.js` projection
- Exposes the OAuth provider's password-recovery entry point to the SPA
- Exposes the current access token only as same-origin JSON from `/session.json`

It **does not proxy** HaveAPI calls. The SPA still calls `https://api.vpsfree.cz` directly.

## Why it exists

The OAuth2 token exchange for this deployment uses the **authorization code** grant with a
**client secret**. A static SPA cannot safely keep a secret, so we do the code→token exchange
server-side. The browser reads the **access token** from a non-executable,
same-origin JSON response; it is never embedded in either config endpoint.

For a new authorization-code login, the BFF sends the validated callback
`req.ip` as one `Client-IP` header and the exact `User-Agent: vpsadmin-webui`
to the OAuth token provider. A missing or malformed derived IP consumes the
one-use state and follows the sanitized recovery route without contacting the
provider. The BFF never forwards browser `Client-IP`, raw forwarding headers or
browser User-Agent. Refresh requests and both logout revocations use the same
service User-Agent but omit `Client-IP`; they do not replace the initial session
metadata. The trusted edge and private backend normalize the callback address
before Express derives `req.ip`. The address can be a NAT or proxy peer and is
descriptive metadata, not an authorization factor. Existing sessions keep their
recorded metadata. This change does not alter cookies or the file session store.

## HaveAPI auth header (important)

The deployed environment needs the SPA to use a specific auth header when calling HaveAPI:

- `X-HaveAPI-OAuth2-Token`

The BFF sets this in `/config.json` and `/config.js` as:

- `window.vpsAdmin.webuiNext.haveApi.authHeader`

Without this, the SPA may attempt to use `Authorization`, which can be blocked by CORS preflight
depending on API configuration.

## Production startup contract

`BFF_RUNTIME_MODE` defaults to `production`. Before opening a listener the BFF
reads three fixed, raw UTF-8 files from the absolute `CREDENTIALS_DIRECTORY`,
validates its settings and proves that `SESSION_STORE_PATH` is an existing,
writable directory. It creates and removes a private write probe; it does not
create a missing session directory. A failed setting is named without printing
its value. The files are `oauth-client-id`, `oauth-client-secret` and
`session-secret`; each must be a regular file of at most 16 KiB, with at most
one terminal LF or CRLF. Symlinks, malformed UTF-8, BOMs, whitespace and
control characters fail startup. Retired `OAUTH_CLIENT_ID`,
`OAUTH_CLIENT_SECRET` and `SESSION_SECRET` environment variables also fail
startup, including in `legacy-test` mode. The reusable NixOS module sets both
`BFF_RUNTIME_MODE=production` and `PUBLIC_ORIGIN` explicitly; they must never
select `legacy-test`. The production environment must provide:

| Setting | Contract |
| --- | --- |
| `PUBLIC_ORIGIN` | Canonical HTTPS origin, with no path, credentials, query or trailing slash |
| `API_URL`, `API_VERSION` | Absolute HTTPS API URL without query; numeric dotted API version, such as `7.0` |
| `HAVEAPI_AUTH_HEADER`, `HAVEAPI_META_NAMESPACE` | Valid HTTP header name and metadata identifier; site uses `X-HaveAPI-OAuth2-Token` and `_meta` |
| `OAUTH_AUTHORIZE_URL`, `OAUTH_TOKEN_URL`, `OAUTH_REVOKE_URL` | Absolute HTTPS URLs on the same provider origin, without query or credentials |
| `PASSWORD_RECOVERY_URL` | Absolute HTTPS URL on that provider origin; only an optional matching `client_id` query is accepted, and the BFF adds it when absent |
| `OAUTH_REDIRECT_URI` | Exactly `<PUBLIC_ORIGIN>/oauth/callback`, matching the registered client |
| `CREDENTIALS_DIRECTORY` | Absolute existing directory with the three fixed credential files; client ID is nonempty and the generated OAuth secret is at least 32 bytes |
| `OAUTH_SCOPE`, `OAUTH_TYPE` | Explicit provider scope and client type; site uses `all` and `web_server` |
| `session-secret` file | Stable generated signing secret of at least 32 bytes |
| `SESSION_STORE_PATH`, `SESSION_COOKIE_NAME` | Existing writable state directory and host-only cookie name; one process owns the file store |

`LEGACY_WEBUI_URL` is optional and appears in the public object only when set.
`PORT` or `BFF_PORT` defaults to 3001; if both are set they must agree. Durations
and limits have positive bounded defaults in `runtime-config.js`. Integer
settings reject suffixes, fractions and overflow. Session and client secrets
reject obvious placeholders and repeated-character values; these checks cannot
prove entropy, so generate and transfer secrets securely. The NixOS module
supplies the public production settings and loads private credential files
through systemd `LoadCredential`. Do not place secret values in the Nix store,
environment, command arguments or public config.

The public JSON shape is `{schemaVersion: 1, api: {url, version}, webuiNext}`.
`webuiNext` contains the same login, logout, recovery, passkey, base-path and
HaveAPI settings previously served by `/config.js`, plus `legacyUrl` when set.
The JSON body is capped at 64 KiB before startup. Both endpoints send `no-store`,
`nosniff` and same-origin resource policy; `/config.json` has JSON MIME and
`/config.js` keeps JavaScript MIME. `/session.json` and its anonymous null fields
remain separate and unchanged. Production frontend builds require `/config.json`
and then `/session.json` before mounting; deploy a BFF with the JSON route
before serving those assets. Explicit standalone builds retain `/config.js`
compatibility.

## Running locally

```bash
cd bff
npm ci
credential_dir="$(mktemp -d)"
session_dir="$(mktemp -d)"
chmod 0700 "$credential_dir" "$session_dir"
# Provision the three raw files privately; do not put their values in this shell command.
BFF_RUNTIME_MODE=legacy-test CREDENTIALS_DIRECTORY="$credential_dir" \
  SESSION_STORE_PATH="$session_dir" OAUTH_AUTHORIZE_URL=... OAUTH_TOKEN_URL=... \
  node server.js
```

`legacy-test` is an explicit nonproduction fixture/development mode. It retains
the historical public defaults and optional revoke URL, and allows local HTTP
API and token/revoke URLs. Passkey authentication and UI origins still require
HTTPS. It is not a fallback after production validation fails and
is rejected with `NODE_ENV=production`. It must not be selected by the NixOS
production service. Remove the temporary credential and session directories
after stopping this local process.

### Concurrent session requests

The BFF serializes requests carrying the same verified session cookie before
`express-session` reads the store, until its response-time save/touch completes.
This prevents overlapping bootstraps from rotating the same refresh token and
returning access tokens invalidated by another request. Logout runs in the same
queue and revokes the latest stored tokens. Disconnecting a client does not
release a refresh that is still saving; disconnected queued requests are skipped.
Other sessions remain independent. At most 32 requests per session are admitted;
excess requests receive HTTP 503 with `Retry-After: 1` and no session mutation.

This queue is process-local. Run one BFF process per file session store. Multiple
workers/replicas sharing a store require distributed serialization and are not
supported by this mechanism. It also does not renew access tokens already held
by an open SPA after another tab performs a later rotation.

### Static contract coverage

From the repository root, `npm run typecheck:bff:core` checks the session queue
and its declared `cookie-signature` boundary using strict, no-emit TypeScript in
CommonJS mode. Compile-only fixtures reject wrong queue settings, cookie input
and middleware callback types. The project imports no BFF server or response
page code and does not start a listener. The root Node 24 development toolchain
supplies TypeScript; no type tooling is installed in the production BFF package.
The browser-free queue test checks response-end forwarding, admission order and
busy rejection; runtime queue and OAuth tests remain necessary.
`runtime-config.js`, `security.js`, `server.js` and the response pages are outside
this first static gate and need separate adoption before BFF type coverage is
complete.
