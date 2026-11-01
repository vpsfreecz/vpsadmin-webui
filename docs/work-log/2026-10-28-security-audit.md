# WebUI/BFF cleanup and security audit — 28–29 October 2026

Status: review candidates and audit report prepared; no merge or deployment.
No shared merge, deployment, host configuration application or API source edit.
[Review report](../audits/webui-security-review-2026-10-28.md).

## Scope and source receipts

The maintainer authorized code cleanup, a broad security review and real dev
browser/API testing, including disposable accounts/VPS. Work ends early when
useful verification is complete, and no later than 29 October 08:00 Europe/Prague
(07:00 UTC). Heartbeat `no-n-audit-webui-do-8-00` must be disabled on handoff.
Other paused automations remain paused. Browsers run only on the development
machine, not the Mac. Production investigation is anonymous/read-only.

Main source: 40653dffed4561dd6086716fd506a7223d3631d7. Live UI/BFF:
606a02c19f328c69298dd30780c805211fb5cb27. Dev API:
fb2f51222503a45f2e5a42af505f719e44279ed0. Locked terminology reference:
a65a4dfeb92a59df4a80a737a20bcbf8558793ff. These are different receipts.
No colleague PR 63/74 or separate IP-search PR 102 was included or modified.
Production IP 13294/13693 accounting remains read-only and untouched.

| PR | Source | Purpose and evidence |
| --- | --- | --- |
| [104](https://github.com/vpsfreecz/vpsadmin-webui/pull/104) | 51c1fb6c | Reject OAuth provider redirects and unsafe local paths; actual two-server reproduction, BFF/auth regressions. |
| [105](https://github.com/vpsfreecz/vpsadmin-webui/pull/105) | b7237217 | Compatible development security patches; full dependency audit clean, fresh install, clean Nix frontend/BFF/provenance/source/package checks. |
| [106](https://github.com/vpsfreecz/vpsadmin-webui/pull/106) | 135e2031 | Private/redacted legacy live-audit artifacts, explicit authenticated-media opt-ins. |
| [107](https://github.com/vpsfreecz/vpsadmin-webui/pull/107) | dea423a3 | Typed network confirmation presentation, exclusive dialog state, parent 77 lines smaller and structural exception removed. |
| [108](https://github.com/vpsfreecz/vpsadmin-webui/pull/108) | 698fd549 | Singular proxy metadata policies and stricter current session audit; real isolated nginx wire proof and Nix evaluation. |
| [109](https://github.com/vpsfreecz/vpsadmin-webui/pull/109) | 2895f24f | Bounded account label, Escape/focus/expanded-state behavior;9 browser cases, 54 viewport/role/browser combinations. |
| [110](https://github.com/vpsfreecz/vpsadmin-webui/pull/110) | 39ee1e62 | Reachable responsive task transaction details; 14 browser regressions. Explicit base:PR 109. |

Each PR has its own English work log and relevant contracts/requirements.
Attachments were attempted after creation, but the app's existing 100-identity
limit rejected them; direct GitHub links work. No historical attachment removed.
Contributor identity and hooks were checked before commits; no force-push or
published history rewrite. Local dependency integration preserved both work-log
entries, typed manifests and WebKit selectors. Its exact own WIP stash was
removed after the committed/pushed changes were verified.

## Security review and actual dev checks

The inventory covers 8 BFF modules/1,473 lines and 1,120 frontend modules/181,929 lines;
it is not a claim that every line received independent manual review. Detailed
review followed authentication/session/OAuth, origin/cookies/queues/private files,
HTML/URL/output handling, owner/role scoping, mutation preflight/locks/uncertainty,
dependencies, immutable packaging and test-artifact privacy. See the report for
severity, prerequisites, disposition and unverified areas.

Real OAuth and API checks used new disposable accounts 33–35 plus reverified
prior same-chat fixtures 29/30 with unchanged existing small quotas. Checks
include positive user-data/metrics-token ownership, foreign reads/deletes and
forged filters, user/payment-instruction/SSH/TOTP/session rejection and preserved
member privilege after attempted escalation. HaveAPI may reject with HTTP 200
and status:false/response:null; assertions check the envelope and read-back.

Two real VPS 66/67 and datasets 77/78 supported 20 checks of own/foreign VPS and
dataset access, mutation/start/console/delete rejection and forged filters.
Actual mobile WebKit started the own VPS with exactly 1 POST on the first tap
and opened Tasks on the first tap. Both VPS were subsequently destroyed.

Twenty-two further actual reads used positive chains396/393 and transactions
1138/1129. Foreign chain/action-state/item reads were rejected, foreign-chain
filtering returned no items, and forged owner filters retained only own results.
Ordinary member item/list responses omitted sensitive input/output/user fields.
Temporary read-probe OAuth access was revoked and original credentials restored.

The fresh live browser sweep covered 195 views: 193 passed, 2 WebKit page-error
observations. A 6-view settled follow-up passed without errors or overflow. Five
menu→Transactions→Tasks cycles passed first-touch checks. Stale-session and
pre-bootstrap attempts are retained as unsuccessful attempts, not hidden.
Actual cookie flags/concurrent reads/logout/provider token revocation passed;
cross-site metadata/logout returned 403. Refresh rotation was not demonstrated:
the shared dev client has issue_refresh_token:false and was not changed.

Actual TOTP enrollment, invalid/valid confirmation, ordinary-read secret omission
and mobile Safari OAuth challenge passed 11 checks. Password alone/invalid TOTP
could not complete login; valid TOTP did. Temporary devices were removed and
MFA restored. The first probe used the wrong request namespace and failed;
the corrected totp_device envelope/read-back passed. No secrets were logged.

## Automated verification and retained failures

Baseline all-unit repeat with maxWorkers=2 passed 1,899 tests; build passed.
Desktop: 1,058 passed / 33 skipped of 1,091, zero retries, 53.7 min.
Full mobile Chrome: 1,054 passed / 10 skipped / 27 failed of 1,091, zero retries, 1.1 h.
Twenty-five failures target deliberately hidden desktop table/actions/search
representations; mobile cards/palette need corresponding coverage. Two are real
action-state table defects, reproduced and fixed inPR 110. This broad mobile run
is NOT green and was not hidden, weakened or pointlessly repeated.
Configured mobile WebKit: 249 passed, 2 skipped of 251, zero retries (17.0 min).

Initial script checks lacked rsync; supplying the actual locked runtime closure
resolved the 6 setup failures. An initial unit fan-out overloaded the 2-CPU runner:
1,894 passed / 5 timeouts. The bounded repeat passed without timeout/assertion
changes. PR 104's first desktop CI job hit its 30-minute job cap; a single scoped
rerun completed in 27m52s. Its other passing jobs were not repeated. PR 104–109 now
have all six GitHub checks green. PR 110 WebKit/fast checks are green; its last
desktop/mobile Chrome CI jobs are pending at this checkpoint.

New layout regression first measured 393px viewport/820px document. Its first 6
checks passed after the table fix; adding intermediate widths found an unrelated
768/779px header overflow (13/14 passed). PR 109 was kept separate and the strict
width assertion retained. Final stack: 14/14 browser checks, 9 parent/header units,
ci:quick, production build and documentation gates passed. Initial candidate
installation permissions and JSDOM matchMedia were test setup failures; only the
own runner directory and unit browser API stub were corrected.

Header probes retain initial missing-Escape failures and non-isolated/wrappable
label attempts. The controlled original-source checksum e822e855433a99d4... plus
an API-valid 63-character unbroken login reproduced 640px/825px overflow. The final
9 cases passed 54 width/role/browser combinations (320/390/640/768/1024/1280), with
no retries; 8 HeaderHarness units, ci:quick/build/docs passed. Implemented synthetic
screenshots are in browser artifacts and the chat's local visualization folder.

## Owned-resource cleanup and operational limits

Cleanup first tried DELETE 66 (lazy:false), which returned 500. No blind retry:
read-back confirmed unchanged active/unlocked objects. The exception occurs
before chain creation because environment 1 lacks a Vps enter/hard_delete default
retention. A normal authenticated lifecycle PUT with explicit expiry was then
sent once to each exact owned receipt. Terminal read-back: both hard_delete,
dataset_in_pool_id:null, no locks or VPS resource uses, datasets 77/78absent.
No shared lifetime default was changed.

Owned templates 70/71, metrics tokens 3/4 and temporary TOTP devices were deleted.
All 5 used accounts are locked with authentication disabled, zero open sessions,
SSO or device tokens. Reused 29/30 have original credentials/auth flags restored;
new admin 33 was demoted and new 33–35 passwords randomized. The read-only transaction
follow-up restored/revoked access again. Fifteen private credential/session files
and password/hash fields were removed after revocation; redacted receipts remain.
Cleanup is scoped to exact verified fixture names/owners, not other users.

Outstanding own NAS receipts:datasets 79/80, DatasetInPool 91/92, create chains 401/
402, transactions 1161/1162. Each has 1 GiB refquota. They remain queued on the old
storage 104lab node; its QEMUunit is active but guest SSH timed out. No export
was created. New-user NoOps 377–379await the pre-existing unavailable mailer 100.
Do not bypass locks/confirmations, restart shared services or claim these rows
cleaned. Normal terminal cleanup and positive NFS/export proof need healthy
infrastructure. No essential data, other VMs, quotas or services were deleted.

Dev uses a self-signed snakeoil certificate; tests explicitly accept that test
certificate and do not certify TLS identity. Normal TLS validation passed for
newadmin/clankerdev (HTTP 200,verification 0), failed on dev (curl 60/verification 18).
A metadata inspection accidentally entered the serving API dev shell, whose
hook ran Bundler. No tracked API source change or restart was observed; this
was not repeated. Later helpers reused the active process's private environment
without printing it. No global GC or shared dependency cleanup was attempted.

## Combined integration and handoff checkpoint

Local-only integration source: e9d996ced9b4a9880dec9bbfeb2d79c64a55834d in
/Users/kerrycze/git/vpsadmin-webui-security-audit-integration-20261028. Its recipe
combines exactly 104–110 on 40653, excluding 102/63/74. No shared merge/push/deploy.
The remote clone's alternate-object path was initially unavailable inside the
container. Its own Git object database was made self-contained; host Git now
verifies exact clean e9d996ce. No source bytes changed during that correction.
Dependency audits, ci:quick, 230 script checks, 58 BFF checks, 1,907 bounded
unit tests in 305 files and the production build passed. The original plain
HTTP preview attempt was interrupted after 26 failures: required BFF metadata
was absent. A separate HTTPS loopback metadata fixture now tests 18 changed-UI
cases against the unchanged produced artifact, without forwarding to any API.
The actual build-info reports e9d996ce, dirty:false, source:git. Session40873
and integration/https-browser.log contain the corrected preview results.

Corrected produced-artifact verification passed all 18 cases with zero retries
in 1.7 minutes: changed network dialogs, long account labels and action-state
transaction details on desktop Chrome, mobile Chrome and mobile WebKit. The
HTTPS fixture uses only synthetic metadata/API responses and a temporary
self-signed loopback certificate; it never proxies to an external API. It is
not a real BFF login/session transition test. The earlier missing-metadata
attempt remains recorded as interrupted with 26 failures, not a green run.

After the successful repeat, checked Git commands confirm clean e9d996ce.
Own preview processes terminated; neither loopback port 5201 nor 5203 is listening.
Remote evidence is under
/data/webui-browser-runner/evidence/security-audit-20261028/integration/,
including produced-build-info.json, https-browser.log and status.txt. Original
logs and intermediate checkpoints remain private; no credentials are committed.

Final read-only dev check at 23:48 UTC: VPS 66/67 remain hard_delete, no datasets,
locks or resource uses. All five accounts remain locked, basic/token/OAuth auth
disabled, zero open sessions, SSO or device tokens. NAS 401/402 still queued,
transactions 1161/1162 waiting. API/BFF are active with unchanged service start
times. All three sites expose clean 606a02c19f32 build provenance. Root has
2.0 GiB free; /data 837 GiB free. No cleanup/build moved data onto the root disk.

The final handoff links focused code PR 104–110 and the separate report PR.
No release is authorized by this audit. Finish early and stop the heartbeat
once the review handoff and remaining CI outcomes are recorded. Pending NAS
cleanup is an explicit infrastructure-dependent limit, not permission to force
shared queues or change the backend.
