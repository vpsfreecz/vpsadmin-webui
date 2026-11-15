# Verified export conflict feedback

Approved EXP-05 eee13eb8f00dd658 / REQ-048. Exact source API22adc8b5.
Use new isolated admin65/member66 and new NAS dataset89/DIP101 on local
primary105/node104/10.0.0.5. Normal Create478 finished2/2. Backend minimum
10GiB was retained after the initial256MiB attempt rolled back; only new member
personal budget/quota changed. New private export-only network119/locnet38
has two owned IPs unavailable to other users. Disabled export3 Create480
finished1/1. Repeat the captured payload: real HTTP200/statusfalse, nullresponse,
emptyerrors, `dataset exp-export-20261115-8d2848f4 is already exported`.
No VPS, migration, existing tenant objects, export enable or NFS client mount.

Actual deployed cff desktop Chromium and mobile WebKit both show this raw
English reason inside the open dialog. The missing localized explanation/next
step is the defect; do not claim the toast was hidden. Replace the transient
Create error toast with bounded persistent form feedback. Show a localized
known-conflict explanation and a read-only dataset exports/snapshots link;
use captured submitted form identity even after later edits. Other failures
keep their own reason. Backend permissions, payload, timings, task/local locks
and uncertainty behavior are unchanged; no retry/delete/recreate loop.

Terminology guide locked vpsAdmina65a4dfeb92a59df4a80a737a20bcbf8558793ff,
separately deployed API22adc. Current external KB contract targets legacy
PHP/API and has no React input; no unrelated pin/capture/freshness claim.

Working validation: both full quick checks and25unit tests pass. Cumulative
production build and36strict browser cases pass without retry. Cover member/support/admin/My, captured
source across pending edits, safe next-step destinations, draft/Cancel/reopen,
and unrelated rejection. Exact committed candidate results, actual-dev candidate overlay,
fixture cleanup, focused PR/all6 CI and paired/protected delivery remain pending.
Durable raw receipts, screenshots and cleanup ledger are indexed at
`/data/webui-browser-runner/verification-20261103/todo-export-selection-help-conflict-20261114`.
