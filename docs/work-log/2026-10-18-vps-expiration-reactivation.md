# Expired VPS renewal and reactivation — 2026-10-18

## Scope and cause

REQ-023. The maintainer reported that renewing an expired, suspended playground
VPS and selecting Active failed with invalid input parameters. Work is isolated
on `dev/vps-expired-playground`, based on upstream `f3202feb15d21eb436594ee9f2b69f221d51932b`.
No API implementation, deployment configuration or production data was changed.

The administrator lifecycle editor sent `remind_after_date: null` when no reminder
was selected. The real HaveAPI contract permits a null `expiration_date`, but not
a null `remind_after_date`. On dev, the original UI reproduced the exact rejection:
HTTP 200 with `status: false` and `errors.remind_after_date: ["nesmí být null"]`.

A shared payload builder now omits absent reminders. Setting expiration also
resets the backend reminder, so nonempty reminders are explicitly preserved when
expiration changes. Clearing a reminder resends the current expiration without a
reminder; clearing expiration sends its nullable field alone. The same shared
editor serves VPS and member lifecycle administration. Permissions, confirmation,
asynchronous receipts, transaction locks and uncertain-write handling are retained.
The existing fixture expectations were corrected to match this API contract.

## Verification

- All 299 Vitest files passed: 1,839 tests, including seven payload-contract cases.
- TypeScript application and adopted E2E checks, lint, scoped formatting,
  structural audit and production build passed.
- Playwright renewal, reactivation, start and reminder/expiration clearing passed
  in Czech and English on desktop Chromium, mobile Chromium and mobile WebKit.
- The broader lifecycle run covered 96 cases: 88 passed initially, two failed
  because the old expiration test omitted the preserved reminder, and six timed
  out. After correcting that contract expectation, all eight failed cases passed
  when rerun serially. This is local regression evidence, not a claim about CI.

## Live dev evidence and limits

A disposable admin (31), namespace/map (7) and VPS (59) were created on dev for
this test. VPS hostname: `webui-next-live-test-expiry-20261018`. It had 1 CPU,
1 GiB memory, 2 GiB disk and no IP allocations. The test account had email disabled.
The playground lab node (103) was offline, so the real lifecycle test used the
available node 101 instead. This proves the shared lifecycle/API behavior, not
execution on the unavailable playground node.

The VPS was suspended with an already-past expiration. The deployed dev UI
reproduced the rejection above. The locally built fixed frontend was then served
only inside the Playwright browser via document/asset overrides on the dev origin;
API, authentication and session requests still reached the real dev services.
The root document was overridden as well to keep the frontend freshness check
consistent. The server's deployed frontend was not replaced.

Reactivation request: `object_state: active`, expiration
`2026-11-21T08:25:00.000Z`, no reminder field. Action 347 completed successfully
(2/2 transactions); the Start button submitted action 348, which also completed
successfully (1/1). A fresh authenticated read confirmed `object_state: active`,
`is_running: true`, the new expiration and a null reminder. The initial runtime
poll timed out; later readback and completed transaction records established the
successful result. This is not a synchronous-start guarantee.

Credentials and authenticated browser state are outside Git. Screenshot and
sanitized request evidence are retained locally under
`/tmp/webui-playground-expiry-20261018/`. Verification did not deploy the fix.
The maintainer subsequently requested publication as a focused pull request;
merge and deployment remain pending explicit authorization.

Additional real-API browser checks set a reminder, extended expiration to
22 November while preserving that reminder, and then cleared only the reminder.
All writes succeeded and authenticated readback confirmed the expected dates.
The final captured VPS was Active and Running with no reminder. Sanitized evidence
and screenshots were copied to local ignored `work/verification/vps-expiration/`.

Cleanup: the dev DELETE endpoint returned a server error, so the fixture was
removed through the existing model lifecycle transition without changing backend
code. Cleanup chain 349 completed (10/10); VPS 59 and its dataset 72 no longer
exist. Test user 31 is locked, OAuth/token login disabled and all sessions closed.
The account and transaction records remain as audit history.
The namespace/map (7) remains attached to that locked audit account: its cleanup
was refused by an existing resource lock. The lock was not bypassed and no shared
infrastructure was repaired as part of this frontend task. There are no remaining
VPS/disk allocations for this fixture.
