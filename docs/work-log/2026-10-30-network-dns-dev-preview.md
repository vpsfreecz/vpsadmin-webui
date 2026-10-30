# Network and DNS dev preview — 30 October 2026

Status: prepared; activation and acceptance are pending. The maintainer requested
implementing the DNS feedback and deploying all this task's changes to dev.
No main merge, production/API deployment or configuration-repository pin update.

## Exact selected scope

Preserve dev preview PR112 at `455ea11f71a0783cd8ac1788e4ed1cc445c540c8`,
then merge only these original feature heads into a separate preview branch:

| PR | Head | Change |
| --- | --- | --- |
| [113](https://github.com/vpsfreecz/vpsadmin-webui/pull/113) | e90be4264cce5a4acec4cb68d299245a95f7e468 | Continue bounded primary-location free-IP samples. |
| [114](https://github.com/vpsfreecz/vpsadmin-webui/pull/114) | 6328f65be793cb483df797ac32efd375d9cc7c8a | VPS-first assignment and synchronous owner read-back. |
| [116](https://github.com/vpsfreecz/vpsadmin-webui/pull/116) | 94fb440c1a0086569af201637c1f647f6663f300 | Primary/secondary and direction labels, DNSSEC responsibility, wildcard owners. |

Original feature histories/reviews remain independent. PR63/74/115 and other
unrelated work are excluded. Concurrent documentation inserts preserve all
entries; REQ-049 and REQ-050 retain both sets of acceptance criteria, and both
IP suites plus the DNS suite remain in mobile WebKit's selection.

## Preparation and activation contract

Observed current paired dev runtime and rollback target:
`1c12a219ba87facd64fe27a8d135f14dbe7c6c36`. Production remains clean
`606a02c19f328c69298dd30780c805211fb5cb27`; main remains `40653dff`.
Recheck live pointers, process cwd, original PR heads, main and deployment lock
immediately before promotion. Build exact clean matching frontend/BFF Nix
packages and provenance/source/package/module checks on dev in isolated /data
space. Run combined checks and browser regressions on the development machine.

Retain the current nginx configuration, credentials, session store and systemd
unit byte-for-byte. Validate the candidate with the existing actual systemd
credentials before activation. Stage immutable packages, keep existing hashed
assets for open tabs and activate both pointers under the existing deployment
lock. Roll back the exact previous pair if acceptance fails. No global GC,
shared queue repair, unrelated service restart or deletion is included.

Separate served-bundle synthetic UI checks from unmocked public/OAuth/API checks.
Only same-chat disposable fixtures may be enabled; restore original access flags
and revoke temporary credentials after bounded actual tests. Synthetic UI proof
is not live DNS publication, cross-member authorization or infrastructure proof.

## Evidence and remaining work

Feature-specific evidence and limits are recorded in the three dated logs.
PR113/114 each passed six exact-head GitHub checks; PR116 CI is in progress at
preparation. Combined build, deployment, actual runtime SHA and final acceptance
will be appended after completion. No prepared status implies deployment.
