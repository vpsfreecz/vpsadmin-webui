# Reusable NixOS service module

Requirement: [REQ-069](REQUIREMENTS.md). `nixosModules.default` exports the
disabled-by-default `services.vpsadmin-webui` module. It serves one immutable
[frontend/BFF package pair](PACKAGING.md) through a private nginx listener
and one loopback-bound BFF process. Importing the module alone creates no
service, vhost or account. It does not enable the legacy PHP WebUI, API,
database, Redis or RabbitMQ.

## Enable and configure

The enabled module requires `publicOrigin`, `api.url`, `api.version`, all four
OAuth URLs and an absolute string `environmentFile`. The public origin and
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

`environmentFile` is a runtime string path, not a Nix store path. Systemd reads
it as root; it contains only `OAUTH_CLIENT_ID`, `OAUTH_CLIENT_SECRET` and
`SESSION_SECRET`. Do not put their values in Nix. Systemd's EnvironmentFile
assignments override ordinary `Environment` assignments, so the operator must
keep this file limited to those three secrets. The file is mandatory; an absent
or invalid file/secret prevents startup. The service uses one writer, private
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
OAuth/passkey CSP. The edge owns TLS/HSTS and must suppress OAuth query logging
at its hop too.

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

Evaluation does not prove nginx syntax, listener isolation or runtime behavior.
The separate edge/site configuration, rendered nginx inspection, actual
package builds, HTTPS mock-provider VM test and deployment remain open. The
site must use its own metadata-selected backend/edge addresses and preserve
the vpsAdmin input follow mapping; no production addresses or secrets are
baked into this module.
