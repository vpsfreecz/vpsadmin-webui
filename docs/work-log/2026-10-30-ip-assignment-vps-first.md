# VPS-first IP assignment and verified ownership — 2026-10-30

REQ-050, REQ-046. Prepared on `dev/ip-assignment-vps-first` over the authorized
dev preview PR112 (`455ea11f`). No backend changes, merge or deployment.

## Request and implementation

Match the legacy routing workflow: the attach icon opens a centered dialog whose
first field is VPS ID (also hostname lookup), followed by that VPS's interfaces.
Show its owner and environment for review, not as prerequisite editable fields.
A single interface is selected automatically; switching VPS clears stale drafts.
Keep route-only, optional route-via and combined route+host actions. Re-read IP,
VPS owner and interfaces before POST. Failed preflight reads remain safely
retryable because no write has been submitted. Foreign ownership blocks assignment;
accounting and final authorization remain the API's responsibility. Consume the
URL action once so cancel/reload does not reopen or submit anything.

Separate reservation/ownership remains available. A read-only query of the
reported production IP confirmed that the requested owner and charged
environment had already been saved: the write succeeded, but the UI unconditionally required an
asynchronous receipt. API source confirms ownership-only updates can have no
transaction chain. Accept this specific synchronous response only after a new
GET confirms the exact IP, owner and charged environment. Release must read back
both fields explicitly null. Invalid present receipts and unrelated updates
remain fail-closed. Unknown outcomes retain durable local guards and require
Tasks review plus fresh state/manual confirmation before unlocking. No automatic
write replay or reconciliation of historical accounting.

Extract the coherent owner and route forms from the long detail page and remove
its now-satisfied structural debt exception. No file-budget relaxation.
Terminology reviewed at locked vpsAdmin
`a65a4dfeb92a59df4a80a737a20bcbf8558793ff`; cs/en rendered checks passed.

## Verification and limitations

The isolated development-machine runner passed 51 API/lock unit tests.
Final `ci:quick`, production build and design-documentation validation passed,
including after the checkbox-label correction.
The broad networking repeat passed 68 checks with two existing mobile skips;
the expanded assignment/ownership and detail regression suite passed all 37
checks in desktop Chromium, mobile Chrome and mobile WebKit. The first browser
run caught duplicate React sibling keys in the extracted forms; distinct owner
and route keys fixed it. Explicit component lint also identified the nested
checkbox label. Its corrected accessible association and all assignment modes
passed a final nine-check cs/en desktop/mobile repeat; explicit component lint
passed as well.
Remote evidence: `/data/webui-browser-runner/evidence/ip-assign-20261030`.
Synthetic browser responses are UI/receipt evidence, not live authorization proof.
Production queries were read-only; no actual member's IP was assigned/reassigned.
The standalone `vpsadmin-kb-captures` checkout is absent locally. External KB
navigation/screenshots for this admin shortcut still need review; they are not
certified by fixture tests. Deployment and shared-main history remain unchanged.

The deployed dev bundle failed the new first-click dialog regression in both
Chromium and mobile WebKit (synthetic API interception). New passing candidates
must retain this failing before-proof rather than silently retesting fixtures.

Implemented synthetic screenshots (no production user data):
[desktop](images/2026-10-30-ip-vps-first/desktop-cs.png),
[mobile WebKit](images/2026-10-30-ip-vps-first/mobile-webkit-cs.png).
