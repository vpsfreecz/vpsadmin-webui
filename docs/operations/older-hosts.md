# Dev and clankerdev release/recovery handover

Use this with the [operations guide](../design/OPERATIONS.md) and the approved
release scope. The 2026-09-30 release migrated these hosts to the canonical
repository and current BFF credentials contract. The old bootstrap/deploy scripts
under `deploy/` predate that cutover and are not validated update tools for it.

## Runtime map

| Item | dev.crucio.cz | clankerdev.vpsfree.cz |
| --- | --- | --- |
| SSH host | admin.crucio.cz | clankerdev.vpsfree.cz (IPv4 was used for the release) |
| Frontend pointer | `/var/www/dev.crucio.cz/current` | `/var/www/clankerdev.vpsfree.cz/current` |
| BFF release pointer | `/srv/clankerdev-release/current` | `/opt/webui-next/current-release` |
| BFF below pointer | `bff/server.js` | `vpsadmin/webui-next/bff/server.js` |
| BFF unit/account | `webui-next-bff` / `webui-bff` | `webui-next-bff` / `webui-bff` |
| Nginx site file | `/etc/nginx/sites-available/dev.crucio.cz` | `/etc/nginx/sites-available/clankerdev.vpsfree.cz.conf` |
| Public API | `https://dev.crucio.cz` | `https://api.vpsfree.cz` |
| Runtime mode | `legacy-test` for the existing isolated provider routing | `production` |

Both frontend pointers became symlinks at the cutover. Inspect them before use;
do not run a historical in-place `rsync --delete` procedure against the live
pointer. Dev retains loopback OAuth token/revoke routes to its test API and its
other services, including the PHP interface on admin.crucio.cz. Do not copy
production runtime settings to dev.

Systemd now loads `oauth-client-id`, `oauth-client-secret` and `session-secret`
using `LoadCredential`; it unsets the retired `OAUTH_CLIENT_ID`,
`OAUTH_CLIENT_SECRET` and `SESSION_SECRET` variables. Its existing environment
file still supplies other settings and is retained for older-version rollback.
Inspect the effective unit and source file permissions privately. Do not print
process environments, credential contents or session files into shared logs.
The private credential sources and session store must survive release cleanup.

## Preparing a subsequent approved release

1. Inspect exact running frontend SHA, BFF process/release path, active deploy
   locks, other work and free space. Record the paired previous release and the
   effective nginx/systemd configuration in a private receipt. Recheck immediately
   before promotion to avoid replacing a newer deployment.
2. Build the reviewed exact source with locked dependencies in an isolated build
   checkout. Use the default BFF-mode frontend build; `/config.json` is required.
   Prepare matching BFF runtime dependencies outside the live release and verify
   source/build provenance. Do not run npm installation in a deployed directory.
3. Stage a new complete release on a filesystem with sufficient room. Preserve
   executable/read/traverse permissions for `webui-bff` and nginx. Use the host's
   existing path shape above; the two BFF pointer layouts differ.
4. Validate runtime settings with the candidate's `loadBffConfig` under the
   service account and the actual systemd credential-loading mechanism. Preserve
   secret values, sessions, OAuth callback, cookie scope and test API separation.
   Never restart the old service merely to obtain its secrets.
5. Preserve a matching frontend/BFF rollback pair, necessary existing hashed
   assets for open tabs and configuration backups before touching live pointers.
   Validate candidate nginx routing, especially `/config.json`, `/session.json`,
   `/healthz`, OAuth and SPA/static precedence, with `nginx -t`.
6. Under the target's deployment lock, recheck the expected old revision, then
   switch both pointers and restart `webui-next-bff`; reload nginx if its
   configuration changed. Each pointer can be replaced atomically, but the two
   switches and restart are not one transaction: retain failure handling that
   restores both and the matching configuration.
7. Check the process's resolved working directory/BFF revision separately from
   frontend `/build-info.json`; verify required secrets are not back in process
   environment variables. Run the operations guide's auth, config, session,
   deep-link and browser checks. Record the result and retained rollback pair.

The 2026-09-30 operator-held promotion helper was a one-time migration tied to
source `156a7c04`, absence of the new drop-in and the old nginx route layout. It
must not be rerun for a later release. A general automated replacement is not
provided here; the steps above are the manual operator contract. Transfer and
review private receipts/access for handover rather than depending on a chat or
an undocumented local script.

## Recovery

For an application-only update, restore the previous paired release pointers
and restart the BFF while keeping compatible current settings and live sessions.
If rolling back the credential cutover itself, restore its saved nginx config
and original unit environment behavior as well: remove only the cutover's own
added drop-in, restore the retained frontend and BFF pointers, daemon-reload,
run `nginx -t`, restart BFF and reload nginx. Use the private receipt to identify
the exact files; do not delete another operator's later drop-ins or configuration.
Repeat provenance, health, config, session and routing checks after recovery.
Do not replace live session files with old copies containing spent refresh tokens.

## Outstanding host constraints

Read-only inspection on 2026-10-02 found dev's root filesystem still almost full
(about 152 MiB available), while `/data` had ample space. Inactive retained
releases/backups were moved there on 2026-09-30 with compatibility symlinks;
they were not deleted. Capacity cleanup is outstanding. Keep new build/staging
work off the root filesystem and inspect current free space before every release.
Dev also retains its pre-existing self-signed certificate/SAN mismatch. Those
host issues were not fixed by a frontend release or this documentation update.
