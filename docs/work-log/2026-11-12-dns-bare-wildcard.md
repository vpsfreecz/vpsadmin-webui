# Accept the API-supported bare DNS wildcard

Prepare approved DNS-03 / REQ-049 on the maintainer's fixed experiment base.
Actual clean C9 screenshots on desktop Chromium and Linux mobile WebKit
reproduce a valid A record named `*` showing a name error with disabled submit.
The current API22adc explicitly accepts `*` and `@`; the UI accepts `*.suffix`
but omits the bare wildcard. The focused model regression initially failed all
four A/AAAA/TXT/CNAME positive cases while26 existing/negative cases passed.

Allow only the missing bare `*` case in the existing owner-name validator.
Preserve every other label, wildcard-position, content, TTL, conflict, payload,
owner/action and API-error rule. No API/schema/SDK/BFF/dependency, DNSSEC or
terminology change; held DNS PR116/117 remain untouched. DNS-01 models are
unselected and do not authorize naming changes.

Verification in progress: the model suite now passes30 cases. New full strict
browser coverage exercises A/AAAA/TXT fixture saves in CSdark/ENlight, member,
admin-My and support-My, keyboard submit and narrow bounds; rejects malformed
wildcards/content before sending; preserves an intercepted API422 name error
and draft without replay. Fixtures do not certify live permission, server
validation, backend mutation, OAuth or actual DNS publication. All live API
writes/objects/identities are zero. Native/clean-package/hosted CI and paired
preview results remain pending until separately recorded; no merge/deployment
or broad task completion is claimed here.


Local verification: pinned Node24.21/npm11.19 ci:quick and34 targeted DNS model/
zone tests pass on each foundation; both working builds pass. Full strict E2E
roots113 focused/244 cumulative, no new deferrals. The unchanged model debt
allowances537/518 are retained; only its reviewed one-line content hash and
rationale change. Working cumulative12 configurations passed with zero retries/
page errors:36 intercepted A/AAAA/TXT creates and12 deliberate API422 rejections,
48 fixture POSTs total and zero live writes. Member/admin-My/support-My only; no
selected-foreign-owner or live-permission claim. Desktop/mobile before and working
after raw captures individually viewed. CI selects all six new tests per profile.
The first structural hash refusal and absent-SDK fixture import diagnostic are
preserved privately; the fixture uses a narrow checked local DTO without adding
dependencies. Cumulative source retains delivered SDK aliases/nullability.
Clean Nix/browser, hosted CI and paired/protected delivery remain pending.


### Focused foundation dependency — 2026-11-12

Original PR303/C264 Chromium CI retained652 passes and1 flaky OOM history
scenario. Its trace shows Next restoring preserved.slice while the API still
uses system.slice and the new filters. The cumulative DCB25 preview already
contains the reviewed PR243/4df369be correction; the focused13a foundation does
not.12 ordinary and6 CPU6 cumulative repetitions pass, but cannot reproduce
a defect whose fix is already present. A rejected synthetic microtask diagnostic
hit a missing button during loading; it is not application-failure evidence.

On a fresh C264 clone, the exact two original PR243 pending-router regressions
fail with preserved.slice instead of system.slice; all4 older tests pass.
Include PR243 as an explicit Git dependency, retaining its authorship and all
strict browser/API/history/URL assertions. Only WORK_LOG append sections conflict;
preserve both entries. No cumulative runtime change is needed for this existing
correction. Verification on this prepared dependency remains separate from clean
new-head packages, hosted CI and paired activation; those are not yet qualified.
Private evidence: /data/webui-browser-runner/verification-20261103/
todo-oom-router-race-20261112/actual-acceptance-report.md. No live API writes.


Prepared dependency validation: pinned ci:quick passes (114 strict E2E roots,
174 unchanged deferrals), production build passes, and all52 focused hook/UI/
OOM-semantics/DNS model tests pass. Working source24/24 browser cases pass across
Chromium and mobile WebKit:12 exact-filter/history/owner-scope OOM contracts and
12 wildcard scenarios with48 intercepted DNS creates/rejections. Zero retries
or live writes. OOM cases retain all public URL/API/history assertions; wildcard
journals record zero page errors. Clean new-head/Nix qualification and original
hosted six-check/zero-flaky evidence remain pending. No preview activation.
