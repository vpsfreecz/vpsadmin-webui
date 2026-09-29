# Reusable NixOS service module

Requirement: [REQ-069](REQUIREMENTS.md). `nixosModules.default` exports the
disabled-by-default `services.vpsadmin-webui` module. It serves one immutable
[frontend/BFF package pair](PACKAGING.md) through a private nginx listener
and one loopback-bound BFF process. Importing the module alone creates no
service, vhost or account. It does not enable the legacy PHP WebUI, API,
database, Redis or RabbitMQ.

## Enable and configure

The enabled module requires `publicOrigin`, `api.url`, `api.version`, all four
OAuth URLs and three absolute runtime `credentialFiles` paths. The public origin and
legacy origin must be exact HTTPS DNS origins. API and OAuth URLs must be
credential-free HTTPS URLs; authorization, token, revoke and recovery URLs
must share one provider origin. The recovery URL may carry one `client_id`
query value, which the BFF verifies against the runtime client ID. The public
UI origin must be distinct from API, provider and legacy origins: this nginx
vhost does not proxy those other services. Module assertions reject malformed
options before activation; the BFF validates the
effective environment again before listening.

The frontend and BFF package options default to this flake's outputs for the
host system. Override both together with packages bearing identical build
provenance. The module does not use `pkgs.vpsadmin-webui`, which belongs to
the legacy PHP package. The dedicated `vpsadmin-webui-bff` account is distinct
from the legacy PHP account. Its systemd `StateDirectory` is fixed at
`vpsadmin-webui`: `/var/lib/vpsadmin-webui`, with a `sessions/` child created
at mode 0700. The module has no public state-directory override, so it cannot
be pointed at the legacy `/var/lib/vpsadmin` tree through this option. Keep
this state and the signing secret across restarts and matching-pair rollbacks.
The BFF still rejects a missing, symlinked or unwritable session directory at
startup. Before first activation, confirm the fixed path is absent or already
belongs to this BFF; systemd may adjust existing state ownership before
`ExecStartPre` runs. Stop on foreign state rather than repairing it.

The module emits `BFF_RUNTIME_MODE=production`, `NODE_ENV=production`,
`PUBLIC_ORIGIN`, `API_URL`, `API_VERSION`, OAuth endpoints and derived exact
callback, `PASSWORD_RECOVERY_URL`, scope/type, HaveAPI OAuth header and metadata
namespace, cookie name, session path and `PORT`. `LEGACY_WEBUI_URL` is emitted
only when set. The BFF listens on `127.0.0.1` on the configured port. It keeps
the `/config.json`, `/config.js`, `/session.json` and OAuth contracts unchanged.

`credentialFiles.oauthClientId`, `oauthClientSecret` and `sessionSecret` are
runtime source paths outside the Nix store. Systemd loads their raw contents
as `oauth-client-id`, `oauth-client-secret` and `session-secret` in its private
`CREDENTIALS_DIRECTORY`. The module does not expose an `environmentFile` option
or pass secret values through `Environment` or `ExecStart`. It explicitly removes
the retired secret variable names with `UnsetEnvironment`. Do not put credential
values in Nix. Missing, nonregular, malformed, oversized or weak credentials
prevent BFF startup before it listens. The fixed names and bounded UTF-8 reader
are described in the [BFF startup contract](../../bff/README.md). The service
uses one writer, private
temporary files/devices, empty capabilities, no privilege gain, strict system
protection and writable access only to its state directory. Node JIT memory
permissions remain available.

## Private nginx boundary

`nginx.listenAddress` and `nginx.port` select one explicit private listener;
the default address is loopback. `allowedClientAddresses` controls original
socket peers and defaults to loopback. `trustedProxyAddresses` is independent
and empty by default; each trusted edge CIDR must also be allowed. Backend
nginx keeps `$remote_addr` as the socket peer, rejects foreign peers and
noncanonical Host, and accepts forwarded scheme/client headers only from a
trusted edge. It requires one edge client address without a forwarding chain.
The edge must overwrite `Host`, `X-Forwarded-Host`, `X-Forwarded-Proto` and
`X-Forwarded-For` from its own TLS connection and `$remote_addr`; untrusted
request headers must not be passed through. The site firewall must separately
restrict the private listener. Do not widen the trusted range merely for
health checks. Recommended nginx proxy headers are disabled in each new BFF
location, and the intended forwarding headers are emitted once.
The BFF validates Express's derived callback IP before sending it as the OAuth
provider's `Client-IP` on a new code exchange; refresh and revoke requests omit
that header. The provider always receives the service User-Agent
`vpsadmin-webui`. This depends on the edge replacing client forwarding values
and the backend accepting only a trusted edge's single address; it does not
make browser-supplied headers authoritative.

The backend serves SPA deep links with revalidated HTML; static files have
exact-file handling and missing assets return 404. Hashed assets use immutable
cache headers. `/config.local.js` returns 404. Exact config/session/health
routes and `/oauth/` go to the BFF without an SPA fallback or proxy cache;
bare `/oauth` returns 404. Both OAuth locations suppress access and error
logging, including an upstream connection failure. Other backend locations
retain their nginx diagnostics; the missing OAuth-specific nginx error detail
is deliberate. This covers requests routed to those locations, not malformed
requests rejected before nginx selects a location. The
static locations own the application CSP, including the current inline
bootstrap hash, API connect origin and existing OpenStreetMap/Nominatim
origins. Reviewed console/frame origins are explicit options; there is no
blanket `https:` or `wss:` allowance. Proxied BFF responses retain their own
OAuth/passkey CSP. The current passkey response has a fixed CSP with
`default-src 'none'` and a provider-specific `form-action`; it does not use a
nonce. The edge owns TLS/HSTS and must suppress OAuth query logging at its hop.

## Evaluation and remaining proof

`checks.x86_64-linux.module-eval.passthru.results` exposes build-free
disabled, valid, invalid and pinned legacy-module coexistence results. It
also rejects an attempted `stateDirectory = "vpsadmin"` assignment. It
inspects the effective service environment, state settings, private listener,
proxy headers, route ownership and assertions. The inline-script hash has a
source-level regression test. Evaluate the fixture on the exact pinned input:

```sh
nix eval --json --no-write-lock-file .#checks.x86_64-linux.module-eval.passthru.results
nix flake check --no-build --no-write-lock-file --option allow-import-from-derivation false
```

`checks.x86_64-linux.nixos-webui` is a separate three-node NixOS test: TLS
edge, private backend and client. Its local HTTPS provider and CA are synthetic;
the BFF runs in production mode with strict TLS validation. It checks route,
cache and CSP ownership, normalized forwarding, login and one-use state,
private persistent sessions, restart, missing/invalid credential files, and a
seeded legacy PHP state file whose owner, mode and content must survive. The VM
also checks that the BFF process has no retired secret environment variables. The
synthetic provider records only route, `Client-IP` and `User-Agent` for token and
revoke requests; the VM checks the actual client address and service identity
through both nginx hops despite hostile browser headers, then confirms both
revocations omit `Client-IP`. The disabled and coexistence cases remain
build-free module-evaluation assertions
required by the VM fixture. The test does not use a real API, account or DNS.

Evaluation alone does not prove nginx syntax, listener isolation or runtime
behavior. Build the packages and run the VM check on the exact candidate head
before claiming this evidence; then inspect rendered nginx and site-specific
settings. The site must use its own metadata-selected backend/edge addresses
and preserve the vpsAdmin input follow mapping; no production addresses or
secrets are baked into this module.
