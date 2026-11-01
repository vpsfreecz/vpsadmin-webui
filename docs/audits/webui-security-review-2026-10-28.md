# WebUI security and cleanup review — 28–29 October 2026

Status: review candidates prepared; no merge or deployment. Combined
production-artifact browser proof is recorded separately from live checks.

## Scope and evidence

This is a bounded source review and reproducible test exercise, not an independent
penetration-test certification. The reviewed source baseline is WebUI main
`40653dffed4561dd6086716fd506a7223d3631d7`. The live development UI/BFF is the
previous release `606a02c19f328c69298dd30780c805211fb5cb27`; its API runs
`fb2f51222503a45f2e5a42af505f719e44279ed0`. Source candidates, mocked browser
checks, real API checks and deployed versions are distinct evidence classes.

All browsers ran on the development machine, using its isolated Linux runner.
Actual OAuth, two real member identities and task-owned objects were exercised
against dev.crucio.cz. No production credentials or production writes were used.
No API source, shared database defaults or service configuration were changed.
One early inspection mistakenly entered the serving API dev shell and its
hook ran Bundler; no tracked source change or restart was observed. It was not
repeated. Later probes reused the process environment privately. Colleagues' PR 63/74 and the separate IP-search PR 102 remain separate.

The source inventory covers eight BFF modules (1,473 lines) and 1,120 frontend
runtime modules (181,929 lines). That inventory is not a claim to have inspected
every line. Detailed review followed the following trust boundaries:

- OAuth state/callback/token/refresh/revocation and local return paths;
- session cookies, origin/Fetch Metadata guards, impersonation binding, idle
  logout, token/cache invalidation and non-replay of uncertain writes;
- BFF request/body/deadline limits, serialized session access and private files;
- owner scoping, role-sensitive UI and API wrappers, mutation preflights,
  immutable target snapshots and durable uncertainty locks;
- news/payment HTML and URL sanitization, image restrictions and iframe sandbox;
- development dependencies, artifact privacy, packaging hashes and provenance;
- structural duplication, beginning with the VPS network confirmation dialogs.

## Findings and disposition

Severity below describes the observed conditions and prerequisites, not a CVSS
score. No critical compromise or live cross-member access was demonstrated.

| Finding | Assessment | Evidence and review candidate |
| --- | --- | --- |
| Credential-bearing provider requests could follow redirects | Medium defense gap at a trusted-provider/network boundary; no public production exploit demonstrated | A dummy pair of actual HTTP servers reproduced forwarding before the fix. [PR 104](https://github.com/vpsfreecz/vpsadmin-webui/pull/104) forces redirect rejection and tests 301/302/303/307/308 plus override resistance. |
| Shared local-path validation accepted backslashes/control characters | Medium navigation confinement gap; exact OAuth-next path already had a stricter check | Regression reproduces a browser-origin escape. PR 104 makes the shared helper reject these inputs, including impersonation returns. |
| Seven vulnerable packages in the development dependency tree | Build/developer exposure, not seven deployed BFF vulnerabilities | [PR 105](https://github.com/vpsfreecz/vpsadmin-webui/pull/105) applies compatible patches and a narrow same-major parser override. Fresh full-tree and production audits are clean; immutable Nix package checks passed. |
| Legacy live-audit driver wrote sensitive diagnostics/artifacts too readily | Medium operator artifact/privacy risk | [PR 106](https://github.com/vpsfreecz/vpsadmin-webui/pull/106) uses private files, bounded metadata and explicit authenticated-media opt-ins. Its legacy token bootstrap is still not proof of current BFF authentication. |
| Duplicate metadata CORP headers | Medium loss of an intended browser defense; independent same-origin guard still passed and no disclosure observed | Anonymous wire checks on all three sites and an isolated nginx reproduction. [PR 108](https://github.com/vpsfreecz/vpsadmin-webui/pull/108) assigns each replaced policy to one layer and strengthens parity checks. No host configuration applied. |
| Duplicate, oversized VPS network confirmation implementation | Maintainability issue; no authorization relaxation | [PR 107](https://github.com/vpsfreecz/vpsadmin-webui/pull/107) extracts typed presentation, makes dialog modes exclusive, removes 77 parent lines and its structural exception while retaining parent permission/lock/mutation control. |
| Dev HTTPS uses a snakeoil certificate with hostname mismatch | Environment/security verification limit | Live browser contexts explicitly accepted this test certificate. Those results do not certify TLS identity or justify disabling certificate checks generally. Independent normal TLS verification succeeded for newadmin and clankerdev (HTTP 200, verification 0); dev failed validation 18/self-signed. |
| Dev OAuth client does not issue refresh tokens | Coverage limit, not a proven rotation defect | Own-session expiry exercise could not demonstrate real refresh rotation. Shared client settings were not changed. |
| Dev lacks default hard-delete retention | Environment configuration defect | Own VPS delete returned 500 before creating a chain. Explicit lifecycle expiry cleaned both fixtures normally; no shared defaults repaired. |
| Storage node does not process new NAS transactions | Environment/cleanup blocker | Two bounded own dataset-create chains remain queued. No export was created; positive NFS owner-isolation proof remains incomplete. Do not bypass locks or silently mark transactions successful. |
| Action-state transaction table escaped mobile width | Functional bug, separately reproduced at 393px viewport/820px document | Focused responsive table candidate, regression passed both member/admin on all three browser projects; [PR 110](https://github.com/vpsfreecz/vpsadmin-webui/pull/110), based explicitly on PR 109; 14 targeted checks passed. |
| Global account menu overflow and missing Escape dismissal | Functional/accessibility defects | Controlled original-source reproduction at 640px/825px with a legal long-login boundary; [PR 109](https://github.com/vpsfreecz/vpsadmin-webui/pull/109) bounds the label and restores Escape/focus behavior; 54 viewport/role/browser combinations passed. |
| Some full-mobile tests select desktop-only representations | Test coverage debt | Hidden desktop tables are not mobile cards. Retain the failing broad run and assess supported mobile workflows separately; do not skip assertions merely to claim green. |

The duplicate-CORP conclusion follows the [Fetch standard](https://fetch.spec.whatwg.org/#cross-origin-resource-policy-header): combined duplicate values are not the single supported policy. This must not be generalized to nosniff, whose parsing is different. PR 108 preserves CSP, Vary, cookies and direct BFF protections. Its full NixOS VM scenario has been extended but not run; module evaluation and wire reproduction are separate evidence.

## Actual development API and browser checks

These checks use real authentication and actual business objects, without API
mocks. Fixture accounts and secrets are kept in a private ownership ledger;
authenticated screenshots, traces and videos were not recorded.

- Two members each created a positive user-data template and metrics token.
  Foreign reads/deletes were rejected; originals remained readable by their
  owners. Forged owner filters returned only the authenticated member's objects.
- Cross-member user dossier, payment instructions, SSH-key/TOTP subresources and
  session access were rejected. A member's attempted level 99 update did not
  grant privilege, as verified by read-back. HaveAPI can reject using HTTP 200
  with status:false/response:null; the envelope is part of the assertion.
- Two actual VPS and their datasets were created within existing small quotas.
  Twenty checks covered own positive reads, foreign GET/PUT/start/console-token/
  DELETE rejection, forged list filters, dataset isolation and a mobile WebKit
  first-tap start with exactly one POST. Both VPS were subsequently destroyed;
  datasets, resource uses and locks were gone in terminal read-back.
- Twenty-two additional actual transaction checks used known positive chains
  and transaction IDs from each member's VPS operations. Foreign chain, action
  state and item reads were rejected; forged filters disclosed no foreign items.
  Ordinary members' own item/list responses omitted input/output/user fields,
  matching the API output policy. The temporary read-only OAuth fixture access
  was revoked and original credentials/locked flags restored afterwards.
- Five mobile menu → Transactions → Tasks cycles responded to the first tap.
  The fresh route sweep covered 195 views: 193 passed and two WebKit page-error
  observations were retained. A six-view settled follow-up of the affected
  routes passed without page errors or horizontal overflow. A stale-session
  attempt and a follow-up begun before bootstrap settled are not hidden or
  counted as clean runs.
- Secure/HttpOnly/SameSite=Lax cookie flags, concurrent session reads, same-origin
  logout, subsequent anonymous state and provider rejection of the logged-out
  token passed. Cross-site metadata and logout requests returned 403.
- Actual TOTP enrollment, invalid-code rejection, confirmation, ordinary-read
  secret omission and mobile Safari OAuth challenge were exercised. Password
  alone and invalid TOTP did not complete login; valid TOTP did. The temporary
  device was deleted and the original MFA flag restored. The first probe used
  a wrong request envelope and was retained as a test-driver error, then fixed
  to the API's documented totp_device namespace.

Payment history without a known positive foreign payment, empty export lists,
mocked roles and source inspection alone are not proof of cross-object
isolation. No physical passkey/hardware authenticator was tested. Real refresh
rotation, NFS mounting/positive export isolation and storage workflows remain
uncertified under the current dev configuration.

## Automated checks

| Scope | Result |
| --- | --- |
| Baseline nonbrowser | ci:quick, 226 script checks, 57 BFF checks, 1,899 bounded unit tests and production build passed. |
| Complete baseline desktop | 1,058 passed, 33 skipped, zero retries (1,091 selected). |
| Complete baseline mobile Chrome | 1,054 passed, 10 skipped, **27 failed**, zero retries (1,091 selected). |
| Configured baseline mobile WebKit | 249 passed, 2 skipped, zero retries (251 selected). |
| Combined seven-candidate source | 230 script checks, 58 BFF checks, 1,907 unit tests in 305 files, ci:quick and production build passed. Full dependency tree, production root and production BFF audits reported zero known vulnerabilities. |

Twenty-five full-mobile failures select deliberately hidden desktop tables,
actions or search fields rather than their mobile card/palette alternatives.
These are coverage gaps, not automatically product defects. Two failures are
actual action-state detail layout bugs addressed in PR 110. The full-mobile run
is **not green**; no selectors were forced, skipped or weakened to disguise it.
New focused checks cover the changed header and transaction detail behavior.

The initial script run lacked rsync. Initial unit fan-out overloaded the two-CPU
runner (1,894 passed, five timeouts); the maxWorkers=2 repeat passed without
changing assertions or timeouts. Original logs were retained. PR 104's first
desktop CI hit its 30-minute job cap; its scoped rerun passed in 27m52s. PR 104–109
have all six GitHub checks green; PR 110's last browser jobs are recorded at
handoff. Passing jobs were not blindly rerun. The toolchain candidate's clean
Nix frontend/BFF/provenance/source/package-content builds passed; no complete
Nix VM certification is claimed.

A local-only integration snapshot `e9d996ced9b4a9880dec9bbfeb2d79c64a55834d`
combines exactly PR 104–110 on the reviewed baseline. It is not a shared merge,
release branch or deployment. Its own clone initially used an alternate object
path unavailable inside the container; making only that clone self-contained
resolved the metadata problem without source changes. Checked Git commands and
produced build-info identify the clean snapshot.

The first 36-case production-preview attempt was interrupted after 26 failures
because plain Vite preview lacks the required BFF metadata. That was a test
setup error, not evidence of 26 application regressions. A separate loopback
HTTPS fixture serves the unchanged built artifact, strict config/session JSON
with dummy credentials and no API proxy. The narrower 18-case UI regression
repeat uses intercepted synthetic API responses, not real authentication.
All 18 cases passed with zero retries in 1.7 minutes across desktop Chrome,
mobile Chrome and mobile WebKit. It does not certify live BFF session
transitions. No production bootstrap fallback was weakened.

## Cleanup and follow-up priorities

The two test VPS, user-data templates, metrics tokens and temporary TOTP device
were removed. All five used accounts are locked with authentication disabled
and zero open
sessions, SSO or device tokens. Reused accounts have their original credentials
and flags restored; the temporary administrator has been demoted. Fifteen private
credential/session files and copied password/hash fields were removed after
revocation; redacted ownership receipts remain. New account creation left NoOps queued on the pre-existing unavailable mailer; the new NAS
probe left two create operations queued on storage 104. No services were
restarted, shared queues altered, locks bypassed or unrelated data deleted.
The outstanding own storage receipts are datasets 79/80, DatasetInPool 91/92 and
create chains 401/402 (transactions 1161/1162), each bounded to 1 GiB. User-create
chains 377/378/379 remain on the unavailable mailer 100; their accounts 33–35
are locked and no longer privileged. Do not claim complete resource cleanup while
the two storage transactions are pending.

Priorities after review:

1. Review the focused fixes and deploy only the explicitly selected release.
2. Repair the dev certificate and choose explicit dev retention defaults through
   a separately authorized infrastructure/configuration change.
3. Restore mailer/storage health, then complete normal cleanup of pending owned
   fixtures and positive NFS/export ownership tests.
4. Test refresh rotation using an isolated correctly configured OAuth client,
   and payment isolation with known positive disposable payment records.
5. Keep gradual behavior-preserving structural cleanup and responsive workflow
   coverage; avoid broad rewrites or weakening gates to obtain a green badge.

[Detailed chronology and continuation evidence](../work-log/2026-10-28-security-audit.md).
Private raw evidence remains on the dev runner with restricted permissions;
repository documentation contains no credentials or authenticated personal data.
