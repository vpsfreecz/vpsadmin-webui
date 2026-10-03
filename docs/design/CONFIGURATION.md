# Configuration and persisted data reference

Canonical source reference: `3f31fce5`, reviewed 2026-10-03. Sources:
[runtime config](../../src/app/config.ts), [bootstrap](../../src/app/runtimeBootstrap.ts),
[Vite](../../vite.config.ts), [BFF](../../bff/server.js).
Defaults describe code, not verified values on any deployment host.

## Loading order and supported modes

Production builds select required BFF mode. Bootstrap validates bounded same-origin
`/config.json` and `/session.json` within one 15-second deadline and installs a
single runtime snapshot before mounting. Failure shows a bilingual retry screen;
it does not fall back to standalone browser credentials or config scripts.
`/config.js` remains a compatibility projection for explicit legacy builds.

Standalone Vite development and explicit legacy builds can load config.js and,
on dev/loopback, config.local.js. Runtime values override public VITE build inputs
and defaults in that mode. Never put secrets or bearer tokens in either surface.

Deployed OAuth code exchange/refresh tokens stay in the BFF; the authenticated
browser receives an access token through same-origin session JSON for direct
HaveAPI calls. An anonymous BFF snapshot cannot revive stored standalone OAuth.
Impersonation is bound to the validated base-session fingerprint, survives token
rotation within that session and is cleared on a new login or invalid binding.
See [authentication boundaries](ARCHITECTURE.md#authentication-and-session-lifecycle)
and [impersonation](ACTION_CONTRACTS.md#impersonation).

## Frontend controls

Paths below are relative to window.vpsAdmin unless explicitly VITE-only.

| Setting | Runtime / VITE equivalent | Default and interpretation |
| --- | --- | --- |
| API | api.url / VITE_API_URL; api.version / VITE_API_VERSION | https://api.vpsfree.cz; 7.0. Client appends /v7.0; version normalizes leading v. Use an owned API for live tests. |
| Router | webuiNext.basePath / VITE_ROUTER_BASENAME or VITE_BASE_PATH | Root. Vite asset base must match router and reverse proxy; changing only runtime does not relocate built assets. |
| HaveAPI | webuiNext.haveApi.authHeader/metaNamespace / VITE_HAVEAPI_AUTH_HEADER, VITE_HAVEAPI_META_NAMESPACE | BFF supplies X-HaveAPI-OAuth2-Token and _meta; standalone behavior must match description/API CORS. |
| UI persistence | webuiNext.uiSettings.persistence / VITE_UI_SETTINGS_PERSISTENCE | server, with local fallback; only explicit local disables server sync. |
| UI record | uiSettings.server.path/namespace/field under webuiNext / VITE_UI_SETTINGS_SERVER_PATH, VITE_UI_SETTINGS_NAMESPACE, VITE_UI_SETTINGS_FIELD | /webui_user_settings, ui, settings. field means record key, not payload member. GET filters namespace/key; PUT /{namespace}/{key} sends value as JSON string. Adapter rejects unrelated configured resource paths by falling back to default. |
| Login/logout | webuiNext.loginUrl/logoutUrl / VITE_LOGIN_URL, VITE_LOGOUT_URL | {basename}/oauth/login and /oauth/logout; BFF supplies root endpoints. |
| Recovery | webuiNext.passwordRecoveryUrl / VITE_PASSWORD_RECOVERY_URL | Unset in generic runtime; BFF supplies provider URL with client_id. |
| Passkey | webuiNext.passkeyRegistrationUrl | BFF supplies /oauth/passkey; enrollment stays on authentication origin. |
| Legacy links | webui.url / VITE_WEBUI_URL; webuiNext.legacyUrl / VITE_LEGACY_WEBUI_URL | Optional and distinct; not authorization bypasses. |
| Timezone | webuiNext.serverTimeZone, then serverTimeZone / VITE_SERVER_TIME_ZONE | Europe/Prague fallback; explicit account zone still takes precedence in display. |
| Status thresholds | webuiNext.publicStatus.ipv4Warn/ipv4Critical / VITE_PUBLIC_IPV4_WARN, VITE_PUBLIC_IPV4_CRITICAL | 64/16; rounded nonnegative, critical capped at warning. |
| Standalone OAuth | webuiNext.oauth2.* / VITE_OAUTH2_AUTHORIZE_URL, TOKEN_URL, CLIENT_ID, SCOPE, TYPE, FLOW, STORAGE, REDIRECT_PATH (each with VITE_OAUTH2_ prefix) | Provider defaults in config.ts; clientId hostname, scope all, type web_server, pkce flow, session storage, {basename}/oauth/callback. BFF does not obtain its secret from these fields. |

Vite-only controls: VITE_DEV_HOST/PORT (default port 5173), VITE_DEV_HTTPS and
VITE_DEV_HTTPS_KEY/CERT paths; VITE_API_PROXY_TARGET/PREFIX/SECURE for optional local
API proxy (prefix /api, certificate validation on). No proxy is configured by default.
Keep TLS validation on. VITE_PUBLIC_BASE_PATH is a build-base alias only; prefer
VITE_ROUTER_BASENAME for matched asset/router configuration. VITE_BUILD_SHA is a
build provenance override, not proof of clean source. VITE_ENABLE_DESIGN_SANDBOX
exposes the internal design sandbox in production when enabled; do not enable it
incidentally for a release. Heatmap configuration is a separate API/legacy fact;
see [URL eligibility](../../src/lib/nodeHeatmap.ts), not an invented VITE endpoint.

## BFF environment

The authoritative validator is [runtime-config.js](../../bff/runtime-config.js),
with credential parsing in [credentials.js](../../bff/credentials.js). Production
validates configuration and the writable, pre-existing session directory before
listening. The table describes source rules, not live secret values.

| Input | Production contract / default |
| --- | --- |
| BFF_RUNTIME_MODE | `production` by default; explicit `legacy-test` for fixtures only, forbidden with NODE_ENV=production |
| CREDENTIALS_DIRECTORY | Absolute directory containing raw regular files `oauth-client-id`, `oauth-client-secret`, `session-secret`; normally systemd LoadCredential |
| Retired OAUTH_CLIENT_ID / OAUTH_CLIENT_SECRET / SESSION_SECRET | Environment variables are rejected, including in legacy-test; do not migrate secrets back into environment or Nix store |
| PUBLIC_ORIGIN | Required canonical HTTPS origin |
| OAUTH_REDIRECT_URI | Required exact PUBLIC_ORIGIN + /oauth/callback |
| DOMAIN | Optional; if present must match PUBLIC_ORIGIN host; legacy-test callback fallback only |
| OAUTH_AUTHORIZE_URL / OAUTH_TOKEN_URL / OAUTH_REVOKE_URL | Required HTTPS endpoints on one provider origin; no query/fragment credentials |
| PASSWORD_RECOVERY_URL | Required same-provider URL; only matching client_id query accepted |
| API_URL / API_VERSION | Required HTTPS API URL and numeric version |
| HAVEAPI_AUTH_HEADER / HAVEAPI_META_NAMESPACE | Required valid header and underscore-prefixed namespace |
| OAUTH_SCOPE / OAUTH_TYPE / SESSION_COOKIE_NAME | Required validated strings; do not rely on legacy-test defaults in production |
| SESSION_STORE_PATH | Required existing writable absolute private directory; one BFF process per store |
| LEGACY_WEBUI_URL | Optional validated public URL |
| PORT / BFF_PORT | Default 3001; 1–65535, conflicting values fail; binds loopback |
| REFRESH_SKEW_MS | 60000; range 1–600000, less than session age |
| SESSION_MAX_AGE_MS | 2592000000 (30 days); range 60000–7776000000 |
| OAUTH_STATE_MAX_AGE_MS | 600000; range 1000–1800000, no greater than preauth age |
| PREAUTH_SESSION_MAX_AGE_MS | 600000; range 1000–1800000, no greater than session age |
| LOGIN_RATE_LIMIT_WINDOW_MS / LOGIN_RATE_LIMIT_MAX | 600000 / 20; ranges 1000–3600000 / 1–1000 |
| OAUTH_FETCH_TIMEOUT_MS / OAUTH_RESPONSE_MAX_BYTES | 10000 / 65536; ranges 100–30000 / 1024–1048576 |

Credential files are limited to 16 KiB, strict UTF-8, at most one terminal LF/CRLF;
symlinks, BOM, whitespace/control characters fail. Production secrets must meet
strength/length validation. Provision and transfer them privately; never print
contents. [BFF setup](../../bff/README.md#production-startup-contract) describes
the exact startup contract and the separate local test mode. The fixed single
trusted proxy hop requires a private loopback listener and a correctly configured
edge. Public configuration uses root paths; a subpath is not enabled just by
changing one VITE setting.

## Persisted data and recovery boundaries

| Data | Location / lifetime | Recovery consequence |
| --- | --- | --- |
| BFF OAuth session | Private file store, access/refresh tokens and signed cookie identity; single process per store | Preserve on routine code rollback. Losing store or changing signing secret can log users out; restoring old sessions can restore stale/revoked tokens. Never copy a production store into tests. |
| Browser access token | Runtime memory in BFF mode; optional vpsadmin_ui_next.oauth2 in session/local storage for standalone | Valid BFF session response clears standalone residue. Do not export storage or raw session.json in bug reports. |
| Impersonation | vpsadmin.ui.impersonation in sessionStorage: full borrowed token, target/session IDs, reason and return path | Sensitive credential; bound to the originating validated BFF session and overrides normal auth only while that binding remains valid. Return attempts server close before clearing/reload, but close failure is tolerated. Browser tab/session restoration is not a revocation guarantee. |
| Idle activity | vpsadmin.idle.{sessionKey} in localStorage, non-credential fingerprint; tab-local without stable key | Trusted pointer/key/wheel/touch activity, not polling/focus, extends the deadline. API preferred_session_length supplies seconds; zero disables this timer. BFF cookie age and token expiry remain separate. |
| UI preferences | vpsadmin.uiSettings.v1 localStorage plus keyed API setting when authenticated/server enabled | Local settings are origin-level, not a secure per-user vault. Account settings load on authentication; anonymous layout uses local bootstrap. A new hostname does not carry old origin storage. |
| Pending/uncertain operations | User-scoped browser-local lock records and Web Locks where available | Clearing storage is not evidence an operation failed. Reconcile server receipt/object state first; preserve safe record of target/intent before recovery. |
| Domain objects and history | API/database/node services | Frontend/BFF rollback does not restore datasets, DNS, payments or users. API backup/restore belongs to backend operations. |
| Test traces/screenshots/logs | Ignored local outputs or CI artifact retention | Synthetic images may be published after inspection; authenticated traces may contain secrets/PII and need restricted retention. |

There is no documented automatic UI database migration in this product. Preference
schema normalization is in [uiSettingsModel](../../src/app/uiSettingsModel.ts);
locks have their own migration/uncertainty handling. Changing either requires old
stored-state cases, not an instruction to erase all browser data. Retention periods
and backup owners for private stores/evidence are handover decisions, not invented
service guarantees.
